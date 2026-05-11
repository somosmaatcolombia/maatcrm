// ============================================================
// Edge Function: google-calendar
// ----------------------------------------------------------------
// Handles Google Calendar integration for MAAT discovery calls.
//
// Actions (POST /functions/v1/google-calendar with JSON body):
//   { action: "oauth-exchange", code, redirect_uri }
//     -> exchanges OAuth code for refresh_token, stores in system_settings
//
//   { action: "status" }
//     -> returns { connected: bool, email?: string, calendar_id?: string }
//
//   { action: "disconnect" }
//     -> deletes the stored tokens
//
//   { action: "create-event", call_id, summary, description, start, end, attendees }
//     -> creates a Google Calendar event with Google Meet, returns event_id + meet_link
//     -> also updates the discovery_calls row with google_event_id + meeting_link
//
//   { action: "update-event", call_id, ...changes }
//     -> updates an existing event
//
//   { action: "cancel-event", call_id }
//     -> deletes event from calendar + updates DB row
//
// Authentication: caller must be an authenticated admin (we verify via JWT).
// ============================================================

// @ts-ignore - Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: any) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
// @ts-ignore
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const SETTING_KEY = "google_calendar";

// ============================================================
// Helpers
// ============================================================

interface GoogleTokens {
  refresh_token: string;
  access_token?: string;
  expires_at?: number; // unix ms
  scope?: string;
  calendar_id?: string;
  email?: string;
  connected_at?: string;
}

async function getStoredTokens(supabase: any): Promise<GoogleTokens | null> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", SETTING_KEY)
    .maybeSingle();
  if (error || !data) return null;
  return data.value as GoogleTokens;
}

async function saveTokens(supabase: any, tokens: GoogleTokens, userId?: string) {
  const { error } = await supabase
    .from("system_settings")
    .upsert({
      key: SETTING_KEY,
      value: tokens,
      description: "Google Calendar OAuth tokens for MAAT central calendar",
      updated_by: userId || null,
    });
  if (error) throw new Error("Failed to store tokens: " + error.message);
}

async function clearTokens(supabase: any) {
  await supabase.from("system_settings").delete().eq("key", SETTING_KEY);
}

async function getValidAccessToken(supabase: any): Promise<{ access_token: string; calendar_id: string }> {
  const tokens = await getStoredTokens(supabase);
  if (!tokens?.refresh_token) {
    throw new Error("Google Calendar no está conectado. Conéctalo desde Administración.");
  }

  const now = Date.now();
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > now + 60000) {
    return { access_token: tokens.access_token, calendar_id: tokens.calendar_id || "primary" };
  }

  // Refresh
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error("Error refreshing token: " + txt);
  }
  const data = await resp.json();
  const updated: GoogleTokens = {
    ...tokens,
    access_token: data.access_token,
    expires_at: now + (data.expires_in || 3600) * 1000,
  };
  await saveTokens(supabase, updated);
  return { access_token: updated.access_token!, calendar_id: updated.calendar_id || "primary" };
}

// ============================================================
// OAuth code exchange
// ============================================================
async function handleOAuthExchange(supabase: any, code: string, redirectUri: string, userId?: string) {
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResp.ok) {
    const txt = await tokenResp.text();
    return json(400, { error: "OAuth exchange failed", details: txt });
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.refresh_token) {
    return json(400, {
      error:
        "No se recibió refresh_token. Asegúrate de incluir prompt=consent en la URL de autorización.",
    });
  }

  // Fetch user email
  let email: string | undefined;
  try {
    const userResp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (userResp.ok) {
      const u = await userResp.json();
      email = u.email;
    }
  } catch (_) {}

  // Use primary calendar by default; admin can change later
  const tokens: GoogleTokens = {
    refresh_token: tokenData.refresh_token,
    access_token: tokenData.access_token,
    expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
    scope: tokenData.scope,
    calendar_id: "primary",
    email,
    connected_at: new Date().toISOString(),
  };
  await saveTokens(supabase, tokens, userId);

  return json(200, { connected: true, email });
}

// ============================================================
// Event operations
// ============================================================

interface EventPayload {
  summary: string;
  description?: string;
  start: string; // ISO
  end: string;   // ISO
  attendees?: { email: string; displayName?: string }[];
  timezone?: string;
}

async function createGoogleEvent(supabase: any, payload: EventPayload): Promise<{ event_id: string; meet_link?: string; html_link?: string }> {
  const { access_token, calendar_id } = await getValidAccessToken(supabase);

  const eventBody: any = {
    summary: payload.summary,
    description: payload.description || "",
    start: { dateTime: payload.start, timeZone: payload.timezone || "America/Bogota" },
    end: { dateTime: payload.end, timeZone: payload.timezone || "America/Bogota" },
    attendees: payload.attendees || [],
    conferenceData: {
      createRequest: {
        requestId: "maat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error("Google API error: " + txt);
  }
  const data = await resp.json();
  const meet = data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video");
  return {
    event_id: data.id,
    meet_link: meet?.uri,
    html_link: data.htmlLink,
  };
}

async function updateGoogleEvent(supabase: any, eventId: string, payload: Partial<EventPayload>) {
  const { access_token, calendar_id } = await getValidAccessToken(supabase);

  const patch: any = {};
  if (payload.summary) patch.summary = payload.summary;
  if (payload.description) patch.description = payload.description;
  if (payload.start) patch.start = { dateTime: payload.start, timeZone: payload.timezone || "America/Bogota" };
  if (payload.end) patch.end = { dateTime: payload.end, timeZone: payload.timezone || "America/Bogota" };
  if (payload.attendees) patch.attendees = payload.attendees;

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events/${eventId}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error("Google API error: " + txt);
  }
}

async function deleteGoogleEvent(supabase: any, eventId: string) {
  const { access_token, calendar_id } = await getValidAccessToken(supabase);
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events/${eventId}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${access_token}` },
    }
  );
  // 410 means already deleted, treat as OK
  if (!resp.ok && resp.status !== 410 && resp.status !== 404) {
    const txt = await resp.text();
    throw new Error("Google API error: " + txt);
  }
}

// ============================================================
// Build event from discovery_call row
// ============================================================
function buildEventFromCall(call: any): EventPayload {
  const prospect = call.prospect;
  const qualification = call.qualification;
  const advisor = call.advisor;

  const name = prospect?.full_name || qualification?.full_name || "Prospecto";
  const advisorName = advisor?.full_name || "Asesor MAAT";
  const score = qualification?.qualification_score;
  const invMin = qualification?.investment_capacity_min;
  const invMax = qualification?.investment_capacity_max;
  const income = qualification?.income_range;

  const summary = `Discovery: ${name} · con ${advisorName.split(' ')[0]}`;

  const descLines: string[] = [
    `Llamada de descubrimiento MAAT`,
    ``,
    `👤 Prospecto: ${name}`,
    prospect?.email || qualification?.email ? `📧 ${prospect?.email || qualification?.email}` : "",
    prospect?.phone || qualification?.phone ? `📱 ${prospect?.phone || qualification?.phone}` : "",
    ``,
    `🎯 Asesor: ${advisorName}`,
  ];
  if (score != null) descLines.push("", `📊 Fit score: ${score}%`);
  if (invMin && invMax) descLines.push(`💰 Inversión declarada: $${invMin}-$${invMax} USD`);
  if (income) descLines.push(`💵 Ingresos: ${income}`);
  if (call.call_notes) descLines.push("", `📝 Notas:`, call.call_notes);

  const start = new Date(call.scheduled_at).toISOString();
  const end = new Date(new Date(call.scheduled_at).getTime() + (call.duration_min || 45) * 60000).toISOString();

  const attendees: { email: string; displayName?: string }[] = [];
  const prospectEmail = prospect?.email || qualification?.email;
  if (prospectEmail) attendees.push({ email: prospectEmail, displayName: name });
  if (advisor?.email) attendees.push({ email: advisor.email, displayName: advisor.full_name });

  return {
    summary,
    description: descLines.filter(Boolean).join("\n"),
    start,
    end,
    attendees,
    timezone: call.timezone || "America/Bogota",
  };
}

// ============================================================
// Main handler
// ============================================================
// @ts-ignore - Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Service-role client (for storing tokens, full access)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Authenticated client to verify caller is admin
  const authHeader = req.headers.get("Authorization");
  let userId: string | undefined;
  let isAdmin = false;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await adminClient.auth.getUser(token);
    if (userData?.user) {
      userId = userData.user.id;
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      isAdmin = profile?.role === "admin";
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const action = body.action;

  try {
    // === OAuth exchange (admin only) ===
    if (action === "oauth-exchange") {
      if (!isAdmin) return json(403, { error: "Solo administradores" });
      if (!body.code || !body.redirect_uri) {
        return json(400, { error: "Falta code o redirect_uri" });
      }
      return await handleOAuthExchange(adminClient, body.code, body.redirect_uri, userId);
    }

    // === Status (any authenticated user can check) ===
    if (action === "status") {
      if (!userId) return json(401, { error: "No autorizado" });
      const tokens = await getStoredTokens(adminClient);
      return json(200, {
        connected: !!tokens?.refresh_token,
        email: tokens?.email,
        calendar_id: tokens?.calendar_id,
        connected_at: tokens?.connected_at,
      });
    }

    // === Disconnect (admin only) ===
    if (action === "disconnect") {
      if (!isAdmin) return json(403, { error: "Solo administradores" });
      await clearTokens(adminClient);
      return json(200, { disconnected: true });
    }

    // === Set calendar id (admin only) ===
    if (action === "set-calendar") {
      if (!isAdmin) return json(403, { error: "Solo administradores" });
      const tokens = await getStoredTokens(adminClient);
      if (!tokens) return json(400, { error: "No conectado" });
      tokens.calendar_id = body.calendar_id || "primary";
      await saveTokens(adminClient, tokens, userId);
      return json(200, { calendar_id: tokens.calendar_id });
    }

    // === List calendars (admin only) ===
    if (action === "list-calendars") {
      if (!isAdmin) return json(403, { error: "Solo administradores" });
      const { access_token } = await getValidAccessToken(adminClient);
      const resp = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=owner", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!resp.ok) return json(500, { error: "Failed to list calendars" });
      const data = await resp.json();
      return json(200, {
        calendars: (data.items || []).map((c: any) => ({
          id: c.id,
          name: c.summary,
          primary: !!c.primary,
        })),
      });
    }

    // === Create event for an existing discovery_call ===
    if (action === "create-event") {
      if (!userId) return json(401, { error: "No autorizado" });
      if (!body.call_id) return json(400, { error: "Falta call_id" });

      const { data: call, error: callErr } = await adminClient
        .from("discovery_calls")
        .select("*, prospect:prospect_id(id, full_name, email, phone), advisor:advisor_id(id, full_name, email), qualification:qualification_id(*)")
        .eq("id", body.call_id)
        .single();
      if (callErr || !call) return json(404, { error: "Llamada no encontrada" });

      const eventPayload = buildEventFromCall(call);
      const result = await createGoogleEvent(adminClient, eventPayload);

      // Persist event id + meet link on the discovery_calls row
      await adminClient
        .from("discovery_calls")
        .update({
          google_event_id: result.event_id,
          google_calendar_id: (await getStoredTokens(adminClient))?.calendar_id || "primary",
          meeting_link: result.meet_link || null,
        })
        .eq("id", call.id);

      return json(200, result);
    }

    // === Update event ===
    if (action === "update-event") {
      if (!userId) return json(401, { error: "No autorizado" });
      if (!body.call_id) return json(400, { error: "Falta call_id" });

      const { data: call, error: callErr } = await adminClient
        .from("discovery_calls")
        .select("*, prospect:prospect_id(id, full_name, email, phone), advisor:advisor_id(id, full_name, email), qualification:qualification_id(*)")
        .eq("id", body.call_id)
        .single();
      if (callErr || !call) return json(404, { error: "Llamada no encontrada" });
      if (!call.google_event_id) return json(400, { error: "Esta llamada no tiene evento en Google Calendar" });

      const eventPayload = buildEventFromCall(call);
      await updateGoogleEvent(adminClient, call.google_event_id, eventPayload);
      return json(200, { updated: true });
    }

    // === Cancel event ===
    if (action === "cancel-event") {
      if (!userId) return json(401, { error: "No autorizado" });
      if (!body.call_id) return json(400, { error: "Falta call_id" });

      const { data: call } = await adminClient
        .from("discovery_calls")
        .select("google_event_id")
        .eq("id", body.call_id)
        .single();
      if (!call?.google_event_id) return json(200, { cancelled: false, reason: "no_event" });

      await deleteGoogleEvent(adminClient, call.google_event_id);
      await adminClient
        .from("discovery_calls")
        .update({ google_event_id: null, meeting_link: null })
        .eq("id", body.call_id);
      return json(200, { cancelled: true });
    }

    return json(400, { error: "Unknown action: " + action });
  } catch (e: any) {
    return json(500, { error: e?.message || String(e) });
  }
});

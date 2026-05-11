// ============================================================
// Edge Function: process-scheduled-notifications
// ----------------------------------------------------------------
// Cron-triggered function that processes pending scheduled_notifications.
// Reads `pending` rows where scheduled_for <= now() and sends them via
// Resend (email). Marks as sent/failed accordingly.
//
// Can be invoked:
//   - By pg_cron every 15 minutes (see SQL in setup-cron.sql)
//   - Manually via POST { call_id } to send all pending for a specific call
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
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
// @ts-ignore
const APP_URL = Deno.env.get("APP_URL") || "https://maatcrm.vercel.app";

const FROM_EMAIL = "MAAT <hola@somosmaat.org>";

// ============================================================
// Email templates
// ============================================================

function buildQualificationLinkEmail(data: {
  name: string;
  call_date: string;
  advisor_name: string;
  qualify_url: string;
}) {
  const firstName = data.name?.split(" ")[0] || "";
  return {
    subject: `${firstName}, una pregunta rápida antes de nuestra llamada`,
    html: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Antes de nuestra llamada</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#F5F5F5;color:#1A1A2E;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F5F5;padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <tr><td style="background:linear-gradient(135deg,#0F3460,#39A1C9);padding:32px 24px;text-align:center;">
        <p style="color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">MAAT Mentoría</p>
        <h1 style="color:#FFFFFF;font-size:26px;font-weight:800;margin:0;line-height:1.2;">Antes de nuestra llamada</h1>
      </td></tr>
      <tr><td style="padding:32px 24px;">
        <p style="font-size:16px;line-height:1.6;color:#1A1A2E;margin:0 0 16px 0;">Hola ${firstName},</p>
        <p style="font-size:15px;line-height:1.6;color:#333333;margin:0 0 16px 0;">
          Confirmamos nuestra sesión de descubrimiento el <strong>${data.call_date}</strong> con <strong>${data.advisor_name}</strong>.
        </p>
        <p style="font-size:15px;line-height:1.6;color:#333333;margin:0 0 24px 0;">
          Para que aprovechemos al máximo el tiempo, te pido un favor: dedícale 2 minutos a este cuestionario.
          Así llegamos a la llamada conociendo lo importante y nos enfocamos directo en cómo ayudarte.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${data.qualify_url}" style="display:inline-block;background:#0F3460;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:12px;font-weight:700;font-size:15px;">
            Empezar cuestionario (2 min)
          </a>
        </div>
        <p style="font-size:13px;line-height:1.6;color:#6B7280;margin:0 0 8px 0;">
          O copia este link en tu navegador:
        </p>
        <p style="font-size:12px;line-height:1.4;color:#39A1C9;word-break:break-all;margin:0 0 24px 0;">
          ${data.qualify_url}
        </p>
        <p style="font-size:14px;line-height:1.6;color:#6B7280;margin:24px 0 0 0;border-top:1px solid #E5E7EB;padding-top:16px;">
          ¡Nos vemos pronto! 🙌<br/>
          <strong>${data.advisor_name}</strong> — Equipo MAAT
        </p>
      </td></tr>
      <tr><td style="background:#1A1A2E;padding:16px;text-align:center;">
        <p style="color:#9CA3AF;font-size:11px;margin:0;">MAAT · Mentoría de Alto Rendimiento</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    text: `Hola ${firstName},

Confirmamos nuestra sesión de descubrimiento el ${data.call_date} con ${data.advisor_name}.

Antes de la llamada, ¿podrías dedicarle 2 minutos a este breve cuestionario? Así llegamos enfocados directo en cómo ayudarte:

${data.qualify_url}

¡Nos vemos pronto!
${data.advisor_name} — Equipo MAAT`,
  };
}

function buildReminder24hEmail(data: {
  name: string;
  call_date: string;
  advisor_name: string;
  meeting_link?: string;
  has_qualification: boolean;
  qualify_url?: string;
}) {
  const firstName = data.name?.split(" ")[0] || "";
  return {
    subject: `Mañana hablamos, ${firstName} 🙌`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#F5F5F5;color:#1A1A2E;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F5F5;padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <tr><td style="background:linear-gradient(135deg,#0F3460,#39A1C9);padding:28px 24px;text-align:center;">
        <p style="color:#EBA055;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;">Recordatorio MAAT</p>
        <h1 style="color:#FFFFFF;font-size:24px;font-weight:800;margin:0;">Tu sesión es mañana</h1>
      </td></tr>
      <tr><td style="padding:28px 24px;">
        <p style="font-size:16px;line-height:1.6;color:#1A1A2E;margin:0 0 16px 0;">Hola ${firstName},</p>
        <p style="font-size:15px;line-height:1.6;color:#333333;margin:0 0 20px 0;">
          Un recordatorio rápido: nuestra llamada de descubrimiento es <strong>${data.call_date}</strong> con <strong>${data.advisor_name}</strong>.
        </p>
        ${
          data.meeting_link
            ? `<div style="text-align:center;margin:24px 0;">
                 <a href="${data.meeting_link}" style="display:inline-block;background:#10B981;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">
                   🎥 Abrir Google Meet
                 </a>
               </div>`
            : ""
        }
        ${
          !data.has_qualification && data.qualify_url
            ? `<div style="background:#EBA055;background:linear-gradient(135deg,#EBA055,#D4883A);border-radius:12px;padding:18px;margin:20px 0;">
                 <p style="color:#FFFFFF;font-size:13px;font-weight:700;margin:0 0 6px 0;">¿Aún no lo has llenado?</p>
                 <p style="color:#FFFFFF;font-size:13px;line-height:1.5;margin:0 0 12px 0;opacity:0.95;">El cuestionario nos ayuda a llegar preparados. 2 minutos:</p>
                 <a href="${data.qualify_url}" style="display:inline-block;background:#FFFFFF;color:#D4883A;text-decoration:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;">Llenar ahora</a>
               </div>`
            : ""
        }
        <h3 style="font-size:14px;font-weight:700;color:#1A1A2E;margin:24px 0 8px 0;">Para prepararte:</h3>
        <ul style="font-size:14px;line-height:1.7;color:#333333;margin:0 0 16px 0;padding-left:20px;">
          <li>Busca un espacio sin interrupciones</li>
          <li>Ten claro tu reto principal</li>
          <li>Llega 2 min antes para probar audio/video</li>
        </ul>
        <p style="font-size:13px;line-height:1.6;color:#6B7280;margin:24px 0 0 0;border-top:1px solid #E5E7EB;padding-top:16px;">
          Si necesitas reagendar, responde a este correo.<br/><br/>
          <strong>${data.advisor_name}</strong> — Equipo MAAT
        </p>
      </td></tr>
      <tr><td style="background:#1A1A2E;padding:16px;text-align:center;">
        <p style="color:#9CA3AF;font-size:11px;margin:0;">MAAT · Mentoría de Alto Rendimiento</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    text: `Hola ${firstName},

Un recordatorio rápido: nuestra llamada de descubrimiento es ${data.call_date} con ${data.advisor_name}.

${data.meeting_link ? `Link: ${data.meeting_link}\n\n` : ""}${!data.has_qualification && data.qualify_url ? `Si aún no llenaste el cuestionario, hazlo aquí: ${data.qualify_url}\n\n` : ""}Para prepararte:
- Busca un espacio sin interrupciones
- Ten claro tu reto principal
- Llega 2 min antes para probar audio/video

${data.advisor_name} — Equipo MAAT`,
  };
}

// ============================================================
// Send email via Resend
// ============================================================
async function sendEmail(to: string, subject: string, html: string, text: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Resend error ${resp.status}: ${errTxt}`);
  }
  return await resp.json();
}

// ============================================================
// Format helpers
// ============================================================
function formatCallDate(iso: string, timezone: string = "America/Bogota"): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return iso;
  }
}

// ============================================================
// Process one notification
// ============================================================
async function processNotification(supabase: any, notif: any): Promise<boolean> {
  // Mark as processing
  await supabase
    .from("scheduled_notifications")
    .update({ status: "processing", attempt_count: notif.attempt_count + 1 })
    .eq("id", notif.id);

  try {
    // Skip if no email
    if (notif.channel === "email" && !notif.to_email) {
      throw new Error("Sin destinatario email");
    }

    // Load related call + prospect + advisor + qualification
    const { data: call } = await supabase
      .from("discovery_calls")
      .select("*, prospect:prospect_id(id, full_name, email, phone), advisor:advisor_id(id, full_name, email), qualification:qualification_id(id, qualification_score)")
      .eq("id", notif.call_id)
      .maybeSingle();

    if (!call) throw new Error("Llamada no encontrada o eliminada");

    // Skip if call is cancelled/completed
    if (call.status !== "scheduled") {
      await supabase
        .from("scheduled_notifications")
        .update({ status: "skipped", last_error: `Call no longer scheduled (status=${call.status})` })
        .eq("id", notif.id);
      return false;
    }

    const advisorName = call.advisor?.full_name || "Equipo MAAT";
    const recipientName = notif.to_name || call.prospect?.full_name || "";
    const callDate = formatCallDate(call.scheduled_at, call.timezone);

    let template;
    if (notif.type === "qualification_link") {
      if (call.qualification_id) {
        // Already qualified, skip
        await supabase
          .from("scheduled_notifications")
          .update({ status: "skipped", last_error: "Call already has qualification" })
          .eq("id", notif.id);
        return false;
      }
      template = buildQualificationLinkEmail({
        name: recipientName,
        call_date: callDate,
        advisor_name: advisorName,
        qualify_url: `${APP_URL}/qualify/discovery?call=${call.id}`,
      });
    } else if (notif.type === "reminder_24h") {
      template = buildReminder24hEmail({
        name: recipientName,
        call_date: callDate,
        advisor_name: advisorName,
        meeting_link: call.meeting_link,
        has_qualification: !!call.qualification_id,
        qualify_url: call.qualification_id ? undefined : `${APP_URL}/qualify/discovery?call=${call.id}`,
      });
    } else if (notif.type === "custom" && notif.subject && (notif.body_html || notif.body_text)) {
      template = {
        subject: notif.subject,
        html: notif.body_html || `<p>${notif.body_text || ""}</p>`,
        text: notif.body_text || "",
      };
    } else {
      throw new Error(`Unsupported type: ${notif.type}`);
    }

    // Send
    await sendEmail(notif.to_email, template.subject, template.html, template.text);

    // Mark as sent
    await supabase
      .from("scheduled_notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        subject: template.subject,
        last_error: null,
      })
      .eq("id", notif.id);
    return true;
  } catch (e: any) {
    await supabase
      .from("scheduled_notifications")
      .update({
        status: notif.attempt_count >= 3 ? "failed" : "pending",
        last_error: e?.message || String(e),
      })
      .eq("id", notif.id);
    return false;
  }
}

// ============================================================
// Main handler
// ============================================================
// @ts-ignore - Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // If specific notification IDs were requested, process those; otherwise process all due
  let query = supabase
    .from("scheduled_notifications")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (body.notification_id) {
    query = supabase.from("scheduled_notifications").select("*").eq("id", body.notification_id).limit(1);
  } else if (body.call_id) {
    query = supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("call_id", body.call_id)
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true });
  }

  const { data: pending, error } = await query;
  if (error) return json(500, { error: error.message });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const notif of pending || []) {
    const ok = await processNotification(supabase, notif);
    if (ok) sent++;
    else {
      // Check status after processing
      const { data: updated } = await supabase
        .from("scheduled_notifications")
        .select("status")
        .eq("id", notif.id)
        .single();
      if (updated?.status === "skipped") skipped++;
      else failed++;
    }
  }

  return json(200, {
    processed: pending?.length || 0,
    sent,
    failed,
    skipped,
  });
});

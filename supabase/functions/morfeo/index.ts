import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Config ---
const MORFEO_API_KEY = Deno.env.get('MORFEO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-morfeo-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function success(data: unknown) {
  return json({ success: true, data })
}

function error(message: string, status = 400) {
  return json({ success: false, error: message }, status)
}

// --- Auth middleware ---
function authenticate(req: Request): boolean {
  const key = req.headers.get('x-morfeo-key')
  return key === MORFEO_API_KEY
}

// --- Route parser ---
function parseRoute(url: string): { segments: string[]; params: URLSearchParams } {
  const u = new URL(url)
  // Supabase Edge Functions receive the full path including /morfeo prefix
  // Remove everything up to and including the function name
  let fullPath = u.pathname
  // Remove /functions/v1/morfeo or just /morfeo prefix
  fullPath = fullPath.replace(/^(\/functions\/v1)?\/morfeo\/?/, '')
  // Also handle if Supabase sends just the subpath after function name
  fullPath = fullPath.replace(/^\/+/, '').replace(/\/+$/, '')
  const segments = fullPath ? fullPath.split('/') : []
  return { segments, params: u.searchParams }
}

// --- Supabase client (service role, bypasses RLS) ---
function getSupabase() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
}

// ============================================================
// HANDLERS
// ============================================================

// --- PROSPECTS ---

async function listProspects(params: URLSearchParams) {
  const supabase = getSupabase()
  let query = supabase
    .from('prospects')
    .select('*, profiles:advisor_id(full_name, email)')
    .order('created_at', { ascending: false })

  const stage = params.get('stage')
  const clientType = params.get('type')
  const advisorId = params.get('advisor_id')
  const search = params.get('search')
  const limit = parseInt(params.get('limit') || '50')
  const offset = parseInt(params.get('offset') || '0')

  if (stage) query = query.eq('pipeline_stage', stage)
  if (clientType) query = query.eq('client_type', clientType)
  if (advisorId) query = query.eq('advisor_id', advisorId)
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`)

  query = query.range(offset, offset + limit - 1)

  const { data, error: err, count } = await query
  if (err) return error(err.message, 500)
  return success({ prospects: data, count: data?.length || 0, limit, offset })
}

async function getProspect(id: string) {
  const supabase = getSupabase()
  const { data, error: err } = await supabase
    .from('prospects')
    .select('*, profiles:advisor_id(full_name, email)')
    .eq('id', id)
    .single()

  if (err) return error(err.message, err.code === 'PGRST116' ? 404 : 500)
  return success(data)
}

async function createProspect(body: Record<string, unknown>) {
  const supabase = getSupabase()

  // Validate required fields
  if (!body.full_name) return error('full_name es obligatorio')
  if (!body.client_type) return error('client_type es obligatorio (b2b o b2c)')
  if (!body.advisor_id) return error('advisor_id es obligatorio')

  const validClientTypes = ['b2b', 'b2c']
  if (!validClientTypes.includes(body.client_type as string)) {
    return error('client_type debe ser b2b o b2c')
  }

  const prospectData = {
    advisor_id: body.advisor_id,
    client_type: body.client_type,
    full_name: body.full_name,
    email: body.email || null,
    phone: body.phone || null,
    country: body.country || null,
    city: body.city || null,
    company_name: body.company_name || null,
    company_size: body.company_size || null,
    job_title: body.job_title || null,
    pipeline_stage: body.pipeline_stage || 'lead_nuevo',
    lead_source: body.lead_source || null,
    estimated_value: body.estimated_value || null,
    next_contact_date: body.next_contact_date || null,
    tags: body.tags || [],
  }

  const { data, error: err } = await supabase
    .from('prospects')
    .insert(prospectData)
    .select()
    .single()

  if (err) return error(err.message, 500)

  // Auto-create activity: "Prospecto creado por Morfeo"
  await supabase.from('activities').insert({
    prospect_id: data.id,
    advisor_id: body.advisor_id,
    activity_type: 'note',
    title: 'Prospecto creado por Morfeo',
    description: `Prospecto ${body.full_name} creado automaticamente por el agente Morfeo.`,
    metadata: { source: 'morfeo_api', client_type: body.client_type },
  })

  return success(data)
}

async function updateProspect(id: string, body: Record<string, unknown>) {
  const supabase = getSupabase()

  // Only allow updating specific fields
  const allowedFields = [
    'full_name', 'email', 'phone', 'country', 'city',
    'company_name', 'company_size', 'job_title',
    'pipeline_stage', 'lead_source', 'estimated_value',
    'next_contact_date', 'tags', 'client_type',
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // If stage changed, also log a stage_change activity
  const oldStage = body._old_stage as string | undefined

  const { data, error: err } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (err) return error(err.message, err.code === 'PGRST116' ? 404 : 500)

  // If pipeline_stage was updated, create stage_change activity
  if (body.pipeline_stage && oldStage && oldStage !== body.pipeline_stage) {
    await supabase.from('activities').insert({
      prospect_id: id,
      advisor_id: data.advisor_id,
      activity_type: 'stage_change',
      title: `Etapa cambiada: ${oldStage} → ${body.pipeline_stage}`,
      description: 'Cambio de etapa realizado por Morfeo.',
      metadata: {
        source: 'morfeo_api',
        from_stage: oldStage,
        to_stage: body.pipeline_stage,
      },
    })
  }

  return success(data)
}

// --- ACTIVITIES ---

async function createActivity(body: Record<string, unknown>) {
  const supabase = getSupabase()

  if (!body.prospect_id) return error('prospect_id es obligatorio')
  if (!body.advisor_id) return error('advisor_id es obligatorio')
  if (!body.activity_type) return error('activity_type es obligatorio')
  if (!body.title) return error('title es obligatorio')

  const validTypes = ['call', 'email', 'whatsapp', 'meeting', 'note', 'stage_change']
  if (!validTypes.includes(body.activity_type as string)) {
    return error(`activity_type debe ser uno de: ${validTypes.join(', ')}`)
  }

  const { data, error: err } = await supabase
    .from('activities')
    .insert({
      prospect_id: body.prospect_id,
      advisor_id: body.advisor_id,
      activity_type: body.activity_type,
      title: body.title,
      description: body.description || null,
      metadata: body.metadata || {},
    })
    .select()
    .single()

  if (err) return error(err.message, 500)
  return success(data)
}

async function getProspectActivities(prospectId: string, params: URLSearchParams) {
  const supabase = getSupabase()
  const limit = parseInt(params.get('limit') || '50')

  const { data, error: err } = await supabase
    .from('activities')
    .select('*, profiles:advisor_id(full_name)')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (err) return error(err.message, 500)
  return success({ activities: data, count: data?.length || 0 })
}

// --- EMAILS ---

async function sendEmail(body: Record<string, unknown>) {
  const supabase = getSupabase()

  if (!body.to_email) return error('to_email es obligatorio')
  if (!body.subject) return error('subject es obligatorio')
  if (!body.html_body) return error('html_body es obligatorio')

  // Send via Resend
  let resendId: string | null = null
  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MAAT CRM <hola@somosmaat.org>',
        to: [body.to_email],
        subject: body.subject,
        html: body.html_body,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      return error(`Error de Resend: ${resendData?.message || 'Error enviando email'}`, 502)
    }

    resendId = resendData?.id || null
  } catch (e) {
    return error(`Error enviando email: ${(e as Error).message}`, 502)
  }

  // Record in sent_emails
  const emailRecord: Record<string, unknown> = {
    subject: body.subject,
    to_email: body.to_email,
    status: 'sent',
    sent_at: new Date().toISOString(),
    prospect_id: body.prospect_id || null,
    advisor_id: body.advisor_id || null,
    template_id: body.template_id || null,
  }

  const { data: sentEmail, error: dbErr } = await supabase
    .from('sent_emails')
    .insert(emailRecord)
    .select()
    .single()

  if (dbErr) {
    console.error('Error registrando email en DB:', dbErr)
  }

  // Create activity
  if (body.prospect_id && body.advisor_id) {
    await supabase.from('activities').insert({
      prospect_id: body.prospect_id,
      advisor_id: body.advisor_id,
      activity_type: 'email',
      title: `Email enviado: ${body.subject}`,
      description: `Email enviado a ${body.to_email} por Morfeo.`,
      metadata: {
        source: 'morfeo_api',
        resend_id: resendId,
        template_id: body.template_id || null,
      },
    })
  }

  return success({
    email_id: sentEmail?.id || null,
    resend_id: resendId,
    status: 'sent',
  })
}

async function listEmails(params: URLSearchParams) {
  const supabase = getSupabase()
  const limit = parseInt(params.get('limit') || '50')
  const offset = parseInt(params.get('offset') || '0')
  const prospectId = params.get('prospect_id')

  let query = supabase
    .from('sent_emails')
    .select('*, prospects:prospect_id(full_name, email), profiles:advisor_id(full_name), email_templates:template_id(name)')
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (prospectId) query = query.eq('prospect_id', prospectId)

  const { data, error: err } = await query
  if (err) return error(err.message, 500)
  return success({ emails: data, count: data?.length || 0, limit, offset })
}

// --- PIPELINE SUMMARY ---

async function pipelineSummary() {
  const supabase = getSupabase()

  // Get all stages
  const { data: stages, error: stagesErr } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('order_index')

  if (stagesErr) return error(stagesErr.message, 500)

  // Get prospect counts grouped by stage and type
  const { data: prospects, error: prospectsErr } = await supabase
    .from('prospects')
    .select('pipeline_stage, client_type')

  if (prospectsErr) return error(prospectsErr.message, 500)

  // Build summary
  const counts: Record<string, Record<string, number>> = {}
  for (const p of prospects || []) {
    const key = `${p.client_type}:${p.pipeline_stage}`
    if (!counts[key]) counts[key] = { count: 0 }
    counts[key].count++
  }

  const b2cStages = (stages || []).filter(s => s.client_type === 'b2c')
  const b2bStages = (stages || []).filter(s => s.client_type === 'b2b')

  const buildPipeline = (stageList: typeof stages, type: string) =>
    (stageList || []).map(s => ({
      stage: s.slug,
      name: s.name,
      color: s.color,
      order: s.order_index,
      count: counts[`${type}:${s.slug}`]?.count || 0,
    }))

  const totalB2C = prospects?.filter(p => p.client_type === 'b2c').length || 0
  const totalB2B = prospects?.filter(p => p.client_type === 'b2b').length || 0

  return success({
    b2c: { stages: buildPipeline(b2cStages, 'b2c'), total: totalB2C },
    b2b: { stages: buildPipeline(b2bStages, 'b2b'), total: totalB2B },
    total: (prospects || []).length,
  })
}

// --- STATS ---

async function getStats() {
  const supabase = getSupabase()

  const { data: prospects } = await supabase.from('prospects').select('*')
  const { data: activities } = await supabase.from('activities').select('id, created_at')
  const { data: emails } = await supabase.from('sent_emails').select('id, sent_at')

  const all = prospects || []
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const wonStages = ['cliente_activo', 'onboarding', 'cierre']
  const active = all.filter(p => p.pipeline_stage !== 'perdido')
  const won = all.filter(p => wonStages.includes(p.pipeline_stage))
  const lost = all.filter(p => p.pipeline_stage === 'perdido')
  const newThisWeek = all.filter(p => new Date(p.created_at) >= weekAgo)
  const newThisMonth = all.filter(p => new Date(p.created_at) >= monthAgo)

  const conversionRate = all.length > 0 ? Math.round((won.length / all.length) * 100) : 0

  const pipelineValue = active.reduce((sum, p) => sum + (parseFloat(p.estimated_value) || 0), 0)

  const avgLeadScore = active.length > 0
    ? Math.round(active.reduce((sum, p) => sum + (p.lead_score || 0), 0) / active.length)
    : 0

  const overdueContacts = all.filter(p =>
    p.next_contact_date && new Date(p.next_contact_date) < now && p.pipeline_stage !== 'perdido'
  ).length

  const activitiesThisWeek = (activities || []).filter(a => new Date(a.created_at) >= weekAgo).length
  const emailsThisWeek = (emails || []).filter(e => new Date(e.sent_at) >= weekAgo).length

  return success({
    total_prospects: all.length,
    active_prospects: active.length,
    won_prospects: won.length,
    lost_prospects: lost.length,
    new_this_week: newThisWeek.length,
    new_this_month: newThisMonth.length,
    conversion_rate: conversionRate,
    pipeline_value: pipelineValue,
    avg_lead_score: avgLeadScore,
    overdue_contacts: overdueContacts,
    activities_this_week: activitiesThisWeek,
    emails_this_week: emailsThisWeek,
    by_client_type: {
      b2c: all.filter(p => p.client_type === 'b2c').length,
      b2b: all.filter(p => p.client_type === 'b2b').length,
    },
  })
}

// ============================================================
// ROUTER
// ============================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth check
  if (!authenticate(req)) {
    return error('Unauthorized — X-Morfeo-Key invalida o faltante', 401)
  }

  // Validate Supabase config
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return error('Configuracion de Supabase incompleta', 500)
  }

  const { segments, params } = parseRoute(req.url)
  const method = req.method

  try {
    // --- PROSPECTS ---
    // GET /morfeo/prospects
    if (method === 'GET' && segments[0] === 'prospects' && !segments[1]) {
      return await listProspects(params)
    }

    // GET /morfeo/prospects/:id/activities
    if (method === 'GET' && segments[0] === 'prospects' && segments[1] && segments[2] === 'activities') {
      return await getProspectActivities(segments[1], params)
    }

    // GET /morfeo/prospects/:id
    if (method === 'GET' && segments[0] === 'prospects' && segments[1]) {
      return await getProspect(segments[1])
    }

    // POST /morfeo/prospects
    if (method === 'POST' && segments[0] === 'prospects' && !segments[1]) {
      const body = await req.json()
      return await createProspect(body)
    }

    // PUT /morfeo/prospects/:id
    if (method === 'PUT' && segments[0] === 'prospects' && segments[1]) {
      const body = await req.json()
      return await updateProspect(segments[1], body)
    }

    // --- ACTIVITIES ---
    // POST /morfeo/activities
    if (method === 'POST' && segments[0] === 'activities' && !segments[1]) {
      const body = await req.json()
      return await createActivity(body)
    }

    // --- EMAILS ---
    // POST /morfeo/emails/send
    if (method === 'POST' && segments[0] === 'emails' && segments[1] === 'send') {
      const body = await req.json()
      return await sendEmail(body)
    }

    // GET /morfeo/emails
    if (method === 'GET' && segments[0] === 'emails' && !segments[1]) {
      return await listEmails(params)
    }

    // --- PIPELINE ---
    // GET /morfeo/pipeline/summary
    if (method === 'GET' && segments[0] === 'pipeline' && segments[1] === 'summary') {
      return await pipelineSummary()
    }

    // --- STATS ---
    // GET /morfeo/stats
    if (method === 'GET' && segments[0] === 'stats') {
      return await getStats()
    }

    // --- HEALTH ---
    // GET /morfeo/ or /morfeo/health
    if (method === 'GET' && (segments.length === 0 || segments[0] === 'health')) {
      return success({
        status: 'ok',
        service: 'MAAT CRM — Morfeo API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET    /morfeo/prospects',
          'GET    /morfeo/prospects/:id',
          'POST   /morfeo/prospects',
          'PUT    /morfeo/prospects/:id',
          'POST   /morfeo/activities',
          'GET    /morfeo/prospects/:id/activities',
          'POST   /morfeo/emails/send',
          'GET    /morfeo/emails',
          'GET    /morfeo/pipeline/summary',
          'GET    /morfeo/stats',
        ],
      })
    }

    return error(`Ruta no encontrada: ${method} /morfeo/${segments.join('/')}`, 404)
  } catch (e) {
    console.error('Morfeo API error:', e)
    return error(`Error interno: ${(e as Error).message}`, 500)
  }
})

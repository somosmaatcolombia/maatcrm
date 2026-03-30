import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
function success(data: unknown) { return json({ success: true, data }) }
function error(message: string, status = 400) { return json({ success: false, error: message }, status) }
function getSupabase() { return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) }

function parseRoute(url: string) {
  const u = new URL(url)
  const fullPath = u.pathname.replace(/^(\/functions\/v1)?\/morfeo-activities\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '')
  return { segments: fullPath ? fullPath.split('/') : [], params: u.searchParams }
}

// ============================================================
// HANDLERS
// ============================================================

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
  const { data: sentEmail, error: dbErr } = await supabase
    .from('sent_emails')
    .insert({
      subject: body.subject,
      to_email: body.to_email,
      status: 'sent',
      sent_at: new Date().toISOString(),
      prospect_id: body.prospect_id || null,
      advisor_id: body.advisor_id || null,
      template_id: body.template_id || null,
    })
    .select()
    .single()

  if (dbErr) console.error('Error registrando email en DB:', dbErr)

  // Create activity
  if (body.prospect_id && body.advisor_id) {
    await supabase.from('activities').insert({
      prospect_id: body.prospect_id,
      advisor_id: body.advisor_id,
      activity_type: 'email',
      title: `Email enviado: ${body.subject}`,
      description: `Email enviado a ${body.to_email} por Morfeo.`,
      metadata: { source: 'morfeo_api', resend_id: resendId, template_id: body.template_id || null },
    })
  }

  return success({ email_id: sentEmail?.id || null, resend_id: resendId, status: 'sent' })
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

// ============================================================
// ROUTER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.headers.get('x-morfeo-key') !== MORFEO_API_KEY) {
    return error('Unauthorized — X-Morfeo-Key invalida o faltante', 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return error('Configuracion de Supabase incompleta', 500)
  }

  const { segments, params } = parseRoute(req.url)
  const method = req.method

  try {
    // POST /morfeo-activities — crear actividad
    if (method === 'POST' && segments.length === 0) {
      const body = await req.json()
      return await createActivity(body)
    }

    // GET /morfeo-activities/prospect/:id — timeline de un prospecto
    if (method === 'GET' && segments[0] === 'prospect' && segments[1]) {
      return await getProspectActivities(segments[1], params)
    }

    // POST /morfeo-activities/emails/send — enviar email
    if (method === 'POST' && segments[0] === 'emails' && segments[1] === 'send') {
      const body = await req.json()
      return await sendEmail(body)
    }

    // GET /morfeo-activities/emails — historial de emails
    if (method === 'GET' && segments[0] === 'emails') {
      return await listEmails(params)
    }

    return error(`Ruta no encontrada: ${method} /morfeo-activities/${segments.join('/')}`, 404)
  } catch (e) {
    console.error('Morfeo Activities error:', e)
    return error(`Error interno: ${(e as Error).message}`, 500)
  }
})

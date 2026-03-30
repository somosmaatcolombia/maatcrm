import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MORFEO_API_KEY = Deno.env.get('MORFEO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
  const fullPath = u.pathname.replace(/^(\/functions\/v1)?\/morfeo-prospects\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '')
  return { segments: fullPath ? fullPath.split('/') : [], params: u.searchParams }
}

// ============================================================
// HANDLERS
// ============================================================

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

  const { data, error: err } = await query
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

  // Auto-create activity
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

  const oldStage = body._old_stage as string | undefined

  const { data, error: err } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (err) return error(err.message, err.code === 'PGRST116' ? 404 : 500)

  // Log stage change
  if (body.pipeline_stage && oldStage && oldStage !== body.pipeline_stage) {
    await supabase.from('activities').insert({
      prospect_id: id,
      advisor_id: data.advisor_id,
      activity_type: 'stage_change',
      title: `Etapa cambiada: ${oldStage} → ${body.pipeline_stage}`,
      description: 'Cambio de etapa realizado por Morfeo.',
      metadata: { source: 'morfeo_api', from_stage: oldStage, to_stage: body.pipeline_stage },
    })
  }

  return success(data)
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
    // GET /morfeo-prospects
    if (method === 'GET' && segments.length === 0) {
      return await listProspects(params)
    }

    // GET /morfeo-prospects/:id
    if (method === 'GET' && segments.length === 1) {
      return await getProspect(segments[0])
    }

    // POST /morfeo-prospects
    if (method === 'POST' && segments.length === 0) {
      const body = await req.json()
      return await createProspect(body)
    }

    // PUT /morfeo-prospects/:id
    if (method === 'PUT' && segments.length === 1) {
      const body = await req.json()
      return await updateProspect(segments[0], body)
    }

    return error(`Ruta no encontrada: ${method} /morfeo-prospects/${segments.join('/')}`, 404)
  } catch (e) {
    console.error('Morfeo Prospects error:', e)
    return error(`Error interno: ${(e as Error).message}`, 500)
  }
})

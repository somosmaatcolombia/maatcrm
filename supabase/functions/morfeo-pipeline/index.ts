import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MORFEO_API_KEY = Deno.env.get('MORFEO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-morfeo-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  const fullPath = u.pathname.replace(/^(\/functions\/v1)?\/morfeo-pipeline\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '')
  return { segments: fullPath ? fullPath.split('/') : [], params: u.searchParams }
}

// ============================================================
// HANDLERS
// ============================================================

async function pipelineSummary() {
  const supabase = getSupabase()

  const { data: stages, error: stagesErr } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('order_index')

  if (stagesErr) return error(stagesErr.message, 500)

  const { data: prospects, error: prospectsErr } = await supabase
    .from('prospects')
    .select('pipeline_stage, client_type')

  if (prospectsErr) return error(prospectsErr.message, 500)

  const counts: Record<string, number> = {}
  for (const p of prospects || []) {
    const key = `${p.client_type}:${p.pipeline_stage}`
    counts[key] = (counts[key] || 0) + 1
  }

  const buildPipeline = (stageList: typeof stages, type: string) =>
    (stageList || []).map(s => ({
      stage: s.slug,
      name: s.name,
      color: s.color,
      order: s.order_index,
      count: counts[`${type}:${s.slug}`] || 0,
    }))

  const b2cStages = (stages || []).filter(s => s.client_type === 'b2c')
  const b2bStages = (stages || []).filter(s => s.client_type === 'b2b')

  return success({
    b2c: {
      stages: buildPipeline(b2cStages, 'b2c'),
      total: prospects?.filter(p => p.client_type === 'b2c').length || 0,
    },
    b2b: {
      stages: buildPipeline(b2bStages, 'b2b'),
      total: prospects?.filter(p => p.client_type === 'b2b').length || 0,
    },
    total: (prospects || []).length,
  })
}

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
    activities_this_week: (activities || []).filter(a => new Date(a.created_at) >= weekAgo).length,
    emails_this_week: (emails || []).filter(e => new Date(e.sent_at) >= weekAgo).length,
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.headers.get('x-morfeo-key') !== MORFEO_API_KEY) {
    return error('Unauthorized — X-Morfeo-Key invalida o faltante', 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return error('Configuracion de Supabase incompleta', 500)
  }

  const { segments } = parseRoute(req.url)
  const method = req.method

  try {
    // GET /morfeo-pipeline — resumen del pipeline
    if (method === 'GET' && (segments.length === 0 || segments[0] === 'summary')) {
      return await pipelineSummary()
    }

    // GET /morfeo-pipeline/stats — metricas generales
    if (method === 'GET' && segments[0] === 'stats') {
      return await getStats()
    }

    return error(`Ruta no encontrada: ${method} /morfeo-pipeline/${segments.join('/')}`, 404)
  } catch (e) {
    console.error('Morfeo Pipeline error:', e)
    return error(`Error interno: ${(e as Error).message}`, 500)
  }
})

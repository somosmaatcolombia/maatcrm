import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { startOfWeek, isAfter, parseISO } from 'date-fns'

const WON_STAGES = ['cliente_activo', 'onboarding', 'cierre']
const LOST_STAGES = ['perdido']

export function useMetrics() {
  const { profile, isAdmin } = useAuthContext()
  const [metrics, setMetrics] = useState({
    totalProspects: 0,
    activeProspects: 0,
    newThisWeek: 0,
    conversionRate: 0,
    avgLeadScore: 0,
    pipelineValue: 0,
    overdueContacts: 0,
    activitiesThisWeek: 0,
    byStage: {},
    byClientType: { b2b: 0, b2c: 0 },
    bySource: {},
    funnelData: [],
    upcomingContacts: [],
    advisorPerformance: [],
    monthlyProjection: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch prospects
      let prospectsQuery = supabase
        .from('prospects')
        .select('*, profiles:advisor_id(full_name)')

      if (!isAdmin) {
        prospectsQuery = prospectsQuery.eq('advisor_id', profile.id)
      }

      const { data: prospects, error: prospectsError } = await prospectsQuery
      if (prospectsError) throw prospectsError

      // Fetch activities
      let activitiesQuery = supabase
        .from('activities')
        .select('id, advisor_id, created_at, activity_type')

      if (!isAdmin) {
        activitiesQuery = activitiesQuery.eq('advisor_id', profile.id)
      }

      const { data: activities, error: activitiesError } = await activitiesQuery
      if (activitiesError) throw activitiesError

      // Fetch pipeline stages for funnel ordering
      const { data: stagesData } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order_index', { ascending: true })

      const allProspects = prospects || []
      const allActivities = activities || []
      const allStages = stagesData || []

      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // ---- Basic metrics ----
      const totalProspects = allProspects.length
      const activeProspects = allProspects.filter(
        (p) => !LOST_STAGES.includes(p.pipeline_stage)
      ).length

      const newThisWeek = allProspects.filter((p) => {
        const created = parseISO(p.created_at)
        return isAfter(created, weekStart)
      }).length

      const wonCount = allProspects.filter((p) =>
        WON_STAGES.includes(p.pipeline_stage)
      ).length
      const conversionRate =
        totalProspects > 0 ? Math.round((wonCount / totalProspects) * 100) : 0

      let totalScore = 0
      let pipelineValue = 0
      allProspects.forEach((p) => {
        totalScore += p.lead_score || 0
        if (!LOST_STAGES.includes(p.pipeline_stage) && !WON_STAGES.includes(p.pipeline_stage)) {
          pipelineValue += p.estimated_value || 0
        }
      })
      const avgLeadScore =
        totalProspects > 0 ? Math.round(totalScore / totalProspects) : 0

      // Overdue contacts
      const overdueContacts = allProspects.filter((p) => {
        if (!p.next_contact_date || LOST_STAGES.includes(p.pipeline_stage) || WON_STAGES.includes(p.pipeline_stage)) return false
        const d = parseISO(p.next_contact_date)
        return d < today
      }).length

      // Activities this week
      const activitiesThisWeek = allActivities.filter((a) => {
        const created = parseISO(a.created_at)
        return isAfter(created, weekStart)
      }).length

      // ---- By stage ----
      const byStage = {}
      allProspects.forEach((p) => {
        byStage[p.pipeline_stage] = (byStage[p.pipeline_stage] || 0) + 1
      })

      // ---- By client type ----
      const byClientType = { b2b: 0, b2c: 0 }
      allProspects.forEach((p) => {
        byClientType[p.client_type] = (byClientType[p.client_type] || 0) + 1
      })

      // ---- By source ----
      const bySource = {}
      allProspects.forEach((p) => {
        const src = p.lead_source || 'Sin fuente'
        bySource[src] = (bySource[src] || 0) + 1
      })

      // ---- Funnel data (B2C + B2B combined, by stage order) ----
      // Build funnel using unique stage names collapsed across types
      const stageOrder = []
      const stageMap = {}
      allStages.forEach((s) => {
        if (!stageMap[s.slug]) {
          stageMap[s.slug] = { name: s.name, slug: s.slug, color: s.color, count: 0 }
          stageOrder.push(s.slug)
        }
      })
      allProspects.forEach((p) => {
        if (stageMap[p.pipeline_stage]) {
          stageMap[p.pipeline_stage].count += 1
        }
      })
      // Deduplicate by keeping unique order (B2C stages map first)
      const seenNames = new Set()
      const funnelData = []
      stageOrder.forEach((slug) => {
        const s = stageMap[slug]
        if (!seenNames.has(s.name)) {
          // Sum counts for same-name stages across B2B/B2C
          const totalCount = stageOrder
            .filter((sl) => stageMap[sl].name === s.name)
            .reduce((sum, sl) => sum + stageMap[sl].count, 0)
          funnelData.push({ name: s.name, value: totalCount, color: s.color })
          seenNames.add(s.name)
        }
      })

      // ---- Upcoming contacts (next 7 days) ----
      const sevenDaysFromNow = new Date(today)
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const upcomingContacts = allProspects
        .filter((p) => {
          if (!p.next_contact_date) return false
          if (LOST_STAGES.includes(p.pipeline_stage)) return false
          const d = parseISO(p.next_contact_date)
          return d >= today && d <= sevenDaysFromNow
        })
        .sort((a, b) => parseISO(a.next_contact_date) - parseISO(b.next_contact_date))
        .slice(0, 10)

      // Also include overdue at the top
      const overdueList = allProspects
        .filter((p) => {
          if (!p.next_contact_date) return false
          if (LOST_STAGES.includes(p.pipeline_stage) || WON_STAGES.includes(p.pipeline_stage)) return false
          return parseISO(p.next_contact_date) < today
        })
        .sort((a, b) => parseISO(a.next_contact_date) - parseISO(b.next_contact_date))
        .slice(0, 5)

      const contactsList = [...overdueList, ...upcomingContacts].slice(0, 10)

      // ---- Advisor performance (admin only) ----
      let advisorPerformance = []
      if (isAdmin) {
        const advisorMap = {}
        allProspects.forEach((p) => {
          const advisorId = p.advisor_id
          if (!advisorMap[advisorId]) {
            advisorMap[advisorId] = {
              id: advisorId,
              name: p.profiles?.full_name || 'Sin asignar',
              total: 0,
              won: 0,
              lost: 0,
              active: 0,
              pipelineValue: 0,
              activitiesCount: 0,
            }
          }
          const a = advisorMap[advisorId]
          a.total += 1
          if (WON_STAGES.includes(p.pipeline_stage)) a.won += 1
          else if (LOST_STAGES.includes(p.pipeline_stage)) a.lost += 1
          else {
            a.active += 1
            a.pipelineValue += p.estimated_value || 0
          }
        })

        // Count activities per advisor
        allActivities.forEach((act) => {
          if (advisorMap[act.advisor_id]) {
            advisorMap[act.advisor_id].activitiesCount += 1
          }
        })

        advisorPerformance = Object.values(advisorMap)
          .map((a) => ({
            ...a,
            conversionRate: a.total > 0 ? Math.round((a.won / a.total) * 100) : 0,
          }))
          .sort((a, b) => b.won - a.won)
      }

      // ---- Monthly projection (last 6 months of closed deals) ----
      const monthlyProjection = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)

        const wonInMonth = allProspects.filter((p) => {
          if (!WON_STAGES.includes(p.pipeline_stage)) return false
          const updated = parseISO(p.updated_at)
          return updated >= monthStart && updated <= monthEnd
        })

        const value = wonInMonth.reduce((sum, p) => sum + (p.estimated_value || 0), 0)
        const count = wonInMonth.length

        monthlyProjection.push({
          month: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
          value,
          count,
        })
      }

      setMetrics({
        totalProspects,
        activeProspects,
        newThisWeek,
        conversionRate,
        avgLeadScore,
        pipelineValue,
        overdueContacts,
        activitiesThisWeek,
        byStage,
        byClientType,
        bySource,
        funnelData,
        upcomingContacts: contactsList,
        advisorPerformance,
        monthlyProjection,
      })
    } catch {
      // Error handled silently — metrics will show defaults
    } finally {
      setLoading(false)
    }
  }, [profile?.id, isAdmin])

  useEffect(() => {
    if (profile) {
      fetchMetrics()
    }
  }, [fetchMetrics, profile])

  return { metrics, loading, refreshMetrics: fetchMetrics }
}

import { useState, useMemo } from 'react'
import { Kanban, Users } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { usePipelineContext } from '../context/PipelineContext'
import { useProspects } from '../hooks/useProspects'
import { supabase } from '../lib/supabase'
import {
  sendEmail,
  replaceTemplateVariables,
  resolveVariables,
} from '../lib/email'
import PipelineBoard from '../components/pipeline/PipelineBoard'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { showSuccess, showError } from '../components/ui/Toast'
import { ACTIVITY_TYPES } from '../lib/constants'

export default function PipelinePage() {
  const { profile } = useAuthContext()
  const { stages, loading: stagesLoading } = usePipelineContext()
  const [activeTab, setActiveTab] = useState('b2c')

  const filters = useMemo(() => ({
    clientType: activeTab,
  }), [activeTab])

  const {
    prospects,
    loading: prospectsLoading,
    updateProspect,
    fetchProspects,
  } = useProspects(filters)

  const currentStages = activeTab === 'b2b' ? stages.b2b : stages.b2c
  const loading = stagesLoading || prospectsLoading

  async function handleMoveProspect(prospect, targetStageSlug, fromStage, toStage) {
    // Optimistic update via updateProspect (updates local state immediately)
    const previousStage = prospect.pipeline_stage
    try {
      await updateProspect(prospect.id, {
        pipeline_stage: targetStageSlug,
      })

      // Record stage_change activity
      await supabase.from('activities').insert([{
        prospect_id: prospect.id,
        advisor_id: profile.id,
        activity_type: ACTIVITY_TYPES.STAGE_CHANGE,
        title: `Etapa cambiada: ${fromStage?.name || previousStage} → ${toStage.name}`,
        description: `Prospecto movido de "${fromStage?.name || previousStage}" a "${toStage.name}" en el pipeline.`,
        metadata: {
          from_stage: previousStage,
          to_stage: targetStageSlug,
          from_stage_name: fromStage?.name,
          to_stage_name: toStage.name,
        },
      }])

      showSuccess(`${prospect.full_name} → ${toStage.name}`)

      // Auto-email: if target stage has an auto_email_template_id, send it
      if (toStage.auto_email_template_id && prospect.email) {
        try {
          const { data: template, error: tplError } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', toStage.auto_email_template_id)
            .eq('active', true)
            .single()

          if (!tplError && template) {
            const variables = resolveVariables(prospect, profile?.full_name || '')
            const resolvedSubject = replaceTemplateVariables(template.subject, variables)
            const resolvedBody = replaceTemplateVariables(template.html_body, variables)

            await sendEmail({
              to: prospect.email,
              subject: resolvedSubject,
              htmlBody: resolvedBody,
              prospectId: prospect.id,
              advisorId: profile.id,
              templateId: template.id,
            })

            showSuccess(`📧 Email automático enviado a ${prospect.full_name}`)
          }
        } catch (emailErr) {
          // Don't block stage change on email failure
          showError(`Etapa actualizada, pero el email automático falló`)
        }
      }
    } catch (err) {
      // Revert on failure
      showError('Error al mover el prospecto')
      await fetchProspects()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Pipeline</h1>
          <p className="text-sm text-[#6B7280]">
            Arrastra los prospectos entre etapas para actualizar su estado
          </p>
        </div>
      </div>

      {/* Tabs B2C / B2B */}
      <div className="bg-white rounded-xl shadow-md transition-shadow duration-200 hover:shadow-lg px-4 pt-2 pb-0">
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: 'b2c', label: 'B2C — Personas', count: activeTab === 'b2c' ? prospects.length : undefined },
            { value: 'b2b', label: 'B2B — Empresas', count: activeTab === 'b2b' ? prospects.length : undefined },
          ]}
        />
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="min-w-[280px] w-[280px] shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
              </div>
              <div className="bg-gray-100/60 rounded-xl p-2 space-y-2 min-h-[200px]">
                {[1, 2].map((j) => (
                  <div key={j} className="bg-white rounded-lg border border-gray-100 p-3 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                    <div className="h-2 bg-gray-100 rounded w-1/2 ml-[22px]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : currentStages.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Pipeline no configurado"
          description="Las etapas del pipeline aún no están disponibles. Verifica la conexión con Supabase."
        />
      ) : prospects.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`Sin prospectos ${activeTab === 'b2b' ? 'B2B' : 'B2C'}`}
          description={`No hay prospectos de tipo ${activeTab === 'b2b' ? 'B2B' : 'B2C'} en el pipeline. Crea uno desde la sección de Prospectos.`}
          action={
            <Button onClick={() => window.location.href = '/prospects'}>
              Ir a Prospectos
            </Button>
          }
        />
      ) : (
        <PipelineBoard
          stages={currentStages}
          prospects={prospects}
          onMoveProspect={handleMoveProspect}
        />
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-md p-4 transition-shadow duration-200 hover:shadow-lg">
        <div className="flex items-center gap-6 flex-wrap text-[11px] text-[#6B7280]">
          <span className="font-semibold text-[#333333]">Días en etapa:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            0-3 días
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            4-7 días
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            +7 días
          </div>
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-semibold text-[#333333]">Lead Score:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#6B7280] rounded-full" />
            0-39
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#F59E0B] rounded-full" />
            40-69
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#10B981] rounded-full" />
            70-100
          </div>
        </div>
      </div>
    </div>
  )
}

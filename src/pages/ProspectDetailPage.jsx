import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
  Send,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { usePipelineContext } from '../context/PipelineContext'
import { useAdvisors } from '../hooks/useAdvisors'
import { useActivities } from '../hooks/useActivities'
import ProspectForm from '../components/prospects/ProspectForm'
import ActivityTimeline from '../components/activities/ActivityTimeline'
import ActivityForm from '../components/activities/ActivityForm'
import EmailComposer from '../components/emails/EmailComposer'
import WhatsAppPicker from '../components/prospects/WhatsAppPicker'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { showSuccess, showError } from '../components/ui/Toast'
import {
  formatDate,
  formatRelativeDate,
  formatCurrency,
  getInitials,
  isOverdue,
} from '../lib/utils'

export default function ProspectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuthContext()
  const { stages } = usePipelineContext()
  const { advisors } = useAdvisors()

  const {
    activities,
    loading: activitiesLoading,
    createActivity,
  } = useActivities(id)

  const [prospect, setProspect] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activitySubmitting, setActivitySubmitting] = useState(false)

  useEffect(() => {
    fetchProspect()
  }, [id])

  async function fetchProspect() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prospects')
        .select('*, profiles:advisor_id(full_name, email)')
        .eq('id', id)
        .single()

      if (error) throw error
      setProspect(data)
    } catch (err) {
      showError('No se pudo cargar el prospecto')
      navigate('/prospects')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(data) {
    setSubmitting(true)
    try {
      const { data: updated, error } = await supabase
        .from('prospects')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, profiles:advisor_id(full_name, email)')
        .single()

      if (error) throw error
      setProspect(updated)
      setEditModal(false)
      showSuccess('Prospecto actualizado correctamente')
    } catch (err) {
      showError(err.message || 'Error al actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    try {
      const { error } = await supabase.from('prospects').delete().eq('id', id)
      if (error) throw error
      showSuccess('Prospecto eliminado')
      navigate('/prospects')
    } catch (err) {
      showError(err.message || 'Error al eliminar')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 bg-gray-100 rounded w-20 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!prospect) return null

  const isB2B = prospect.client_type === 'b2b'
  const currentStages = isB2B ? stages.b2b : stages.b2c
  const currentStage = currentStages.find((s) => s.slug === prospect.pipeline_stage)

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/prospects')}
          className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#333333] transition-colors duration-200"
        >
          <ArrowLeft size={16} />
          Volver a prospectos
        </button>
        <div className="flex items-center gap-2">
          {prospect.email && (
            <Button
              onClick={() => setEmailModal(true)}
              className="bg-[#EBA055] hover:bg-[#D4883A] text-white"
            >
              <Send size={16} />
              Enviar correo
            </Button>
          )}
          <WhatsAppPicker
            phone={prospect.phone}
            prospectName={prospect.full_name}
            pipelineStage={prospect.pipeline_stage}
          />
          <Button variant="outline" onClick={() => setEditModal(true)}>
            <Pencil size={16} />
            Editar
          </Button>
          {isAdmin && (
            <Button variant="danger" size="sm" onClick={() => setDeleteDialog(true)}>
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
                  isB2B ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {getInitials(prospect.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-[#333333]">{prospect.full_name}</h2>
                  <Badge variant={prospect.client_type}>
                    {isB2B ? 'B2B' : 'B2C'}
                  </Badge>
                </div>
                {prospect.job_title && (
                  <p className="text-sm text-[#6B7280]">{prospect.job_title}</p>
                )}
                {isB2B && prospect.company_name && (
                  <p className="text-sm text-purple-600 font-medium flex items-center gap-1 mt-0.5">
                    <Building2 size={14} />
                    {prospect.company_name}
                    {prospect.company_size && (
                      <span className="text-xs text-[#6B7280] font-normal">
                        ({prospect.company_size} empleados)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Contact info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prospect.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail size={16} className="text-[#6B7280] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-medium">Email</p>
                    <a href={`mailto:${prospect.email}`} className="text-sm text-[#39A1C9] hover:underline truncate block">
                      {prospect.email}
                    </a>
                  </div>
                </div>
              )}
              {prospect.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone size={16} className="text-[#6B7280] shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-medium">Teléfono</p>
                    <p className="text-sm text-[#333333]">{prospect.phone}</p>
                  </div>
                </div>
              )}
              {(prospect.city || prospect.country) && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin size={16} className="text-[#6B7280] shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-medium">Ubicación</p>
                    <p className="text-sm text-[#333333]">
                      {[prospect.city, prospect.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {prospect.lead_source && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <ExternalLink size={16} className="text-[#6B7280] shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-medium">Fuente</p>
                    <p className="text-sm text-[#333333]">{prospect.lead_source}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activities */}
          <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
            <h3 className="text-base font-semibold text-[#333333] mb-4">
              Actividades
              {activities.length > 0 && (
                <span className="ml-2 text-xs font-medium text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
            </h3>

            {/* Activity Form */}
            <div className="mb-5">
              <ActivityForm
                onSubmit={async (data) => {
                  setActivitySubmitting(true)
                  try {
                    await createActivity(data)
                    showSuccess('Actividad registrada')
                  } catch (err) {
                    showError(err.message || 'Error al registrar actividad')
                    throw err
                  } finally {
                    setActivitySubmitting(false)
                  }
                }}
                loading={activitySubmitting}
              />
            </div>

            {/* Activity Timeline */}
            <ActivityTimeline
              activities={activities}
              loading={activitiesLoading}
            />
          </div>
        </div>

        {/* Sidebar cards */}
        <div className="space-y-6">
          {/* Pipeline stage */}
          <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
            <h3 className="text-xs uppercase tracking-wider text-[#6B7280] font-semibold mb-3">
              Etapa actual
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: currentStage?.color || '#6B7280' }}
              />
              <span className="text-sm font-semibold text-[#333333]">
                {currentStage?.name || prospect.pipeline_stage}
              </span>
            </div>
            {/* Pipeline progress */}
            <div className="space-y-1.5">
              {currentStages.map((stage) => (
                <div key={stage.slug} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      stage.order_index <= (currentStage?.order_index || 0)
                        ? ''
                        : 'opacity-30'
                    }`}
                    style={{ backgroundColor: stage.color }}
                  />
                  <span
                    className={`text-xs ${
                      stage.slug === prospect.pipeline_stage
                        ? 'text-[#333333] font-semibold'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {stage.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Score + Value */}
          <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
            <h3 className="text-xs uppercase tracking-wider text-[#6B7280] font-semibold mb-3">
              Métricas
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#6B7280]">Lead Score</span>
                  <span className="text-sm font-bold text-[#333333]">{prospect.lead_score}/100</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${prospect.lead_score || 0}%`,
                      backgroundColor:
                        prospect.lead_score >= 70 ? '#10B981' :
                        prospect.lead_score >= 40 ? '#F59E0B' : '#6B7280',
                    }}
                  />
                </div>
              </div>
              {prospect.estimated_value != null && (
                <div>
                  <span className="text-xs text-[#6B7280]">Valor estimado</span>
                  <p className="text-lg font-bold text-[#333333]">
                    {formatCurrency(prospect.estimated_value)}
                  </p>
                </div>
              )}
              {prospect.next_contact_date && (
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  isOverdue(prospect.next_contact_date)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-100'
                }`}>
                  <Calendar size={14} className={`shrink-0 ${
                    isOverdue(prospect.next_contact_date) ? 'text-red-600' : 'text-amber-600'
                  }`} />
                  <div>
                    <p className={`text-[10px] font-medium ${
                      isOverdue(prospect.next_contact_date) ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {isOverdue(prospect.next_contact_date) ? '⚠ Contacto vencido' : 'Próximo contacto'}
                    </p>
                    <p className={`text-xs font-semibold ${
                      isOverdue(prospect.next_contact_date) ? 'text-red-900' : 'text-amber-900'
                    }`}>
                      {formatDate(prospect.next_contact_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advisor info */}
          {prospect.profiles && (
            <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
              <h3 className="text-xs uppercase tracking-wider text-[#6B7280] font-semibold mb-3">
                Asesor asignado
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#39A1C9] flex items-center justify-center text-white text-sm font-bold">
                  {getInitials(prospect.profiles.full_name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#333333]">{prospect.profiles.full_name}</p>
                  <p className="text-xs text-[#6B7280]">{prospect.profiles.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
            <h3 className="text-xs uppercase tracking-wider text-[#6B7280] font-semibold mb-3">
              Fechas
            </h3>
            <div className="space-y-2 text-xs text-[#6B7280]">
              <div className="flex justify-between">
                <span>Creado</span>
                <span className="text-[#333333] font-medium">
                  {formatRelativeDate(prospect.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Actualizado</span>
                <span className="text-[#333333] font-medium">
                  {formatRelativeDate(prospect.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Editar prospecto"
        size="lg"
      >
        <ProspectForm
          prospect={prospect}
          advisors={advisors}
          onSubmit={handleUpdate}
          onCancel={() => setEditModal(false)}
          loading={submitting}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Eliminar prospecto"
        message={`¿Eliminar a "${prospect.full_name}"? Esta acción no se puede deshacer.`}
        loading={submitting}
      />

      {/* Email Composer Modal */}
      <Modal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        title={`Enviar correo a ${prospect.full_name}`}
        size="xl"
      >
        <EmailComposer
          prospect={prospect}
          onClose={() => setEmailModal(false)}
          onSent={() => {
            fetchProspect()
          }}
        />
      </Modal>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Phone,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  UserX,
  Filter,
  Plus,
  Search,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Award,
  Target,
  AlertCircle,
  Mail,
  MessageCircle,
  Video,
  FileText,
  ChevronRight,
  Edit3,
  Trash2,
  Copy,
  CheckCheck,
} from 'lucide-react'
import { useDiscoveryCalls } from '../hooks/useDiscoveryCalls'
import { useAdvisors } from '../hooks/useAdvisors'
import { useAuthContext } from '../context/AuthContext'
import { useProspects } from '../hooks/useProspects'
import { supabase } from '../lib/supabase'
import { formatDate, formatRelativeDate, getWhatsAppLink } from '../lib/utils'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Agendada' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Completada' },
  no_show: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'No asistió' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Cancelada' },
  rescheduled: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Reagendada' },
}

const OUTCOME_STYLES = {
  won: { label: 'Cerró 🎉', color: '#10B981' },
  proposal_sent: { label: 'Propuesta enviada', color: '#3B82F6' },
  follow_up_needed: { label: 'Requiere follow-up', color: '#F59E0B' },
  not_a_fit: { label: 'No es fit', color: '#6B7280' },
  disqualified: { label: 'Descalificado', color: '#EF4444' },
  lost: { label: 'Perdido', color: '#EF4444' },
}

const QUAL_STATUS_STYLES = {
  qualified: { bg: 'bg-green-50', text: 'text-green-700', label: 'Calificado' },
  borderline: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Borderline' },
  disqualified: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Descalificado' },
  booked: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Agendada' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Pendiente' },
  expired: { bg: 'bg-red-50', text: 'text-red-700', label: 'Expirada' },
}

function scoreColor(score) {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#3B82F6'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

export default function DiscoveryCallsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin, profile } = useAuthContext()
  const { calls, qualifications, loading, stats, createCall, updateCall, deleteCall, fetchQualifications, fetchCalls } = useDiscoveryCalls()
  const { activeAdvisors } = useAdvisors()
  const { prospects } = useProspects()

  const [activeTab, setActiveTab] = useState('upcoming')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleFromQual, setScheduleFromQual] = useState(null) // pre-fill from qualification
  const [scheduleFromProspect, setScheduleFromProspect] = useState(null) // pre-fill from prospect
  const [detailCall, setDetailCall] = useState(null)
  const [detailQual, setDetailQual] = useState(null)

  const now = new Date()

  const upcomingCalls = useMemo(
    () => calls.filter((c) => c.status === 'scheduled' && new Date(c.scheduled_at) >= now),
    [calls]
  )
  const pastCalls = useMemo(
    () => calls.filter((c) => c.status !== 'scheduled' || new Date(c.scheduled_at) < now),
    [calls]
  )
  const filteredCalls = useMemo(() => {
    const base = activeTab === 'upcoming' ? upcomingCalls : activeTab === 'past' ? pastCalls : calls
    return base.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const fullName = c.prospect?.full_name || c.qualification?.full_name || ''
        const email = c.prospect?.email || c.qualification?.email || ''
        if (!fullName.toLowerCase().includes(q) && !email.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [activeTab, calls, upcomingCalls, pastCalls, statusFilter, search])

  const filteredQualifications = useMemo(() => {
    return qualifications.filter((q) => {
      // Hide booked + expired by default in this tab (they show up under calls)
      if (q.status === 'booked' || q.status === 'expired') return false
      if (search) {
        const s = search.toLowerCase()
        if (!(q.full_name || '').toLowerCase().includes(s) && !(q.email || '').toLowerCase().includes(s)) {
          return false
        }
      }
      return true
    })
  }, [qualifications, search])

  function openSchedule(qual = null, prospect = null) {
    setScheduleFromQual(qual)
    setScheduleFromProspect(prospect)
    setShowSchedule(true)
  }

  // Handle ?prospect=<id> from prospect detail page
  useEffect(() => {
    const prospectId = searchParams.get('prospect')
    if (prospectId && prospects.length > 0) {
      const p = prospects.find((pp) => pp.id === prospectId)
      if (p) {
        openSchedule(null, p)
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, prospects, setSearchParams])

  async function handleStatusUpdate(callId, status, outcome = null, notes = null) {
    try {
      const updates = { status }
      if (outcome) updates.outcome = outcome
      if (notes !== null) updates.call_notes = notes
      await updateCall(callId, updates)
      toast.success('Llamada actualizada')
      setDetailCall(null)
    } catch (e) {
      toast.error(e.message || 'Error al actualizar')
    }
  }

  const tabs = [
    { value: 'upcoming', label: `Próximas (${upcomingCalls.length})` },
    { value: 'past', label: `Pasadas (${pastCalls.length})` },
    { value: 'qualifications', label: `Calificaciones (${filteredQualifications.length})` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333] flex items-center gap-2">
            <Phone size={24} className="text-[#39A1C9]" />
            Llamadas de Descubrimiento
          </h1>
          <p className="text-sm text-[#6B7280]">
            Gestiona el agendamiento, calificación y seguimiento de tus discovery calls
          </p>
        </div>
        <Button onClick={() => openSchedule()}>
          <Plus size={16} /> Agendar llamada
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Calendar} label="Próximas" value={stats.upcoming} color="#3B82F6" />
        <StatCard icon={CheckCircle2} label="Completadas" value={stats.completed} color="#10B981" />
        <StatCard icon={UserX} label="No asistieron" value={stats.noShow} color="#F59E0B" />
        <StatCard icon={Target} label="Conversión" value={`${stats.conversionRate}%`} color="#89608E" tooltip="Cerradas / Completadas" />
        <StatCard icon={Award} label="Calificados sin agendar" value={stats.qualifiedNotBooked} color="#EBA055" />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 text-sm"
            />
          </div>
        </div>

        {activeTab !== 'qualifications' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="scheduled">Agendada</option>
            <option value="completed">Completada</option>
            <option value="no_show">No asistió</option>
            <option value="cancelled">Cancelada</option>
          </select>
        )}
      </div>

      {/* Content */}
      {activeTab !== 'qualifications' ? (
        loading ? (
          <SkeletonList />
        ) : filteredCalls.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin llamadas"
            description={
              activeTab === 'upcoming'
                ? 'No tienes llamadas próximas. Agenda una desde un prospecto o calificación.'
                : 'No hay llamadas pasadas con estos filtros.'
            }
          />
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredCalls.map((call) => (
                <CallRow key={call.id} call={call} onClick={() => setDetailCall(call)} />
              ))}
            </div>
          </div>
        )
      ) : (
        // Qualifications tab
        loading ? (
          <SkeletonList />
        ) : filteredQualifications.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Sin calificaciones"
            description="Las personas que llenen el cuestionario público aparecerán aquí para que puedas agendar su llamada o seguir el follow-up."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQualifications.map((q) => (
              <QualificationCard
                key={q.id}
                qualification={q}
                onClick={() => setDetailQual(q)}
                onSchedule={() => openSchedule(q)}
              />
            ))}
          </div>
        )
      )}

      {/* Detail modals */}
      <Modal
        isOpen={!!detailCall}
        onClose={() => setDetailCall(null)}
        title="Detalle de la llamada"
        size="xl"
      >
        {detailCall && (
          <CallDetail
            call={detailCall}
            isAdmin={isAdmin}
            onUpdate={updateCall}
            onDelete={async () => {
              if (!window.confirm('¿Eliminar esta llamada? Esta acción no se puede deshacer.')) return
              await deleteCall(detailCall.id)
              setDetailCall(null)
              toast.success('Llamada eliminada')
            }}
            onClose={() => setDetailCall(null)}
            navigate={navigate}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!detailQual}
        onClose={() => setDetailQual(null)}
        title="Calificación"
        size="xl"
      >
        {detailQual && (
          <QualificationDetail
            qualification={detailQual}
            onSchedule={() => {
              setDetailQual(null)
              openSchedule(detailQual)
            }}
            onClose={() => setDetailQual(null)}
          />
        )}
      </Modal>

      {/* Schedule modal */}
      <Modal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        title={scheduleFromQual ? 'Agendar desde calificación' : scheduleFromProspect ? 'Agendar para prospecto' : 'Agendar nueva llamada'}
        size="lg"
      >
        <ScheduleForm
          prospects={prospects}
          activeAdvisors={activeAdvisors}
          currentUserId={profile?.id}
          fromQualification={scheduleFromQual}
          fromProspect={scheduleFromProspect}
          onCancel={() => setShowSchedule(false)}
          onSubmit={async (payload) => {
            try {
              const call = await createCall(payload)
              toast.success('Llamada agendada')
              setShowSchedule(false)
              fetchQualifications()
              setDetailCall(call)
            } catch (e) {
              toast.error(e.message || 'Error al agendar')
            }
          }}
        />
      </Modal>

      {/* Qualification link helper (admin) */}
      {isAdmin && (
        <QualificationLinkBanner />
      )}
    </div>
  )
}

// ===========================================================
// Stat Card
// ===========================================================
function StatCard({ icon: Icon, label, value, color, tooltip }) {
  return (
    <div
      className="bg-white rounded-xl shadow-md p-4 transition-shadow duration-200 hover:shadow-lg"
      title={tooltip}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-[#333333] leading-tight">{value}</p>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ===========================================================
// Skeleton
// ===========================================================
function SkeletonList() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-4 h-20 animate-pulse" />
      ))}
    </div>
  )
}

// ===========================================================
// Call Row
// ===========================================================
function CallRow({ call, onClick }) {
  const styles = STATUS_STYLES[call.status] || STATUS_STYLES.scheduled
  const date = new Date(call.scheduled_at)
  const isUpcoming = call.status === 'scheduled' && date >= new Date()
  const isPast = date < new Date()
  const name = call.prospect?.full_name || call.qualification?.full_name || 'Sin nombre'
  const email = call.prospect?.email || call.qualification?.email
  const phone = call.prospect?.phone || call.qualification?.phone
  const score = call.qualification?.qualification_score

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-4 group"
    >
      {/* Date block */}
      <div className="text-center shrink-0 w-16">
        <div className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">
          {date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
        </div>
        <div className="text-2xl font-black text-[#1A1A2E] leading-none">
          {date.getDate()}
        </div>
        <div className="text-[10px] text-[#6B7280] mt-0.5">
          {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Divider */}
      <div className={`w-1 h-12 rounded-full ${styles.dot}`} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#1A1A2E] truncate">{name}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
            <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
            {styles.label}
          </span>
          {score != null && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${scoreColor(score)}15`, color: scoreColor(score) }}
            >
              {score}% fit
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B7280] mt-1">
          {email && (
            <span className="flex items-center gap-1 truncate"><Mail size={11} />{email}</span>
          )}
          {call.advisor?.full_name && (
            <span className="flex items-center gap-1 truncate"><Users size={11} />{call.advisor.full_name}</span>
          )}
          {call.outcome && OUTCOME_STYLES[call.outcome] && (
            <span
              className="font-medium"
              style={{ color: OUTCOME_STYLES[call.outcome].color }}
            >
              · {OUTCOME_STYLES[call.outcome].label}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {phone && (
          <a
            href={getWhatsAppLink(phone, '')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-md transition-all"
            title="Abrir WhatsApp"
          >
            <MessageCircle size={15} />
          </a>
        )}
        {call.meeting_link && (
          <a
            href={call.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-[#39A1C9] hover:bg-blue-50 rounded-md transition-all"
            title="Abrir reunión"
          >
            <Video size={15} />
          </a>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  )
}

// ===========================================================
// Qualification Card
// ===========================================================
function QualificationCard({ qualification, onClick, onSchedule }) {
  const q = qualification
  const color = scoreColor(q.qualification_score)
  const styles = QUAL_STATUS_STYLES[q.status] || QUAL_STATUS_STYLES.pending

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onClick} className="text-left flex-1 min-w-0">
          <p className="font-bold text-[#1A1A2E] truncate">{q.full_name || 'Anónimo'}</p>
          <p className="text-xs text-[#6B7280] truncate">{q.email || 'Sin email'}</p>
        </button>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md text-white"
          style={{
            background: `conic-gradient(${color} ${q.qualification_score * 3.6}deg, #E5E7EB 0deg)`,
          }}
        >
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center">
            <span className="text-sm font-black" style={{ color }}>
              {q.qualification_score}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
          {styles.label}
        </span>
        {q.investment_capacity_max && (
          <span className="text-[10px] text-[#6B7280] font-medium">
            ${q.investment_capacity_min}-${q.investment_capacity_max} USD
          </span>
        )}
      </div>

      {q.income_range && (
        <p className="text-[10px] text-[#6B7280]">
          <strong>Ingresos:</strong> {q.income_range}
        </p>
      )}

      <p className="text-[10px] text-gray-400">{formatRelativeDate(q.created_at)}</p>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={onClick}
          className="flex-1 text-xs font-medium text-[#39A1C9] hover:bg-[#39A1C9]/10 rounded-lg py-1.5 transition-colors"
        >
          Ver detalle
        </button>
        {q.status !== 'booked' && (
          <button
            onClick={onSchedule}
            className="flex-1 text-xs font-medium bg-[#39A1C9] text-white hover:bg-[#2E8AB0] rounded-lg py-1.5 transition-colors"
          >
            Agendar
          </button>
        )}
      </div>
    </div>
  )
}

// ===========================================================
// Call Detail
// ===========================================================
function CallDetail({ call, isAdmin, onUpdate, onDelete, onClose, navigate }) {
  const [notes, setNotes] = useState(call.call_notes || '')
  const [outcome, setOutcome] = useState(call.outcome || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const styles = STATUS_STYLES[call.status] || STATUS_STYLES.scheduled
  const date = new Date(call.scheduled_at)
  const name = call.prospect?.full_name || call.qualification?.full_name || 'Sin nombre'
  const email = call.prospect?.email || call.qualification?.email
  const phone = call.prospect?.phone || call.qualification?.phone
  const score = call.qualification?.qualification_score

  async function handleStatusChange(newStatus) {
    try {
      await onUpdate(call.id, { status: newStatus, outcome: newStatus === 'completed' ? outcome || null : null })
      toast.success('Estado actualizado')
      onClose()
    } catch (e) {
      toast.error(e.message || 'Error')
    }
  }

  async function handleSaveOutcome() {
    try {
      setSavingNotes(true)
      await onUpdate(call.id, {
        status: 'completed',
        outcome: outcome || null,
        call_notes: notes,
      })
      toast.success('Llamada cerrada y notas guardadas')
      onClose()
    } catch (e) {
      toast.error(e.message || 'Error')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={`flex items-center justify-between gap-3 p-3 rounded-lg ${styles.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
          <span className={`text-sm font-bold ${styles.text}`}>{styles.label}</span>
        </div>
        <span className="text-xs text-[#6B7280]">
          {formatDate(call.scheduled_at)} · {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Contact info */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Contacto</h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="text-sm font-bold text-[#1A1A2E]">{name}</div>
            {email && <div className="flex items-center gap-2 text-xs text-[#6B7280]"><Mail size={12} />{email}</div>}
            {phone && <div className="flex items-center gap-2 text-xs text-[#6B7280]"><Phone size={12} />{phone}</div>}
            {call.advisor?.full_name && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280] pt-1 border-t border-gray-200">
                <Users size={12} /> Asesor: <strong>{call.advisor.full_name}</strong>
              </div>
            )}
          </div>

          {call.prospect_id && (
            <button
              onClick={() => navigate(`/prospects/${call.prospect_id}`)}
              className="w-full flex items-center justify-center gap-2 bg-[#39A1C9]/10 text-[#39A1C9] rounded-lg py-2 text-sm font-medium hover:bg-[#39A1C9]/20 transition-colors"
            >
              <ExternalLink size={14} /> Ver prospecto en CRM
            </button>
          )}

          {/* Notes editor */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center gap-1">
              <FileText size={12} /> Notas de la llamada
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Qué pasó en la llamada? Puntos clave, objeciones, siguiente paso..."
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
            />
          </div>
        </div>

        {/* Score + meeting */}
        <div className="md:col-span-2 space-y-3">
          {score != null && (
            <>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Calificación</h4>
              <div className="bg-gradient-to-br from-[#39A1C9] to-[#0F3460] text-white rounded-xl p-5 text-center">
                <div className="text-5xl font-black">{score}%</div>
                <div className="text-xs uppercase tracking-wider mt-1 opacity-90">Fit score</div>
                {call.qualification?.investment_capacity_max && (
                  <div className="text-xs mt-3 bg-white/20 rounded-full px-2 py-1 inline-block">
                    Inversión: ${call.qualification.investment_capacity_min}-${call.qualification.investment_capacity_max} USD
                  </div>
                )}
              </div>
            </>
          )}

          {call.meeting_link && (
            <a
              href={call.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#0F3460] text-white rounded-lg py-2.5 text-sm font-bold hover:bg-[#16213E] transition-colors"
            >
              <Video size={14} /> Abrir reunión
            </a>
          )}
          {phone && (
            <a
              href={getWhatsAppLink(phone, '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Outcome + actions */}
      {call.status === 'scheduled' && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Cerrar llamada</h4>
          <Select
            label="Resultado de la llamada"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            options={[
              { value: '', label: 'Selecciona resultado' },
              { value: 'won', label: '🎉 Cerró — Se convierte en cliente' },
              { value: 'proposal_sent', label: 'Propuesta enviada' },
              { value: 'follow_up_needed', label: 'Requiere follow-up' },
              { value: 'not_a_fit', label: 'No es fit por ahora' },
              { value: 'lost', label: 'Perdido' },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveOutcome} loading={savingNotes} className="flex-1 min-w-[180px]">
              <CheckCircle2 size={16} /> Marcar como completada
            </Button>
            <Button onClick={() => handleStatusChange('no_show')} variant="outline">
              <UserX size={14} /> No asistió
            </Button>
            <Button onClick={() => handleStatusChange('cancelled')} variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
              <XCircle size={14} /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Completed: allow editing notes */}
      {call.status === 'completed' && (
        <div className="border-t border-gray-100 pt-3 flex justify-between gap-3">
          <Button onClick={handleSaveOutcome} loading={savingNotes}>
            <Edit3 size={14} /> Guardar cambios
          </Button>
          {isAdmin && (
            <Button onClick={onDelete} variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ===========================================================
// Qualification Detail
// ===========================================================
function QualificationDetail({ qualification, onSchedule, onClose }) {
  const q = qualification
  const color = scoreColor(q.qualification_score)
  const styles = QUAL_STATUS_STYLES[q.status] || QUAL_STATUS_STYLES.pending
  const answers = q.answers || {}

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Contacto</h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="text-base font-bold text-[#1A1A2E]">{q.full_name || 'Anónimo'}</div>
            {q.email && <div className="flex items-center gap-2 text-xs text-[#6B7280]"><Mail size={12} />{q.email}</div>}
            {q.phone && <div className="flex items-center gap-2 text-xs text-[#6B7280]"><Phone size={12} />{q.phone}</div>}
            {q.country && <div className="text-xs text-[#6B7280]">📍 {q.country}</div>}
            <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-200">
              {formatDate(q.created_at)} · {q.source || 'direct'}
            </div>
          </div>

          {/* Answers */}
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] pt-2">Respuestas</h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {Object.entries(answers).map(([key, value]) => (
              <div key={key}>
                <div className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">{key}</div>
                <div className="text-sm text-[#333333]">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Calificación</h4>
          <div
            className="rounded-xl p-5 text-white text-center shadow-md"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}AA)` }}
          >
            <div className="text-5xl font-black">{q.qualification_score}%</div>
            <div className="text-xs uppercase tracking-wider mt-1 opacity-90">Fit score</div>
            <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">
              {styles.label}
            </div>
          </div>

          {q.investment_capacity_max && (
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold">Inversión declarada</p>
              <p className="text-lg font-bold text-[#1A1A2E]">
                ${q.investment_capacity_min} - ${q.investment_capacity_max}
                <span className="text-xs text-[#6B7280] font-normal"> USD</span>
              </p>
            </div>
          )}

          {q.income_range && (
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold">Ingresos mensuales</p>
              <p className="text-sm font-bold text-[#1A1A2E]">{q.income_range}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        {q.status !== 'booked' && (
          <Button onClick={onSchedule} className="flex-1 min-w-[200px]">
            <Calendar size={16} /> Agendar llamada <ArrowRight size={14} />
          </Button>
        )}
        {q.phone && (
          <a
            href={getWhatsAppLink(q.phone, `Hola ${q.full_name?.split(' ')[0] || ''}, vi que llenaste el cuestionario de MAAT. Me encantaría conversar.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 transition-colors"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

// ===========================================================
// Schedule Form
// ===========================================================
function ScheduleForm({ prospects, activeAdvisors, currentUserId, fromQualification, fromProspect, onCancel, onSubmit }) {
  // Default: tomorrow at 10am local
  const defaultDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })()

  const [form, setForm] = useState({
    prospect_id: fromProspect?.id || fromQualification?.prospect_id || '',
    advisor_id: currentUserId || '',
    scheduled_at: defaultDate,
    duration_min: 45,
    meeting_link: '',
    notes: '',
    create_prospect_from_qual: !!fromQualification && !fromQualification.prospect_id,
  })
  const [submitting, setSubmitting] = useState(false)

  const prospectOptions = useMemo(
    () => [
      { value: '', label: fromQualification ? 'Sin prospecto vinculado' : 'Selecciona prospecto' },
      ...prospects.map((p) => ({ value: p.id, label: `${p.full_name} · ${p.email || 'sin email'}` })),
    ],
    [prospects, fromQualification]
  )

  const advisorOptions = useMemo(
    () => [
      { value: '', label: 'Sin asignar' },
      ...activeAdvisors.map((a) => ({ value: a.id, label: a.full_name })),
    ],
    [activeAdvisors]
  )

  async function handleSubmit(evt) {
    evt.preventDefault()
    setSubmitting(true)
    try {
      let prospectId = form.prospect_id || null

      // If asked to create prospect from qualification, do it first
      if (form.create_prospect_from_qual && fromQualification && !prospectId) {
        const q = fromQualification
        const { data: newProspect, error: pErr } = await supabase
          .from('prospects')
          .insert({
            advisor_id: form.advisor_id || null,
            client_type: 'b2c',
            full_name: q.full_name || 'Sin nombre',
            email: q.email,
            phone: q.phone || null,
            country: q.country || null,
            pipeline_stage: 'calificado',
            lead_source: 'Llamada de descubrimiento',
            tags: ['discovery-call', 'pre-qualified'],
          })
          .select()
          .single()
        if (pErr) throw pErr
        prospectId = newProspect.id

        // Link qualification to the new prospect
        await supabase
          .from('call_qualifications')
          .update({ prospect_id: prospectId })
          .eq('id', q.id)
      }

      await onSubmit({
        qualification_id: fromQualification?.id || null,
        prospect_id: prospectId,
        advisor_id: form.advisor_id || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: form.duration_min,
        meeting_link: form.meeting_link.trim() || null,
        call_notes: form.notes.trim() || null,
        status: 'scheduled',
      })
    } catch (e) {
      toast.error(e.message || 'Error al agendar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fromQualification && (
        <div className="bg-gradient-to-r from-[#39A1C9]/10 to-[#0F3460]/10 border border-[#39A1C9]/30 rounded-lg p-3 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: scoreColor(fromQualification.qualification_score) }}
          >
            {fromQualification.qualification_score}%
          </div>
          <div className="text-xs">
            <p className="font-bold text-[#1A1A2E]">{fromQualification.full_name}</p>
            <p className="text-[#6B7280]">{fromQualification.email}</p>
          </div>
        </div>
      )}

      {fromQualification && !fromQualification.prospect_id && (
        <label className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.create_prospect_from_qual}
            onChange={(e) => setForm((f) => ({ ...f, create_prospect_from_qual: e.target.checked }))}
            className="mt-0.5 accent-[#39A1C9]"
          />
          <div>
            <p className="text-xs font-bold text-[#1A1A2E]">Crear prospecto automáticamente</p>
            <p className="text-[10px] text-[#6B7280]">
              Esta persona aún no es prospecto en el CRM. Al agendar se creará uno en etapa "Calificado".
            </p>
          </div>
        </label>
      )}

      {!fromQualification && (
        <Select
          label="Prospecto"
          value={form.prospect_id}
          onChange={(e) => setForm((f) => ({ ...f, prospect_id: e.target.value }))}
          options={prospectOptions}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-1">Fecha y hora *</label>
          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
          />
        </div>
        <Input
          label="Duración (minutos)"
          type="number"
          min="15"
          max="180"
          step="15"
          value={form.duration_min}
          onChange={(e) => setForm((f) => ({ ...f, duration_min: Number(e.target.value) }))}
        />
      </div>

      <Select
        label="Asesor asignado"
        value={form.advisor_id}
        onChange={(e) => setForm((f) => ({ ...f, advisor_id: e.target.value }))}
        options={advisorOptions}
      />

      <Input
        label="Link de la reunión (Zoom, Meet, etc.)"
        placeholder="https://meet.google.com/..."
        value={form.meeting_link}
        onChange={(e) => setForm((f) => ({ ...f, meeting_link: e.target.value }))}
      />

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">Notas iniciales</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Contexto para la llamada..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>
          <Calendar size={16} /> Agendar llamada
        </Button>
      </div>
    </form>
  )
}

// ===========================================================
// Qualification Link Banner
// ===========================================================
function QualificationLinkBanner() {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/qualify/discovery`

  function copyLink() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gradient-to-r from-[#0F3460] to-[#39A1C9] text-white rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Target size={18} />
        </div>
        <div>
          <p className="text-sm font-bold">Link público de calificación</p>
          <p className="text-[11px] opacity-90">Comparte este link para que prospectos llenen el cuestionario antes de agendar</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="bg-white/10 px-2 py-1 rounded text-[11px] font-mono truncate max-w-[200px]">{url}</code>
        <button
          onClick={copyLink}
          className="bg-white text-[#0F3460] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1"
        >
          {copied ? <><CheckCheck size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
        </button>
      </div>
    </div>
  )
}

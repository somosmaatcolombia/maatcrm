import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Magnet,
  Search,
  Users,
  TrendingUp,
  Mail,
  UserPlus,
  ExternalLink,
  Eye,
  Trash2,
  ArrowRight,
  BarChart3,
  Globe,
  Filter,
  Download,
  Phone,
  MessageCircle,
  Copy,
  CheckCircle2,
  XCircle,
  Calendar,
  Target,
  ChevronRight,
  RotateCcw,
  MapPin,
  Smartphone,
  Info,
  Award,
  AlertCircle,
  ClipboardList,
} from 'lucide-react'
import { useLeadMagnets } from '../hooks/useLeadMagnets'
import { useAdvisors } from '../hooks/useAdvisors'
import { useAuthContext } from '../context/AuthContext'
import { usePipelineContext } from '../context/PipelineContext'
import { formatDate, formatRelativeDate, getWhatsAppLink, exportToCSV } from '../lib/utils'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  completed: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Completado',
    icon: CheckCircle2,
  },
  converted: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Convertido',
    icon: UserPlus,
  },
  discarded: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
    label: 'Descartado',
    icon: XCircle,
  },
}

const LEVEL_COLORS = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#10B981',
}

// Dimension labels (test-performance-emocional)
const DIM_LABELS = {
  regulacion: 'Regulación emocional',
  valores: 'Decisiones desde valores',
  respuesta: 'Respuesta consciente',
  claridad: 'Claridad en caos',
}

function scoreColor(percentage) {
  if (percentage >= 80) return '#10B981'
  if (percentage >= 60) return '#3B82F6'
  if (percentage >= 40) return '#F59E0B'
  return '#EF4444'
}

export default function LeadMagnetsPage() {
  const navigate = useNavigate()
  const { isAdmin, profile } = useAuthContext()
  const { stages } = usePipelineContext()
  const {
    responses,
    magnets,
    loading,
    error,
    stats,
    fetchResponses,
    assignAdvisor,
    convertToProspect,
    discardResponse,
    reopenResponse,
  } = useLeadMagnets()
  const { activeAdvisors } = useAdvisors()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [contactFilter, setContactFilter] = useState(false)
  const [magnetFilter, setMagnetFilter] = useState('')
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [converting, setConverting] = useState(false)
  const [copiedField, setCopiedField] = useState(null)

  useEffect(() => {
    fetchResponses({
      search: search || undefined,
      status: statusFilter || undefined,
      hasContact: contactFilter || undefined,
      leadMagnetId: magnetFilter || undefined,
    })
  }, [search, statusFilter, contactFilter, magnetFilter, fetchResponses])

  // Count responses per magnet for the filter chips
  const countsByMagnet = useMemo(() => {
    const counts = {}
    responses.forEach((r) => {
      if (r.lead_magnet_id) counts[r.lead_magnet_id] = (counts[r.lead_magnet_id] || 0) + 1
    })
    return counts
  }, [responses])

  async function handleAssign(responseId, advisorId) {
    try {
      await assignAdvisor(responseId, advisorId)
      setSelectedResponse((prev) =>
        prev && prev.id === responseId ? { ...prev, advisor_id: advisorId } : prev
      )
      toast.success('Asesor asignado')
    } catch {
      toast.error('Error al asignar asesor')
    }
  }

  async function handleDiscard(responseId) {
    try {
      await discardResponse(responseId)
      toast.success('Respuesta descartada')
      setShowDetail(false)
    } catch {
      toast.error('Error al descartar')
    }
  }

  async function handleReopen(responseId) {
    try {
      await reopenResponse(responseId)
      toast.success('Respuesta reactivada')
      setSelectedResponse((prev) =>
        prev && prev.id === responseId ? { ...prev, status: 'completed' } : prev
      )
    } catch {
      toast.error('Error al reactivar')
    }
  }

  function openConvertModal(response) {
    setSelectedResponse(response)
    setShowDetail(false)
    setShowConvert(true)
  }

  function openDetail(response) {
    setSelectedResponse(response)
    setShowDetail(true)
  }

  function handleCopy(text, fieldKey) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 1500)
  }

  function handleExportCSV() {
    if (responses.length === 0) {
      toast.error('Nada que exportar')
      return
    }
    const rows = responses.map((r) => ({
      nombre: r.full_name || '',
      email: r.email || '',
      telefono: r.phone || '',
      pais: r.country || '',
      lead_magnet: r.lead_magnets?.name || '',
      score: r.total_percentage != null ? Math.round(r.total_percentage) : '',
      nivel: r.level_number || '',
      nombre_nivel: r.level_name || '',
      canal: r.delivery_method || '',
      fuente: r.source || '',
      utm_campaign: r.utm_campaign || '',
      utm_medium: r.utm_medium || '',
      estado: r.status || '',
      fecha: formatDate(r.created_at),
    }))
    exportToCSV(rows, `lead-magnets-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exportadas ${rows.length} respuestas`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333] flex items-center gap-3">
            <Magnet className="text-[#39A1C9]" size={28} />
            Lead Magnets
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Convierte respuestas de tus content magnets en prospectos calificados
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={responses.length === 0}>
          <Download size={16} />
          Exportar CSV
        </Button>
      </div>

      {/* Magnet filter chips */}
      {magnets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMagnetFilter('')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              !magnetFilter
                ? 'bg-[#39A1C9] text-white border-[#39A1C9] shadow-sm'
                : 'bg-white text-[#6B7280] border-gray-300 hover:border-[#39A1C9]'
            }`}
          >
            <Magnet size={12} />
            Todos
            <span
              className={`ml-1 text-[10px] px-1.5 py-0 rounded-full ${
                !magnetFilter ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {magnetFilter ? '—' : responses.length}
            </span>
          </button>
          {magnets.map((m) => (
            <button
              key={m.id}
              onClick={() => setMagnetFilter(m.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                magnetFilter === m.id
                  ? 'bg-[#39A1C9] text-white border-[#39A1C9] shadow-sm'
                  : 'bg-white text-[#6B7280] border-gray-300 hover:border-[#39A1C9]'
              }`}
            >
              {m.name}
              {countsByMagnet[m.id] !== undefined && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0 rounded-full ${
                    magnetFilter === m.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {countsByMagnet[m.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total" value={stats.total} color="#39A1C9" />
        <StatCard icon={Mail} label="Con contacto" value={stats.withContact} color="#EBA055" />
        <StatCard icon={UserPlus} label="Convertidos" value={stats.converted} color="#10B981" />
        <StatCard
          icon={Target}
          label="Tasa conversión"
          value={`${stats.conversionRate}%`}
          color="#89608E"
          tooltip="Convertidos / Con contacto"
        />
        <StatCard
          icon={TrendingUp}
          label="Score promedio"
          value={`${stats.avgScore}%`}
          color="#3B82F6"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 text-sm"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="completed">Completados</option>
          <option value="converted">Convertidos</option>
          <option value="discarded">Descartados</option>
        </select>

        <button
          onClick={() => setContactFilter(!contactFilter)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
            contactFilter
              ? 'bg-[#39A1C9] text-white border-[#39A1C9]'
              : 'bg-white text-[#6B7280] border-gray-300 hover:border-[#39A1C9]'
          }`}
        >
          <Filter size={14} />
          Solo con contacto
        </button>

        {(search || statusFilter || contactFilter || magnetFilter) && (
          <button
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setContactFilter(false)
              setMagnetFilter('')
            }}
            className="text-xs text-[#6B7280] hover:text-[#333333] hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto text-red-400 mb-2" size={32} />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : responses.length === 0 ? (
          <EmptyState
            icon={Magnet}
            title="Sin respuestas aún"
            description="Cuando alguien complete un lead magnet, aparecerá aquí para que puedas convertirlo en prospecto."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Contacto</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Lead Magnet</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Resultado</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Canal</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Fuente</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Fecha</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => {
                  const statusStyle = STATUS_STYLES[r.status] || STATUS_STYLES.completed
                  const percentage = Math.round(r.total_percentage || 0)
                  const color = LEVEL_COLORS[r.level_number] || scoreColor(percentage)
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors cursor-pointer group"
                      onClick={() => openDetail(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#333333]">{r.full_name || 'Anónimo'}</div>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5">
                          {r.email ? (
                            <>
                              <Mail size={11} />
                              <span className="truncate max-w-[200px]">{r.email}</span>
                            </>
                          ) : (
                            <span className="italic">Sin email</span>
                          )}
                        </div>
                        {r.phone && (
                          <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5">
                            <Phone size={11} />
                            {r.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#333333] font-medium">
                          {r.lead_magnets?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.total_percentage != null ? (
                          <div>
                            <span className="font-bold text-lg" style={{ color }}>
                              {percentage}%
                            </span>
                            {r.level_name && (
                              <div
                                className="inline-block ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                Nv.{r.level_number}
                              </div>
                            )}
                            {r.level_name && (
                              <div className="text-[10px] text-[#6B7280] mt-0.5 truncate max-w-[140px]">
                                {r.level_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.delivery_method === 'email' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                            <Mail size={12} className="text-[#39A1C9]" /> Email
                          </span>
                        ) : r.delivery_method === 'whatsapp' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                            <MessageCircle size={12} className="text-green-500" /> WhatsApp
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#6B7280]">{r.source || 'direct'}</span>
                        {r.utm_campaign && (
                          <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                            {r.utm_campaign}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap">
                        {formatRelativeDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === 'completed' && r.email && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openConvertModal(r)
                              }}
                              className="p-1.5 text-gray-400 hover:text-[#10B981] hover:bg-green-50 rounded-md transition-all duration-200"
                              title="Convertir a prospecto"
                            >
                              <UserPlus size={16} />
                            </button>
                          )}
                          {r.status === 'converted' && r.prospect_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/prospects/${r.prospect_id}`)
                              }}
                              className="p-1.5 text-gray-400 hover:text-[#39A1C9] hover:bg-blue-50 rounded-md transition-all duration-200"
                              title="Ver prospecto"
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
                          {r.phone && (
                            <a
                              href={getWhatsAppLink(r.phone, '')}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-md transition-all duration-200"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail(r)
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#333333] hover:bg-gray-100 rounded-md transition-all duration-200"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail && !!selectedResponse}
        onClose={() => setShowDetail(false)}
        title={selectedResponse?.lead_magnets?.name || 'Detalle de respuesta'}
        size="xl"
      >
        {selectedResponse && (
          <DetailContent
            response={selectedResponse}
            isAdmin={isAdmin}
            activeAdvisors={activeAdvisors}
            copiedField={copiedField}
            onCopy={handleCopy}
            onAssign={handleAssign}
            onConvert={() => openConvertModal(selectedResponse)}
            onDiscard={() => handleDiscard(selectedResponse.id)}
            onReopen={() => handleReopen(selectedResponse.id)}
            onViewProspect={() => {
              setShowDetail(false)
              navigate(`/prospects/${selectedResponse.prospect_id}`)
            }}
          />
        )}
      </Modal>

      {/* Convert to Prospect Modal */}
      <Modal
        isOpen={showConvert && !!selectedResponse}
        onClose={() => !converting && setShowConvert(false)}
        title="Convertir a prospecto"
        size="lg"
      >
        {selectedResponse && (
          <ConvertForm
            response={selectedResponse}
            stages={stages}
            activeAdvisors={activeAdvisors}
            currentUserId={profile?.id}
            converting={converting}
            onCancel={() => setShowConvert(false)}
            onSubmit={async (overrides) => {
              try {
                setConverting(true)
                const prospect = await convertToProspect(selectedResponse.id, overrides)
                toast.success(`Prospecto creado: ${prospect.full_name}`)
                setShowConvert(false)
                navigate(`/prospects/${prospect.id}`)
              } catch (err) {
                toast.error(err.message || 'Error al convertir')
              } finally {
                setConverting(false)
              }
            }}
          />
        )}
      </Modal>
    </div>
  )
}

// ============================================================
// Stat Card
// ============================================================
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

// ============================================================
// Detail Content
// ============================================================
function DetailContent({
  response,
  isAdmin,
  activeAdvisors,
  copiedField,
  onCopy,
  onAssign,
  onConvert,
  onDiscard,
  onReopen,
  onViewProspect,
}) {
  const [showRawAnswers, setShowRawAnswers] = useState(false)
  const percentage = Math.round(response.total_percentage || 0)
  const color = LEVEL_COLORS[response.level_number] || scoreColor(percentage)
  const statusStyle = STATUS_STYLES[response.status] || STATUS_STYLES.completed

  const answersArray = response.answers
    ? Object.entries(response.answers).sort((a, b) => Number(a[0]) - Number(b[0]))
    : []

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={`flex items-center justify-between gap-3 p-3 rounded-lg ${statusStyle.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
          <span className={`text-sm font-semibold ${statusStyle.text}`}>{statusStyle.label}</span>
          {response.converted_at && (
            <span className="text-xs text-[#6B7280]">
              · {formatDate(response.converted_at)}
            </span>
          )}
        </div>
        <div className="text-xs text-[#6B7280]">
          Recibida {formatRelativeDate(response.created_at)}
        </div>
      </div>

      {/* Main grid: contact + results */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {/* Contact info (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
            <Users size={12} />
            Información de contacto
          </h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <CopyableField
              label="Nombre"
              value={response.full_name}
              fieldKey="name"
              copiedField={copiedField}
              onCopy={onCopy}
            />
            <CopyableField
              label="Email"
              value={response.email}
              fieldKey="email"
              icon={Mail}
              copiedField={copiedField}
              onCopy={onCopy}
            />
            <CopyableField
              label="Teléfono"
              value={response.phone}
              fieldKey="phone"
              icon={Phone}
              copiedField={copiedField}
              onCopy={onCopy}
              trailingAction={
                response.phone && (
                  <a
                    href={getWhatsAppLink(response.phone, '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-green-600 hover:underline"
                  >
                    <MessageCircle size={10} /> WhatsApp
                  </a>
                )
              }
            />
            <InfoRow label="País" value={response.country} icon={MapPin} />
            <InfoRow
              label="Canal preferido"
              value={
                response.delivery_method === 'email'
                  ? 'Email'
                  : response.delivery_method === 'whatsapp'
                  ? 'WhatsApp'
                  : '—'
              }
              icon={
                response.delivery_method === 'whatsapp'
                  ? MessageCircle
                  : Mail
              }
            />
          </div>

          {/* Tracking info */}
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5 pt-2">
            <Target size={12} />
            Tracking y origen
          </h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <InfoRow label="Fuente" value={response.source || 'direct'} icon={Globe} />
            <InfoRow label="UTM Campaign" value={response.utm_campaign} />
            <InfoRow label="UTM Medium" value={response.utm_medium} />
            {response.user_agent && (
              <InfoRow
                label="Dispositivo"
                value={
                  <span className="truncate block" title={response.user_agent}>
                    {response.user_agent.slice(0, 50)}...
                  </span>
                }
                icon={Smartphone}
              />
            )}
          </div>
        </div>

        {/* Results (2 cols) */}
        <div className="md:col-span-2 space-y-3">
          {response.total_percentage != null ? (
            <>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                <Award size={12} />
                Resultado del test
              </h4>
              <div
                className="rounded-xl p-5 text-white text-center shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                }}
              >
                <div className="text-5xl font-black leading-none">{percentage}%</div>
                {response.level_name && (
                  <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">
                    Nivel {response.level_number}: {response.level_name}
                  </div>
                )}
              </div>

              {/* Dimensions */}
              {response.dimension_scores && (
                <div className="space-y-2.5 pt-2">
                  {Object.entries(response.dimension_scores).map(([key, val]) => {
                    const v = Math.round(val)
                    const dimColor = scoreColor(v)
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#6B7280] font-medium">
                            {DIM_LABELS[key] || key}
                          </span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: dimColor }}
                          >
                            {v}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${v}%`, backgroundColor: dimColor }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Info className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-xs text-[#6B7280]">
                Este lead magnet no incluye puntaje
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Raw answers (collapsible) */}
      {answersArray.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowRawAnswers(!showRawAnswers)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
              <ClipboardList size={12} />
              Respuestas individuales ({answersArray.length})
            </span>
            <ChevronRight
              size={14}
              className={`text-[#6B7280] transition-transform ${showRawAnswers ? 'rotate-90' : ''}`}
            />
          </button>
          {showRawAnswers && (
            <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {answersArray.map(([q, a]) => (
                <div key={q} className="text-center bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-[#6B7280] uppercase">Q{q}</div>
                  <div className="text-sm font-bold text-[#333333]">{a}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign advisor (admin, non-converted) */}
      {isAdmin && response.status !== 'converted' && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
            Asesor asignado
          </h4>
          <select
            value={response.advisor_id || ''}
            onChange={(e) => onAssign(response.id, e.target.value || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none text-sm bg-white"
          >
            <option value="">Sin asignar</option>
            {activeAdvisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {response.status === 'completed' && response.email && (
          <Button onClick={onConvert} className="flex-1 min-w-[200px]">
            <UserPlus size={16} /> Convertir a prospecto <ArrowRight size={14} />
          </Button>
        )}
        {response.status === 'converted' && response.prospect_id && (
          <Button onClick={onViewProspect} variant="primary" className="flex-1 min-w-[200px]">
            <ExternalLink size={16} /> Ver prospecto
          </Button>
        )}
        {response.status === 'discarded' && (
          <Button onClick={onReopen} variant="outline">
            <RotateCcw size={14} /> Reactivar
          </Button>
        )}
        {response.status === 'completed' && (
          <Button onClick={onDiscard} variant="outline" className="text-red-500 hover:bg-red-50 border-red-200">
            <Trash2 size={14} /> Descartar
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Convert Form
// ============================================================
function ConvertForm({
  response,
  stages,
  activeAdvisors,
  currentUserId,
  converting,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => ({
    full_name: response.full_name || '',
    email: response.email || '',
    phone: response.phone || '',
    country: response.country || '',
    city: '',
    client_type: 'b2c',
    pipeline_stage: 'lead_nuevo',
    advisor_id: response.advisor_id || currentUserId || '',
    company_name: '',
    job_title: '',
    lead_source: response.lead_magnets?.name || 'Lead Magnet',
    tags: ['lead-magnet', response.lead_magnets?.slug || 'test'].filter(Boolean),
    notes: '',
  }))
  const [errors, setErrors] = useState({})
  const [newTag, setNewTag] = useState('')

  const stageOptions = useMemo(() => {
    const list = form.client_type === 'b2b' ? stages.b2b || [] : stages.b2c || []
    return list.map((s) => ({ value: s.slug, label: s.name }))
  }, [form.client_type, stages])

  // Ensure selected stage is valid for the selected client_type
  useEffect(() => {
    if (stageOptions.length > 0 && !stageOptions.find((o) => o.value === form.pipeline_stage)) {
      setForm((f) => ({ ...f, pipeline_stage: stageOptions[0].value }))
    }
  }, [stageOptions, form.pipeline_stage])

  const advisorOptions = useMemo(
    () => [
      { value: '', label: 'Sin asignar' },
      ...activeAdvisors.map((a) => ({ value: a.id, label: a.full_name })),
    ],
    [activeAdvisors]
  )

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Nombre obligatorio'
    if (!form.email.trim()) e.email = 'Email obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email no válido'
    if (form.client_type === 'b2b' && !form.company_name.trim()) {
      e.company_name = 'Empresa obligatoria para B2B'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return
    onSubmit({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      client_type: form.client_type,
      pipeline_stage: form.pipeline_stage,
      advisor_id: form.advisor_id || null,
      company_name: form.client_type === 'b2b' ? form.company_name.trim() : null,
      job_title: form.client_type === 'b2b' ? form.job_title.trim() || null : null,
      lead_source: form.lead_source.trim(),
      tags: form.tags,
      notes: form.notes.trim(),
    })
  }

  function addTag() {
    const t = newTag.trim()
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }))
      setNewTag('')
    }
  }

  function removeTag(t) {
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Score context banner */}
      {response.total_percentage != null && (
        <div className="bg-gradient-to-r from-[#39A1C9]/10 to-[#89608E]/10 rounded-lg p-3 flex items-center gap-3 border border-[#39A1C9]/20">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: LEVEL_COLORS[response.level_number] || '#39A1C9' }}
          >
            {Math.round(response.total_percentage)}%
          </div>
          <div className="text-xs">
            <p className="font-semibold text-[#333333]">
              {response.lead_magnets?.name}
            </p>
            <p className="text-[#6B7280]">
              {response.level_name
                ? `Nivel ${response.level_number}: ${response.level_name}`
                : 'Respuesta completada'}
            </p>
          </div>
        </div>
      )}

      {/* Client type toggle */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
          Tipo de cliente
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['b2c', 'b2b'].map((type) => {
            const active = form.client_type === type
            const label = type === 'b2c' ? 'B2C · Individual' : 'B2B · Empresa'
            return (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, client_type: type }))}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? type === 'b2b'
                      ? 'bg-purple-50 border-purple-500 text-purple-700'
                      : 'bg-blue-50 border-[#39A1C9] text-[#39A1C9]'
                    : 'bg-white border-gray-200 text-[#6B7280] hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Personal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre completo *"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          error={errors.full_name}
        />
        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          error={errors.email}
        />
        <Input
          label="Teléfono"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="País"
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
        />
      </div>

      {/* B2B extras */}
      {form.client_type === 'b2b' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 rounded-lg p-3 border border-purple-200">
          <Input
            label="Empresa *"
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            error={errors.company_name}
          />
          <Input
            label="Cargo"
            value={form.job_title}
            onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
          />
        </div>
      )}

      {/* Pipeline + advisor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Etapa inicial del pipeline"
          value={form.pipeline_stage}
          onChange={(e) => setForm((f) => ({ ...f, pipeline_stage: e.target.value }))}
          options={stageOptions}
        />
        <Select
          label="Asesor asignado"
          value={form.advisor_id}
          onChange={(e) => setForm((f) => ({ ...f, advisor_id: e.target.value }))}
          options={advisorOptions}
        />
      </div>

      {/* Source + tags */}
      <Input
        label="Fuente / Lead source"
        value={form.lead_source}
        onChange={(e) => setForm((f) => ({ ...f, lead_source: e.target.value }))}
      />

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
          Etiquetas
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs bg-[#39A1C9]/10 text-[#39A1C9] px-2 py-1 rounded-full font-medium"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          {form.tags.length === 0 && (
            <span className="text-xs text-gray-400 italic">Sin etiquetas</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Agregar etiqueta y presionar Enter"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            Agregar
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
          Notas iniciales
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Contexto adicional que quieras incluir en la primera actividad del prospecto..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={converting}>
          Cancelar
        </Button>
        <Button type="submit" loading={converting}>
          <UserPlus size={16} />
          {converting ? 'Creando...' : 'Crear prospecto'}
        </Button>
      </div>
    </form>
  )
}

// ============================================================
// Small helpers
// ============================================================
function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {Icon && <Icon size={12} className="text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-[#6B7280]">{label}:</span>{' '}
        <span className="text-[#333333] font-medium break-all">
          {value || <span className="italic text-gray-400">—</span>}
        </span>
      </div>
    </div>
  )
}

function CopyableField({ label, value, fieldKey, icon: Icon, copiedField, onCopy, trailingAction }) {
  const copied = copiedField === fieldKey
  return (
    <div className="flex items-start gap-2 text-xs group">
      {Icon && <Icon size={12} className="text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[#6B7280]">{label}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-[#333333] font-medium break-all">
            {value || <span className="italic text-gray-400 text-xs">No proporcionado</span>}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => onCopy(value, fieldKey)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#39A1C9] transition-all"
              title="Copiar"
            >
              {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          )}
          {trailingAction}
        </div>
      </div>
    </div>
  )
}

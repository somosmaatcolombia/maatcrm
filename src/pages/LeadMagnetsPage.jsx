import { useState, useEffect } from 'react'
import {
  Magnet,
  Search,
  Users,
  TrendingUp,
  Mail,
  UserPlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  ArrowRight,
  BarChart3,
  Globe,
  Clock,
  Filter,
} from 'lucide-react'
import { useLeadMagnets } from '../hooks/useLeadMagnets'
import { useAdvisors } from '../hooks/useAdvisors'
import { useAuthContext } from '../context/AuthContext'
import { formatDate, formatRelativeDate } from '../lib/utils'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  completed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Completado' },
  converted: { bg: 'bg-green-50', text: 'text-green-700', label: 'Convertido' },
  discarded: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Descartado' },
}

const LEVEL_COLORS = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#10B981',
}

export default function LeadMagnetsPage() {
  const { isAdmin } = useAuthContext()
  const { responses, loading, error, stats, fetchResponses, assignAdvisor, convertToProspect, discardResponse } = useLeadMagnets()
  const { activeAdvisors } = useAdvisors()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [contactFilter, setContactFilter] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    fetchResponses({
      search: search || undefined,
      status: statusFilter || undefined,
      hasContact: contactFilter || undefined,
    })
  }, [search, statusFilter, contactFilter, fetchResponses])

  async function handleConvert(responseId) {
    try {
      setConverting(true)
      const prospect = await convertToProspect(responseId)
      toast.success(`Prospecto creado: ${prospect.full_name}`)
      setShowDetail(false)
    } catch (err) {
      toast.error(err.message || 'Error al convertir')
    } finally {
      setConverting(false)
    }
  }

  async function handleAssign(responseId, advisorId) {
    try {
      await assignAdvisor(responseId, advisorId)
      toast.success('Asesor asignado')
    } catch (err) {
      toast.error('Error al asignar asesor')
    }
  }

  async function handleDiscard(responseId) {
    try {
      await discardResponse(responseId)
      toast.success('Respuesta descartada')
      setShowDetail(false)
    } catch (err) {
      toast.error('Error al descartar')
    }
  }

  const dimLabels = {
    regulacion: 'Regulacion Emocional',
    valores: 'Decisiones desde Valores',
    respuesta: 'Respuesta Consciente',
    claridad: 'Claridad en Caos',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Magnet className="text-[#39A1C9]" size={28} />
          Lead Magnets
        </h1>
        <p className="text-gray-500 mt-1">Rastrea y gestiona las respuestas de tus content magnets</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Respuestas" value={stats.total} color="#39A1C9" />
        <StatCard icon={Mail} label="Con Contacto" value={stats.withContact} color="#EBA055" />
        <StatCard icon={UserPlus} label="Convertidos" value={stats.converted} color="#7DCD93" />
        <StatCard icon={TrendingUp} label="Score Promedio" value={`${stats.avgScore}%`} color="#89608E" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o telefono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 text-sm"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none"
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
              : 'bg-white text-gray-600 border-gray-300 hover:border-[#39A1C9]'
          }`}
        >
          <Filter size={16} />
          Solo con contacto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : responses.length === 0 ? (
          <div className="p-12 text-center">
            <Magnet size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Sin respuestas aun</h3>
            <p className="text-gray-400 mt-1">Las respuestas de tus lead magnets apareceran aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contacto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Score</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nivel</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Canal</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fuente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => {
                  const statusStyle = STATUS_STYLES[r.status] || STATUS_STYLES.completed
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => { setSelectedResponse(r); setShowDetail(true) }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{r.full_name || 'Anonimo'}</div>
                        <div className="text-gray-400 text-xs">{r.email || 'Sin email'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-lg" style={{ color: LEVEL_COLORS[r.level_number] || '#666' }}>
                          {Math.round(r.total_percentage || 0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${LEVEL_COLORS[r.level_number]}15`,
                            color: LEVEL_COLORS[r.level_number],
                          }}
                        >
                          Nv.{r.level_number} {r.level_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.delivery_method === 'email' ? '📧' : r.delivery_method === 'whatsapp' ? '💬' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{r.source || 'direct'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatRelativeDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedResponse(r); setShowDetail(true) }}
                          className="text-gray-400 hover:text-[#39A1C9] transition-colors p-1"
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>
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
      {showDetail && selectedResponse && (
        <Modal
          title="Detalle de Respuesta"
          onClose={() => setShowDetail(false)}
          size="lg"
        >
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Nombre" value={selectedResponse.full_name || 'Anonimo'} />
              <InfoField label="Email" value={selectedResponse.email || 'No proporcionado'} />
              <InfoField label="Telefono" value={selectedResponse.phone || 'No proporcionado'} />
              <InfoField label="Pais" value={selectedResponse.country || 'No proporcionado'} />
              <InfoField label="Fuente" value={selectedResponse.source || 'direct'} />
              <InfoField label="Fecha" value={formatDate(selectedResponse.created_at)} />
            </div>

            {/* Score */}
            <div className="bg-gradient-to-r from-[#39A1C9] to-[#89608E] rounded-xl p-6 text-white text-center">
              <div className="text-4xl font-bold">{Math.round(selectedResponse.total_percentage || 0)}%</div>
              <div
                className="inline-block mt-2 px-4 py-1 rounded-full text-sm font-semibold"
                style={{ backgroundColor: LEVEL_COLORS[selectedResponse.level_number] }}
              >
                Nivel {selectedResponse.level_number}: {selectedResponse.level_name}
              </div>
            </div>

            {/* Dimensions */}
            {selectedResponse.dimension_scores && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Dimensiones</h4>
                {Object.entries(selectedResponse.dimension_scores).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-44">{dimLabels[key] || key}</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#39A1C9] to-[#89608E]"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#39A1C9] w-12 text-right">{Math.round(val)}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Assign Advisor (admin only) */}
            {isAdmin && selectedResponse.status !== 'converted' && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Asignar Asesor</h4>
                <select
                  value={selectedResponse.advisor_id || ''}
                  onChange={(e) => handleAssign(selectedResponse.id, e.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none text-sm"
                >
                  <option value="">Sin asignar</option>
                  {activeAdvisors.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {selectedResponse.status === 'completed' && selectedResponse.email && (
                <button
                  onClick={() => handleConvert(selectedResponse.id)}
                  disabled={converting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#39A1C9] text-white rounded-lg px-4 py-2.5 hover:bg-[#2d8ab0] transition-colors duration-200 font-medium text-sm disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  {converting ? 'Convirtiendo...' : 'Convertir a Prospecto'}
                </button>
              )}

              {selectedResponse.status === 'converted' && selectedResponse.prospect_id && (
                <a
                  href={`/prospects/${selectedResponse.prospect_id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#7DCD93] text-white rounded-lg px-4 py-2.5 hover:bg-[#6ab87e] transition-colors duration-200 font-medium text-sm"
                >
                  <ExternalLink size={16} />
                  Ver Prospecto
                </a>
              )}

              {selectedResponse.status === 'completed' && (
                <button
                  onClick={() => handleDiscard(selectedResponse.id)}
                  className="flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 rounded-lg px-4 py-2.5 border border-gray-200 hover:border-red-200 transition-all duration-200 text-sm"
                >
                  <Trash2 size={16} />
                  Descartar
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 transition-shadow duration-200 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  )
}

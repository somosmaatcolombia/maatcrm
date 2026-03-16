import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  LayoutGrid,
  List,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { usePipelineContext } from '../context/PipelineContext'
import { useProspects } from '../hooks/useProspects'
import { useAdvisors } from '../hooks/useAdvisors'
import ProspectCard from '../components/prospects/ProspectCard'
import ProspectForm from '../components/prospects/ProspectForm'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { showSuccess, showError } from '../components/ui/Toast'
import { formatDate, formatCurrency, getInitials } from '../lib/utils'

export default function ProspectsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAdmin } = useAuthContext()
  const { stages } = usePipelineContext()

  // Filters state
  const [clientTypeTab, setClientTypeTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [stageFilter, setStageFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [viewMode, setViewMode] = useState('grid')

  // CRUD state
  const [formModal, setFormModal] = useState({ open: false, prospect: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, prospect: null })
  const [submitting, setSubmitting] = useState(false)

  // Build filters for the hook
  const filters = useMemo(() => ({
    clientType: clientTypeTab !== 'all' ? clientTypeTab : undefined,
    search: searchQuery.trim() || undefined,
    pipelineStage: stageFilter || undefined,
  }), [clientTypeTab, searchQuery, stageFilter])

  const { prospects, loading, createProspect, updateProspect, deleteProspect } = useProspects(filters)
  const { advisors } = useAdvisors()

  // Sort locally
  const sortedProspects = useMemo(() => {
    const sorted = [...prospects]
    sorted.sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]

      if (sortBy === 'full_name') {
        valA = (valA || '').toLowerCase()
        valB = (valB || '').toLowerCase()
      }
      if (sortBy === 'lead_score' || sortBy === 'estimated_value') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [prospects, sortBy, sortDir])

  // Counts for tabs
  const counts = useMemo(() => ({
    all: prospects.length,
    b2c: prospects.filter((p) => p.client_type === 'b2c').length,
    b2b: prospects.filter((p) => p.client_type === 'b2b').length,
  }), [prospects])

  // All stages for filter dropdown
  const allStages = useMemo(() => {
    const combined = [...(stages.b2c || []), ...(stages.b2b || [])]
    const unique = []
    const seen = new Set()
    combined.forEach((s) => {
      if (!seen.has(s.slug)) {
        seen.add(s.slug)
        unique.push(s)
      }
    })
    return unique
  }, [stages])

  async function handleCreateOrUpdate(data) {
    setSubmitting(true)
    try {
      if (formModal.prospect) {
        await updateProspect(formModal.prospect.id, data)
        showSuccess('Prospecto actualizado correctamente')
      } else {
        await createProspect(data)
        showSuccess('Prospecto creado correctamente')
      }
      setFormModal({ open: false, prospect: null })
    } catch (err) {
      showError(err.message || 'Error al guardar el prospecto')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteDialog.prospect) return
    setSubmitting(true)
    try {
      await deleteProspect(deleteDialog.prospect.id)
      showSuccess('Prospecto eliminado correctamente')
      setDeleteDialog({ open: false, prospect: null })
    } catch (err) {
      showError(err.message || 'Error al eliminar el prospecto')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  function clearFilters() {
    setSearchQuery('')
    setStageFilter('')
    setClientTypeTab('all')
  }

  const hasActiveFilters = searchQuery || stageFilter || clientTypeTab !== 'all'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Prospectos</h1>
          <p className="text-sm text-[#6B7280]">
            {sortedProspects.length} prospecto{sortedProspects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setFormModal({ open: true, prospect: null })}>
          <Plus size={18} />
          Nuevo prospecto
        </Button>
      </div>

      {/* Tabs + Controls */}
      <div className="bg-white rounded-xl shadow-md transition-shadow duration-200 hover:shadow-lg">
        <div className="px-4 pt-2">
          <Tabs
            activeTab={clientTypeTab}
            onChange={setClientTypeTab}
            tabs={[
              { value: 'all', label: 'Todos', count: counts.all },
              { value: 'b2c', label: 'B2C', count: counts.b2c },
              { value: 'b2b', label: 'B2B', count: counts.b2b },
            ]}
          />
        </div>

        <div className="p-3 md:p-4 flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] md:min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o empresa..."
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 max-w-[140px] md:max-w-none"
          >
            <option value="">Todas las etapas</option>
            {allStages.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(':')
              setSortBy(field)
              setSortDir(dir)
            }}
            className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 max-w-[130px] md:max-w-none"
          >
            <option value="created_at:desc">Más recientes</option>
            <option value="created_at:asc">Más antiguos</option>
            <option value="full_name:asc">Nombre A-Z</option>
            <option value="full_name:desc">Nombre Z-A</option>
            <option value="lead_score:desc">Mayor score</option>
            <option value="estimated_value:desc">Mayor valor</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors duration-200 ${
                viewMode === 'grid' ? 'bg-[#39A1C9] text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors duration-200 ${
                viewMode === 'table' ? 'bg-[#39A1C9] text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List size={16} />
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#EBA055] hover:text-red-700 font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedProspects.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? 'Sin resultados' : 'Sin prospectos aún'}
          description={
            hasActiveFilters
              ? 'No se encontraron prospectos con los filtros aplicados.'
              : 'Crea tu primer prospecto para comenzar a gestionar tu pipeline comercial.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
            ) : (
              <Button onClick={() => setFormModal({ open: true, prospect: null })}>
                <Plus size={18} /> Crear prospecto
              </Button>
            )
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProspects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              showAdvisor={isAdmin}
              onView={(p) => navigate(`/prospects/${p.id}`)}
              onEdit={(p) => setFormModal({ open: true, prospect: p })}
              onDelete={(p) => setDeleteDialog({ open: true, prospect: p })}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left p-4 font-medium text-[#6B7280]">
                    <button onClick={() => toggleSort('full_name')} className="flex items-center gap-1 hover:text-[#333333] transition-colors">
                      Nombre <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-[#6B7280]">Tipo</th>
                  <th className="text-left p-4 font-medium text-[#6B7280]">Contacto</th>
                  <th className="text-left p-4 font-medium text-[#6B7280]">Etapa</th>
                  <th className="text-left p-4 font-medium text-[#6B7280]">
                    <button onClick={() => toggleSort('lead_score')} className="flex items-center gap-1 hover:text-[#333333] transition-colors">
                      Score <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-[#6B7280]">
                    <button onClick={() => toggleSort('estimated_value')} className="flex items-center gap-1 hover:text-[#333333] transition-colors">
                      Valor <ArrowUpDown size={12} />
                    </button>
                  </th>
                  {isAdmin && <th className="text-left p-4 font-medium text-[#6B7280]">Asesor</th>}
                  <th className="text-left p-4 font-medium text-[#6B7280]">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-[#333333] transition-colors">
                      Fecha <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="p-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {sortedProspects.map((prospect) => (
                  <tr
                    key={prospect.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150 cursor-pointer"
                    onClick={() => navigate(`/prospects/${prospect.id}`)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          prospect.client_type === 'b2b' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {getInitials(prospect.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#333333] truncate">{prospect.full_name}</p>
                          {prospect.company_name && (
                            <p className="text-xs text-[#6B7280] truncate">{prospect.company_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={prospect.client_type}>
                        {prospect.client_type === 'b2b' ? 'B2B' : 'B2C'}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-[#6B7280]">
                      {prospect.email && <p className="truncate max-w-[180px]">{prospect.email}</p>}
                      {prospect.phone && <p>{prospect.phone}</p>}
                    </td>
                    <td className="p-4 text-xs font-medium text-[#6B7280]">
                      {allStages.find((s) => s.slug === prospect.pipeline_stage)?.name || prospect.pipeline_stage}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${prospect.lead_score || 0}%`,
                              backgroundColor:
                                prospect.lead_score >= 70 ? '#10B981' :
                                prospect.lead_score >= 40 ? '#F59E0B' : '#6B7280',
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#6B7280]">{prospect.lead_score || 0}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-[#6B7280]">
                      {prospect.estimated_value ? formatCurrency(prospect.estimated_value) : '—'}
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-xs text-[#6B7280]">
                        {prospect.profiles?.full_name || '—'}
                      </td>
                    )}
                    <td className="p-4 text-xs text-[#6B7280]">
                      {formatDate(prospect.created_at)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFormModal({ open: true, prospect })
                        }}
                        className="p-1 text-gray-400 hover:text-[#39A1C9] rounded transition-colors"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, prospect: null })}
        title={formModal.prospect ? 'Editar prospecto' : 'Nuevo prospecto'}
        size="lg"
      >
        <ProspectForm
          prospect={formModal.prospect}
          advisors={advisors}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => setFormModal({ open: false, prospect: null })}
          loading={submitting}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, prospect: null })}
        onConfirm={handleDelete}
        title="Eliminar prospecto"
        message={`¿Estás seguro de eliminar a "${deleteDialog.prospect?.full_name}"? Esta acción no se puede deshacer.`}
        loading={submitting}
      />
    </div>
  )
}

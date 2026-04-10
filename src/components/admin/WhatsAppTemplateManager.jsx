import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MessageCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePipelineContext } from '../../context/PipelineContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import { showSuccess, showError } from '../ui/Toast'

const EMPTY_TEMPLATE = {
  name: '',
  stage_slug: '',
  client_type: 'both',
  message_body: '',
  active: true,
}

// Preview: replace {{nombre}} with example
function previewMessage(body) {
  return (body || '')
    .replace(/\{\{nombre\}\}/gi, 'Maria')
    .replace(/\{\{empresa\}\}/gi, 'Empresa ABC')
    .replace(/\{\{asesor\}\}/gi, 'Tu asesor')
}

export default function WhatsAppTemplateManager() {
  const { stages } = usePipelineContext()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [formModal, setFormModal] = useState({ open: false, template: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null })
  const [form, setForm] = useState(EMPTY_TEMPLATE)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('stage_slug', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      // Table might not exist yet — show empty
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Build stage options for dropdown
  const allStages = [
    ...(stages.b2c || []).map((s) => ({ value: s.slug, label: `B2C — ${s.name}` })),
    ...(stages.b2b || []).map((s) => ({ value: s.slug, label: `B2B — ${s.name}` })),
  ]
  // Deduplicate by slug
  const stageOptions = allStages.filter(
    (s, i, arr) => arr.findIndex((x) => x.value === s.value) === i
  )

  const filteredTemplates = templates.filter((t) => {
    if (filterType !== 'all' && t.client_type !== filterType && t.client_type !== 'both') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        t.name?.toLowerCase().includes(q) ||
        t.message_body?.toLowerCase().includes(q) ||
        t.stage_slug?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by stage
  const groupedTemplates = {}
  filteredTemplates.forEach((t) => {
    const key = t.stage_slug || 'sin_etapa'
    if (!groupedTemplates[key]) groupedTemplates[key] = []
    groupedTemplates[key].push(t)
  })

  function openCreate() {
    setForm(EMPTY_TEMPLATE)
    setErrors({})
    setFormModal({ open: true, template: null })
  }

  function openEdit(template) {
    setForm({
      name: template.name || '',
      stage_slug: template.stage_slug || '',
      client_type: template.client_type || 'both',
      message_body: template.message_body || '',
      active: template.active,
    })
    setErrors({})
    setFormModal({ open: true, template })
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nombre obligatorio'
    if (!form.message_body.trim()) e.message_body = 'El mensaje es obligatorio'
    if (!form.stage_slug) e.stage_slug = 'Selecciona una etapa'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    const isEditing = !!formModal.template
    try {
      const payload = {
        name: form.name.trim(),
        stage_slug: form.stage_slug,
        client_type: form.client_type,
        message_body: form.message_body.trim(),
        active: form.active,
      }

      if (isEditing) {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .update(payload)
          .eq('id', formModal.template.id)
          .select()
          .single()
        if (error) throw error
        setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)))
        showSuccess('Plantilla actualizada')
      } else {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert([payload])
          .select()
          .single()
        if (error) throw error
        setTemplates((prev) => [data, ...prev])
        showSuccess('Plantilla creada')
      }
      setFormModal({ open: false, template: null })
    } catch (err) {
      showError(err.message || 'Error al guardar plantilla')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteDialog.template) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', deleteDialog.template.id)
      if (error) throw error
      setTemplates((prev) => prev.filter((t) => t.id !== deleteDialog.template.id))
      showSuccess('Plantilla eliminada')
      setDeleteDialog({ open: false, template: null })
    } catch (err) {
      showError(err.message || 'Error al eliminar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(template) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update({ active: !template.active })
        .eq('id', template.id)
        .select()
        .single()
      if (error) throw error
      setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)))
      showSuccess(template.active ? 'Plantilla desactivada' : 'Plantilla activada')
    } catch (err) {
      showError(err.message || 'Error al cambiar estado')
    }
  }

  function handleCopy(template) {
    const text = template.message_body
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function getStageName(slug) {
    const stage = stageOptions.find((s) => s.value === slug)
    return stage ? stage.label : slug
  }

  const typeBadge = (type) => {
    const map = {
      b2b: { className: 'bg-purple-100 text-purple-800', label: 'B2B' },
      b2c: { className: 'bg-blue-100 text-blue-800', label: 'B2C' },
      both: { className: 'bg-gray-100 text-gray-700', label: 'Ambos' },
    }
    const c = map[type] || map.both
    return (
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.className}`}>
        {c.label}
      </span>
    )
  }

  // Available variables
  const VARIABLES = [
    { key: 'nombre', label: 'Nombre del prospecto' },
    { key: 'empresa', label: 'Empresa (B2B)' },
    { key: 'asesor', label: 'Nombre del asesor' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#333333] flex items-center gap-2">
            <MessageCircle size={20} className="text-green-500" />
            Plantillas de WhatsApp
          </h2>
          <p className="text-xs text-[#6B7280]">{templates.length} plantillas en total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nueva plantilla
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar plantilla..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
          />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'b2c', label: 'B2C' },
            { value: 'b2b', label: 'B2B' },
            { value: 'both', label: 'Ambos' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                filterType === opt.value
                  ? 'bg-white text-[#333333] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#333333]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates grouped by stage */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-12 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Sin plantillas de WhatsApp"
          description={
            searchQuery
              ? 'No se encontraron plantillas con esa busqueda.'
              : 'Crea la primera plantilla de mensaje para WhatsApp.'
          }
          action={
            !searchQuery && (
              <Button onClick={openCreate}>
                <Plus size={16} /> Crear plantilla
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTemplates).map(([stageSlug, stageTemplates]) => (
            <div key={stageSlug} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Stage header */}
              <button
                onClick={() => setExpandedId(expandedId === stageSlug ? null : stageSlug)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-semibold text-[#333333]">{getStageName(stageSlug)}</span>
                  <span className="text-[10px] text-[#6B7280] bg-gray-200 px-1.5 py-0.5 rounded-full">
                    {stageTemplates.length}
                  </span>
                </div>
                {expandedId === stageSlug ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {/* Templates */}
              {(expandedId === stageSlug || expandedId === null) && (
                <div className="divide-y divide-gray-100">
                  {stageTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`px-5 py-4 ${!template.active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-sm font-medium text-[#333333]">{template.name}</h4>
                            {typeBadge(template.client_type)}
                            {!template.active && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6B7280] whitespace-pre-wrap line-clamp-2">
                            {previewMessage(template.message_body)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(template)}
                            className="p-2 rounded-lg text-[#6B7280] hover:bg-gray-100 transition-colors duration-200"
                            title="Copiar mensaje"
                          >
                            {copiedId === template.id ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                          </button>
                          <button
                            onClick={() => handleToggle(template)}
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              template.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={template.active ? 'Desactivar' : 'Activar'}
                          >
                            <MessageCircle size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(template)}
                            className="p-2 rounded-lg text-[#6B7280] hover:bg-gray-100 transition-colors duration-200"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteDialog({ open: true, template })}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, template: null })}
        title={formModal.template ? 'Editar plantilla de WhatsApp' : 'Nueva plantilla de WhatsApp'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de la plantilla *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="Ej: Saludo inicial B2C"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Etapa del pipeline *"
              value={form.stage_slug}
              onChange={(e) => setForm((f) => ({ ...f, stage_slug: e.target.value }))}
              options={[
                { value: '', label: 'Seleccionar etapa...' },
                ...stageOptions,
              ]}
              error={errors.stage_slug}
            />
            <Select
              label="Tipo de cliente"
              value={form.client_type}
              onChange={(e) => setForm((f) => ({ ...f, client_type: e.target.value }))}
              options={[
                { value: 'both', label: 'Ambos (B2B y B2C)' },
                { value: 'b2c', label: 'Solo B2C' },
                { value: 'b2b', label: 'Solo B2B' },
              ]}
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-1.5">
              Mensaje *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      message_body: (f.message_body || '') + `{{${v.key}}}`,
                    }))
                  }
                  className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200 font-mono hover:bg-green-100 transition-colors"
                  title={v.label}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            <textarea
              value={form.message_body}
              onChange={(e) => setForm((f) => ({ ...f, message_body: e.target.value }))}
              placeholder="Escribe el mensaje de WhatsApp... Usa {{nombre}} para personalizar."
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
            />
            {errors.message_body && (
              <p className="text-xs text-red-500 mt-1">{errors.message_body}</p>
            )}
          </div>

          {/* Preview */}
          {form.message_body && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-[10px] font-medium text-green-700 mb-1">Vista previa:</p>
              <p className="text-sm text-[#333333] whitespace-pre-wrap">
                {previewMessage(form.message_body)}
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            Plantilla activa (visible para asesores)
          </label>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormModal({ open: false, template: null })}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {formModal.template ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, template: null })}
        onConfirm={handleDelete}
        title="Eliminar plantilla"
        message={`Eliminar "${deleteDialog.template?.name}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={submitting}
      />
    </div>
  )
}

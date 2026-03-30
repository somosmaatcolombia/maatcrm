import { useState, useRef } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  Eye,
  EyeOff,
  FileText,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react'
import { useEmailTemplates } from '../../hooks/useEmailTemplates'
import TemplateEditor from '../emails/TemplateEditor'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import { showSuccess, showError } from '../ui/Toast'
import { formatDate } from '../../lib/utils'

const EMPTY_TEMPLATE = {
  name: '',
  subject: '',
  html_body: '',
  design_json: '',
  category: 'general',
  pipeline_stage: '',
  active: true,
}

export default function TemplateManager() {
  const {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,
  } = useEmailTemplates()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formModal, setFormModal] = useState({ open: false, template: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null })
  const [form, setForm] = useState(EMPTY_TEMPLATE)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [editorFullscreen, setEditorFullscreen] = useState(false)
  const [formCollapsed, setFormCollapsed] = useState(false)

  const filteredTemplates = templates.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        t.name?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q)
      )
    }
    return true
  })

  function openCreate() {
    setForm(EMPTY_TEMPLATE)
    setErrors({})
    setEditorFullscreen(false)
    setFormCollapsed(false)
    setFormModal({ open: true, template: null })
  }

  function openEdit(template) {
    setForm({
      name: template.name || '',
      subject: template.subject || '',
      html_body: template.html_body || '',
      design_json: template.design_json || '',
      category: template.category || 'general',
      pipeline_stage: template.pipeline_stage || '',
      active: template.active,
    })
    setErrors({})
    setEditorFullscreen(false)
    setFormCollapsed(false)
    setFormModal({ open: true, template })
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nombre obligatorio'
    if (!form.subject.trim()) e.subject = 'Asunto obligatorio'
    if (!form.html_body.trim()) e.html_body = 'El contenido HTML es obligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) {
      // If fields are hidden (editor fullscreen or collapsed), show them
      if (editorFullscreen || formCollapsed) {
        setFormCollapsed(false)
      }
      return
    }

    setSubmitting(true)
    const isEditing = !!formModal.template
    try {
      const payload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        html_body: form.html_body,
        design_json: form.design_json || null,
        category: form.category,
        pipeline_stage: form.pipeline_stage || null,
        active: form.active,
      }

      if (isEditing) {
        await updateTemplate(formModal.template.id, payload)
        showSuccess('Plantilla actualizada')
      } else {
        await createTemplate(payload)
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
      await deleteTemplate(deleteDialog.template.id)
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
      await toggleTemplateActive(template.id, !template.active)
      showSuccess(template.active ? 'Plantilla desactivada' : 'Plantilla activada')
    } catch (err) {
      showError(err.message || 'Error al cambiar estado')
    }
  }

  function handleCloseModal() {
    setFormModal({ open: false, template: null })
    setEditorFullscreen(false)
    setFormCollapsed(false)
  }

  const categoryBadge = (cat) => {
    const map = {
      b2b: { className: 'bg-purple-100 text-purple-800', label: 'B2B' },
      b2c: { className: 'bg-blue-100 text-blue-800', label: 'B2C' },
      general: { className: 'bg-gray-100 text-gray-700', label: 'General' },
    }
    const c = map[cat] || map.general
    return (
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.className}`}>
        {c.label}
      </span>
    )
  }

  const showFormFields = !editorFullscreen || formCollapsed === false

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#333333]">Plantillas de correo</h2>
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
            { value: 'general', label: 'General' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterCategory(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                filterCategory === opt.value
                  ? 'bg-white text-[#333333] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#333333]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin plantillas"
          description={
            searchQuery
              ? 'No se encontraron plantillas con esa busqueda.'
              : 'Crea la primera plantilla de correo para tus asesores.'
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
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-xl shadow-md p-5 transition-shadow duration-200 hover:shadow-lg ${
                !template.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-[#39A1C9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-semibold text-[#333333] truncate">
                      {template.name}
                    </h4>
                    {categoryBadge(template.category)}
                    {!template.active && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] truncate mb-1">{template.subject}</p>
                  <p className="text-[10px] text-gray-400">
                    Creada {formatDate(template.created_at)}
                    {template.pipeline_stage && (
                      <> · Etapa: <span className="font-medium">{template.pipeline_stage}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(template)}
                    className="p-2 rounded-lg text-[#6B7280] hover:bg-gray-100 transition-colors duration-200"
                    title={template.active ? 'Desactivar' : 'Activar'}
                  >
                    {template.active ? <EyeOff size={15} /> : <Eye size={15} />}
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={handleCloseModal}
        title={formModal.template ? 'Editar plantilla' : 'Nueva plantilla'}
        size="full"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Collapsible form fields - always accessible */}
          {editorFullscreen ? (
            <>
              {/* Compact header with template name and save button */}
              <div className="flex items-center justify-between gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setFormCollapsed(!formCollapsed)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#333333] transition-colors shrink-0"
                  >
                    {formCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    {formCollapsed ? 'Mostrar campos' : 'Ocultar campos'}
                  </button>
                  <span className="text-xs text-[#333333] font-medium truncate">
                    {form.name || 'Sin nombre'}
                  </span>
                  {categoryBadge(form.category)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" loading={submitting}>
                    <Save size={13} />
                    Guardar
                  </Button>
                </div>
              </div>

              {/* Expandable fields */}
              {formCollapsed && (
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nombre *"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      error={errors.name}
                      placeholder="Ej: Bienvenida B2C"
                    />
                    <Select
                      label="Categoria *"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      options={[
                        { value: 'general', label: 'General' },
                        { value: 'b2c', label: 'B2C' },
                        { value: 'b2b', label: 'B2B' },
                      ]}
                    />
                  </div>
                  <Input
                    label="Asunto *"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    error={errors.subject}
                    placeholder="Ej: Hola {{nombre}}! Bienvenido a MAAT"
                  />
                  <Input
                    label="Etapa del pipeline (opcional)"
                    value={form.pipeline_stage}
                    onChange={(e) => setForm((f) => ({ ...f, pipeline_stage: e.target.value }))}
                    placeholder="Ej: lead_nuevo, contactado..."
                  />
                  <label className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                      className="rounded border-gray-300 text-[#39A1C9] focus:ring-[#39A1C9]"
                    />
                    Plantilla activa
                  </label>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre de la plantilla *"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  error={errors.name}
                  placeholder="Ej: Bienvenida B2C"
                />
                <Select
                  label="Categoria *"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  options={[
                    { value: 'general', label: 'General' },
                    { value: 'b2c', label: 'B2C' },
                    { value: 'b2b', label: 'B2B' },
                  ]}
                />
              </div>

              <Input
                label="Asunto del correo *"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                error={errors.subject}
                placeholder="Ej: Hola {{nombre}}! Bienvenido a MAAT"
              />

              <Input
                label="Etapa del pipeline (opcional)"
                value={form.pipeline_stage}
                onChange={(e) => setForm((f) => ({ ...f, pipeline_stage: e.target.value }))}
                placeholder="Ej: lead_nuevo, contactado, calificado..."
              />
            </>
          )}

          <div>
            {!editorFullscreen && (
              <>
                <label className="block text-sm font-medium text-[#333333] mb-1.5">
                  Contenido HTML *
                </label>
                {errors.html_body && (
                  <p className="text-xs text-red-500 mb-1.5">{errors.html_body}</p>
                )}
              </>
            )}
            <TemplateEditor
              value={form.html_body}
              onChange={(val) => setForm((f) => ({ ...f, html_body: val }))}
              designJson={form.design_json}
              onDesignChange={(val) => setForm((f) => ({ ...f, design_json: val }))}
              onEditorModeChange={(isVisual) => {
                setEditorFullscreen(isVisual)
                setFormCollapsed(false)
              }}
            />
          </div>

          {!editorFullscreen && (
            <>
              <label className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded border-gray-300 text-[#39A1C9] focus:ring-[#39A1C9]"
                />
                Plantilla activa (visible para asesores)
              </label>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={submitting}>
                  {formModal.template ? 'Guardar cambios' : 'Crear plantilla'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, template: null })}
        onConfirm={handleDelete}
        title="Eliminar plantilla"
        message={`¿Eliminar "${deleteDialog.template?.name}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={submitting}
      />
    </div>
  )
}

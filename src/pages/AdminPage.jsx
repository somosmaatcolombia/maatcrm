import { useState } from 'react'
import {
  Shield,
  UserPlus,
  Pencil,
  UserX,
  UserCheck,
  Search,
  Mail,
  Phone,
  Users,
  FileText,
} from 'lucide-react'
import { useAdvisors } from '../hooks/useAdvisors'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TemplateManager from '../components/admin/TemplateManager'
import WhatsAppTemplateManager from '../components/admin/WhatsAppTemplateManager'
import { showSuccess, showError } from '../components/ui/Toast'
import { getInitials, formatDate } from '../lib/utils'

const EMPTY_ADVISOR = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'advisor',
}

export default function AdminPage() {
  const { advisors, loading, createAdvisor, updateAdvisor, toggleAdvisorActive } = useAdvisors()

  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formModal, setFormModal] = useState({ open: false, advisor: null })
  const [toggleDialog, setToggleDialog] = useState({ open: false, advisor: null })
  const [form, setForm] = useState(EMPTY_ADVISOR)
  const [editForm, setEditForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const filteredAdvisors = advisors.filter((a) => {
    if (!showInactive && !a.active) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q)
      )
    }
    return true
  })

  function openCreate() {
    setForm(EMPTY_ADVISOR)
    setErrors({})
    setFormModal({ open: true, advisor: null })
  }

  function openEdit(advisor) {
    setEditForm({
      full_name: advisor.full_name,
      phone: advisor.phone || '',
      role: advisor.role,
    })
    setErrors({})
    setFormModal({ open: true, advisor })
  }

  function validateCreate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Nombre obligatorio'
    if (!form.email.trim()) e.email = 'Email obligatorio'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email no válido'
    if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateEdit() {
    const e = {}
    if (!editForm.full_name?.trim()) e.full_name = 'Nombre obligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate(evt) {
    evt.preventDefault()
    if (!validateCreate()) return
    setSubmitting(true)
    try {
      await createAdvisor(form)
      showSuccess('Asesor creado correctamente')
      setFormModal({ open: false, advisor: null })
    } catch (err) {
      showError(err.message || 'Error al crear asesor')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(evt) {
    evt.preventDefault()
    if (!validateEdit()) return
    setSubmitting(true)
    try {
      await updateAdvisor(formModal.advisor.id, editForm)
      showSuccess('Asesor actualizado correctamente')
      setFormModal({ open: false, advisor: null })
    } catch (err) {
      showError(err.message || 'Error al actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive() {
    if (!toggleDialog.advisor) return
    setSubmitting(true)
    try {
      const newActive = !toggleDialog.advisor.active
      await toggleAdvisorActive(toggleDialog.advisor.id, newActive)
      showSuccess(
        newActive ? 'Asesor reactivado' : 'Asesor desactivado'
      )
      setToggleDialog({ open: false, advisor: null })
    } catch (err) {
      showError(err.message || 'Error al cambiar estado')
    } finally {
      setSubmitting(false)
    }
  }

  const isEditing = !!formModal.advisor
  const [adminTab, setAdminTab] = useState('advisors')

  const adminTabs = [
    { value: 'advisors', label: 'Asesores' },
    { value: 'templates', label: 'Plantillas de correo' },
    { value: 'whatsapp', label: 'Plantillas de WhatsApp' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Administración</h1>
          <p className="text-sm text-[#6B7280]">Gestión de asesores y configuración del sistema</p>
        </div>
        {adminTab === 'advisors' && (
          <Button onClick={openCreate}>
            <UserPlus size={18} />
            Nuevo asesor
          </Button>
        )}
      </div>

      {/* Section Tabs */}
      <Tabs tabs={adminTabs} activeTab={adminTab} onChange={setAdminTab} />

      {/* Templates Section */}
      {adminTab === 'templates' && <TemplateManager />}

      {/* WhatsApp Templates Section */}
      {adminTab === 'whatsapp' && <WhatsAppTemplateManager />}

      {/* Advisors Section */}
      {adminTab === 'advisors' && <>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-md p-4 transition-shadow duration-200 hover:shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-[#39A1C9] focus:ring-[#39A1C9]"
            />
            Mostrar inactivos
          </label>
          <span className="text-xs text-[#6B7280]">
            {filteredAdvisors.length} de {advisors.length} asesores
          </span>
        </div>
      </div>

      {/* Advisors list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAdvisors.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Sin asesores"
          description="Crea el primer asesor para que pueda gestionar prospectos."
          action={<Button onClick={openCreate}><UserPlus size={18} /> Crear asesor</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdvisors.map((advisor) => (
            <div
              key={advisor.id}
              className={`bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg ${
                !advisor.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#39A1C9] flex items-center justify-center text-white font-bold shadow-md">
                    {getInitials(advisor.full_name)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#333333]">
                      {advisor.full_name}
                    </h4>
                    <Badge variant={advisor.role === 'admin' ? 'warning' : 'default'}>
                      {advisor.role === 'admin' ? 'Administrador' : 'Asesor'}
                    </Badge>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  advisor.active ? 'bg-green-500' : 'bg-gray-300'
                }`} title={advisor.active ? 'Activo' : 'Inactivo'} />
              </div>

              <div className="space-y-1.5 text-xs text-[#6B7280] mb-4">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="shrink-0" />
                  <span className="truncate">{advisor.email}</span>
                </div>
                {advisor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="shrink-0" />
                    <span>{advisor.phone}</span>
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  Desde {formatDate(advisor.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(advisor)}
                  className="flex-1"
                >
                  <Pencil size={14} /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToggleDialog({ open: true, advisor })}
                  className={`flex-1 ${advisor.active ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                >
                  {advisor.active ? (
                    <><UserX size={14} /> Desactivar</>
                  ) : (
                    <><UserCheck size={14} /> Activar</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, advisor: null })}
        title={isEditing ? 'Editar asesor' : 'Nuevo asesor'}
        size="md"
      >
        <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-4">
          {!isEditing ? (
            <>
              <Input
                label="Nombre completo *"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                error={errors.fullName}
                placeholder="María López"
              />
              <Input
                label="Correo electrónico *"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                error={errors.email}
                placeholder="maria@maat.com"
              />
              <Input
                label="Contraseña *"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                error={errors.password}
                placeholder="Mínimo 6 caracteres"
              />
              <Input
                label="Teléfono"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+52 55 1234 5678"
              />
              <Select
                label="Rol"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                options={[
                  { value: 'advisor', label: 'Asesor' },
                  { value: 'admin', label: 'Administrador' },
                ]}
              />
            </>
          ) : (
            <>
              <Input
                label="Nombre completo *"
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                error={errors.full_name}
              />
              <Input
                label="Teléfono"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Select
                label="Rol"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                options={[
                  { value: 'advisor', label: 'Asesor' },
                  { value: 'admin', label: 'Administrador' },
                ]}
              />
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormModal({ open: false, advisor: null })}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {isEditing ? 'Guardar cambios' : 'Crear asesor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle active confirm */}
      <ConfirmDialog
        isOpen={toggleDialog.open}
        onClose={() => setToggleDialog({ open: false, advisor: null })}
        onConfirm={handleToggleActive}
        title={toggleDialog.advisor?.active ? 'Desactivar asesor' : 'Reactivar asesor'}
        message={
          toggleDialog.advisor?.active
            ? `¿Desactivar a "${toggleDialog.advisor?.full_name}"? No podrá iniciar sesión hasta ser reactivado.`
            : `¿Reactivar a "${toggleDialog.advisor?.full_name}"? Podrá volver a iniciar sesión.`
        }
        confirmLabel={toggleDialog.advisor?.active ? 'Desactivar' : 'Reactivar'}
        loading={submitting}
      />
    </div>
  )
}

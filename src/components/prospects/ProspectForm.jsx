import { useState, useEffect } from 'react'
import { Building2, User } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { useAuthContext } from '../../context/AuthContext'
import { usePipelineContext } from '../../context/PipelineContext'
import {
  CLIENT_TYPES,
  LEAD_SOURCES,
  COMPANY_SIZES,
  COUNTRIES,
} from '../../lib/constants'

const EMPTY_FORM = {
  client_type: 'b2c',
  full_name: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  company_name: '',
  company_size: '',
  job_title: '',
  pipeline_stage: 'lead_nuevo',
  lead_score: 0,
  lead_source: '',
  estimated_value: '',
  next_contact_date: '',
  tags: [],
  advisor_id: '',
}

export default function ProspectForm({ prospect, advisors = [], onSubmit, onCancel, loading }) {
  const { profile, isAdmin } = useAuthContext()
  const { stages } = usePipelineContext()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const isEditing = !!prospect

  useEffect(() => {
    if (prospect) {
      setForm({
        ...EMPTY_FORM,
        ...prospect,
        estimated_value: prospect.estimated_value ?? '',
        next_contact_date: prospect.next_contact_date ?? '',
        advisor_id: prospect.advisor_id || '',
        tags: prospect.tags || [],
      })
    } else {
      setForm({ ...EMPTY_FORM, advisor_id: profile?.id || '' })
    }
  }, [prospect, profile?.id])

  const isB2B = form.client_type === CLIENT_TYPES.B2B

  const currentStages = isB2B ? stages.b2b : stages.b2c

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  function validate() {
    const newErrors = {}
    if (!form.full_name.trim()) newErrors.full_name = 'El nombre es obligatorio'
    if (!form.client_type) newErrors.client_type = 'Selecciona un tipo'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email no válido'
    }
    if (isB2B && !form.company_name?.trim()) {
      newErrors.company_name = 'La empresa es obligatoria para B2B'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    const data = {
      ...form,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      next_contact_date: form.next_contact_date || null,
      lead_score: Number(form.lead_score) || 0,
      advisor_id: form.advisor_id || profile?.id,
    }

    // Remove fields not in the DB
    delete data.profiles
    delete data.id
    delete data.created_at
    delete data.updated_at

    onSubmit(data)
  }

  const sourceOptions = LEAD_SOURCES.map((s) => ({ value: s, label: s }))
  const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }))
  const sizeOptions = COMPANY_SIZES.map((s) => ({ value: s, label: `${s} empleados` }))
  const stageOptions = currentStages.map((s) => ({ value: s.slug, label: s.name }))
  const advisorOptions = advisors
    .filter((a) => a.active)
    .map((a) => ({ value: a.id, label: a.full_name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client type selector */}
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-2">
          Tipo de cliente
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              handleChange('client_type', 'b2c')
              handleChange('pipeline_stage', 'lead_nuevo')
            }}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
              !isB2B
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <User size={18} />
            B2C — Persona
          </button>
          <button
            type="button"
            onClick={() => {
              handleChange('client_type', 'b2b')
              handleChange('pipeline_stage', 'lead_nuevo')
            }}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
              isB2B
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Building2 size={18} />
            B2B — Empresa
          </button>
        </div>
        {errors.client_type && (
          <p className="text-xs text-red-500 mt-1">{errors.client_type}</p>
        )}
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre completo *"
          value={form.full_name}
          onChange={(e) => handleChange('full_name', e.target.value)}
          error={errors.full_name}
          placeholder="Juan Pérez"
        />
        <Input
          label="Correo electrónico"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="juan@empresa.com"
        />
        <Input
          label="Teléfono"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+52 55 1234 5678"
        />
        <Input
          label="Cargo / Puesto"
          value={form.job_title}
          onChange={(e) => handleChange('job_title', e.target.value)}
          placeholder="Director de Marketing"
        />
      </div>

      {/* B2B-specific fields */}
      {isB2B && (
        <div className="bg-purple-50/50 rounded-lg p-4 space-y-4 border border-purple-100">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
            Datos de empresa
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de empresa *"
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              error={errors.company_name}
              placeholder="Empresa S.A. de C.V."
            />
            <Select
              label="Tamaño de empresa"
              value={form.company_size}
              onChange={(e) => handleChange('company_size', e.target.value)}
              options={sizeOptions}
              placeholder="Seleccionar..."
            />
          </div>
        </div>
      )}

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="País"
          value={form.country}
          onChange={(e) => handleChange('country', e.target.value)}
          options={countryOptions}
          placeholder="Seleccionar país..."
        />
        <Input
          label="Ciudad"
          value={form.city}
          onChange={(e) => handleChange('city', e.target.value)}
          placeholder="Ciudad de México"
        />
      </div>

      {/* Pipeline & Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Etapa del pipeline"
          value={form.pipeline_stage}
          onChange={(e) => handleChange('pipeline_stage', e.target.value)}
          options={stageOptions}
          placeholder="Seleccionar etapa..."
        />
        <Select
          label="Fuente del lead"
          value={form.lead_source}
          onChange={(e) => handleChange('lead_source', e.target.value)}
          options={sourceOptions}
          placeholder="¿Cómo nos conoció?"
        />
      </div>

      {/* Score & Value */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[#333333]">
            Lead Score ({form.lead_score})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={form.lead_score}
            onChange={(e) => handleChange('lead_score', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#39A1C9]"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        <Input
          label="Valor estimado (USD)"
          type="number"
          value={form.estimated_value}
          onChange={(e) => handleChange('estimated_value', e.target.value)}
          placeholder="5000"
        />
        <Input
          label="Próximo contacto"
          type="date"
          value={form.next_contact_date}
          onChange={(e) => handleChange('next_contact_date', e.target.value)}
        />
      </div>

      {/* Advisor assignment (admin only) */}
      {isAdmin && advisorOptions.length > 0 && (
        <Select
          label="Asesor asignado"
          value={form.advisor_id}
          onChange={(e) => handleChange('advisor_id', e.target.value)}
          options={advisorOptions}
          placeholder="Seleccionar asesor..."
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {isEditing ? 'Guardar cambios' : 'Crear prospecto'}
        </Button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import {
  Phone,
  Mail,
  MessageCircle,
  Users,
  StickyNote,
  Plus,
  X,
} from 'lucide-react'
import Button from '../ui/Button'
import { ACTIVITY_TYPES } from '../../lib/constants'

const ACTIVITY_TYPE_OPTIONS = [
  {
    value: ACTIVITY_TYPES.CALL,
    label: 'Llamada',
    icon: Phone,
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    activeColor: 'bg-blue-500 text-white border-blue-500',
  },
  {
    value: ACTIVITY_TYPES.EMAIL,
    label: 'Email',
    icon: Mail,
    color: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    activeColor: 'bg-indigo-500 text-white border-indigo-500',
  },
  {
    value: ACTIVITY_TYPES.WHATSAPP,
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-green-100 text-green-600 border-green-200',
    activeColor: 'bg-green-500 text-white border-green-500',
  },
  {
    value: ACTIVITY_TYPES.MEETING,
    label: 'Reunión',
    icon: Users,
    color: 'bg-purple-100 text-purple-600 border-purple-200',
    activeColor: 'bg-purple-500 text-white border-purple-500',
  },
  {
    value: ACTIVITY_TYPES.NOTE,
    label: 'Nota',
    icon: StickyNote,
    color: 'bg-amber-100 text-amber-600 border-amber-200',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
]

export default function ActivityForm({ onSubmit, loading }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES.NOTE)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function resetForm() {
    setActivityType(ACTIVITY_TYPES.NOTE)
    setTitle('')
    setDescription('')
    setError('')
  }

  function handleCancel() {
    resetForm()
    setIsOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }

    try {
      await onSubmit({
        activity_type: activityType,
        title: title.trim(),
        description: description.trim() || null,
      })
      resetForm()
      setIsOpen(false)
    } catch (err) {
      setError(err.message || 'Error al registrar la actividad.')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-[#6B7280] hover:border-[#39A1C9]/30 hover:text-[#39A1C9] transition-all duration-200"
      >
        <Plus size={16} />
        Registrar actividad
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[#333333]">Nueva actividad</h4>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Activity type selector */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ACTIVITY_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = activityType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActivityType(option.value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                isActive ? option.activeColor : option.color
              }`}
            >
              <Icon size={12} />
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la actividad"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 mb-2"
        autoFocus
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción o notas (opcional)"
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-none mb-2"
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          <Plus size={14} />
          Registrar
        </Button>
      </div>
    </form>
  )
}

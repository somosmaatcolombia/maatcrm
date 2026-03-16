import {
  Phone,
  Mail,
  MessageCircle,
  Users,
  StickyNote,
  ArrowRightLeft,
  Clock,
} from 'lucide-react'
import { formatRelativeDate } from '../../lib/utils'

const ACTIVITY_CONFIG = {
  call: {
    icon: Phone,
    label: 'Llamada',
    color: 'bg-blue-100 text-blue-600',
    lineColor: 'bg-blue-200',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'bg-indigo-100 text-indigo-600',
    lineColor: 'bg-indigo-200',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'bg-green-100 text-green-600',
    lineColor: 'bg-green-200',
  },
  meeting: {
    icon: Users,
    label: 'Reunión',
    color: 'bg-purple-100 text-purple-600',
    lineColor: 'bg-purple-200',
  },
  note: {
    icon: StickyNote,
    label: 'Nota',
    color: 'bg-amber-100 text-amber-600',
    lineColor: 'bg-amber-200',
  },
  stage_change: {
    icon: ArrowRightLeft,
    label: 'Cambio de etapa',
    color: 'bg-gray-100 text-gray-600',
    lineColor: 'bg-gray-200',
  },
}

function ActivityItem({ activity, isLast }) {
  const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.note
  const Icon = config.icon
  const advisorName = activity.profiles?.full_name || 'Sistema'

  return (
    <div className="flex gap-3">
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
          <Icon size={14} />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[24px] ${config.lineColor}`} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isLast ? 'pb-5' : 'pb-1'}`}>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#333333]">
              {activity.title}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>

        {activity.description && (
          <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">
            {activity.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1">
            <Clock size={10} />
            {formatRelativeDate(activity.created_at)}
          </span>
          <span className="text-[10px] text-[#6B7280]">
            por {advisorName}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ActivityTimeline({ activities, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pb-5">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-2 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Clock size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-[#6B7280]">
          Aún no hay actividades registradas.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Registra la primera interacción con este prospecto.
        </p>
      </div>
    )
  }

  return (
    <div>
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  )
}

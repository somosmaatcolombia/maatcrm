import {
  Users,
  UserPlus,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { formatCurrency, formatCompactNumber } from '../../lib/utils'

const CARDS_CONFIG = [
  {
    key: 'activeProspects',
    label: 'Prospectos activos',
    icon: Users,
    color: 'text-[#39A1C9]',
    bg: 'bg-blue-50',
    format: (v) => String(v),
  },
  {
    key: 'newThisWeek',
    label: 'Nuevos esta semana',
    icon: UserPlus,
    color: 'text-green-600',
    bg: 'bg-green-50',
    format: (v) => String(v),
  },
  {
    key: 'conversionRate',
    label: 'Tasa de conversión',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    format: (v) => `${v}%`,
  },
  {
    key: 'pipelineValue',
    label: 'Valor del pipeline',
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    format: (v) => formatCurrency(v),
  },
  {
    key: 'overdueContacts',
    label: 'Contactos vencidos',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    format: (v) => String(v),
    highlight: (v) => v > 0,
  },
  {
    key: 'activitiesThisWeek',
    label: 'Actividades esta semana',
    icon: Activity,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    format: (v) => String(v),
  },
]

export default function MetricsCards({ metrics, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {CARDS_CONFIG.map((c) => (
          <div key={c.key} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
            <div className="w-9 h-9 bg-gray-100 rounded-lg mb-3" />
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS_CONFIG.map((card) => {
        const Icon = card.icon
        const value = metrics[card.key] ?? 0
        const isHighlighted = card.highlight?.(value)
        return (
          <div
            key={card.key}
            className={`bg-white rounded-xl shadow-md p-5 transition-shadow duration-200 hover:shadow-lg ${
              isHighlighted ? 'ring-2 ring-red-300' : ''
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-[#333333] leading-none mb-1">
              {card.format(value)}
            </p>
            <p className="text-[11px] text-[#6B7280] font-medium">{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}

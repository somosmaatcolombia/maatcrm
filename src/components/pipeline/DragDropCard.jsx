import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { Phone, Clock, GripVertical, MessageCircle, AlertTriangle } from 'lucide-react'
import Badge from '../ui/Badge'
import { getInitials, getWhatsAppLink, isOverdue } from '../../lib/utils'
import { getDefaultStageMessage } from '../../lib/whatsappMessages'
import { differenceInDays, parseISO } from 'date-fns'

function getDaysInStage(updatedAt) {
  if (!updatedAt) return 0
  const date = typeof updatedAt === 'string' ? parseISO(updatedAt) : updatedAt
  return differenceInDays(new Date(), date)
}

function getDaysColor(days) {
  if (days <= 3) return 'text-green-600 bg-green-50'
  if (days <= 7) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export default function DragDropCard({ prospect, overlay = false }) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: prospect.id,
    data: {
      type: 'prospect',
      prospect,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const daysInStage = getDaysInStage(prospect.updated_at)
  const daysColorClass = getDaysColor(daysInStage)
  const isB2B = prospect.client_type === 'b2b'
  const contactOverdue = isOverdue(prospect.next_contact_date)

  const cardContent = (
    <div
      className={`bg-white rounded-lg border p-3 transition-all duration-200 group cursor-grab active:cursor-grabbing ${
        contactOverdue
          ? 'border-red-300 ring-1 ring-red-200'
          : 'border-gray-100'
      } ${
        isDragging
          ? 'opacity-40 shadow-none'
          : 'shadow-sm hover:shadow-md'
      } ${overlay ? 'shadow-xl ring-2 ring-[#39A1C9]/20 rotate-2 scale-105' : ''}`}
    >
      {/* Top row: drag handle + name + badge */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="mt-0.5 text-gray-300 hover:text-gray-500 transition-colors shrink-0 touch-none"
          {...listeners}
          {...attributes}
        >
          <GripVertical size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                isB2B ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {getInitials(prospect.full_name)}
            </div>
            <button
              onClick={() => navigate(`/prospects/${prospect.id}`)}
              className="text-sm font-semibold text-[#333333] truncate hover:text-[#39A1C9] transition-colors text-left"
            >
              {prospect.full_name}
            </button>
          </div>
          {prospect.company_name && (
            <p className="text-[10px] text-purple-600 truncate pl-[30px]">
              {prospect.company_name}
            </p>
          )}
        </div>
        <Badge variant={prospect.client_type} className="shrink-0 text-[10px] px-1.5 py-0">
          {isB2B ? 'B2B' : 'B2C'}
        </Badge>
      </div>

      {/* Phone */}
      {prospect.phone && (
        <div className="flex items-center gap-1.5 mb-2 pl-[22px]">
          <Phone size={11} className="text-gray-400 shrink-0" />
          <span className="text-[11px] text-[#6B7280] truncate">{prospect.phone}</span>
          <a
            href={getWhatsAppLink(prospect.phone, getDefaultStageMessage(prospect.pipeline_stage, prospect.full_name))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-green-500 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Abrir WhatsApp"
          >
            <MessageCircle size={13} />
          </a>
        </div>
      )}

      {/* Overdue alert */}
      {contactOverdue && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 rounded px-1.5 py-0.5 mb-2 ml-[22px] w-fit border border-red-200">
          <AlertTriangle size={10} />
          Contacto vencido
        </div>
      )}

      {/* Bottom row: lead score bar + days */}
      <div className="flex items-center gap-2 pl-[22px]">
        {/* Lead score */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${prospect.lead_score || 0}%`,
                backgroundColor:
                  prospect.lead_score >= 70 ? '#10B981' :
                  prospect.lead_score >= 40 ? '#F59E0B' : '#6B7280',
              }}
            />
          </div>
          <span className="text-[10px] text-[#6B7280] font-medium tabular-nums w-5 text-right">
            {prospect.lead_score || 0}
          </span>
        </div>

        {/* Days in stage */}
        <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${daysColorClass}`}>
          <Clock size={10} />
          {daysInStage}d
        </div>
      </div>
    </div>
  )

  if (overlay) {
    return cardContent
  }

  return (
    <div ref={setNodeRef} style={style}>
      {cardContent}
    </div>
  )
}

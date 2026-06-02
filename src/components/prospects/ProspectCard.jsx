import { Mail, Phone, Building2, MapPin, Calendar, MoreVertical, Eye, Pencil, Trash2, AlertTriangle, MessageCircle, StickyNote } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import Badge from '../ui/Badge'
import { formatDate, formatCurrency, getInitials, isOverdue } from '../../lib/utils'

export default function ProspectCard({ prospect, onView, onEdit, onDelete, showAdvisor = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const isB2B = prospect.client_type === 'b2b'
  const contactOverdue = isOverdue(prospect.next_contact_date)

  function handleCardClick(e) {
    // Don't navigate if clicking on the menu or its buttons
    if (menuRef.current && menuRef.current.contains(e.target)) return
    onView?.(prospect)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-xl shadow-md p-5 transition-all duration-200 hover:shadow-lg cursor-pointer group ${
        contactOverdue ? 'ring-2 ring-red-300 ring-offset-1' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              isB2B
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {getInitials(prospect.full_name)}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#333333] truncate group-hover:text-[#39A1C9] transition-colors duration-200">
              {prospect.full_name}
            </h4>
            {prospect.job_title && (
              <p className="text-xs text-[#6B7280] truncate">{prospect.job_title}</p>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="p-1.5 text-gray-400 hover:text-[#333333] rounded-md hover:bg-gray-100 transition-colors duration-200 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-100 py-1 w-40 z-20">
              <button
                onClick={(e) => { e.stopPropagation(); onView?.(prospect); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#333333] hover:bg-gray-50 transition-colors"
              >
                <Eye size={14} /> Ver detalle
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(prospect); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#333333] hover:bg-gray-50 transition-colors"
              >
                <Pencil size={14} /> Editar
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(prospect); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant={prospect.client_type}>
          {isB2B ? 'B2B' : 'B2C'}
        </Badge>
        {contactOverdue && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
            <AlertTriangle size={10} />
            Contacto vencido
          </span>
        )}
        {prospect.lead_source && (
          <Badge variant="default">{prospect.lead_source}</Badge>
        )}
        {prospect.estimated_value && (
          <Badge variant="success">{formatCurrency(prospect.estimated_value)}</Badge>
        )}
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 text-xs text-[#6B7280]">
        {isB2B && prospect.company_name && (
          <div className="flex items-center gap-2">
            <Building2 size={13} className="shrink-0 text-purple-500" />
            <span className="truncate">{prospect.company_name}</span>
          </div>
        )}
        {prospect.email && (
          <a
            href={`mailto:${prospect.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:text-[#39A1C9] transition-colors"
          >
            <Mail size={13} className="shrink-0" />
            <span className="truncate">{prospect.email}</span>
          </a>
        )}
        {prospect.phone && (
          <a
            href={`tel:${prospect.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:text-[#39A1C9] transition-colors"
            title="Llamar"
          >
            <Phone size={13} className="shrink-0" />
            <span>{prospect.phone}</span>
          </a>
        )}
        {prospect.whatsapp && (
          <a
            href={`https://wa.me/${prospect.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:text-green-600 transition-colors"
            title="Abrir WhatsApp"
          >
            <MessageCircle size={13} className="shrink-0 text-green-500" />
            <span>{prospect.whatsapp}</span>
          </a>
        )}
        {(prospect.city || prospect.country) && (
          <div className="flex items-center gap-2">
            <MapPin size={13} className="shrink-0" />
            <span>{[prospect.city, prospect.country].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {prospect.notes && (
          <div className="flex items-start gap-2 pt-1 border-t border-gray-100 mt-1">
            <StickyNote size={13} className="shrink-0 mt-0.5 text-amber-500" />
            <span className="text-[11px] line-clamp-2 italic">{prospect.notes}</span>
          </div>
        )}
        {prospect.next_contact_date && (
          <div className={`flex items-center gap-2 ${contactOverdue ? 'text-red-600 font-medium' : ''}`}>
            <Calendar size={13} className={`shrink-0 ${contactOverdue ? 'text-red-500' : 'text-amber-500'}`} />
            <span>{contactOverdue ? 'Vencido: ' : 'Proximo contacto: '}{formatDate(prospect.next_contact_date)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {/* Lead score bar */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${prospect.lead_score || 0}%`,
                backgroundColor:
                  prospect.lead_score >= 70 ? '#10B981' :
                  prospect.lead_score >= 40 ? '#F59E0B' : '#6B7280',
              }}
            />
          </div>
          <span className="text-[10px] text-[#6B7280] font-medium">{prospect.lead_score || 0}</span>
        </div>

        {showAdvisor && prospect.profiles?.full_name && (
          <span className="text-[10px] text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded-full">
            {prospect.profiles.full_name}
          </span>
        )}
      </div>
    </div>
  )
}

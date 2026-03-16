import { useState, useRef, useEffect } from 'react'
import { MessageCircle, ChevronDown, ExternalLink } from 'lucide-react'
import { getWhatsAppLink } from '../../lib/utils'
import { getStageMessages, getDefaultStageMessage } from '../../lib/whatsappMessages'

export default function WhatsAppPicker({ phone, prospectName, pipelineStage, size = 'md' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const messages = getStageMessages(pipelineStage)
  const firstName = prospectName?.split(' ')[0] || ''
  const hasMultiple = messages.length > 1

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!phone) return null

  // Single message — just a link
  if (!hasMultiple) {
    const defaultMsg = getDefaultStageMessage(pipelineStage, prospectName)
    return (
      <a
        href={getWhatsAppLink(phone, defaultMsg)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors duration-200 ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        }`}
      >
        <MessageCircle size={size === 'sm' ? 14 : 16} />
        WhatsApp
      </a>
    )
  }

  // Multiple messages — dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className={`inline-flex items-center gap-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors duration-200 ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        }`}
      >
        <MessageCircle size={size === 'sm' ? 14 : 16} />
        WhatsApp
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-72 z-30 animate-in fade-in zoom-in-95">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold border-b border-gray-100 mb-1">
            Selecciona un mensaje
          </p>
          {messages.map((msg, i) => {
            const text = msg.getMessage(firstName)
            return (
              <a
                key={i}
                href={getWhatsAppLink(phone, text)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-green-50 transition-colors duration-150 group"
              >
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle size={13} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#333333] mb-0.5 flex items-center gap-1">
                    {msg.label}
                    <ExternalLink size={9} className="text-gray-300 group-hover:text-green-500 transition-colors" />
                  </p>
                  <p className="text-[10px] text-[#6B7280] line-clamp-2 leading-relaxed">
                    {text}
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

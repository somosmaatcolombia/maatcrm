import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose?.()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscape)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  }

  const isFullSize = size === 'full'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content */}
      <div
        className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} mx-4 ${isFullSize ? 'max-h-[95vh]' : 'max-h-[90vh]'} flex flex-col animate-in fade-in zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-semibold text-[#333333]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-[#333333] rounded-lg hover:bg-gray-100 transition-colors duration-200"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

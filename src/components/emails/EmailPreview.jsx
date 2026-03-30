import { useRef, useEffect, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'

export default function EmailPreview({ html, className = '' }) {
  const iframeRef = useRef(null)
  const [viewSize, setViewSize] = useState('desktop') // 'desktop' | 'mobile'

  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    doc.open()
    doc.write(
      html ||
        '<p style="color:#6B7280;text-align:center;padding:40px;font-family:sans-serif;">Sin contenido para previsualizar</p>'
    )
    doc.close()
  }, [html])

  return (
    <div className="space-y-2">
      {/* Size toggle */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setViewSize('desktop')}
          className={`p-1.5 rounded-md transition-colors ${
            viewSize === 'desktop'
              ? 'bg-gray-200 text-[#333333]'
              : 'text-gray-400 hover:text-[#333333]'
          }`}
          title="Vista escritorio"
        >
          <Monitor size={14} />
        </button>
        <button
          type="button"
          onClick={() => setViewSize('mobile')}
          className={`p-1.5 rounded-md transition-colors ${
            viewSize === 'mobile'
              ? 'bg-gray-200 text-[#333333]'
              : 'text-gray-400 hover:text-[#333333]'
          }`}
          title="Vista movil"
        >
          <Smartphone size={14} />
        </button>
      </div>

      {/* Preview iframe */}
      <div className={`flex justify-center ${className}`}>
        <iframe
          ref={iframeRef}
          title="Email preview"
          className="border border-gray-200 rounded-lg bg-white transition-all duration-300"
          style={{
            width: viewSize === 'mobile' ? 375 : '100%',
            height: '100%',
            minHeight: 300,
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}

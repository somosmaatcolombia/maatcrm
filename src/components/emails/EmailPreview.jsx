import { useRef, useEffect } from 'react'

export default function EmailPreview({ html, className = '' }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    doc.open()
    doc.write(html || '<p style="color:#6B7280;text-align:center;padding:40px;font-family:sans-serif;">Sin contenido para previsualizar</p>')
    doc.close()
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      title="Email preview"
      className={`w-full border border-gray-200 rounded-lg bg-white ${className}`}
      style={{ minHeight: 300 }}
      sandbox="allow-same-origin"
    />
  )
}

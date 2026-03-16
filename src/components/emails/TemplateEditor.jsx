import { useState, useRef, useCallback } from 'react'
import {
  Eye,
  Code,
  Upload,
  Copy,
  Variable,
  FileCode2,
} from 'lucide-react'
import EmailPreview from './EmailPreview'
import Button from '../ui/Button'
import { EMAIL_VARIABLES } from '../../lib/constants'
import { DEFAULT_HTML_TEMPLATE } from '../../lib/email'
import { showSuccess, showError } from '../ui/Toast'

export default function TemplateEditor({ value, onChange }) {
  const [viewMode, setViewMode] = useState('code') // 'code' | 'preview' | 'split'
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  function insertVariable(varKey) {
    const tag = `{{${varKey}}}`
    const textarea = textareaRef.current
    if (!textarea) {
      onChange((value || '') + tag)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = value.substring(0, start)
    const after = value.substring(end)
    const newValue = before + tag + after
    onChange(newValue)

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + tag.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  function loadDefaultTemplate() {
    onChange(DEFAULT_HTML_TEMPLATE)
    showSuccess('Plantilla base cargada')
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(value || '').then(() => {
      showSuccess('HTML copiado al portapapeles')
    })
  }

  // Drag & drop .html file
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      showError('Solo se aceptan archivos .html')
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      onChange(evt.target.result)
      showSuccess(`Archivo "${file.name}" cargado`)
    }
    reader.readAsText(file)
  }, [onChange])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      showError('Solo se aceptan archivos .html')
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      onChange(evt.target.result)
      showSuccess(`Archivo "${file.name}" cargado`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              viewMode === 'code'
                ? 'bg-white text-[#333333] shadow-sm'
                : 'text-[#6B7280] hover:text-[#333333]'
            }`}
          >
            <Code size={13} />
            Código
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              viewMode === 'preview'
                ? 'bg-white text-[#333333] shadow-sm'
                : 'text-[#6B7280] hover:text-[#333333]'
            }`}
          >
            <Eye size={13} />
            Vista previa
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              viewMode === 'split'
                ? 'bg-white text-[#333333] shadow-sm'
                : 'text-[#6B7280] hover:text-[#333333]'
            }`}
          >
            Dividido
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadDefaultTemplate}
            title="Cargar plantilla base"
          >
            <FileCode2 size={14} />
            Base
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Subir archivo HTML"
          >
            <Upload size={14} />
            Subir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyHtml}
            title="Copiar HTML"
          >
            <Copy size={14} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Variables bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold shrink-0">
          <Variable size={12} />
          Variables:
        </span>
        {EMAIL_VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors duration-200 font-mono"
            title={v.label}
          >
            {`{{${v.key}}}`}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div
        className={`${viewMode === 'split' ? 'grid grid-cols-2 gap-3' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Code editor */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Escribe o pega tu HTML aquí, o arrastra un archivo .html..."
              rows={viewMode === 'split' ? 16 : 20}
              className={`w-full border rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y ${
                dragOver
                  ? 'border-[#39A1C9] bg-blue-50 ring-2 ring-[#39A1C9]/20'
                  : 'border-gray-300'
              }`}
            />
            {dragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 rounded-lg border-2 border-dashed border-[#39A1C9] pointer-events-none">
                <div className="text-center">
                  <Upload size={32} className="mx-auto text-[#39A1C9] mb-2" />
                  <p className="text-sm font-medium text-[#39A1C9]">Suelta el archivo .html aquí</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <EmailPreview
            html={value}
            className={viewMode === 'split' ? 'h-[400px]' : 'h-[500px]'}
          />
        )}
      </div>
    </div>
  )
}

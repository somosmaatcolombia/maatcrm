import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Eye,
  Code,
  Paintbrush,
  Loader2,
  Download,
  ArrowRightLeft,
  Info,
} from 'lucide-react'
import EmailPreview from './EmailPreview'
import Button from '../ui/Button'
import { EMAIL_VARIABLES } from '../../lib/constants'

const MAAT_MERGE_TAGS = {}
EMAIL_VARIABLES.forEach((v) => {
  MAAT_MERGE_TAGS[v.key] = {
    name: v.label,
    value: `{{${v.key}}}`,
  }
})

// Load the Unlayer embed script once globally
let unlayerScriptPromise = null
function loadUnlayerScript() {
  if (unlayerScriptPromise) return unlayerScriptPromise
  unlayerScriptPromise = new Promise((resolve) => {
    if (window.unlayer) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://editor.unlayer.com/embed.js'
    script.onload = () => resolve()
    script.onerror = () => {
      unlayerScriptPromise = null
      resolve()
    }
    document.head.appendChild(script)
  })
  return unlayerScriptPromise
}

/**
 * Wraps raw HTML into an Unlayer-compatible design JSON.
 * Unlayer needs its own design format to render content in the visual editor.
 * This wraps any HTML into a single "html" content block so Unlayer can display it.
 */
function wrapHtmlInDesign(html) {
  return {
    counters: { u_row: 1, u_column: 1, u_content_html: 1 },
    body: {
      id: 'auto-imported',
      rows: [
        {
          id: 'auto-row-1',
          cells: [1],
          columns: [
            {
              id: 'auto-col-1',
              contents: [
                {
                  id: 'auto-html-1',
                  type: 'html',
                  values: {
                    html: html,
                    containerPadding: '0px',
                  },
                },
              ],
              values: {
                _meta: { htmlID: 'u_column_1', htmlClassNames: 'u_column' },
              },
            },
          ],
          values: {
            displayCondition: null,
            columns: false,
            backgroundColor: '',
            columnsBackgroundColor: '',
            backgroundImage: { url: '', fullWidth: true, repeat: false, center: true, cover: false },
            padding: '0px',
            hideDesktop: false,
            _meta: { htmlID: 'u_row_1', htmlClassNames: 'u_row' },
            selectable: true,
            draggable: true,
            duplicatable: true,
            deletable: true,
            hideable: true,
          },
        },
      ],
      values: {
        contentWidth: '600px',
        fontFamily: { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
        textColor: '#333333',
        backgroundColor: '#F5F5F5',
        backgroundImage: { url: '', fullWidth: true, repeat: false, center: true, cover: false },
        linkStyle: { body: true, linkColor: '#39A1C9', linkHoverColor: '#2E8AB0', linkUnderline: true, linkHoverUnderline: true },
        _meta: { htmlID: 'u_body', htmlClassNames: 'u_body' },
      },
    },
  }
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve
 * within `ms` milliseconds, resolves with undefined instead of hanging forever.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
}

export default function TemplateEditor({ value, onChange, designJson, onDesignChange, onEditorModeChange }) {
  const [viewMode, setViewMode] = useState('code') // 'editor' | 'code' | 'preview'
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState(null)
  const [htmlImported, setHtmlImported] = useState(false)
  const [editorReady, setEditorReady] = useState(false) // true ONLY when editor:ready fired
  const [switching, setSwitching] = useState(false) // true while switching views
  const containerRef = useRef(null)
  const editorInstanceRef = useRef(null)
  const designLoadedRef = useRef(false)
  const safetyTimeoutRef = useRef(null)
  const initCountRef = useRef(0)

  // Refs to latest values (avoid re-init loops from dependencies)
  const latestValueRef = useRef(value)
  const latestDesignRef = useRef(designJson)
  useEffect(() => { latestValueRef.current = value }, [value])
  useEffect(() => { latestDesignRef.current = designJson }, [designJson])

  // Initialize Unlayer when switching to editor mode
  useEffect(() => {
    if (viewMode !== 'editor') return

    let cancelled = false
    const initId = ++initCountRef.current

    async function initEditor() {
      setEditorLoading(true)
      setEditorError(null)
      setEditorReady(false)
      setHtmlImported(false)

      try {
        await loadUnlayerScript()
      } catch {
        // Script load failed
      }

      if (cancelled || initId !== initCountRef.current) return

      if (!window.unlayer) {
        setEditorError('No se pudo cargar el editor visual. Verifica tu conexion a internet.')
        setEditorLoading(false)
        return
      }

      if (!containerRef.current) return

      // Clear previous editor
      containerRef.current.innerHTML = ''
      editorInstanceRef.current = null

      try {
        // createEditor returns the editor instance in newer versions of Unlayer
        const editorInstance = window.unlayer.createEditor({
          id: containerRef.current.id,
          appearance: { theme: 'modern_light' },
          locale: 'es-ES',
          mergeTags: MAAT_MERGE_TAGS,
          features: {
            stockImages: { enabled: true, safeSearch: true },
            userUploads: true,
          },
          tools: {
            image: { enabled: true },
            button: { enabled: true },
            divider: { enabled: true },
            heading: { enabled: true },
            html: { enabled: true },
            menu: { enabled: false },
            social: { enabled: true },
            text: { enabled: true },
            timer: { enabled: false },
            video: { enabled: false },
          },
        })

        // Try to use the returned instance, fallback to global
        const editor = editorInstance || window.unlayer

        editor.addEventListener('editor:ready', () => {
          if (cancelled || initId !== initCountRef.current) return

          editorInstanceRef.current = editor
          setEditorLoading(false)
          setEditorReady(true)

          // Clear safety timeout
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current)
            safetyTimeoutRef.current = null
          }

          const currentDesign = latestDesignRef.current
          const currentHtml = latestValueRef.current

          // Priority 1: Load saved design JSON
          if (currentDesign && !designLoadedRef.current) {
            try {
              const design = typeof currentDesign === 'string' ? JSON.parse(currentDesign) : currentDesign
              editor.loadDesign(design)
              designLoadedRef.current = true
              return
            } catch {
              // Invalid design JSON, fall through
            }
          }

          // Priority 2: Import raw HTML as an Unlayer HTML block
          if (currentHtml && currentHtml.trim() && !designLoadedRef.current) {
            try {
              const wrappedDesign = wrapHtmlInDesign(currentHtml)
              editor.loadDesign(wrappedDesign)
              designLoadedRef.current = true
              setHtmlImported(true)
            } catch {
              // Failed to import
            }
          }
        })

        // Safety timeout: DON'T set editorInstanceRef to global unlayer.
        // Instead, just hide loading and mark as not ready so export is skipped.
        safetyTimeoutRef.current = setTimeout(() => {
          if (!cancelled && initId === initCountRef.current) {
            setEditorLoading(false)
            // Do NOT set editorInstanceRef — the editor didn't truly initialize.
            // editorReady stays false so export will be safely skipped.
            if (!editorInstanceRef.current) {
              setEditorError('El editor tardo demasiado en cargar. Intenta cambiar a HTML y volver al editor visual.')
            }
          }
        }, 10000)
      } catch (err) {
        if (!cancelled) {
          setEditorError(`Error al inicializar el editor: ${err.message}`)
          setEditorLoading(false)
        }
      }
    }

    initEditor()

    return () => {
      cancelled = true
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  /**
   * Export HTML and design from Unlayer. Has a 3-second timeout
   * so it NEVER hangs forever if the editor is in a broken state.
   */
  const exportFromEditor = useCallback(() => {
    const exportPromise = new Promise((resolve) => {
      const editor = editorInstanceRef.current
      if (!editor) { resolve(); return }

      try {
        editor.exportHtml((data) => {
          if (data?.html) onChange(data.html)

          try {
            editor.saveDesign((design) => {
              if (onDesignChange && design) {
                onDesignChange(JSON.stringify(design))
              }
              resolve()
            })
          } catch {
            resolve()
          }
        })
      } catch {
        resolve()
      }
    })

    // Never hang more than 3 seconds
    return withTimeout(exportPromise, 3000)
  }, [onChange, onDesignChange])

  /**
   * Switch between views. The key fix: NEVER let await block the UI.
   * Export runs with a timeout, and view switches immediately if export fails.
   */
  async function handleViewChange(mode) {
    if (switching) return // Prevent double-click during switch
    if (mode === viewMode) return // Already on this view

    setSwitching(true)

    try {
      // Try to export from editor before leaving, but don't block forever
      if (viewMode === 'editor' && mode !== 'editor' && editorReady) {
        await exportFromEditor()
      }
    } catch {
      // Export failed, switch anyway — don't block the user
    }

    if (mode === 'editor') {
      setEditorLoading(true)
      designLoadedRef.current = false
      setEditorError(null)
      setEditorReady(false)
      setHtmlImported(false)
    }

    setViewMode(mode)
    setSwitching(false)
    onEditorModeChange?.(mode === 'editor')
  }

  return (
    <div className="space-y-3">
      {/* View mode toggle — ALWAYS clickable */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {[
            { mode: 'editor', icon: Paintbrush, label: 'Editor visual' },
            { mode: 'code', icon: Code, label: 'HTML' },
            { mode: 'preview', icon: Eye, label: 'Vista previa' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              disabled={switching}
              onClick={() => handleViewChange(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === mode
                  ? 'bg-white text-[#333333] shadow-sm'
                  : switching
                    ? 'text-gray-300 cursor-wait'
                    : 'text-[#6B7280] hover:text-[#333333]'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {viewMode === 'editor' && editorReady && !editorError && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await exportFromEditor()
                handleViewChange('code')
              }}
            >
              <ArrowRightLeft size={13} />
              Sincronizar a HTML
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportFromEditor}
            >
              <Download size={13} />
              Exportar HTML
            </Button>
          </div>
        )}
      </div>

      {/* Info banner: HTML was imported */}
      {viewMode === 'editor' && htmlImported && !editorLoading && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            El HTML existente fue importado al editor visual como un bloque HTML.
            Puedes editarlo haciendo clic en el contenido, o agregar nuevos bloques desde el panel lateral.
          </p>
          <button
            type="button"
            onClick={() => setHtmlImported(false)}
            className="text-blue-400 hover:text-blue-600 text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor visual (Unlayer) */}
      {viewMode === 'editor' && (
        <div className="relative border border-gray-200 rounded-xl overflow-hidden" style={{ height: 600 }}>
          {editorLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-[#39A1C9]" />
                <span className="text-sm text-[#6B7280]">Cargando editor visual...</span>
                <span className="text-[10px] text-gray-400">Esto puede tomar unos segundos</span>
              </div>
            </div>
          )}
          {editorError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Code size={20} className="text-red-500" />
                </div>
                <p className="text-sm text-red-600 max-w-md">{editorError}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewChange('code')}
                  >
                    Usar editor HTML
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      // Force re-init by toggling viewMode
                      setViewMode('code')
                      setTimeout(() => handleViewChange('editor'), 100)
                    }}
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            id="unlayer-editor-container"
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      )}

      {/* HTML code view */}
      {viewMode === 'code' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => onChange((value || '') + `{{${v.key}}}`)}
                className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-mono hover:bg-blue-100 transition-colors"
                title={v.label}
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Pega o escribe tu HTML aqui... Luego cambia al Editor visual para editarlo graficamente."
            rows={18}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
          />
          {value && value.trim() && (
            <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
              <ArrowRightLeft size={10} />
              Cambia al <strong>Editor visual</strong> para editar este HTML graficamente con drag & drop.
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {viewMode === 'preview' && (
        <div>
          {!value ? (
            <div className="h-[400px] border border-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-sm text-[#6B7280]">Agrega contenido HTML para ver la vista previa</p>
            </div>
          ) : (
            <EmailPreview html={value} className="h-[600px]" />
          )}
        </div>
      )}
    </div>
  )
}

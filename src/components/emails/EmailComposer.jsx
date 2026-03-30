import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Send,
  ChevronRight,
  ChevronLeft,
  Eye,
  Pencil,
  Mail,
  FileText,
  Check,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import Button from '../ui/Button'
import EmailPreview from './EmailPreview'
import { useEmailTemplates } from '../../hooks/useEmailTemplates'
import { useAuthContext } from '../../context/AuthContext'
import {
  replaceTemplateVariables,
  resolveVariables,
  sendEmail,
} from '../../lib/email'
import { showSuccess, showError } from '../ui/Toast'

const STEPS = [
  { id: 'template', label: 'Plantilla', icon: FileText },
  { id: 'edit', label: 'Editar', icon: Pencil },
  { id: 'preview', label: 'Revisar', icon: Eye },
  { id: 'done', label: 'Enviado', icon: CheckCircle2 },
]

export default function EmailComposer({ prospect, onClose, onSent }) {
  const { profile } = useAuthContext()
  const { templates, loading: templatesLoading } = useEmailTemplates()
  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null) // { success: true } | { success: false, error: '...' }
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const advisorName = prospect?.profiles?.full_name || profile?.full_name || ''

  const variables = useMemo(
    () => resolveVariables(prospect, advisorName),
    [prospect, advisorName]
  )

  const availableTemplates = useMemo(() => {
    if (!prospect) return []
    const category = prospect.client_type
    return templates.filter(
      (t) => t.active && (t.category === category || t.category === 'general')
    )
  }, [templates, prospect])

  const resolvedHtml = useMemo(
    () => replaceTemplateVariables(htmlBody, variables),
    [htmlBody, variables]
  )

  const resolvedSubject = useMemo(
    () => replaceTemplateVariables(subject, variables),
    [subject, variables]
  )

  function handleSelectTemplate(template) {
    setSelectedTemplate(template)
    setSubject(template.subject || '')
    setHtmlBody(template.html_body || '')
    setStep(1)
  }

  function handleStartFromScratch() {
    setSelectedTemplate(null)
    setSubject('')
    setHtmlBody('')
    setStep(1)
  }

  async function handleSend() {
    if (!prospect?.email) {
      showError('El prospecto no tiene email registrado')
      return
    }
    if (!subject.trim()) {
      showError('El asunto es obligatorio')
      return
    }
    if (!htmlBody.trim()) {
      showError('El contenido del correo es obligatorio')
      return
    }

    setSending(true)
    setSendResult(null)

    try {
      await sendEmail({
        to: prospect.email,
        subject: resolvedSubject,
        htmlBody: resolvedHtml,
        prospectId: prospect.id,
        advisorId: profile.id,
        templateId: selectedTemplate?.id || null,
      })

      if (!mountedRef.current) return

      setSendResult({ success: true })
      setSending(false)
      setStep(3) // Go to success screen
      showSuccess(`Correo enviado a ${prospect.email}`)

      // Notify parent but don't close
      onSent?.()
    } catch (err) {
      if (!mountedRef.current) return

      setSendResult({ success: false, error: err.message || 'Error al enviar el correo' })
      setSending(false)
      showError(err.message || 'Error al enviar el correo')
    }
  }

  function handleRetry() {
    setSendResult(null)
    handleSend()
  }

  function handleClose() {
    onClose?.()
  }

  // Visible steps (hide "done" step until we're there)
  const visibleSteps = step < 3 ? STEPS.slice(0, 3) : STEPS

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {visibleSteps.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight size={12} className="text-gray-300" />
              )}
              <button
                type="button"
                onClick={() => {
                  if (i < step && step < 3) setStep(i)
                }}
                disabled={i >= step || step === 3}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? i === 3
                      ? 'bg-green-500 text-white'
                      : 'bg-[#39A1C9] text-white'
                    : isDone
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-default'
                }`}
              >
                {isDone ? <Check size={12} /> : <Icon size={12} />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Step 0: Template picker ── */}
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[#6B7280]">
            Selecciona una plantilla o comienza desde cero.
          </p>

          {templatesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartFromScratch}
                className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl text-left hover:border-[#39A1C9]/30 hover:bg-gray-50 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Pencil size={18} className="text-[#6B7280]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#333333]">Correo personalizado</p>
                  <p className="text-xs text-[#6B7280]">Escribe el correo desde cero</p>
                </div>
              </button>

              {availableTemplates.length === 0 && (
                <p className="text-sm text-[#6B7280] text-center py-4">
                  No hay plantillas disponibles para {prospect?.client_type === 'b2b' ? 'B2B' : 'B2C'}.
                </p>
              )}

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-[#39A1C9]/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Mail size={18} className="text-[#39A1C9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#333333] truncate">{template.name}</p>
                      <p className="text-xs text-[#6B7280] truncate">{template.subject}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      template.category === 'b2b'
                        ? 'bg-purple-100 text-purple-700'
                        : template.category === 'b2c'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.category === 'general' ? 'General' : template.category.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Edit subject + body ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">
              Para
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-[#333333] border border-gray-200 flex items-center gap-2">
              <Mail size={14} className="text-[#6B7280] shrink-0" />
              <span className="truncate">
                {prospect?.full_name} &lt;{prospect?.email || 'sin email'}&gt;
              </span>
              {!prospect?.email && (
                <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                  Sin email
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">
              Asunto
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo (soporta {{variables}})"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                Contenido HTML
              </label>
              <span className="text-[10px] text-[#6B7280]">
                {htmlBody.length} caracteres
              </span>
            </div>
            {/* Variable hints */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['nombre', 'empresa', 'asesor', 'fecha'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setHtmlBody((prev) => prev + `{{${v}}}`)}
                  className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-mono hover:bg-blue-100 transition-colors"
                  title={`Insertar variable {{${v}}}`}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="HTML del correo..."
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              <ChevronLeft size={14} />
              Plantillas
            </Button>
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!subject.trim() || !htmlBody.trim()}
            >
              Vista previa
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview + Send ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <span className="font-medium text-[#6B7280] uppercase tracking-wider w-14 shrink-0 pt-0.5">Para:</span>
              <span className="text-[#333333]">{prospect?.full_name} &lt;{prospect?.email}&gt;</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="font-medium text-[#6B7280] uppercase tracking-wider w-14 shrink-0 pt-0.5">Asunto:</span>
              <span className="text-[#333333] font-medium">{resolvedSubject}</span>
            </div>
            {selectedTemplate && (
              <div className="flex items-start gap-2 text-xs">
                <span className="font-medium text-[#6B7280] uppercase tracking-wider w-14 shrink-0 pt-0.5">Plantilla:</span>
                <span className="text-[#6B7280]">{selectedTemplate.name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">
              Vista previa del correo
            </label>
            <EmailPreview html={resolvedHtml} className="h-[300px]" />
          </div>

          {/* Error from failed attempt */}
          {sendResult?.success === false && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Error al enviar</p>
                <p className="text-xs text-red-600 mt-0.5">{sendResult.error}</p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs text-red-700 hover:text-red-900 font-medium flex items-center gap-1 shrink-0"
              >
                <RotateCcw size={12} /> Reintentar
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={sending}>
              <ChevronLeft size={14} />
              Editar
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              loading={sending}
              className="bg-[#EBA055] hover:bg-[#D4883A]"
              disabled={sending}
            >
              <Send size={14} />
              {sending ? 'Enviando...' : 'Enviar correo'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Success / Error ── */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          {sendResult?.success ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-[#333333]">Correo enviado</h3>
                <p className="text-sm text-[#6B7280]">
                  El correo fue enviado exitosamente a <strong>{prospect?.email}</strong>
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 w-full max-w-sm text-center">
                <p className="text-xs text-[#6B7280]">Asunto</p>
                <p className="text-sm font-medium text-[#333333] truncate">{resolvedSubject}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  <X size={14} />
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setStep(0)
                    setSelectedTemplate(null)
                    setSubject('')
                    setHtmlBody('')
                    setSendResult(null)
                  }}
                >
                  <Mail size={14} />
                  Enviar otro
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-[#333333]">Error al enviar</h3>
                <p className="text-sm text-red-600">{sendResult?.error || 'Ocurrio un error inesperado'}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
                <Button type="button" onClick={() => { setStep(2); setSendResult(null) }}>
                  <ChevronLeft size={14} />
                  Volver a intentar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

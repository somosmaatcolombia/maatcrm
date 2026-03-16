import { useState, useMemo } from 'react'
import {
  Send,
  ChevronRight,
  ChevronLeft,
  Eye,
  Pencil,
  Mail,
  FileText,
  Check,
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
  { id: 'template', label: 'Elegir plantilla', icon: FileText },
  { id: 'edit', label: 'Editar', icon: Pencil },
  { id: 'preview', label: 'Revisar y enviar', icon: Send },
]

export default function EmailComposer({ prospect, onClose, onSent }) {
  const { profile } = useAuthContext()
  const { templates, loading: templatesLoading } = useEmailTemplates()
  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [sending, setSending] = useState(false)

  // Get advisor name from prospect's assigned advisor or current user
  const advisorName = prospect?.profiles?.full_name || profile?.full_name || ''

  // Resolve variables for this prospect
  const variables = useMemo(
    () => resolveVariables(prospect, advisorName),
    [prospect, advisorName]
  )

  // Filter templates by prospect type
  const availableTemplates = useMemo(() => {
    if (!prospect) return []
    const category = prospect.client_type // 'b2b' or 'b2c'
    return templates.filter(
      (t) => t.active && (t.category === category || t.category === 'general')
    )
  }, [templates, prospect])

  // Resolved preview HTML
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
    try {
      await sendEmail({
        to: prospect.email,
        subject: resolvedSubject,
        htmlBody: resolvedHtml,
        prospectId: prospect.id,
        advisorId: profile.id,
        templateId: selectedTemplate?.id || null,
      })
      showSuccess(`Correo enviado a ${prospect.email}`)
      onSent?.()
      onClose?.()
    } catch (err) {
      showError(err.message || 'Error al enviar el correo')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <ChevronRight size={14} className="text-gray-300" />
              )}
              <button
                type="button"
                onClick={() => {
                  if (i < step) setStep(i)
                }}
                disabled={i > step}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#39A1C9] text-white'
                    : isDone
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <Check size={12} /> : <Icon size={12} />}
                {s.label}
              </button>
            </div>
          )
        })}
      </div>

      {/* Step 0: Template picker */}
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
              {/* From scratch option */}
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

              {/* Template cards */}
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

      {/* Step 1: Edit subject + body */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">
              Para
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-[#333333] border border-gray-200">
              {prospect?.full_name} &lt;{prospect?.email || 'sin email'}&gt;
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
            <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">
              Contenido HTML
            </label>
            {/* Variable hints */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['nombre', 'empresa', 'asesor', 'fecha'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setHtmlBody((prev) => prev + `{{${v}}}`)
                  }}
                  className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-mono hover:bg-blue-100 transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="HTML del correo..."
              rows={12}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 resize-y"
            />
          </div>

          {/* Navigation */}
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

      {/* Step 2: Preview + Send */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-[#6B7280] uppercase tracking-wider w-12">Para:</span>
              <span className="text-[#333333]">{prospect?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-[#6B7280] uppercase tracking-wider w-12">Asunto:</span>
              <span className="text-[#333333] font-medium">{resolvedSubject}</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">
              Vista previa del correo
            </label>
            <EmailPreview html={resolvedHtml} className="h-[350px]" />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft size={14} />
              Editar
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              loading={sending}
              className="bg-[#EBA055] hover:bg-[#D4883A]"
            >
              <Send size={14} />
              Enviar correo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

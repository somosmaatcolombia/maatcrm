import { useState, useEffect, useMemo } from 'react'
import {
  MessageCircle,
  Search,
  User,
  Building2,
  Phone,
  Send,
  ExternalLink,
  Check,
  FileText,
} from 'lucide-react'
import { useProspects } from '../hooks/useProspects'
import { useAuthContext } from '../context/AuthContext'
import { usePipelineContext } from '../context/PipelineContext'
import { supabase } from '../lib/supabase'
import { getWhatsAppLink } from '../lib/utils'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import WhatsAppTemplateManager from '../components/admin/WhatsAppTemplateManager'

function replaceVariables(body, prospect, advisorName) {
  const firstName = prospect?.full_name?.split(' ')[0] || ''
  return (body || '')
    .replace(/\{\{nombre\}\}/gi, firstName)
    .replace(/\{\{empresa\}\}/gi, prospect?.company_name || '')
    .replace(/\{\{asesor\}\}/gi, advisorName || 'Tu asesor')
}

export default function WhatsAppPage() {
  const { profile, isAdmin } = useAuthContext()
  const { stages } = usePipelineContext()
  const { prospects, loading: prospectsLoading } = useProspects()

  const [activeTab, setActiveTab] = useState('send')
  const [searchProspect, setSearchProspect] = useState('')
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customMessage, setCustomMessage] = useState('')
  const [sentProspectId, setSentProspectId] = useState(null)

  // Fetch all active templates
  useEffect(() => {
    async function fetch() {
      try {
        setTemplatesLoading(true)
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('active', true)
          .order('stage_slug')
        if (error) throw error
        setTemplates(data || [])
      } catch {
        setTemplates([])
      } finally {
        setTemplatesLoading(false)
      }
    }
    fetch()
  }, [])

  // Filter prospects by phone + search
  const filteredProspects = useMemo(() => {
    return prospects
      .filter((p) => p.phone)
      .filter((p) => {
        if (!searchProspect) return true
        const q = searchProspect.toLowerCase()
        return (
          p.full_name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.company_name?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
        )
      })
  }, [prospects, searchProspect])

  // Show all templates compatible with client_type, sorted: matching stage first, then the rest
  const availableTemplates = useMemo(() => {
    if (!selectedProspect) return templates
    const compatible = templates.filter(
      (t) => t.client_type === 'both' || t.client_type === selectedProspect.client_type
    )
    // Sort so templates matching the current stage come first
    return compatible.sort((a, b) => {
      const aMatch = a.stage_slug === selectedProspect.pipeline_stage ? 0 : 1
      const bMatch = b.stage_slug === selectedProspect.pipeline_stage ? 0 : 1
      return aMatch - bMatch
    })
  }, [templates, selectedProspect])

  // Update custom message when template or prospect changes
  useEffect(() => {
    if (selectedTemplate && selectedProspect) {
      const text = replaceVariables(
        selectedTemplate.message_body,
        selectedProspect,
        profile?.full_name
      )
      setCustomMessage(text)
    }
  }, [selectedTemplate, selectedProspect, profile?.full_name])

  // Reset template selection when prospect changes
  useEffect(() => {
    setSelectedTemplate(null)
    setCustomMessage('')
  }, [selectedProspect?.id])

  // Get stage name from slug
  const getStageName = (slug) => {
    const all = [...(stages.b2c || []), ...(stages.b2b || [])]
    const stage = all.find((s) => s.slug === slug)
    return stage?.name || slug
  }

  function handleSend() {
    if (!selectedProspect || !customMessage.trim()) return
    const link = getWhatsAppLink(selectedProspect.phone, customMessage)
    window.open(link, '_blank')
    setSentProspectId(selectedProspect.id)
    setTimeout(() => setSentProspectId(null), 3000)
  }

  const tabs = [{ value: 'send', label: 'Enviar mensaje' }]
  if (isAdmin) tabs.push({ value: 'templates', label: 'Gestionar plantillas' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333] flex items-center gap-2">
            <MessageCircle size={24} className="text-green-500" />
            WhatsApp
          </h1>
          <p className="text-sm text-[#6B7280]">
            Envía mensajes personalizados usando plantillas según la etapa del prospecto
          </p>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Send Message Tab */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Select Prospect */}
          <div className="bg-white rounded-xl shadow-md p-5 transition-shadow duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#39A1C9] text-white text-xs font-bold flex items-center justify-center shadow-md">
                1
              </div>
              <h3 className="text-sm font-bold text-[#333333]">Selecciona prospecto</h3>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchProspect}
                onChange={(e) => setSearchProspect(e.target.value)}
                placeholder="Buscar por nombre, email, empresa o teléfono..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
              />
            </div>

            <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
              {prospectsLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))
              ) : filteredProspects.length === 0 ? (
                <p className="text-xs text-[#6B7280] text-center py-8">
                  {searchProspect ? 'Sin resultados.' : 'No hay prospectos con teléfono.'}
                </p>
              ) : (
                filteredProspects.map((p) => {
                  const isSelected = selectedProspect?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProspect(p)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                        isSelected
                          ? 'bg-[#39A1C9]/10 border-[#39A1C9] shadow-sm'
                          : 'bg-white border-gray-200 hover:border-[#39A1C9]/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User size={13} className="text-[#6B7280] shrink-0" />
                          <span className="text-sm font-semibold text-[#333333] truncate">
                            {p.full_name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            p.client_type === 'b2b'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {p.client_type?.toUpperCase()}
                        </span>
                      </div>
                      {p.company_name && (
                        <p className="text-[10px] text-[#6B7280] truncate flex items-center gap-1 mb-0.5">
                          <Building2 size={10} />
                          {p.company_name}
                        </p>
                      )}
                      <p className="text-[10px] text-[#6B7280] truncate flex items-center gap-1">
                        <Phone size={10} />
                        {p.phone}
                      </p>
                      {p.pipeline_stage && (
                        <p className="text-[9px] text-green-600 mt-1 font-medium">
                          {getStageName(p.pipeline_stage)}
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Step 2: Select Template */}
          <div className="bg-white rounded-xl shadow-md p-5 transition-shadow duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-md ${
                  selectedProspect
                    ? 'bg-[#39A1C9] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                2
              </div>
              <h3 className="text-sm font-bold text-[#333333]">Selecciona plantilla</h3>
            </div>

            {!selectedProspect ? (
              <EmptyState
                icon={FileText}
                title="Selecciona un prospecto"
                description="Primero elige un prospecto para ver las plantillas disponibles."
              />
            ) : templatesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : availableTemplates.length === 0 ? (
              <p className="text-xs text-[#6B7280] text-center py-8">
                No hay plantillas disponibles para este tipo de cliente.
              </p>
            ) : (
              <>
                <p className="text-[10px] text-[#6B7280] mb-2">
                  {availableTemplates.length} plantilla{availableTemplates.length !== 1 ? 's' : ''} · las de la etapa actual aparecen primero
                </p>
                <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1">
                  {availableTemplates.map((t) => {
                    const isSelected = selectedTemplate?.id === t.id
                    const matchesStage = t.stage_slug === selectedProspect.pipeline_stage
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? 'bg-green-50 border-green-500 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-green-400 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-[#333333] truncate">{t.name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {matchesStage && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#39A1C9]/10 text-[#39A1C9]">
                                Etapa actual
                              </span>
                            )}
                            {isSelected && <Check size={14} className="text-green-600" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-green-600 font-medium mb-1">
                          {getStageName(t.stage_slug)}
                        </p>
                        <p className="text-[10px] text-[#6B7280] line-clamp-2">
                          {replaceVariables(t.message_body, selectedProspect, profile?.full_name)}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Step 3: Preview + Send */}
          <div className="bg-white rounded-xl shadow-md p-5 transition-shadow duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-md ${
                  selectedProspect && customMessage
                    ? 'bg-[#39A1C9] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                3
              </div>
              <h3 className="text-sm font-bold text-[#333333]">Revisa y envía</h3>
            </div>

            {!selectedProspect ? (
              <EmptyState
                icon={MessageCircle}
                title="Listo para enviar"
                description="Selecciona un prospecto y una plantilla para continuar."
              />
            ) : (
              <div className="space-y-4">
                {/* Recipient */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold mb-1">
                    Para
                  </p>
                  <p className="text-sm font-semibold text-[#333333]">
                    {selectedProspect.full_name}
                  </p>
                  <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                    <Phone size={11} />
                    {selectedProspect.phone}
                  </p>
                </div>

                {/* Message editor */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold mb-1.5">
                    Mensaje (editable)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Escribe o selecciona una plantilla..."
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200 resize-y"
                  />
                  <p className="text-[10px] text-[#6B7280] mt-1">
                    {customMessage.length} caracteres
                  </p>
                </div>

                {/* WhatsApp preview bubble */}
                {customMessage && (
                  <div className="bg-[#E5DDD5] rounded-lg p-3">
                    <div className="bg-[#DCF8C6] rounded-lg px-3 py-2 max-w-full shadow-sm">
                      <p className="text-xs text-[#111b21] whitespace-pre-wrap leading-relaxed">
                        {customMessage}
                      </p>
                      <p className="text-[9px] text-[#667781] text-right mt-1">
                        Vista previa ✓✓
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={!customMessage.trim()}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  {sentProspectId === selectedProspect.id ? (
                    <>
                      <Check size={16} /> Abierto en WhatsApp
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Abrir en WhatsApp
                    </>
                  )}
                  <ExternalLink size={13} />
                </Button>

                <p className="text-[10px] text-[#6B7280] text-center">
                  Se abrirá wa.me con el mensaje listo para enviar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab (admin only) */}
      {activeTab === 'templates' && isAdmin && <WhatsAppTemplateManager />}
    </div>
  )
}

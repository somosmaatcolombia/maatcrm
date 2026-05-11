import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  User,
  Globe,
  Calendar,
  Target,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Score calculation:
 *   For each answered question, take the option's score (0-100),
 *   multiply by question.weight, sum all, divide by total weight = final score 0-100.
 *
 * For 'scale' questions, score is interpolated linearly between min/max
 *   value=min -> score=10, value=max -> score=100
 */
function computeScore(questions, answers) {
  let weightedSum = 0
  let totalWeight = 0
  for (const q of questions || []) {
    const a = answers[q.id]
    if (a == null) continue
    const w = q.weight || 1
    totalWeight += w
    let s = 0
    if (q.type === 'single-choice') {
      const opt = (q.options || []).find((o) => o.value === a)
      s = opt?.score ?? 0
    } else if (q.type === 'scale') {
      const min = q.min ?? 1
      const max = q.max ?? 10
      if (max > min) {
        s = 10 + ((a - min) / (max - min)) * 90
      }
    }
    weightedSum += s * w
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
}

function getInvestmentTier(answers, config) {
  const inv = answers.investment
  if (!inv) return null
  const tiers = config?.investment_tiers || []
  const opt = config?.questions?.find((q) => q.id === 'investment')?.options?.find((o) => o.value === inv)
  if (!opt?.tier) return null
  return tiers.find((t) => t.slug === opt.tier) || null
}

function scoreColor(score) {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#3B82F6'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

export default function QualifyPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0) // 0 = intro, 1..N = questions, N+1 = contact, N+2 = result
  const [answers, setAnswers] = useState({})
  const [contact, setContact] = useState({ full_name: '', email: '', phone: '', country: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null) // { id, score, status }

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('call_qualification_configs')
          .select('*')
          .eq('slug', slug || 'discovery')
          .eq('active', true)
          .single()
        if (err) throw err
        setConfig(data)
      } catch (e) {
        setError('No encontramos este cuestionario o no está disponible.')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [slug])

  const questions = config?.questions || []
  const liveScore = useMemo(() => computeScore(questions, answers), [questions, answers])
  const totalQuestions = questions.length
  const isOnQuestionStep = step >= 1 && step <= totalQuestions
  const isOnContactStep = step === totalQuestions + 1
  const isOnResultStep = step === totalQuestions + 2
  const currentQuestion = isOnQuestionStep ? questions[step - 1] : null
  const allAnswered = totalQuestions > 0 && questions.every((q) => answers[q.id] != null)

  function selectAnswer(qId, value) {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  function next() {
    if (isOnQuestionStep && answers[currentQuestion.id] == null) return
    setStep((s) => s + 1)
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1))
  }

  function validateContact() {
    if (!contact.full_name.trim()) return 'Nombre obligatorio'
    if (!contact.email.trim()) return 'Email obligatorio'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return 'Email no válido'
    return null
  }

  async function submitQualification() {
    const err = validateContact()
    if (err) {
      setError(err)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const score = computeScore(questions, answers)
      const minScore = config.min_qualification_score || 60
      const status =
        score >= minScore ? 'qualified' : score >= minScore - 20 ? 'borderline' : 'disqualified'

      const incomeOpt = questions.find((q) => q.id === 'income')?.options?.find((o) => o.value === answers.income)
      const tier = getInvestmentTier(answers, config)

      const payload = {
        config_id: config.id,
        full_name: contact.full_name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim() || null,
        country: contact.country.trim() || null,
        answers,
        qualification_score: score,
        income_range: incomeOpt?.label || null,
        investment_capacity_min: tier?.min || null,
        investment_capacity_max: tier?.max || null,
        status,
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign'),
        source: searchParams.get('source') || document.referrer || 'direct',
        user_agent: navigator.userAgent,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const { data, error: insertErr } = await supabase
        .from('call_qualifications')
        .insert(payload)
        .select()
        .single()

      if (insertErr) throw insertErr

      setSubmitted({ id: data.id, score, status })
      setStep(totalQuestions + 2)
    } catch (e) {
      setError(e.message || 'Error al enviar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] flex items-center justify-center">
        <Loader2 className="text-white animate-spin" size={32} />
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">No disponible</h2>
          <p className="text-[#6B7280]">{error}</p>
        </div>
      </div>
    )
  }

  const progress =
    step === 0
      ? 0
      : isOnResultStep
      ? 100
      : Math.round(((step - 0.5) / (totalQuestions + 2)) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F3460] via-[#1A1A2E] to-[#39A1C9]/30">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/maat-logo.png" alt="MAAT" className="w-9 h-9 drop-shadow-md" />
            <span className="text-white font-bold tracking-tight">
              MAAT <span className="text-[#EBA055]">Mentoría</span>
            </span>
          </div>
          {!isOnResultStep && step > 0 && (
            <span className="text-xs text-white/70 font-semibold">
              {step <= totalQuestions ? `Pregunta ${step} de ${totalQuestions}` : 'Datos de contacto'}
            </span>
          )}
        </div>
      </header>

      {/* Progress bar */}
      {step > 0 && !isOnResultStep && (
        <div className="max-w-2xl mx-auto px-6 mb-4">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#39A1C9] to-[#EBA055] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main card */}
      <main className="max-w-2xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* STEP 0: INTRO */}
          {step === 0 && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 bg-[#39A1C9]/10 text-[#39A1C9] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                  <Sparkles size={12} />
                  Llamada de Descubrimiento
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-[#1A1A2E] leading-tight mb-3">
                  {config.intro_title || 'Antes de agendar, conozcámonos un poco'}
                </h1>
                <p className="text-base text-[#6B7280]">
                  {config.intro_subtitle ||
                    'Esto nos toma 2 minutos y nos ayuda a preparar la mejor sesión posible para ti'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                {[
                  { icon: Target, label: 'Entendemos tu reto', desc: 'Para que la llamada sea relevante' },
                  { icon: Sparkles, label: 'Personalizado', desc: 'Vendrás con un plan, no con una pitch' },
                  { icon: Calendar, label: '2 minutos', desc: 'No más, no menos' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <Icon size={20} className="mx-auto text-[#39A1C9] mb-1.5" />
                    <p className="text-sm font-bold text-[#1A1A2E]">{label}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full bg-[#0F3460] text-white rounded-xl py-4 font-bold text-base hover:bg-[#16213E] transition-all duration-200 shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                Empezar
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* STEPS 1..N: QUESTIONS */}
          {isOnQuestionStep && currentQuestion && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] leading-tight">
                {currentQuestion.label}
              </h2>

              {currentQuestion.type === 'single-choice' && (
                <div className="space-y-2">
                  {currentQuestion.options.map((opt) => {
                    const selected = answers[currentQuestion.id] === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => selectAnswer(currentQuestion.id, opt.value)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          selected
                            ? 'border-[#39A1C9] bg-[#39A1C9]/10 shadow-md'
                            : 'border-gray-200 bg-white hover:border-[#39A1C9]/50 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              selected ? 'border-[#39A1C9] bg-[#39A1C9]' : 'border-gray-300'
                            }`}
                          >
                            {selected && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                          <span className={`font-medium ${selected ? 'text-[#1A1A2E]' : 'text-[#333333]'}`}>
                            {opt.label}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'scale' && (
                <div className="space-y-4">
                  <input
                    type="range"
                    min={currentQuestion.min ?? 1}
                    max={currentQuestion.max ?? 10}
                    step={1}
                    value={answers[currentQuestion.id] ?? Math.floor(((currentQuestion.min ?? 1) + (currentQuestion.max ?? 10)) / 2)}
                    onChange={(e) => selectAnswer(currentQuestion.id, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#39A1C9]"
                  />
                  <div className="flex justify-between text-xs text-[#6B7280]">
                    <span>{currentQuestion.min_label || currentQuestion.min}</span>
                    <span className="text-2xl font-black text-[#39A1C9]">
                      {answers[currentQuestion.id] ?? '—'}
                    </span>
                    <span>{currentQuestion.max_label || currentQuestion.max}</span>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1A2E] font-medium transition-colors"
                >
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button
                  onClick={next}
                  disabled={answers[currentQuestion.id] == null}
                  className="flex items-center gap-2 bg-[#0F3460] text-white rounded-xl px-6 py-3 font-bold hover:bg-[#16213E] transition-all duration-200 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {step === totalQuestions ? 'Continuar' : 'Siguiente'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP N+1: CONTACT */}
          {isOnContactStep && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A2E] leading-tight mb-1">
                  ¿Cómo te contactamos?
                </h2>
                <p className="text-sm text-[#6B7280]">
                  Tus datos están seguros. Solo los usamos para coordinar tu llamada.
                </p>
              </div>

              <div className="space-y-3">
                <ContactInput
                  icon={User}
                  label="Nombre completo *"
                  value={contact.full_name}
                  onChange={(v) => setContact({ ...contact, full_name: v })}
                  placeholder="María López"
                />
                <ContactInput
                  icon={Mail}
                  label="Email *"
                  type="email"
                  value={contact.email}
                  onChange={(v) => setContact({ ...contact, email: v })}
                  placeholder="tu@email.com"
                />
                <ContactInput
                  icon={Phone}
                  label="WhatsApp (con código de país)"
                  value={contact.phone}
                  onChange={(v) => setContact({ ...contact, phone: v })}
                  placeholder="+57 300 123 4567"
                />
                <ContactInput
                  icon={Globe}
                  label="País"
                  value={contact.country}
                  onChange={(v) => setContact({ ...contact, country: v })}
                  placeholder="Colombia"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1A2E] font-medium transition-colors"
                >
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button
                  onClick={submitQualification}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#0F3460] to-[#39A1C9] text-white rounded-xl px-6 py-3 font-bold transition-all duration-200 shadow-md disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      Ver mi resultado
                      <Sparkles size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP N+2: RESULT */}
          {isOnResultStep && submitted && (
            <ResultScreen
              score={submitted.score}
              status={submitted.status}
              config={config}
              contact={contact}
              answers={answers}
            />
          )}
        </div>

        {/* Live score footer for question steps */}
        {isOnQuestionStep && Object.keys(answers).length >= 2 && (
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between text-white">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Tu calificación parcial</span>
            <span
              className="text-2xl font-black"
              style={{ color: scoreColor(liveScore) }}
            >
              {liveScore}%
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

// ===========================================================
// Result screen
// ===========================================================
function ResultScreen({ score, status, config, contact }) {
  const color = scoreColor(score)
  const isQualified = status === 'qualified'
  const isBorderline = status === 'borderline'

  const headline = isQualified
    ? config.cta_qualified || '¡Excelente fit con MAAT!'
    : isBorderline
    ? config.cta_borderline || 'Estamos en contacto pronto'
    : config.cta_disqualified || 'Te enviaremos contenido relevante'

  const description = isQualified
    ? 'Tu perfil encaja muy bien con nuestro proceso. Vamos a coordinar tu llamada de descubrimiento.'
    : isBorderline
    ? 'Tu perfil es interesante. Un miembro de nuestro equipo te contactará para evaluar el mejor camino.'
    : 'No es el momento ideal para una llamada, pero queremos seguir aportándote valor. Te enviaremos contenido relevante.'

  return (
    <div className="space-y-6 py-2">
      <div className="text-center">
        <div
          className="w-32 h-32 mx-auto rounded-full flex items-center justify-center shadow-xl mb-4 relative"
          style={{
            background: `conic-gradient(${color} ${score * 3.6}deg, #E5E7EB 0deg)`,
          }}
        >
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center flex-col">
            <span className="text-4xl font-black" style={{ color }}>
              {score}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold">
              Tu fit
            </span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A2E] leading-tight mb-2">
          {headline}
        </h2>
        <p className="text-sm text-[#6B7280] max-w-md mx-auto">{description}</p>
      </div>

      {isQualified && (
        <div className="bg-gradient-to-br from-[#39A1C9]/10 to-[#EBA055]/10 border border-[#39A1C9]/30 rounded-xl p-5 text-center">
          <Calendar size={28} className="mx-auto text-[#39A1C9] mb-2" />
          <h3 className="font-bold text-[#1A1A2E] mb-1">Próximo paso</h3>
          <p className="text-sm text-[#6B7280] mb-4">
            Nuestro equipo te contactará en las próximas 24h al email <strong>{contact.email}</strong>
            {contact.phone && <> o al WhatsApp <strong>{contact.phone}</strong></>} para confirmar el horario que mejor te funcione.
          </p>
          <p className="text-xs text-[#6B7280]">
            Mientras tanto, revisa tu bandeja de entrada — te enviaremos info útil para preparar la llamada.
          </p>
        </div>
      )}

      {!isQualified && !isBorderline && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-sm text-[#6B7280]">
            Mientras tanto, suscríbete a nuestro contenido en redes para seguir aprendiendo sobre liderazgo consciente y alto rendimiento.
          </p>
        </div>
      )}

      <div className="text-center text-xs text-[#6B7280] pt-2">
        ¡Gracias, {contact.full_name.split(' ')[0]}! 🙌
      </div>
    </div>
  )
}

function ContactInput({ icon: Icon, label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1">
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
        />
      </div>
    </div>
  )
}

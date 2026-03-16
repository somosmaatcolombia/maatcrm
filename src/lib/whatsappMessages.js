/**
 * Stage-based WhatsApp message templates.
 * Each stage can have multiple pre-formatted messages to choose from.
 */
export const WHATSAPP_MESSAGES = {
  // ---- B2C Stages ----
  lead_nuevo: [
    {
      label: 'Saludo inicial',
      getMessage: (name) =>
        `¡Hola ${name}! 👋 Soy del equipo de MAAT. ¿Cómo estás? Me gustaría platicar contigo sobre cómo podemos ayudarte a alcanzar tus objetivos profesionales.`,
    },
    {
      label: 'Introducción breve',
      getMessage: (name) =>
        `Hola ${name}, ¿qué tal? Te escribo del equipo de MAAT, plataforma de mentoría de alto rendimiento. ¿Tienes unos minutos para platicar?`,
    },
  ],
  contactado: [
    {
      label: 'Seguimiento',
      getMessage: (name) =>
        `¡Hola ${name}! Te escribo para dar seguimiento a nuestra conversación anterior. ¿Has tenido oportunidad de revisar la información que te compartí?`,
    },
    {
      label: 'Agendar llamada',
      getMessage: (name) =>
        `Hola ${name}, ¿qué tal? Me encantaría agendar una breve llamada para conocer mejor tus objetivos y ver cómo MAAT puede apoyarte. ¿Cuándo te viene bien?`,
    },
  ],
  calificado: [
    {
      label: 'Invitar a sesión',
      getMessage: (name) =>
        `¡Hola ${name}! Basándome en lo que platicamos, creo que una sesión de diagnóstico sería ideal para ti. ¿Te gustaría agendar una sin costo?`,
    },
  ],
  sesion_agendada: [
    {
      label: 'Confirmar sesión',
      getMessage: (name) =>
        `¡Hola ${name}! Solo confirmo nuestra sesión programada. Prepararé algunos puntos clave para que aprovechemos al máximo el tiempo. ¡Nos vemos pronto! 🙌`,
    },
    {
      label: 'Recordatorio',
      getMessage: (name) =>
        `Hola ${name}, un recordatorio amistoso de nuestra sesión programada. ¿Todo confirmado de tu lado?`,
    },
  ],
  propuesta_enviada: [
    {
      label: 'Seguimiento de propuesta',
      getMessage: (name) =>
        `Hola ${name}, ¿pudiste revisar la propuesta que te enviamos? Quedo atento a cualquier duda o comentario que tengas. 😊`,
    },
  ],
  negociacion: [
    {
      label: 'Resolver dudas',
      getMessage: (name) =>
        `¡Hola ${name}! ¿Cómo vas con la decisión? Estoy aquí para resolver cualquier duda que tengas sobre el programa de mentoría.`,
    },
    {
      label: 'Oferta especial',
      getMessage: (name) =>
        `Hola ${name}, quiero compartirte que tenemos un beneficio especial vigente que podría interesarte. ¿Tienes un momento para platicarlo?`,
    },
  ],
  cliente_activo: [
    {
      label: 'Bienvenida',
      getMessage: (name) =>
        `¡Bienvenido al equipo MAAT, ${name}! 🎉 Estamos muy emocionados de tenerte. En breve te compartiré los próximos pasos para iniciar tu proceso de mentoría.`,
    },
  ],

  // ---- B2B Stages ----
  contacto_inicial: [
    {
      label: 'Primer contacto B2B',
      getMessage: (name) =>
        `Hola ${name}, soy del equipo de MAAT. Nos especializamos en programas de mentoría corporativa. ¿Podríamos agendar una breve reunión para conocer las necesidades de desarrollo de su equipo?`,
    },
  ],
  reunion_diagnostico: [
    {
      label: 'Confirmar reunión',
      getMessage: (name) =>
        `Hola ${name}, confirmo nuestra reunión de diagnóstico. Prepararé una presentación con casos de éxito relevantes para su industria. ¡Nos vemos pronto!`,
    },
  ],
  propuesta_corporativa: [
    {
      label: 'Seguimiento propuesta corporativa',
      getMessage: (name) =>
        `Hola ${name}, ¿el equipo ha tenido oportunidad de revisar la propuesta corporativa? Estoy disponible para una llamada de aclaración con los tomadores de decisión.`,
    },
  ],
  cierre: [
    {
      label: 'Cierre de acuerdo',
      getMessage: (name) =>
        `¡Hola ${name}! Me da mucho gusto que avancemos con este proyecto. Le enviaré los documentos finales para revisión. ¿Podemos agendar la firma esta semana?`,
    },
  ],
  onboarding: [
    {
      label: 'Bienvenida corporativa',
      getMessage: (name) =>
        `¡Bienvenidos a MAAT, ${name}! 🎉 Nuestro equipo de onboarding se pondrá en contacto para coordinar el inicio del programa con su equipo.`,
    },
  ],

  // ---- Common ----
  perdido: [
    {
      label: 'Reactivación',
      getMessage: (name) =>
        `Hola ${name}, espero que estés bien. Quería saludarte y preguntarte si tus circunstancias han cambiado. En MAAT seguimos innovando y nos encantaría retomar la conversación.`,
    },
  ],
}

/**
 * Get available messages for a given pipeline stage.
 * Falls back to lead_nuevo messages if stage not found.
 */
export function getStageMessages(stage) {
  return WHATSAPP_MESSAGES[stage] || WHATSAPP_MESSAGES.lead_nuevo || []
}

/**
 * Get the default (first) message for a stage
 */
export function getDefaultStageMessage(stage, prospectName) {
  const messages = getStageMessages(stage)
  const firstName = prospectName?.split(' ')[0] || ''
  if (messages.length > 0) {
    return messages[0].getMessage(firstName)
  }
  return `¡Hola ${firstName}! Soy del equipo de MAAT. ¿Cómo estás?`
}

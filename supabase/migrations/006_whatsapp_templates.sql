-- ============================================================
-- 006: WhatsApp message templates table
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stage_slug TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'both' CHECK (client_type IN ('b2b', 'b2c', 'both')),
  message_body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups by stage
CREATE INDEX idx_whatsapp_templates_stage ON whatsapp_templates (stage_slug);
CREATE INDEX idx_whatsapp_templates_active ON whatsapp_templates (active) WHERE active = true;

-- Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active templates
CREATE POLICY "Authenticated users can read whatsapp templates"
  ON whatsapp_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert whatsapp templates"
  ON whatsapp_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update whatsapp templates"
  ON whatsapp_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete whatsapp templates"
  ON whatsapp_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Seed: migrate hardcoded messages to DB
-- ============================================================

INSERT INTO whatsapp_templates (name, stage_slug, client_type, message_body, active) VALUES
-- B2C: lead_nuevo
('Saludo inicial', 'lead_nuevo', 'b2c', '¡Hola {{nombre}}! 👋 Soy del equipo de MAAT. ¿Cómo estás? Me gustaría platicar contigo sobre cómo podemos ayudarte a alcanzar tus objetivos profesionales.', true),
('Introducción breve', 'lead_nuevo', 'b2c', 'Hola {{nombre}}, ¿qué tal? Te escribo del equipo de MAAT, plataforma de mentoría de alto rendimiento. ¿Tienes unos minutos para platicar?', true),

-- B2C: contactado
('Seguimiento', 'contactado', 'b2c', '¡Hola {{nombre}}! Te escribo para dar seguimiento a nuestra conversación anterior. ¿Has tenido oportunidad de revisar la información que te compartí?', true),
('Agendar llamada', 'contactado', 'b2c', 'Hola {{nombre}}, ¿qué tal? Me encantaría agendar una breve llamada para conocer mejor tus objetivos y ver cómo MAAT puede apoyarte. ¿Cuándo te viene bien?', true),

-- B2C: calificado
('Invitar a sesión', 'calificado', 'b2c', '¡Hola {{nombre}}! Basándome en lo que platicamos, creo que una sesión de diagnóstico sería ideal para ti. ¿Te gustaría agendar una sin costo?', true),

-- B2C: sesion_agendada
('Confirmar sesión', 'sesion_agendada', 'b2c', '¡Hola {{nombre}}! Solo confirmo nuestra sesión programada. Prepararé algunos puntos clave para que aprovechemos al máximo el tiempo. ¡Nos vemos pronto! 🙌', true),
('Recordatorio', 'sesion_agendada', 'b2c', 'Hola {{nombre}}, un recordatorio amistoso de nuestra sesión programada. ¿Todo confirmado de tu lado?', true),

-- B2C: propuesta_enviada
('Seguimiento de propuesta', 'propuesta_enviada', 'b2c', 'Hola {{nombre}}, ¿pudiste revisar la propuesta que te enviamos? Quedo atento a cualquier duda o comentario que tengas. 😊', true),

-- B2C: negociacion
('Resolver dudas', 'negociacion', 'both', '¡Hola {{nombre}}! ¿Cómo vas con la decisión? Estoy aquí para resolver cualquier duda que tengas sobre el programa de mentoría.', true),
('Oferta especial', 'negociacion', 'both', 'Hola {{nombre}}, quiero compartirte que tenemos un beneficio especial vigente que podría interesarte. ¿Tienes un momento para platicarlo?', true),

-- B2C: cliente_activo
('Bienvenida', 'cliente_activo', 'b2c', '¡Bienvenido al equipo MAAT, {{nombre}}! 🎉 Estamos muy emocionados de tenerte. En breve te compartiré los próximos pasos para iniciar tu proceso de mentoría.', true),

-- B2B: contacto_inicial
('Primer contacto B2B', 'contacto_inicial', 'b2b', 'Hola {{nombre}}, soy del equipo de MAAT. Nos especializamos en programas de mentoría corporativa. ¿Podríamos agendar una breve reunión para conocer las necesidades de desarrollo de su equipo?', true),

-- B2B: reunion_diagnostico
('Confirmar reunión', 'reunion_diagnostico', 'b2b', 'Hola {{nombre}}, confirmo nuestra reunión de diagnóstico. Prepararé una presentación con casos de éxito relevantes para su industria. ¡Nos vemos pronto!', true),

-- B2B: propuesta_corporativa
('Seguimiento propuesta corporativa', 'propuesta_corporativa', 'b2b', 'Hola {{nombre}}, ¿el equipo ha tenido oportunidad de revisar la propuesta corporativa? Estoy disponible para una llamada de aclaración con los tomadores de decisión.', true),

-- B2B: cierre
('Cierre de acuerdo', 'cierre', 'b2b', '¡Hola {{nombre}}! Me da mucho gusto que avancemos con este proyecto. Le enviaré los documentos finales para revisión. ¿Podemos agendar la firma esta semana?', true),

-- B2B: onboarding
('Bienvenida corporativa', 'onboarding', 'b2b', '¡Bienvenidos a MAAT, {{nombre}}! 🎉 Nuestro equipo de onboarding se pondrá en contacto para coordinar el inicio del programa con su equipo.', true),

-- Common: perdido
('Reactivación', 'perdido', 'both', 'Hola {{nombre}}, espero que estés bien. Quería saludarte y preguntarte si tus circunstancias han cambiado. En MAAT seguimos innovando y nos encantaría retomar la conversación.', true);

-- ============================================================
-- 007: Discovery Calls module — qualification + scheduling
-- ============================================================

-- ----------------------------------------------
-- TABLE: call_qualification_configs
-- Defines questionnaires (questions, weights, scoring rules)
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS call_qualification_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  min_qualification_score INTEGER NOT NULL DEFAULT 60,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  investment_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  intro_title TEXT,
  intro_subtitle TEXT,
  cta_qualified TEXT DEFAULT 'Excelente fit — agenda tu llamada',
  cta_borderline TEXT DEFAULT 'Estaremos en contacto pronto',
  cta_disqualified TEXT DEFAULT 'Te enviaremos contenido relevante',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_qualification_configs_slug ON call_qualification_configs (slug);
CREATE INDEX idx_qualification_configs_active ON call_qualification_configs (active) WHERE active = true;

-- ----------------------------------------------
-- TABLE: call_qualifications
-- Each submission of the questionnaire
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS call_qualifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES call_qualification_configs(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  qualification_score INTEGER NOT NULL DEFAULT 0 CHECK (qualification_score BETWEEN 0 AND 100),
  income_range TEXT,
  investment_capacity_min INTEGER,
  investment_capacity_max INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'disqualified', 'borderline', 'booked', 'expired')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  source TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_qualifications_email ON call_qualifications (email);
CREATE INDEX idx_qualifications_status ON call_qualifications (status);
CREATE INDEX idx_qualifications_created ON call_qualifications (created_at DESC);
CREATE INDEX idx_qualifications_prospect ON call_qualifications (prospect_id);

-- ----------------------------------------------
-- TABLE: discovery_calls
-- The actual scheduled call records
-- ----------------------------------------------
CREATE TABLE IF NOT EXISTS discovery_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_id UUID REFERENCES call_qualifications(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  advisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 45,
  timezone TEXT DEFAULT 'America/Bogota',
  google_event_id TEXT,
  google_calendar_id TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('proposal_sent', 'follow_up_needed', 'disqualified', 'won', 'lost', 'not_a_fit')),
  call_notes TEXT,
  recording_url TEXT,
  prospect_pipeline_stage_before TEXT,
  prospect_pipeline_stage_after TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discovery_calls_scheduled ON discovery_calls (scheduled_at DESC);
CREATE INDEX idx_discovery_calls_advisor ON discovery_calls (advisor_id);
CREATE INDEX idx_discovery_calls_prospect ON discovery_calls (prospect_id);
CREATE INDEX idx_discovery_calls_status ON discovery_calls (status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_discovery_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discovery_calls_updated_at
BEFORE UPDATE ON discovery_calls
FOR EACH ROW EXECUTE FUNCTION update_discovery_calls_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE call_qualification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_calls ENABLE ROW LEVEL SECURITY;

-- call_qualification_configs: anon + authenticated can read active; only admins can write
CREATE POLICY "Anyone can read active qualification configs"
  ON call_qualification_configs FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins can manage qualification configs"
  ON call_qualification_configs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- call_qualifications: anon can insert (public form); authenticated can read/update
CREATE POLICY "Anonymous can insert qualifications"
  ON call_qualifications FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert qualifications"
  ON call_qualifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read all qualifications"
  ON call_qualifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update qualifications"
  ON call_qualifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete qualifications"
  ON call_qualifications FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- discovery_calls: admins see all; advisors see only their own
CREATE POLICY "Admins can see all discovery calls"
  ON discovery_calls FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR advisor_id = auth.uid()
  );

CREATE POLICY "Authenticated can insert discovery calls"
  ON discovery_calls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR advisor_id = auth.uid()
  );

CREATE POLICY "Authenticated can update discovery calls"
  ON discovery_calls FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR advisor_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR advisor_id = auth.uid()
  );

CREATE POLICY "Admins can delete discovery calls"
  ON discovery_calls FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- SEED: Default qualification questionnaire
-- ============================================================

INSERT INTO call_qualification_configs (
  slug,
  name,
  description,
  active,
  min_qualification_score,
  intro_title,
  intro_subtitle,
  investment_tiers,
  questions
) VALUES (
  'discovery',
  'Llamada de Descubrimiento MAAT',
  'Cuestionario de pre-calificación para llamadas de descubrimiento',
  true,
  60,
  'Antes de agendar, conozcámonos un poco',
  'Esto nos toma 2 minutos y nos ayuda a preparar la mejor sesión posible para ti',
  '[
    {"slug":"esencial","label":"Esencial","min":100,"max":300,"description":"Acompañamiento puntual"},
    {"slug":"estandar","label":"Estándar","min":300,"max":700,"description":"Proceso de 3 meses"},
    {"slug":"premium","label":"Premium","min":700,"max":1200,"description":"Acompañamiento integral"}
  ]'::jsonb,
  '[
    {
      "id":"challenge",
      "type":"single-choice",
      "label":"¿Cuál es el principal reto que quieres resolver?",
      "weight":25,
      "required":true,
      "options":[
        {"value":"burnout","label":"Burnout o agotamiento","score":100},
        {"value":"liderazgo","label":"Mejorar mi liderazgo","score":100},
        {"value":"decisiones","label":"Tener decisiones estratégicas más claras","score":100},
        {"value":"negocio","label":"Hacer crecer mi negocio","score":90},
        {"value":"balance","label":"Balance vida-trabajo","score":80},
        {"value":"transicion","label":"Una transición de carrera","score":70},
        {"value":"explorando","label":"Estoy explorando opciones","score":30}
      ]
    },
    {
      "id":"stage",
      "type":"single-choice",
      "label":"¿En qué etapa profesional estás hoy?",
      "weight":10,
      "required":true,
      "options":[
        {"value":"c-level","label":"C-Level o VP","score":100},
        {"value":"director","label":"Director o Gerente Senior","score":100},
        {"value":"founder","label":"Fundador o Co-fundador","score":100},
        {"value":"ejecutivo","label":"Ejecutivo medio","score":80},
        {"value":"profesional","label":"Profesional independiente","score":60},
        {"value":"transicion","label":"En transición","score":40}
      ]
    },
    {
      "id":"urgency",
      "type":"single-choice",
      "label":"¿Cuándo te gustaría empezar tu proceso?",
      "weight":15,
      "required":true,
      "options":[
        {"value":"now","label":"Esta semana — quiero empezar ya","score":100},
        {"value":"month","label":"Este mes","score":85},
        {"value":"quarter","label":"En los próximos 3 meses","score":60},
        {"value":"exploring","label":"Estoy explorando, sin prisa","score":30}
      ]
    },
    {
      "id":"income",
      "type":"single-choice",
      "label":"Rango de ingresos mensuales aproximados (USD)",
      "weight":20,
      "required":true,
      "options":[
        {"value":"25k+","label":"Más de $25,000","score":100},
        {"value":"10k-25k","label":"$10,000 - $25,000","score":95},
        {"value":"5k-10k","label":"$5,000 - $10,000","score":80},
        {"value":"2k-5k","label":"$2,000 - $5,000","score":60},
        {"value":"<2k","label":"Menos de $2,000","score":25},
        {"value":"prefer-not","label":"Prefiero no decirlo","score":40}
      ]
    },
    {
      "id":"investment",
      "type":"single-choice",
      "label":"Si encaja con lo que buscas, ¿qué nivel de inversión estás considerando?",
      "weight":20,
      "required":true,
      "options":[
        {"value":"premium","label":"Premium — $700 a $1,200 USD","score":100,"tier":"premium"},
        {"value":"estandar","label":"Estándar — $300 a $700 USD","score":85,"tier":"estandar"},
        {"value":"esencial","label":"Esencial — $100 a $300 USD","score":65,"tier":"esencial"},
        {"value":"menos-100","label":"Menos de $100 USD","score":20},
        {"value":"no-sure","label":"Aún no estoy seguro","score":50}
      ]
    },
    {
      "id":"readiness",
      "type":"scale",
      "label":"Del 1 al 10, ¿qué tan listo estás para empezar si la propuesta encaja?",
      "weight":10,
      "required":true,
      "min":1,
      "max":10,
      "min_label":"Solo curioso",
      "max_label":"Listo ya"
    }
  ]'::jsonb
);

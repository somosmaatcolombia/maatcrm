-- =============================================
-- 005: Lead Magnets — tables for content magnets tracking
-- =============================================

-- Catalog of lead magnets (tests, quizzes, guides, etc.)
CREATE TABLE IF NOT EXISTS lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- URL-friendly identifier (e.g. 'test-performance-emocional')
  name TEXT NOT NULL,                      -- Display name for CRM
  type TEXT NOT NULL DEFAULT 'test',       -- test | quiz | guide | checklist
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',              -- Questions, scoring rules, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual responses / submissions
CREATE TABLE IF NOT EXISTS lead_magnet_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_magnet_id UUID NOT NULL REFERENCES lead_magnets(id) ON DELETE CASCADE,
  -- Contact info captured at the end
  full_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  -- Delivery preference
  delivery_method TEXT,                    -- email | whatsapp | none
  -- Scores & results
  total_score NUMERIC,
  total_percentage NUMERIC,
  level_name TEXT,                         -- e.g. 'Alto Rendimiento', 'Desarrollo Avanzado'
  level_number INTEGER,
  dimension_scores JSONB DEFAULT '{}',    -- { regulacion: 75, valores: 60, ... }
  answers JSONB DEFAULT '{}',             -- { "1": 3, "2": 4, ... } raw answers
  -- Tracking
  source TEXT,                             -- utm_source or referrer
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,
  -- Prospect linkage (set when converted or auto-matched)
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  advisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'completed', -- completed | converted | discarded
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_lm_responses_lead_magnet ON lead_magnet_responses(lead_magnet_id);
CREATE INDEX idx_lm_responses_email ON lead_magnet_responses(email);
CREATE INDEX idx_lm_responses_status ON lead_magnet_responses(status);
CREATE INDEX idx_lm_responses_created ON lead_magnet_responses(created_at DESC);
CREATE INDEX idx_lm_responses_prospect ON lead_magnet_responses(prospect_id);

-- RLS
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnet_responses ENABLE ROW LEVEL SECURITY;

-- lead_magnets: all authenticated can read, only admin can write
CREATE POLICY "lead_magnets_select_all" ON lead_magnets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lead_magnets_insert_admin" ON lead_magnets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "lead_magnets_update_admin" ON lead_magnets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "lead_magnets_delete_admin" ON lead_magnets
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- lead_magnet_responses: anonymous can insert (public test), authenticated can read
-- Public insert (for the standalone test page — uses anon key)
CREATE POLICY "lm_responses_insert_anon" ON lead_magnet_responses
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "lm_responses_insert_auth" ON lead_magnet_responses
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin can see all responses, advisor only their assigned
CREATE POLICY "lm_responses_select_admin" ON lead_magnet_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "lm_responses_select_advisor" ON lead_magnet_responses
  FOR SELECT TO authenticated
  USING (
    advisor_id = auth.uid()
  );

-- Admin can update any response (assign advisor, convert, etc.)
CREATE POLICY "lm_responses_update_admin" ON lead_magnet_responses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed: insert the Performance Emocional test as a lead magnet
INSERT INTO lead_magnets (slug, name, type, description) VALUES
  ('test-performance-emocional', 'Test MAAT de Performance Emocional', 'test',
   'Evalúa tu capacidad de regular emociones, tomar decisiones desde valores y mantener claridad bajo presión. 20 preguntas, 4 dimensiones.')
ON CONFLICT (slug) DO NOTHING;

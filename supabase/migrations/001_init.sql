-- ============================================================
-- MAAT CRM — Initial Migration (Clean Install)
-- App: MAAT CRM (Sistema de Gestión Comercial)
-- Database dedicada exclusivamente para el CRM
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'advisor' CHECK (role IN ('admin', 'advisor')),
  phone       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-create profile on user signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'advisor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. PIPELINE_STAGES
-- ============================================================
CREATE TABLE public.pipeline_stages (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  client_type           TEXT NOT NULL CHECK (client_type IN ('b2b', 'b2c')),
  order_index           INTEGER NOT NULL,
  color                 TEXT NOT NULL DEFAULT '#6B7280',
  auto_email_template_id UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, client_type)
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_select_authenticated"
  ON public.pipeline_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pipeline_stages_insert_admin"
  ON public.pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "pipeline_stages_update_admin"
  ON public.pipeline_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "pipeline_stages_delete_admin"
  ON public.pipeline_stages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 3. PROSPECTS
-- ============================================================
CREATE TABLE public.prospects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  client_type       TEXT NOT NULL CHECK (client_type IN ('b2b', 'b2c')),
  full_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  country           TEXT,
  city              TEXT,
  company_name      TEXT,
  company_size      TEXT,
  job_title         TEXT,
  pipeline_stage    TEXT NOT NULL DEFAULT 'lead_nuevo',
  lead_score        INTEGER NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  lead_source       TEXT,
  estimated_value   NUMERIC(12, 2),
  next_contact_date DATE,
  tags              TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_advisor_id ON public.prospects(advisor_id);
CREATE INDEX idx_prospects_client_type ON public.prospects(client_type);
CREATE INDEX idx_prospects_pipeline_stage ON public.prospects(pipeline_stage);
CREATE INDEX idx_prospects_created_at ON public.prospects(created_at DESC);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_select"
  ON public.prospects FOR SELECT
  TO authenticated
  USING (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "prospects_insert"
  ON public.prospects FOR INSERT
  TO authenticated
  WITH CHECK (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "prospects_update"
  ON public.prospects FOR UPDATE
  TO authenticated
  USING (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "prospects_delete_admin"
  ON public.prospects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 4. ACTIVITIES
-- ============================================================
CREATE TABLE public.activities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id    UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  advisor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  activity_type  TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'whatsapp', 'meeting', 'note', 'stage_change')),
  title          TEXT NOT NULL,
  description    TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_prospect_id ON public.activities(prospect_id);
CREATE INDEX idx_activities_advisor_id ON public.activities(advisor_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "activities_insert"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 5. EMAIL_TEMPLATES
-- ============================================================
CREATE TABLE public.email_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  html_body       TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('b2b', 'b2c', 'general')),
  pipeline_stage  TEXT,
  variables       TEXT[] DEFAULT '{}',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_select_authenticated"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "email_templates_insert_admin"
  ON public.email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "email_templates_update_admin"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "email_templates_delete_admin"
  ON public.email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 6. SENT_EMAILS
-- ============================================================
CREATE TABLE public.sent_emails (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id  UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  template_id  UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject      TEXT NOT NULL,
  to_email     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sent_emails_prospect_id ON public.sent_emails(prospect_id);
CREATE INDEX idx_sent_emails_advisor_id ON public.sent_emails(advisor_id);

ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sent_emails_select"
  ON public.sent_emails FOR SELECT
  TO authenticated
  USING (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "sent_emails_insert"
  ON public.sent_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    advisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 7. SEED DATA — Pipeline Stages B2C
-- ============================================================
INSERT INTO public.pipeline_stages (name, slug, client_type, order_index, color) VALUES
  ('Lead Nuevo',        'lead_nuevo',        'b2c', 1, '#6B7280'),
  ('Contactado',        'contactado',        'b2c', 2, '#3B82F6'),
  ('Calificado',        'calificado',        'b2c', 3, '#8B5CF6'),
  ('Sesión Agendada',   'sesion_agendada',   'b2c', 4, '#F59E0B'),
  ('Propuesta Enviada', 'propuesta_enviada', 'b2c', 5, '#EC4899'),
  ('Negociación',       'negociacion',       'b2c', 6, '#F97316'),
  ('Cliente Activo',    'cliente_activo',    'b2c', 7, '#10B981'),
  ('Perdido',           'perdido',           'b2c', 8, '#EF4444');

-- ============================================================
-- 8. SEED DATA — Pipeline Stages B2B
-- ============================================================
INSERT INTO public.pipeline_stages (name, slug, client_type, order_index, color) VALUES
  ('Lead Nuevo',            'lead_nuevo',            'b2b', 1, '#6B7280'),
  ('Contacto Inicial',      'contacto_inicial',      'b2b', 2, '#3B82F6'),
  ('Reunión Diagnóstico',   'reunion_diagnostico',   'b2b', 3, '#8B5CF6'),
  ('Propuesta Corporativa', 'propuesta_corporativa', 'b2b', 4, '#F59E0B'),
  ('Negociación',           'negociacion',           'b2b', 5, '#F97316'),
  ('Cierre',                'cierre',                'b2b', 6, '#EC4899'),
  ('Onboarding',            'onboarding',            'b2b', 7, '#10B981'),
  ('Perdido',               'perdido',               'b2b', 8, '#EF4444');

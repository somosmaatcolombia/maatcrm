-- ============================================================
-- MIGRATION 002: Lead Scoring Automático
-- Calcula lead_score basado en:
--   - Completitud de datos del prospecto (+5 por campo llenado)
--   - Tipo de cliente B2B vs B2C (+10 para B2B)
--   - Etapa del pipeline (más avanzado = más puntos)
--   - Número de actividades recientes (últimos 30 días)
--   - Valor estimado (+5-15 según rango)
--   - Tiene próximo contacto agendado (+5)
--   - Fuente de lead (referido/evento > otros)
-- ============================================================

-- Function to calculate lead score for a given prospect
CREATE OR REPLACE FUNCTION calculate_lead_score(p_prospect_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_prospect RECORD;
  v_activity_count INTEGER;
  v_stage_order INTEGER;
BEGIN
  -- Fetch prospect
  SELECT * INTO v_prospect FROM prospects WHERE id = p_prospect_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- 1. Data completeness (max 30 pts)
  IF v_prospect.email IS NOT NULL AND v_prospect.email != '' THEN v_score := v_score + 5; END IF;
  IF v_prospect.phone IS NOT NULL AND v_prospect.phone != '' THEN v_score := v_score + 5; END IF;
  IF v_prospect.city IS NOT NULL AND v_prospect.city != '' THEN v_score := v_score + 3; END IF;
  IF v_prospect.country IS NOT NULL AND v_prospect.country != '' THEN v_score := v_score + 2; END IF;
  IF v_prospect.job_title IS NOT NULL AND v_prospect.job_title != '' THEN v_score := v_score + 5; END IF;
  IF v_prospect.lead_source IS NOT NULL AND v_prospect.lead_source != '' THEN v_score := v_score + 3; END IF;
  IF v_prospect.client_type = 'b2b' THEN
    IF v_prospect.company_name IS NOT NULL AND v_prospect.company_name != '' THEN v_score := v_score + 5; END IF;
    IF v_prospect.company_size IS NOT NULL AND v_prospect.company_size != '' THEN v_score := v_score + 2; END IF;
  END IF;

  -- 2. Client type bonus
  IF v_prospect.client_type = 'b2b' THEN v_score := v_score + 5; END IF;

  -- 3. Pipeline stage progression (max 20 pts)
  SELECT order_index INTO v_stage_order
  FROM pipeline_stages
  WHERE slug = v_prospect.pipeline_stage
    AND client_type = v_prospect.client_type
  LIMIT 1;

  IF v_stage_order IS NOT NULL THEN
    -- Stage 1=2pts, 2=5pts, 3=8pts, 4=12pts, 5=15pts, 6=18pts, 7=20pts (won), 8=0pts (lost)
    IF v_prospect.pipeline_stage = 'perdido' THEN
      v_score := GREATEST(v_score - 20, 0); -- Penalize lost
    ELSE
      v_score := v_score + LEAST(v_stage_order * 3, 20);
    END IF;
  END IF;

  -- 4. Activity count in last 30 days (max 15 pts)
  SELECT COUNT(*) INTO v_activity_count
  FROM activities
  WHERE prospect_id = p_prospect_id
    AND created_at >= NOW() - INTERVAL '30 days';

  v_score := v_score + LEAST(v_activity_count * 3, 15);

  -- 5. Estimated value bonus (max 10 pts)
  IF v_prospect.estimated_value IS NOT NULL THEN
    IF v_prospect.estimated_value >= 10000 THEN v_score := v_score + 10;
    ELSIF v_prospect.estimated_value >= 5000 THEN v_score := v_score + 7;
    ELSIF v_prospect.estimated_value >= 1000 THEN v_score := v_score + 5;
    ELSIF v_prospect.estimated_value > 0 THEN v_score := v_score + 3;
    END IF;
  END IF;

  -- 6. Has next contact scheduled (+5 pts)
  IF v_prospect.next_contact_date IS NOT NULL AND v_prospect.next_contact_date >= CURRENT_DATE THEN
    v_score := v_score + 5;
  END IF;

  -- 7. Lead source quality (max 5 pts)
  IF v_prospect.lead_source IN ('Referido', 'Evento') THEN v_score := v_score + 5;
  ELSIF v_prospect.lead_source IN ('LinkedIn', 'Sitio Web') THEN v_score := v_score + 3;
  ELSIF v_prospect.lead_source IS NOT NULL THEN v_score := v_score + 1;
  END IF;

  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger function: recalculate lead_score when prospect is updated
CREATE OR REPLACE FUNCTION trigger_update_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  v_new_score := calculate_lead_score(NEW.id);

  -- Only update if score changed to avoid infinite recursion
  IF NEW.lead_score IS DISTINCT FROM v_new_score THEN
    NEW.lead_score := v_new_score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger function: recalculate lead_score when an activity is inserted
CREATE OR REPLACE FUNCTION trigger_activity_update_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  v_new_score := calculate_lead_score(NEW.prospect_id);

  UPDATE prospects
  SET lead_score = v_new_score
  WHERE id = NEW.prospect_id
    AND lead_score IS DISTINCT FROM v_new_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trg_prospect_lead_score ON prospects;
DROP TRIGGER IF EXISTS trg_activity_lead_score ON activities;

-- Create triggers
CREATE TRIGGER trg_prospect_lead_score
  BEFORE INSERT OR UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_lead_score();

CREATE TRIGGER trg_activity_lead_score
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_activity_update_lead_score();


-- Batch recalculate all existing prospects
DO $$
DECLARE
  r RECORD;
  v_score INTEGER;
BEGIN
  FOR r IN SELECT id FROM prospects LOOP
    v_score := calculate_lead_score(r.id);
    UPDATE prospects SET lead_score = v_score WHERE id = r.id AND lead_score IS DISTINCT FROM v_score;
  END LOOP;
END $$;

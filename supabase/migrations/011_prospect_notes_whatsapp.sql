-- ============================================================
-- 011: Add notes + dedicated whatsapp field to prospects
-- ============================================================

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

COMMENT ON COLUMN prospects.notes IS 'Free-form notes about the prospect (job title, company, context). For B2C prospects coming from external lists where role/company are relevant context.';
COMMENT ON COLUMN prospects.whatsapp IS 'Dedicated WhatsApp number when different from main phone. Used by WhatsApp picker.';

-- Index for WhatsApp search
CREATE INDEX IF NOT EXISTS idx_prospects_whatsapp ON prospects (whatsapp) WHERE whatsapp IS NOT NULL;

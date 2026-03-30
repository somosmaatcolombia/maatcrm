-- Add design_json column to store Unlayer editor design for drag-and-drop editing
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS design_json JSONB;

-- ============================================================
-- 009: Scheduled notifications for discovery calls
-- ============================================================

-- Add call_id link to qualifications (qualification can be tied to a specific call)
ALTER TABLE call_qualifications
  ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES discovery_calls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qualifications_call ON call_qualifications (call_id);

-- ============================================================
-- TABLE: scheduled_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES discovery_calls(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  qualification_id UUID REFERENCES call_qualifications(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('qualification_link', 'reminder_24h', 'reminder_2h', 'followup_advisor', 'custom')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'system')),
  to_email TEXT,
  to_phone TEXT,
  to_name TEXT,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  template_data JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scheduled_notifications_due ON scheduled_notifications (scheduled_for, status) WHERE status = 'pending';
CREATE INDEX idx_scheduled_notifications_call ON scheduled_notifications (call_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_scheduled_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_notifications_updated_at
BEFORE UPDATE ON scheduled_notifications
FOR EACH ROW EXECUTE FUNCTION update_scheduled_notifications_updated_at();

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read all notifications"
  ON scheduled_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert notifications"
  ON scheduled_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update notifications"
  ON scheduled_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete notifications"
  ON scheduled_notifications FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Trigger: auto-schedule notifications when a discovery_call is created
-- ============================================================

CREATE OR REPLACE FUNCTION schedule_call_notifications()
RETURNS TRIGGER AS $$
DECLARE
  prospect_record prospects%ROWTYPE;
  qual_record call_qualifications%ROWTYPE;
  recipient_email TEXT;
  recipient_phone TEXT;
  recipient_name TEXT;
  qual_send_at TIMESTAMPTZ;
  reminder_send_at TIMESTAMPTZ;
BEGIN
  -- Get prospect info if linked
  IF NEW.prospect_id IS NOT NULL THEN
    SELECT * INTO prospect_record FROM prospects WHERE id = NEW.prospect_id;
    recipient_email := prospect_record.email;
    recipient_phone := prospect_record.phone;
    recipient_name := prospect_record.full_name;
  END IF;

  -- Get qualification info if linked, override with its contact info if no prospect
  IF NEW.qualification_id IS NOT NULL THEN
    SELECT * INTO qual_record FROM call_qualifications WHERE id = NEW.qualification_id;
    IF recipient_email IS NULL THEN recipient_email := qual_record.email; END IF;
    IF recipient_phone IS NULL THEN recipient_phone := qual_record.phone; END IF;
    IF recipient_name IS NULL THEN recipient_name := qual_record.full_name; END IF;
  END IF;

  -- Only schedule if we have an email
  IF recipient_email IS NOT NULL AND NEW.status = 'scheduled' THEN

    -- 1. Qualification link email (only if call doesn't already have a qualification)
    IF NEW.qualification_id IS NULL THEN
      qual_send_at := LEAST(NEW.scheduled_at - INTERVAL '2 days', now() + INTERVAL '5 minutes');
      -- If the call is in less than 2 days, send 5 minutes from now
      IF qual_send_at < now() THEN
        qual_send_at := now() + INTERVAL '5 minutes';
      END IF;

      INSERT INTO scheduled_notifications (call_id, prospect_id, type, channel, to_email, to_name, scheduled_for, template_data)
      VALUES (NEW.id, NEW.prospect_id, 'qualification_link', 'email', recipient_email, recipient_name, qual_send_at, jsonb_build_object('call_id', NEW.id::text));
    END IF;

    -- 2. 24h reminder email (only if call is more than 24h away)
    reminder_send_at := NEW.scheduled_at - INTERVAL '24 hours';
    IF reminder_send_at > now() + INTERVAL '5 minutes' THEN
      INSERT INTO scheduled_notifications (call_id, prospect_id, type, channel, to_email, to_name, scheduled_for, template_data)
      VALUES (NEW.id, NEW.prospect_id, 'reminder_24h', 'email', recipient_email, recipient_name, reminder_send_at, jsonb_build_object('call_id', NEW.id::text));
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_call_notifications
AFTER INSERT ON discovery_calls
FOR EACH ROW EXECUTE FUNCTION schedule_call_notifications();

-- ============================================================
-- Trigger: cancel pending notifications when a call is cancelled
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_call_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'completed', 'no_show') AND OLD.status = 'scheduled' THEN
    UPDATE scheduled_notifications
      SET status = 'cancelled', updated_at = now()
      WHERE call_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cancel_call_notifications
AFTER UPDATE ON discovery_calls
FOR EACH ROW EXECUTE FUNCTION cancel_call_notifications();

-- ============================================================
-- When a qualification is created with a call_id, link the call back
-- ============================================================

CREATE OR REPLACE FUNCTION link_qualification_to_call()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.call_id IS NOT NULL THEN
    UPDATE discovery_calls
      SET qualification_id = NEW.id
      WHERE id = NEW.call_id AND qualification_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_link_qualification_to_call
AFTER INSERT ON call_qualifications
FOR EACH ROW EXECUTE FUNCTION link_qualification_to_call();

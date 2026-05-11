-- ============================================================
-- 010: Cron job to process scheduled notifications every 15 minutes
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing job with the same name first (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('process-scheduled-notifications');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule the cron job
-- Edge function is deployed with --no-verify-jwt so no auth header needed
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vbfesmgxegxsurnfazjs.supabase.co/functions/v1/process-scheduled-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

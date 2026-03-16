-- 003_rls_fixes.sql
-- Fix missing WITH CHECK clauses on UPDATE policies

-- ============================================================
-- 1. profiles — admin update policy
-- ============================================================
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 2. pipeline_stages — admin update policy
-- ============================================================
DROP POLICY IF EXISTS "pipeline_stages_update_admin" ON pipeline_stages;
CREATE POLICY "pipeline_stages_update_admin" ON pipeline_stages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. email_templates — admin update policy
-- ============================================================
DROP POLICY IF EXISTS "email_templates_update_admin" ON email_templates;
CREATE POLICY "email_templates_update_admin" ON email_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

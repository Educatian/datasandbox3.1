-- ============================================================
-- Data Sandbox 2.0 — Supabase policies required by new features
-- Apply in the Supabase SQL editor (project owner only).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- The app logs user_id as the user's EMAIL (loggingService setUser(email)).
-- The original "read own logs" policy compared auth.uid() to user_id, which
-- never matches an email, so students could not read their own telemetry.
-- ProgressView (student progress dashboard) needs this:

DROP POLICY IF EXISTS "Users can read own logs" ON user_logs;
CREATE POLICY "Users can read own logs" ON user_logs
  FOR SELECT USING (
    auth.uid()::text = user_id
    OR auth.email() = user_id
    OR user_id = 'anonymous'
  );

-- AdminAnalytics (instructor dashboard) needs admins to read ALL logs.
-- Admin = user_metadata.role = 'admin' (Plan A) or a row in user_roles (Plan B).

DROP POLICY IF EXISTS "Admins can read all logs" ON user_logs;
CREATE POLICY "Admins can read all logs" ON user_logs
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Module settings for the new Advanced Track modules (admin can then toggle
-- visibility in the dashboard; default hidden, same as core modules).
INSERT INTO module_settings (module_id, visibility_state)
SELECT m.id, 'hidden'
FROM (VALUES
  ('anova'), ('chi-square'), ('bayesian'), ('multi-level'), ('mixed-methods'),
  ('psm'), ('rdd'), ('sem'), ('survival'),
  ('irt'), ('factor-analysis'), ('knowledge-tracing'),
  ('logistic'), ('decision-tree'), ('k-means'), ('pca'), ('lpa'), ('xai'),
  ('hmm'), ('spm'), ('lsa'), ('sequential'), ('sna'), ('topic-modeling'), ('multimodal')
) AS m(id)
ON CONFLICT (module_id) DO NOTHING;

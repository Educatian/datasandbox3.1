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

-- ============================================================
-- RPC functions for social/aggregate features (SECURITY DEFINER:
-- they return only anonymous aggregates, never identities)
-- ============================================================

-- Anonymous class distribution of PredictGate predictions.
-- Extracts fields from the JSON details string without casting (robust to
-- any malformed rows), restricted to prediction_commit events.
CREATE OR REPLACE FUNCTION get_prediction_distribution(p_prediction_id text)
RETURNS TABLE(option_id text, picks bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT substring(target_class from '"option":"([^"]+)"') AS option_id,
         count(*) AS picks
  FROM user_logs
  WHERE target_id = 'prediction_commit'
    AND target_tag = 'PredictGate'
    AND target_class LIKE '%"predictionId":"' || p_prediction_id || '"%'
  GROUP BY 1
  HAVING substring(target_class from '"option":"([^"]+)"') IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION get_prediction_distribution(text) TO authenticated;

-- Pooled class dataset from experiment trials (e.g. the Reaction Time
-- experiment): every student's trials combine into one shared dataset.
CREATE OR REPLACE FUNCTION get_class_experiment_points(p_module text, p_limit int DEFAULT 500)
RETURNS TABLE(x real, y real)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT substring(target_class from '"x":([0-9.eE+-]+)')::real AS x,
         substring(target_class from '"y":([0-9.eE+-]+)')::real AS y
  FROM user_logs
  WHERE target_id = 'experiment_trial'
    AND target_tag = p_module
    AND substring(target_class from '"x":([0-9.eE+-]+)') IS NOT NULL
    AND substring(target_class from '"y":([0-9.eE+-]+)') IS NOT NULL
  ORDER BY timestamp DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION get_class_experiment_points(text, int) TO authenticated;

-- Per-user module activity summary (drives the portal's explored-module
-- chips and "next up" suggestion without shipping raw logs to the client).
CREATE OR REPLACE FUNCTION get_my_module_activity()
RETURNS TABLE(page text, events bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT page, count(*) AS events
  FROM user_logs
  WHERE (user_id = auth.email() OR user_id = auth.uid()::text)
    AND page IS NOT NULL AND page <> 'portal'
  GROUP BY page;
$$;
GRANT EXECUTE ON FUNCTION get_my_module_activity() TO authenticated;

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

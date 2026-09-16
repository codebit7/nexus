-- A rate limit counter that all serverless instances share.
--
-- lib/rate-limit.ts keeps its counters in process memory. On Vercel each warm
-- serverless instance owns its own Map, so "30 requests per 5 minutes" is
-- really 30 x (number of live instances), and the number of instances is not
-- something the app controls. For the integration endpoint — which is reached
-- by a machine holding a long-lived key, not by a human at a login form —
-- that is the difference between a limit and a suggestion.
--
-- One row per bucket, incremented atomically. The in-memory limiter stays in
-- place for the browser-facing routes, where per-instance counting is good
-- enough and an extra database round trip is not worth it.

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  -- e.g. "integration:<key uuid>"
  bucket_key   text        PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits         integer     NOT NULL DEFAULT 0
);

-- Service role only. No workspace user ever reads or writes this table, so it
-- gets no policy at all — RLS on with zero policies denies everyone except the
-- service role, which bypasses RLS.
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

/**
 * Count one hit against a bucket and say whether it is allowed.
 *
 * Fixed window rather than the sliding window used in memory: a sliding window
 * needs every timestamp kept per key, which is a row per request. A fixed
 * window is one row total and cannot drift between instances. The tradeoff is
 * that a caller can burst across a window boundary; for a batch push endpoint
 * that is fine.
 *
 * Returns retry_after_seconds = 0 when allowed.
 */
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key text,
  p_max_hits   integer,
  p_window_secs integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_hits         integer;
BEGIN
  -- INSERT .. ON CONFLICT DO UPDATE is a single atomic statement, so two
  -- instances arriving together cannot both read "29" and both write "30".
  INSERT INTO public.rate_limit_counters AS c (bucket_key, window_start, hits)
  VALUES (p_bucket_key, now(), 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      -- Expired window: start a fresh one instead of adding to a stale count.
      window_start = CASE
        WHEN c.window_start < now() - make_interval(secs => p_window_secs)
          THEN now()
        ELSE c.window_start
      END,
      hits = CASE
        WHEN c.window_start < now() - make_interval(secs => p_window_secs)
          THEN 1
        ELSE c.hits + 1
      END
  RETURNING c.window_start, c.hits INTO v_window_start, v_hits;

  IF v_hits <= p_max_hits THEN
    RETURN QUERY SELECT true, 0;
  ELSE
    RETURN QUERY SELECT
      false,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (v_window_start + make_interval(secs => p_window_secs) - now())))::integer
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM public, anon, authenticated;

-- Housekeeping: rows for buckets nobody has touched in a day are dead weight.
-- Safe to run from a cron job, or ignore — the table stays small either way
-- (one row per integration key).
CREATE INDEX IF NOT EXISTS rate_limit_counters_window_start_idx
  ON public.rate_limit_counters (window_start);

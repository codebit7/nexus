-- Meeting transcripts uploaded in the app, plus whatever the AI pulled out of
-- them, held as a draft until the user turns them into real tasks.
--
-- Deliberately NOT the notes2board approach. That app writes AI output straight
-- into its real `tasks` table with status 'pending', then needs two cleanup jobs
-- to delete the rows nobody converted. Here nothing reaches `tasks` until the
-- user presses create, so there are no orphans to sweep up.
--
-- The row also survives a page refresh: after parsing, the user sits at
-- /dashboard/notes/<id>, so closing the tab or coming back tomorrow reloads the
-- same draft instead of re-running (and re-paying for) the AI.
CREATE TABLE IF NOT EXISTS meeting_notes (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- Who uploaded it. Kept when the transcript is later cleared.
  created_by uuid REFERENCES team_members(id) ON DELETE SET NULL,

  title      text NOT NULL,
  -- 'upload' or 'paste'. file_name is null when pasted.
  source     text NOT NULL DEFAULT 'upload',
  file_name  text,

  -- The two sensitive columns. Emptied by the retention sweep after 30 days,
  -- which is why they are nullable and why nothing else depends on them.
  transcript   text,
  parsed_tasks jsonb,

  -- 'draft'     — parsed, waiting for the user to review and confirm
  -- 'converted' — tasks were created from it
  status     text NOT NULL DEFAULT 'draft'
             CHECK (status IN ('draft', 'converted')),

  -- Where the tasks went. Null until converted.
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  task_count integer NOT NULL DEFAULT 0,

  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  converted_at timestamp with time zone,
  -- Set by the retention sweep so the UI can say "transcript cleared" rather
  -- than showing a blank box with no explanation.
  purged_at    timestamp with time zone
);

CREATE INDEX IF NOT EXISTS meeting_notes_org_id_idx     ON meeting_notes(org_id);
CREATE INDEX IF NOT EXISTS meeting_notes_created_by_idx ON meeting_notes(created_by);
CREATE INDEX IF NOT EXISTS meeting_notes_project_id_idx ON meeting_notes(project_id);
-- Drives the retention sweep: find un-purged rows older than the cutoff.
CREATE INDEX IF NOT EXISTS meeting_notes_retention_idx
  ON meeting_notes(created_at) WHERE purged_at IS NULL;

-- Same shape as tags/task_tags: authenticated users reach only their own org,
-- anon is blocked, service_role bypasses.
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meeting_notes_authenticated_org_scope ON meeting_notes;
CREATE POLICY meeting_notes_authenticated_org_scope ON meeting_notes
  FOR ALL
  TO authenticated
  USING (org_id = get_org_id())
  WITH CHECK (org_id = get_org_id());

/**
 * Retention: clear the words, keep the record.
 *
 * After 30 days the transcript and the AI output are emptied, but the row stays
 * forever. A task never loses the answer to "which meeting did this come from",
 * while the sensitive content (pay, complaints, personal matters) does not sit
 * in the database indefinitely.
 *
 * Rows are never deleted here. Users delete their own uploads from the UI.
 */
CREATE OR REPLACE FUNCTION purge_old_meeting_transcripts(retain_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged integer;
BEGIN
  UPDATE meeting_notes
  SET transcript   = NULL,
      parsed_tasks = NULL,
      purged_at    = now()
  WHERE purged_at IS NULL
    AND created_at < now() - make_interval(days => retain_days);

  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

REVOKE ALL ON FUNCTION purge_old_meeting_transcripts(integer) FROM public, anon, authenticated;

COMMENT ON FUNCTION purge_old_meeting_transcripts(integer) IS
  'Clears transcript and parsed_tasks on meeting_notes older than retain_days (default 30), keeping the row. Schedule daily via pg_cron.';

// Turn a meeting transcript into a reviewable list of tasks.
//
// This replaces notes2board's `parse-notes` edge function. That app is Vite —
// no server — so anything holding the OpenAI key had to run on Supabase. Here
// the route handler already runs server-side, so the key stays in Vercel's env
// and never goes near the browser.
//
// Nothing reaches the `tasks` table from here. The result is stored as a draft
// in `meeting_notes` and the caller gets its id, which becomes the review URL.
// That is what makes a page refresh safe: reload the draft instead of paying
// OpenAI for the same transcript twice.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTeamMemberByEmail } from '@/lib/db/team-members';
import { createMeetingNote, type ParsedTask } from '@/lib/db/meeting-notes';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';
import type { TaskPriority } from '@/lib/types';

/** Above this the request is refused rather than sending a large OpenAI bill.
 *  ~40k characters is roughly a 2-3 hour meeting. */
const MAX_TRANSCRIPT_CHARS = 40_000;
const MIN_TRANSCRIPT_CHARS = 20;
/** The model regularly returns more than asked for; anything past this is noise. */
const MAX_TASKS = 100;
const MAX_TITLE = 500;
const MAX_DESCRIPTION = 10_000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

/**
 * notes2board's AI works on three levels, nexus-app stores four. Map onto the
 * three that mean the same thing and never invent 'urgent' — a person decides
 * that, not a model.
 */
function mapPriority(value: unknown): TaskPriority {
  switch (String(value ?? '').toLowerCase()) {
    case 'high': return 'high';
    case 'low':  return 'low';
    default:     return 'normal';
  }
}

/** Keep a date only if it is real. `2026-02-31` matches the regex but is not a day. */
function cleanDate(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().startsWith(value) ? value : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return trimmed.slice(0, max);
}

/**
 * Match the name the AI read in the transcript against a real team member.
 *
 * The integration could never do this — pushing across the API, the two apps
 * shared no member list, so every task arrived unassigned. Inside nexus-app the
 * workspace is right here.
 *
 * Deliberately conservative: an exact full-name match, or a first-name match
 * when exactly one person answers to it. Two people called "Ali" means nobody
 * gets assigned, because guessing wrong is worse than leaving it blank.
 */
function resolveAssignee(
  name: string | null,
  members: { id: string; name: string | null }[]
): string | null {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  if (!needle) return null;

  const full = members.filter((m) => (m.name ?? '').trim().toLowerCase() === needle);
  if (full.length === 1) return full[0].id;

  const first = members.filter(
    (m) => (m.name ?? '').trim().toLowerCase().split(/\s+/)[0] === needle
  );
  if (first.length === 1) return first[0].id;

  return null;
}

const SYSTEM_PROMPT =
  'You are a helpful assistant that extracts tasks from meeting notes. Always respond with valid JSON only.';

/** Ported from notes2board's parse-notes function. Tuned prompt — kept as-is
 *  apart from dropping fields nexus-app has nowhere to store. */
function buildPrompt(notes: string): string {
  return `
Analyze the following meeting notes as an experienced project manager and scrum master. Extract ALL actionable tasks with professional project management insights.

${notes}

ANALYSIS APPROACH:
1. **Identify Context Patterns**: Look for mentions of different systems, features, modules, or contexts mentioned in the conversation
2. **Extract ALL actionable items** mentioned in the meeting, even if they seem minor
3. **Analyze each task** for dependencies, risks, and business impact
4. **Assess priority** based on urgency, business value, and technical complexity
5. **Identify who is responsible** and any resource constraints
6. **Consider timeline implications** and potential blockers

CONTEXT INTELLIGENCE GUIDELINES:
- **Pay attention to context switches** in the conversation - when speakers move from discussing one topic/system to another
- **Identify specific features, modules, or components** mentioned
- **Don't over-consolidate** - if multiple tasks relate to the same feature but are distinct, keep them separate
- **Include context clues** in task descriptions to help with organization and prioritization
- **Adapt to any domain** - software, marketing, healthcare, education, or any other field
- **Ignore things that were explicitly parked, rejected or deferred** - they are not tasks

Return only valid JSON in this exact format:
[
  {
    "title": "Clear, actionable task title",
    "description": "Description including: who raised it, specific requirements, technical details, business context, dependencies, risks, timeline implications, and any constraints or blockers identified.",
    "assignee": "Person responsible exactly as named in the notes, otherwise null",
    "dueDate": "YYYY-MM-DD if a date is mentioned, otherwise null",
    "priority": "low|medium|high"
  }
]

PRIORITY ASSESSMENT:
- High: Critical bugs, security issues, blocking dependencies, high business impact
- Medium: Regular features, improvements, moderate business value
- Low: Nice-to-have features, optimizations, low business impact

Return an empty array [] if the notes contain no actionable tasks.
`;
}

/** Ask OpenAI and pull the JSON array out of the reply. */
async function extractTasks(notes: string, apiKey: string): Promise<unknown[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(notes) },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // Quota is the one failure a user can act on, so name it plainly instead of
    // letting it surface as a generic 500.
    if (response.status === 429) {
      throw new Error(
        'The AI service is out of credit or too busy right now. Try again shortly, or top up the OpenAI account.'
      );
    }
    console.error('[parse-notes] OpenAI error', response.status, detail.slice(0, 500));
    throw new Error('The AI service could not process these notes. Please try again.');
  }

  const data = await response.json();
  const content: unknown = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('The AI service returned an unexpected response.');
  }

  // The model sometimes wraps the array in prose or a code fence.
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error('[parse-notes] no JSON array in reply:', content.slice(0, 500));
    throw new Error('Could not read the AI response. Please try again.');
  }

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('[parse-notes] invalid JSON:', match[0].slice(0, 500));
    throw new Error('Could not read the AI response. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  // ── Who is asking ─────────────────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'Not signed in' }, 401);

  const member = await getTeamMemberByEmail(user.email).catch(() => null);
  if (!member?.org_id) return json({ error: 'No workspace found for this account' }, 403);

  // Keyed by member, not IP — one person's uploads must not block their colleagues.
  const { success, resetMs } = checkRateLimit(`parse-notes:${member.id}`);
  if (!success) {
    return json(
      { error: `That is a lot of uploads. Please try again in ${formatResetTime(resetMs)}.` },
      429
    );
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  let body: { transcript?: unknown; title?: unknown; source?: unknown; fileName?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

  if (transcript.length < MIN_TRANSCRIPT_CHARS) {
    return json({ error: 'These notes are too short to pull tasks from.' }, 400);
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return json(
      {
        error: `These notes are too long (${transcript.length.toLocaleString()} characters, limit ${MAX_TRANSCRIPT_CHARS.toLocaleString()}). Split the meeting into parts and upload them one at a time.`,
      },
      400
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[parse-notes] OPENAI_API_KEY is not set');
    return json({ error: 'The AI service is not configured yet.' }, 503);
  }

  // ── Ask the model ─────────────────────────────────────────────────────────
  let raw: unknown[];
  try {
    raw = await extractTasks(transcript, apiKey);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Failed to read the notes' }, 502);
  }

  // ── Clean what came back ──────────────────────────────────────────────────
  // Model output is untrusted input. Every field is re-checked here, and again
  // in the server action before anything is written to `tasks`.
  const { data: memberRows } = await supabaseAdmin
    .from('team_members')
    .select('id, name')
    .eq('org_id', member.org_id);

  const members = (memberRows ?? []) as { id: string; name: string | null }[];

  const tasks: ParsedTask[] = [];
  for (const item of raw.slice(0, MAX_TASKS)) {
    const entry = item as Record<string, unknown>;
    const title = cleanText(entry.title, MAX_TITLE);
    if (!title) continue; // A task with no title is not a task.

    const assigneeName = cleanText(entry.assignee, 120);

    tasks.push({
      title,
      description: cleanText(entry.description, MAX_DESCRIPTION),
      priority: mapPriority(entry.priority),
      due_date: cleanDate(entry.dueDate),
      assignee_name: assigneeName,
      assignee_id: resolveAssignee(assigneeName, members),
    });
  }

  if (tasks.length === 0) {
    return json(
      { error: 'No tasks were found in these notes. Check the text and try again.' },
      422
    );
  }

  // ── Save as a draft ───────────────────────────────────────────────────────
  const title = cleanText(body.title, 200) ?? 'Meeting notes';
  const source = body.source === 'paste' ? 'paste' : 'upload';

  try {
    const note = await createMeetingNote({
      title,
      source,
      fileName: cleanText(body.fileName, 300),
      transcript,
      parsedTasks: tasks,
      createdBy: member.id,
    });

    return json({ id: note.id, taskCount: tasks.length }, 201);
  } catch (err) {
    console.error('[parse-notes] failed to save draft', err);
    return json({ error: 'Could not save these notes. Please try again.' }, 500);
  }
}

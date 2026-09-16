"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, CheckCircle2 } from "lucide-react";
import { useWorkspaceSlug } from "../../workspace-context";
import { createTasksFromNotesAction } from "../actions";
import type { ParsedTask } from "@/lib/db/meeting-notes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Priority = ParsedTask["priority"];

const PRIORITIES: Priority[] = ["urgent", "high", "normal", "low"];

// Same dropdown look as the task form (components/tasks/TaskForm.tsx), but sized
// to sit inline beside the create button instead of filling a form column.
// A native <select> here rendered the OS dropdown, which ignores the dark theme.
const SELECT_TRIGGER = `h-9 w-[200px] rounded-md border border-[var(--border-default)] bg-[var(--bg-input)]
  text-[13px] text-[var(--text-primary)]
  focus:ring-1 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)]
  data-[placeholder]:text-[var(--text-faint)]`;
const SELECT_CONTENT =
  "bg-[var(--bg-sidebar)] border-[var(--border-default)] text-[var(--text-primary)]";
const SELECT_ITEM =
  "text-[13px] text-[var(--text-muted)] focus:bg-[var(--tint-accent)] focus:text-[var(--accent)] cursor-pointer";

interface ReviewClientProps {
  note: {
    id: string;
    title: string;
    status: "draft" | "converted";
    taskCount: number;
    projectId: string | null;
    purged: boolean;
    tasks: ParsedTask[];
  };
  projects: { id: string; name: string }[];
  teamMembers: { id: string; name: string | null }[];
}

interface Row extends ParsedTask {
  selected: boolean;
}

export function ReviewClient({ note, projects, teamMembers }: ReviewClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();

  const [rows, setRows] = useState<Row[]>(
    note.tasks.map((t) => ({ ...t, selected: true }))
  );
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = rows.filter((r) => r.selected).length;

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleCreate() {
    if (!projectId || selectedCount === 0) return;
    setSaving(true);
    setError(null);

    try {
      const payload = rows
        .filter((r) => r.selected)
        .map(({ selected: _selected, ...task }) => task);

      const result = await createTasksFromNotesAction(note.id, projectId, payload);
      router.push(`/${slug}/projects/${result.projectId}/board`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the tasks.");
      setSaving(false);
    }
  }

  // Already used, or the 30-day sweep cleared the draft. Either way there is
  // nothing left to review.
  if (note.status === "converted" || note.purged || note.tasks.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
        <BackLink slug={slug} />
        <div className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          {note.status === "converted" ? (
            <>
              <CheckCircle2 size={18} className="mb-3 text-[var(--status-done)]" />
              <p className="text-[13px] text-[var(--text-primary)]">
                {note.taskCount} task{note.taskCount === 1 ? "" : "s"} were already
                created from these notes.
              </p>
              {note.projectId && (
                <Link
                  href={`/${slug}/projects/${note.projectId}/board`}
                  className="mt-3 inline-block text-[13px] text-[var(--accent)] hover:underline"
                >
                  Open the board
                </Link>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[var(--text-muted)]">
              This transcript was cleared after 30 days, so there is nothing left to
              review. The record is kept for reference.
            </p>
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    // The dashboard <main> is overflow-hidden, so each page owns its own scroll
    // container. Without this the list is simply clipped with no way to reach
    // the create button.
    <div className="h-full overflow-y-auto">
      {/* pb-12: the action bar sat flush against the bottom edge, so the project
          dropdown had nothing under it to breathe into. */}
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-12">
      <BackLink slug={slug} />

      <header className="mt-4 mb-6">
        <h1 className="text-[18px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {note.title}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          {rows.length} task{rows.length === 1 ? "" : "s"} found. Edit anything, untick
          what you do not want, then create them.
        </p>
      </header>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className={`rounded-lg border p-3 transition-colors duration-150 ${
              row.selected
                ? "border-[var(--border-default)] bg-[var(--bg-card)]"
                : "border-[var(--border-subtle)] bg-transparent opacity-55"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={row.selected}
                onChange={(e) => update(index, { selected: e.target.checked })}
                aria-label={`Include ${row.title}`}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />

              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={row.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  aria-label="Task title"
                  className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-subtle)] focus:border-[var(--border-hover)] focus:bg-[var(--bg-input)] focus:outline-none"
                />

                <textarea
                  value={row.description ?? ""}
                  onChange={(e) => update(index, { description: e.target.value || null })}
                  rows={2}
                  aria-label="Task description"
                  placeholder="No description"
                  className="w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] leading-[1.6] text-[var(--text-muted)] placeholder:text-[var(--text-disabled)] transition-colors duration-150 hover:border-[var(--border-subtle)] focus:border-[var(--border-hover)] focus:bg-[var(--bg-input)] focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {/* autoComplete off on all three: Chrome autofills selects it
                      cannot identify, which showed random team members as the
                      assignee even though the stored value was null. */}
                  <select
                    value={row.priority}
                    onChange={(e) => update(index, { priority: e.target.value as Priority })}
                    aria-label="Priority"
                    autoComplete="off"
                    className="rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={row.due_date ?? ""}
                    onChange={(e) => update(index, { due_date: e.target.value || null })}
                    aria-label="Due date"
                    autoComplete="off"
                    className="rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
                  />

                  <select
                    value={row.assignee_id ?? ""}
                    onChange={(e) => update(index, { assignee_id: e.target.value || null })}
                    aria-label="Assignee"
                    autoComplete="off"
                    className="rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name ?? "Unnamed"}
                      </option>
                    ))}
                  </select>

                  {/* The AI read a name we could not match to anyone. Say so
                      rather than silently dropping it. */}
                  {row.assignee_name && !row.assignee_id && (
                    <span className="text-[11px] text-[var(--text-faint)]">
                      notes said &ldquo;{row.assignee_name}&rdquo;
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-[13px] text-[var(--priority-urgent)]">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className={SELECT_TRIGGER} aria-label="Project">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className={SELECT_ITEM}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={handleCreate}
          disabled={saving || selectedCount === 0 || !projectId}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Create {selectedCount} task{selectedCount === 1 ? "" : "s"}
        </button>

        <span className="text-[12px] text-[var(--text-faint)]">
          Nothing is created until you press this.
        </span>
        </div>
      </div>
    </div>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/${slug}/notes`}
      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
    >
      <ArrowLeft size={14} />
      Meeting notes
    </Link>
  );
}

export default ReviewClient;

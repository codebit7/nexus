"use client";

import { useState, useRef, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileText,
  Loader2,
  X,
  Sparkles,
  Trash2,
  ArrowRight,
} from "lucide-react";
import {
  processFile,
  isSupportedFileType,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/file-processor";
import { useWorkspaceSlug } from "../workspace-context";
import { deleteMeetingNoteAction } from "./actions";
import type { MeetingNoteListItem } from "@/lib/db/meeting-notes";

interface NotesClientProps {
  projects: { id: string; name: string }[];
  notes: MeetingNoteListItem[];
}

type Stage = "idle" | "reading" | "parsing";

export function NotesClient({ projects, notes }: NotesClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = stage !== "idle";
  const canSubmit = !busy && (file !== null || pasted.trim().length > 0);

  function selectFile(next: File) {
    setError(null);
    if (!isSupportedFileType(next.name)) {
      setError("Unsupported file. Upload a .txt, .md or .pdf file.");
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      setError("That file is over 10MB. Please upload a smaller one.");
      return;
    }
    setFile(next);
    setPasted("");
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);

    try {
      let transcript: string;
      let title: string;

      if (file) {
        setStage("reading");
        const result = await processFile(file);
        transcript = result.text;
        title = result.fileName.replace(/\.[^.]+$/, "");
      } else {
        transcript = pasted.trim();
        title = `Notes — ${new Date().toLocaleDateString()}`;
      }

      setStage("parsing");
      const response = await fetch("/api/parse-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          title,
          source: file ? "upload" : "paste",
          fileName: file?.name ?? null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Could not read these notes.");

      // The draft is saved, so the review screen lives at its own URL. Refreshing
      // there reloads the draft instead of re-running the AI.
      router.push(`/${slug}/notes/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
    }
  }

  return (
    // The dashboard <main> is overflow-hidden, so each page owns its own scroll
    // container. Without this the history list is clipped with no way to reach it.
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-[18px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          Meeting Notes
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Upload a transcript and let AI pull out the tasks. You review everything
          before anything is created.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-[13px] text-[var(--text-muted)]">
          You need a project before notes can become tasks.{" "}
          <Link href={`/${slug}/projects`} className="text-[var(--accent)] hover:underline">
            Create one first
          </Link>
          .
        </div>
      ) : (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-lg border border-dashed p-8 text-center transition-colors duration-150 ${
              dragging
                ? "border-[var(--accent)] bg-[var(--tint-accent)]"
                : "border-[var(--border-default)] bg-[var(--bg-card)]"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={16} className="text-[var(--accent)]" />
                <span className="text-[13px] text-[var(--text-primary)]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={busy}
                  aria-label="Remove file"
                  className="rounded p-1 text-[var(--text-faint)] transition-colors duration-150 hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={20} className="mx-auto mb-3 text-[var(--text-faint)]" />
                <p className="text-[13px] text-[var(--text-primary)]">
                  Drop a transcript here, or{" "}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-[var(--accent)] hover:underline"
                  >
                    browse
                  </button>
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-faint)]">
                  .txt, .md or .pdf — up to 10MB
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) selectFile(picked);
              }}
            />
          </div>

          {!file && (
            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-faint)]">
                Or paste the notes
              </label>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                disabled={busy}
                rows={8}
                placeholder="Paste your meeting transcript…"
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] transition-colors duration-150 focus:border-[var(--border-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
              />
            </div>
          )}

          {error && (
            <p className="mt-3 text-[13px] text-[var(--priority-urgent)]">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {stage === "reading" ? "Reading file…" : "Finding tasks…"}
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Find tasks
              </>
            )}
          </button>

          {stage === "parsing" && (
            <p className="mt-2 text-[12px] text-[var(--text-faint)]">
              This takes a few seconds. You can review and edit everything next.
            </p>
          )}
        </>
      )}

      {notes.length > 0 && <HistoryList notes={notes} slug={slug} />}
      </div>
    </div>
  );
}

function HistoryList({ notes, slug }: { notes: MeetingNoteListItem[]; slug: string }) {
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    try {
      await deleteMeetingNoteAction(id);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
        Previous uploads
      </h2>
      <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
        {notes.map((note) => (
          <div
            key={note.id}
            className="group flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 last:border-b-0 hover:bg-[var(--hover-subtle)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-[var(--text-primary)]">{note.title}</p>
              <p className="text-[12px] text-[var(--text-faint)]">
                {new Date(note.created_at).toLocaleDateString()}
                {note.status === "converted"
                  ? ` · ${note.task_count} task${note.task_count === 1 ? "" : "s"} in ${note.project_name ?? "a project"}`
                  : " · not used yet"}
                {note.purged_at ? " · transcript cleared" : ""}
              </p>
            </div>

            {note.status === "draft" && !note.purged_at && (
              <Link
                href={`/${slug}/notes/${note.id}`}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline"
              >
                Review <ArrowRight size={12} />
              </Link>
            )}

            <button
              type="button"
              onClick={() => remove(note.id)}
              disabled={removing === note.id}
              aria-label={`Delete ${note.title}`}
              className="rounded p-1 text-[var(--text-disabled)] opacity-0 transition-colors duration-150 group-hover:opacity-100 hover:text-[var(--priority-urgent)] disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default NotesClient;

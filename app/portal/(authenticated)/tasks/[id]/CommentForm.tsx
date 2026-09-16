"use client";

import { useState, useTransition } from "react";
import { Send, User } from "lucide-react";
import { submitPortalComment } from "./actions";

interface CommentFormProps {
  taskId: string;
  // Accepted for backwards compatibility with the parent component, but
  // intentionally ignored — the server action derives the portal client id
  // from the session cookie and cannot be impersonated by the caller.
  clientId?: string;
  csrfToken: string;
}

export function CommentForm({ taskId, csrfToken }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const result = await submitPortalComment(taskId, trimmed, csrfToken);
      if (result?.error) {
        setError(result.error);
      } else {
        setContent("");
      }
    });
  }

  return (
    <>
      {error && (
        <p className="mb-3 text-sm text-[var(--priority-urgent)] bg-[var(--tint-red)] px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tint-accent-strong)]">
          <User size={14} className="text-[var(--accent)]" />
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            }}
            placeholder="Add a comment..."
            rows={3}
            disabled={isPending}
            className="w-full resize-none rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)]
              px-4 py-2.5 text-sm text-[var(--text-muted)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)]"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={12} />
              {isPending ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export default CommentForm;

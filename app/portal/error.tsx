"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
        <AlertCircle className="h-5 w-5 text-[var(--priority-urgent)]" />
      </div>
      <h2 className="text-[15px] font-medium text-[var(--text-primary)]">Something went wrong</h2>
      <p className="max-w-sm text-[13px] text-[var(--text-faint)]">
        We encountered an unexpected error. Please try again or contact your project manager if the
        problem persists.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white
          hover:bg-[var(--accent-hover)] transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        Try again
      </button>
    </div>
  );
}

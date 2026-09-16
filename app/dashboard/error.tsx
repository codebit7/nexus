"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg
        bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
        <span className="text-2xl text-[var(--priority-urgent)]">!</span>
      </div>
      <h2 className="text-[15px] font-medium text-[var(--text-primary)]">Something went wrong</h2>
      <p className="max-w-sm text-[13px] text-[var(--text-faint)]">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2
          bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98]
          text-white text-[13px] font-medium rounded-md
          transition-colors duration-150"
      >
        Try again
      </button>
    </div>
  );
}

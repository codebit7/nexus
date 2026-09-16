import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full bg-[var(--accent)]/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 shadow-md">
            <span className="text-sm font-medium text-white tracking-tight">N</span>
          </div>
          <span className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)] font-display">
            Nexus
          </span>
        </div>

        {/* Error code */}
        <h1 className="text-[72px] font-medium leading-none tracking-[-0.04em] text-[var(--text-primary)] font-display">
          404
        </h1>
        <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
          Page not found
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-faint)] max-w-xs">
          The page you are looking for does not exist or has been moved.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/dashboard"
            /* middleware will redirect /dashboard → /{slug} for authenticated users */
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-5 py-2.5 text-[13px] font-medium text-white transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] active:scale-[0.98]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-input)] px-5 py-2.5 text-[13px] font-medium text-[var(--text-primary)] transition-[background-color,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] active:scale-[0.98]"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 ${BAR}`} />
          <div className={`h-4 w-20 ${BAR}`} />
          <div className="h-4 w-px bg-[var(--border-subtle)]" />
          <div className={`h-3 w-14 ${BAR}`} />
        </div>
        <div className={`h-8 w-32 rounded-lg ${BAR}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {/* Stats cards — grid-cols-1 lg:grid-cols-2 (2 cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {[0, 1].map((i) => (
              <div key={i}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-7 w-7 rounded-lg ${BAR}`} />
                  <div className={`h-3 w-28 ${BAR}`} />
                </div>
                <div className={`h-8 w-20 ${BAR}`} />
                <div className={`h-3 w-32 mt-2 ${BAR}`} />
              </div>
            ))}
          </div>

          {/* Search + filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className={`h-9 flex-1 rounded-lg ${BAR}`} />
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-8 w-16 rounded-lg ${BAR}`} />
              ))}
            </div>
          </div>

          {/* Projects list rows */}
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}
                className="flex items-center gap-4 px-5 py-4
                  border-b border-[var(--border-subtle)] last:border-0 bg-[var(--bg-sidebar)]">
                {/* Icon tile */}
                <div className={`h-9 w-9 shrink-0 rounded-lg ${BAR}`} />
                {/* Title + client */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className={`h-4 w-2/3 ${BAR}`} />
                  <div className={`h-3 w-1/3 ${BAR}`} />
                </div>
                {/* Status */}
                <div className={`h-5 w-16 rounded-full ${BAR}`} />
                {/* Deadline / progress — hidden md */}
                <div className={`hidden md:block h-4 w-20 ${BAR}`} />
                {/* Chevron */}
                <div className={`h-4 w-4 ${BAR}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamMembersLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 ${BAR}`} />
          <div className={`h-4 w-28 ${BAR}`} />
          <div className={`h-3 w-12 ${BAR}`} />
        </div>
        <div className={`h-8 w-32 rounded-lg ${BAR}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {/* Stats cards — grid-cols-1 sm:grid-cols-3 (3 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-3.5 w-3.5 ${BAR}`} />
                  <div className={`h-3 w-24 ${BAR}`} />
                </div>
                <div className={`h-7 w-12 ${BAR}`} />
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className={`h-9 w-full rounded-lg ${BAR}`} />
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)]
              px-5 py-3">
              <div className={`h-3 w-16 ${BAR}`} />
              <div className={`hidden sm:block h-3 w-16 flex-1 ${BAR}`} />
              <div className={`h-3 w-10 ${BAR}`} />
              <div className={`hidden lg:block h-3 w-16 ${BAR}`} />
              <div className={`h-3 w-14 ${BAR} ml-auto`} />
            </div>
            {/* Rows */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}
                className="flex items-center gap-4 px-5 py-3.5
                  border-b border-[var(--border-subtle)] last:border-0">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 shrink-0 rounded-lg ${BAR}`} />
                  <div className={`h-4 w-28 ${BAR}`} />
                </div>
                {/* Contact (email) — hidden sm:table-cell */}
                <div className={`hidden sm:block h-4 w-40 flex-1 ${BAR}`} />
                {/* Role pill */}
                <div className={`h-5 w-16 rounded-full ${BAR}`} />
                {/* Projects pills — hidden lg:table-cell */}
                <div className="hidden lg:flex items-center gap-1.5">
                  <div className={`h-5 w-20 rounded-md ${BAR}`} />
                  <div className={`h-5 w-16 rounded-md ${BAR}`} />
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className={`h-7 w-7 rounded-lg ${BAR}`} />
                  <div className={`h-7 w-7 rounded-lg ${BAR}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg ${BAR}`} />
          <div className="h-5 w-px bg-[var(--border-subtle)]" />
          <div className={`h-4 w-4 ${BAR}`} />
          <div className={`h-4 w-24 ${BAR}`} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex gap-6 items-start">

            {/* Left sidebar — hidden on mobile */}
            <aside className="hidden lg:block w-[320px] shrink-0">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 ${BAR}`} />
                    <div className={`h-3.5 w-24 ${BAR}`} />
                  </div>
                  <div className={`h-9 rounded-lg ${BAR}`} />
                </div>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i}
                    className="px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`h-4 w-32 ${BAR}`} />
                      <div className={`h-5 w-16 rounded-md ${BAR}`} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`h-3 w-20 ${BAR}`} />
                      <div className={`h-3 w-14 ${BAR}`} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Right panel — Task detail */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Task Header Card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-5 w-20 rounded-md ${BAR}`} />
                      <div className={`h-5 w-16 rounded-md ${BAR}`} />
                    </div>
                    <div className={`h-6 w-3/4 ${BAR}`} />
                    <div className={`h-4 w-32 ${BAR}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className={`h-3 w-16 ${BAR}`} />
                      <div className={`h-4 w-24 ${BAR}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] space-y-2">
                  <div className={`h-3 w-20 ${BAR}`} />
                  <div className={`h-3 w-full ${BAR}`} />
                  <div className={`h-3 w-4/5 ${BAR}`} />
                  <div className={`h-3 w-3/5 ${BAR}`} />
                </div>
              </div>

              {/* Attachments card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 ${BAR}`} />
                    <div className={`h-3.5 w-24 ${BAR}`} />
                  </div>
                  <div className={`h-7 w-24 rounded-lg ${BAR}`} />
                </div>
                <div className={`h-24 rounded-lg ${BAR}`} />
              </div>

              {/* Comments card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className={`h-3.5 w-3.5 ${BAR}`} />
                  <div className={`h-3.5 w-20 ${BAR}`} />
                </div>
                <div className="space-y-4 mb-5">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`h-8 w-8 shrink-0 rounded-full ${BAR}`} />
                      <div className={`flex-1 h-20 rounded-lg ${BAR}`} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className={`h-8 w-8 shrink-0 rounded-full ${BAR}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-20 rounded-lg ${BAR}`} />
                    <div className="flex justify-end">
                      <div className={`h-7 w-28 rounded-lg ${BAR}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

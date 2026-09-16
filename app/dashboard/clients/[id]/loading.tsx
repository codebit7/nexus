export default function ClientDetailLoading() {
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
          <div className={`h-4 w-32 ${BAR}`} />
        </div>
        <div className={`h-8 w-8 sm:w-24 rounded-lg ${BAR}`} />
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
                    <div className={`h-3.5 w-20 ${BAR}`} />
                  </div>
                  <div className={`h-9 rounded-lg ${BAR}`} />
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i}
                    className="px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`h-4 w-28 ${BAR}`} />
                      <div className={`h-5 w-14 rounded-full ${BAR}`} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`h-3 w-36 ${BAR}`} />
                      <div className={`h-3 w-16 ${BAR}`} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Right panel */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Client info card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-lg shrink-0 ${BAR}`} />
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-40 ${BAR}`} />
                        <div className={`h-5 w-16 rounded-full ${BAR}`} />
                      </div>
                      <div className={`h-4 w-48 ${BAR}`} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className={`h-3 w-20 ${BAR}`} />
                      <div className={`h-4 w-24 ${BAR}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats cards — Active Projects / Total Value / Total Invoices */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3.5 w-3.5 ${BAR}`} />
                      <div className={`h-3 w-24 ${BAR}`} />
                    </div>
                    <div className={`h-7 w-20 ${BAR}`} />
                    <div className={`h-3 w-16 ${BAR}`} />
                  </div>
                ))}
              </div>

              {/* Tabs card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                <div className="flex gap-2 border-b border-[var(--border-subtle)] px-4 pt-3 pb-0">
                  <div className={`h-8 w-24 rounded-t ${BAR}`} />
                  <div className={`h-8 w-24 rounded-t ${BAR}`} />
                </div>
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-12 rounded-lg ${BAR}`} />
                  ))}
                </div>
              </div>

              {/* Portal access card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6 space-y-4">
                <div className={`h-4 w-28 ${BAR}`} />
                <div className={`h-10 rounded-lg ${BAR}`} />
                <div className="flex justify-end">
                  <div className={`h-8 w-32 rounded-lg ${BAR}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

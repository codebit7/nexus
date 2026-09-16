export default function DashboardLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 ${BAR}`} />
          <div>
            <div className={`h-4 w-24 ${BAR}`} />
            <div className={`h-3 w-32 mt-1.5 ${BAR}`} />
          </div>
        </div>
        <div className={`h-8 w-28 rounded-lg ${BAR}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {/* Welcome heading */}
          <div className={`h-7 w-64 ${BAR} mb-8`} />

          {/* Stats grid — grid-cols-1 md:grid-cols-2 lg:grid-cols-4 (4 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-7 w-7 rounded-md ${BAR}`} />
                  <div className={`h-3 w-12 ${BAR}`} />
                </div>
                <div className={`h-7 w-16 ${BAR}`} />
                <div className={`h-3 w-20 mt-1.5 ${BAR}`} />
              </div>
            ))}
          </div>

          {/* Two-column layout — lg:grid-cols-3 with 2-col + 1-col */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent Tasks — lg:col-span-2 */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3
                  border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 ${BAR}`} />
                    <div className={`h-3.5 w-24 ${BAR}`} />
                  </div>
                  <div className={`h-3 w-14 ${BAR}`} />
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className={`h-4 w-3/4 ${BAR}`} />
                        <div className="flex items-center gap-3 mt-2">
                          <div className={`h-4 w-16 rounded-md ${BAR}`} />
                          <div className={`h-3 w-14 ${BAR}`} />
                          <div className={`h-3 w-6 ${BAR}`} />
                        </div>
                      </div>
                      <div className={`h-6 w-6 shrink-0 rounded-full ${BAR}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column — Quick Actions + Active Projects */}
            <div className="space-y-6">
              {/* Quick Actions card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                <div className={`h-3.5 w-28 ${BAR} mb-3`} />
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-9 w-full rounded-lg ${BAR}`} />
                  ))}
                </div>
              </div>
              {/* Active Projects card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3
                  border-b border-[var(--border-subtle)]">
                  <div className={`h-3.5 w-28 ${BAR}`} />
                  <div className={`h-3 w-14 ${BAR}`} />
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="px-5 py-3">
                      <div className={`h-4 w-3/4 ${BAR}`} />
                      <div className={`h-3 w-1/2 mt-2 ${BAR}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

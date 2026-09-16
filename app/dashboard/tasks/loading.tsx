export default function TasksLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-4 w-4 shrink-0 ${BAR}`} />
          <div className="min-w-0">
            <div className={`h-4 w-20 ${BAR}`} />
            <div className={`h-3 w-28 mt-1 ${BAR}`} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`h-8 w-8 sm:w-28 rounded-lg ${BAR}`} />
          <div className={`h-8 w-8 sm:w-28 rounded-lg ${BAR}`} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 sm:px-6 h-[48px]
        border-b border-[var(--border-subtle)] shrink-0 overflow-x-auto">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-7 w-20 rounded-lg shrink-0 ${BAR}`} />
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-full">
          {[0, 1, 2].map((col, colIdx, arr) => (
            <div key={col}
              className={[
                'flex flex-col flex-1 min-w-[260px] sm:min-w-[280px] h-full',
                colIdx < arr.length - 1 ? 'border-r border-[var(--border-subtle)]' : '',
              ].join(' ')}>
              {/* Column header */}
              <div className="flex items-center justify-between px-4 h-[42px] shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 rounded-full ${BAR}`} />
                  <div className={`h-3 w-20 ${BAR}`} />
                  <div className={`h-4 w-10 rounded-full ${BAR}`} />
                </div>
                <div className={`h-4 w-4 ${BAR}`} />
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-7 pt-2 pb-4 flex flex-col gap-3">
                {Array.from({ length: col === 1 ? 4 : 3 }).map((_, i) => (
                  <div key={i}
                    className="rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-default)] p-3 space-y-2.5">
                    <div className={`h-4 w-3/4 ${BAR}`} />
                    <div className={`h-3 w-1/2 ${BAR}`} />
                    <div className="flex items-center justify-between gap-2">
                      <div className={`h-3 w-16 ${BAR}`} />
                      <div className={`h-3 w-8 ${BAR}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

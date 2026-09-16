export default function InvoicesLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 ${BAR}`} />
          <div className={`h-4 w-20 ${BAR}`} />
          <div className={`h-3 w-14 ${BAR}`} />
        </div>
        <div className={`h-8 w-32 rounded-lg ${BAR}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {/* Stats cards — grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-3.5 w-3.5 ${BAR}`} />
                  <div className={`h-3 w-24 ${BAR}`} />
                </div>
                <div className={`h-7 w-16 ${BAR}`} />
                <div className={`h-3 w-20 mt-2 ${BAR}`} />
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

          {/* Table */}
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)]
              px-5 py-3">
              <div className={`h-3 w-20 ${BAR}`} />
              <div className={`hidden sm:block h-3 w-16 ${BAR}`} />
              <div className={`h-3 w-16 ${BAR}`} />
              <div className={`h-3 w-14 ${BAR}`} />
              <div className={`hidden md:block h-3 w-20 ${BAR}`} />
              <div className="w-8 ml-auto" />
            </div>
            {/* Rows */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}
                className="flex items-center gap-4 px-5 py-3.5
                  border-b border-[var(--border-subtle)] last:border-0">
                {/* Invoice # — always visible */}
                <div className={`h-4 w-24 ${BAR}`} />
                {/* Client — hidden sm:table-cell */}
                <div className={`hidden sm:block h-4 w-28 flex-1 ${BAR}`} />
                {/* Amount */}
                <div className={`h-4 w-20 ${BAR}`} />
                {/* Status pill */}
                <div className={`h-5 w-20 rounded-full ${BAR}`} />
                {/* Due Date — hidden md:table-cell */}
                <div className={`hidden md:block h-4 w-20 ${BAR}`} />
                {/* Chevron */}
                <div className={`h-4 w-4 ${BAR} ml-auto sm:ml-0`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

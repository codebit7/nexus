export default function SettingsLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";

  function SectionCard() {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className={`h-8 w-8 rounded-lg ${BAR}`} />
          <div className="space-y-1.5">
            <div className={`h-3.5 w-20 ${BAR}`} />
            <div className={`h-3 w-40 ${BAR}`} />
          </div>
        </div>
        {/* Fields */}
        <div className="px-6 py-5 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className={`h-3 w-24 ${BAR}`} />
              <div className={`h-10 rounded-lg ${BAR}`} />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <div className={`h-9 w-28 rounded-lg ${BAR}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] animate-pulse">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px]
        border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 ${BAR}`} />
          <div className={`h-4 w-20 ${BAR}`} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard />
            <SectionCard />
          </div>

          {/* Danger Zone card (owner-only in real page; shown in skeleton for layout stability) */}
          <div className="rounded-xl border border-[var(--tint-red-border)] bg-[var(--bg-sidebar)] overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
              <div className={`h-8 w-8 rounded-lg ${BAR}`} />
              <div className="space-y-1.5">
                <div className={`h-3.5 w-28 ${BAR}`} />
                <div className={`h-3 w-52 ${BAR}`} />
              </div>
            </div>
            <div className="px-6 py-5 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className={`h-3.5 w-40 ${BAR}`} />
                <div className={`h-3 w-64 ${BAR}`} />
              </div>
              <div className={`h-9 w-36 rounded-lg ${BAR} shrink-0`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

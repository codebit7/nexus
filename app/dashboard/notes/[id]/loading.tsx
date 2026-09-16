export default function ReviewMeetingNotesLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl animate-pulse px-6 py-8">
        {/* Back link */}
        <div className={`h-3 w-28 ${BAR}`} />

        {/* Header */}
        <div className={`mt-5 h-5 w-56 max-w-full ${BAR}`} />
        <div className={`mt-2 h-3 w-96 max-w-full ${BAR}`} />

        {/* Task rows — same card shape as ReviewClient */}
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-4 w-4 shrink-0 ${BAR}`} />
                <div className="min-w-0 flex-1 space-y-2">
                  {/* title */}
                  <div className={`h-4 w-2/3 ${BAR}`} />
                  {/* description, two lines */}
                  <div className={`h-3 w-full ${BAR}`} />
                  <div className={`h-3 w-4/5 ${BAR}`} />
                  {/* priority / date / assignee controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className={`h-6 w-20 rounded-md ${BAR}`} />
                    <div className={`h-6 w-32 rounded-md ${BAR}`} />
                    <div className={`h-6 w-28 rounded-md ${BAR}`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: project picker + create button */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
          <div className={`h-9 w-44 rounded-md ${BAR}`} />
          <div className={`h-9 w-36 rounded-md ${BAR}`} />
        </div>
      </div>
    </div>
  );
}

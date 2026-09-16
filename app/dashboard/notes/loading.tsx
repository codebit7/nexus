export default function MeetingNotesLoading() {
  const BAR = "bg-[var(--border-subtle)] rounded";
  return (
    // Mirrors NotesClient's own scroll container so the page does not shift
    // when the skeleton is swapped for the real content.
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl animate-pulse px-6 py-8">
        {/* Header */}
        <div className={`h-5 w-40 ${BAR}`} />
        <div className={`mt-2 h-3 w-[28rem] max-w-full ${BAR}`} />

        {/* Dropzone */}
        <div className="mt-8 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] px-8 py-10">
          <div className={`mx-auto h-5 w-5 ${BAR}`} />
          <div className={`mx-auto mt-3 h-3.5 w-52 ${BAR}`} />
          <div className={`mx-auto mt-2 h-3 w-40 ${BAR}`} />
        </div>

        {/* Paste box */}
        <div className={`mt-4 h-2.5 w-32 ${BAR}`} />
        <div className="mt-1.5 h-[9.5rem] rounded-md border border-[var(--border-default)] bg-[var(--bg-input)]" />

        {/* Find tasks button */}
        <div className={`mt-4 h-9 w-32 rounded-md ${BAR}`} />

        {/* Previous uploads */}
        <div className={`mt-10 h-2.5 w-36 ${BAR}`} />
        <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border-default)]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className={`h-3.5 w-52 max-w-full ${BAR}`} />
                <div className={`mt-1.5 h-3 w-40 ${BAR}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

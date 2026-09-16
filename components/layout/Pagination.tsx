"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Page controls for the list pages.
 *
 * This markup was copy-pasted into clients, invoices, projects and team members
 * — four copies of the same ~50 lines, and they had drifted. Only the projects
 * copy limited how many page buttons it drew; the other three rendered one
 * button per page, so a workspace with 200 clients got 40 of them across the
 * footer. The windowing below is the projects behaviour, now shared.
 *
 * Renders nothing when everything fits on one page, so callers can drop it in
 * unconditionally.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Disables every control while a page is in flight. */
  loading?: boolean;
  onPageChange: (page: number) => void;
}

/** At most 7 buttons, kept centred on the current page. */
const MAX_BUTTONS = 7;

function visiblePages(currentPage: number, totalPages: number): number[] {
  const count = Math.min(totalPages, MAX_BUTTONS);
  let first = 0;

  if (totalPages > MAX_BUTTONS) {
    if (currentPage < 3) first = 0;
    else if (currentPage > totalPages - 4) first = totalPages - MAX_BUTTONS;
    else first = currentPage - 3;
  }

  return Array.from({ length: count }, (_, i) => first + i);
}

const ARROW = `flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-[12px] font-medium
  text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
  disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
  disabled:hover:text-[var(--text-muted)]
  transition-colors duration-150`;

export function Pagination({
  currentPage,
  totalPages,
  loading = false,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3
      border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
      <span className="text-[12px] text-[var(--text-faint)] text-center sm:text-left">
        Page {currentPage + 1} of {totalPages}
      </span>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || loading}
          aria-label="Previous page"
          className={ARROW}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1 flex-wrap justify-center">
          {visiblePages(currentPage, totalPages).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={loading}
              aria-label={`Page ${page + 1}`}
              aria-current={page === currentPage ? "page" : undefined}
              className={`w-8 h-8 rounded-md text-[12px] font-medium transition-colors duration-150
                disabled:cursor-not-allowed
                ${page === currentPage
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]"
                }`}
            >
              {page + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || loading}
          aria-label="Next page"
          className={ARROW}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;

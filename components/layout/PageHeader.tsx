"use client";

import { Plus, SlidersHorizontal } from "lucide-react";

interface PageHeaderProps {
  title: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  showFilter?: boolean;
}

export function PageHeader({ title, primaryAction, showFilter }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 h-14
      border-b border-[var(--border-subtle)] shrink-0">

      <h1 className="text-[15px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {showFilter && (
          <button className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-[var(--text-muted)]
            hover:bg-[var(--hover-default)] transition-colors duration-150">
            <SlidersHorizontal size={15} />
          </button>
        )}

        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98]
              text-white text-[13px] font-medium rounded-md
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[var(--accent-ring)]"
          >
            <Plus size={14} />
            {primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

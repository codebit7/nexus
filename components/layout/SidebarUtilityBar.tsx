"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarUtilityBarProps {
  settingsHref: string;
}

/**
 * Compact icon cluster — theme toggle + settings link.
 * Designed to sit inline inside the sidebar's workspace header row.
 */
export function SidebarUtilityBar({ settingsHref }: SidebarUtilityBarProps) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith(settingsHref);

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md " +
    "text-[var(--text-muted)] hover:text-[var(--text-primary)] " +
    "hover:bg-[var(--hover-default)] transition-colors duration-150 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]";

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <ThemeToggle className="h-7 w-7" />
      <Link
        href={settingsHref}
        title="Settings"
        aria-label="Settings"
        data-active={settingsActive}
        className={`${iconBtn} data-[active=true]:text-[var(--text-primary)] data-[active=true]:bg-[var(--hover-strong)]`}
      >
        <Settings size={14} />
      </Link>
    </div>
  );
}

export default SidebarUtilityBar;

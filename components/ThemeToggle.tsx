"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** 'button' = compact icon button; 'nav' = full-width nav row with label */
  variant?: "button" | "nav";
  className?: string;
}

export function ThemeToggle({ variant = "button", className = "" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const next = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Light mode" : "Dark mode";

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className={[
          "group flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md",
          "text-[13px] font-medium text-[var(--text-muted)]",
          "hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)]",
          "transition-colors duration-150",
          className,
        ].join(" ")}
        aria-label={`Switch to ${next} mode`}
        suppressHydrationWarning
      >
        <Icon size={15} className="flex-shrink-0 text-[var(--text-faint)] group-hover:text-[var(--text-muted)]" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-md",
        "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
        "hover:bg-[var(--hover-default)]",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        className,
      ].join(" ")}
      aria-label={`Switch to ${next} mode`}
      title={label}
      suppressHydrationWarning
    >
      <Icon size={15} />
    </button>
  );
}

export default ThemeToggle;

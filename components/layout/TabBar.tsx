"use client";

interface Tab {
  label: string;
  value: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 px-6 h-10
      border-b border-[var(--border-subtle)] shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={[
            "px-3 py-1 rounded-md text-[13px] font-medium transition-colors duration-150",
            activeTab === tab.value
              ? "bg-[var(--hover-strong)] text-[var(--text-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]"
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

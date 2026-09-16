"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Layers,
  CheckSquare,
  Users,
  FileText,
  UserCog,
  X,
  ArrowRight,
} from "lucide-react";
import { fetchSearchData, type SearchResult } from "@/app/dashboard/actions";

const TYPE_META: Record<
  SearchResult["type"],
  { label: string; icon: typeof Layers; color: string; path: string }
> = {
  project: { label: "Project", icon: Layers, color: "#5e6ad2", path: "projects" },
  task:    { label: "Task",    icon: CheckSquare, color: "#e79d13", path: "tasks" },
  client:  { label: "Client",  icon: Users, color: "#26c97f", path: "clients" },
  invoice: { label: "Invoice", icon: FileText, color: "#e5484d", path: "invoices" },
  member:  { label: "Member",  icon: UserCog, color: "#8a8a8a", path: "team-members" },
};

interface Props {
  slug: string;
  isAdmin: boolean;
  memberId?: string;
  onClose: () => void;
}

export default function SearchCommandPalette({ slug, isAdmin, memberId, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Focus input + fetch data on mount.
  // No args passed — the server action derives isAdmin/memberId from the session.
  useEffect(() => {
    inputRef.current?.focus();
    fetchSearchData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return data.slice(0, 20);
    const q = query.toLowerCase();
    return data.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.subtitle ?? "").toLowerCase().includes(q) ||
        r.type.includes(q)
    ).slice(0, 20);
  }, [data, query]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of filtered) {
      (groups[r.type] ??= []).push(r);
    }
    return groups;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const type of Object.keys(grouped)) {
      flat.push(...grouped[type]);
    }
    return flat;
  }, [grouped]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const navigate = useCallback(
    (r: SearchResult) => {
      onClose();
      router.push(`/${slug}/${TYPE_META[r.type].path}/${r.id}`);
    },
    [router, slug, onClose]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatList[activeIdx]) {
      e.preventDefault();
      navigate(flatList[activeIdx]);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] mx-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-[var(--shadow-modal)] animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border-subtle)]">
          <Search size={16} className="text-[var(--text-faint)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, tasks, clients, invoices..."
            className="flex-1 py-3.5 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] transition-colors duration-150"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : flatList.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-[var(--text-faint)]">
                {query ? "No results found" : "No items to search"}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const meta = TYPE_META[type as SearchResult["type"]];
              return (
                <div key={type}>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                      {meta.label}s
                    </span>
                  </div>
                  {items.map((r) => {
                    flatIdx++;
                    const idx = flatIdx;
                    const Icon = meta.icon;
                    const isActive = idx === activeIdx;
                    return (
                      <button
                        key={r.id}
                        data-idx={idx}
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={[
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100",
                          isActive ? "bg-[var(--hover-default)]" : "",
                        ].join(" ")}
                      >
                        <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                            {r.title}
                          </p>
                          {r.subtitle && (
                            <p className="text-[11px] text-[var(--text-faint)] truncate">{r.subtitle}</p>
                          )}
                        </div>
                        {r.status && (
                          <span className="text-[10px] text-[var(--text-faint)] shrink-0">{r.status.replace("_", " ")}</span>
                        )}
                        {isActive && (
                          <ArrowRight size={12} className="text-[var(--text-faint)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-faint)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[var(--hover-default)] font-mono text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[var(--hover-default)] font-mono text-[10px]">↵</kbd>
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[var(--hover-default)] font-mono text-[10px]">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect, useMemo, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Inbox,
  Layers,
  CheckSquare,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  Search,
  UserCog,
  Sparkles,
} from "lucide-react";
import { TaskFormProvider } from "./task-form-context";
import { signOutAction } from "@/app/(auth)/login/actions";
import SearchCommandPalette from "@/components/layout/SearchCommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import type { Project, TeamMember } from "@/lib/types";
import type { TaskStatusRow } from "@/lib/db/task-statuses";
import type { TagRow } from "@/lib/db/tags";

// ── Sidebar collapsed context ─────────────────────────────────────────────
const SidebarCollapsedContext = createContext(false);
export function useSidebarCollapsed() { return useContext(SidebarCollapsedContext); }

interface DashboardShellProps {
  children: React.ReactNode;
  isAdmin: boolean;
  currentMemberId?: string;
  orgName?: string;
  memberName?: string;
  memberAvatarUrl?: string;
  slug: string;
}

/** Nav item paths are relative to the workspace root */
const BASE_NAV = [
  { path: "",          label: "Overview",  icon: Inbox,       exact: true  },
  { path: "/projects", label: "Projects",  icon: Layers,      exact: false },
  { path: "/tasks",    label: "Tasks",     icon: CheckSquare, exact: false },
  { path: "/notes",    label: "Meeting Notes", icon: Sparkles, exact: false },
  { path: "/clients",  label: "Clients",   icon: Users,       exact: false },
  { path: "/invoices", label: "Invoices",  icon: FileText,    exact: false },
];

const ADMIN_NAV_ITEM = {
  path: "/team-members",
  label: "Team Members",
  icon: UserCog,
  exact: false,
};

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active}
      className="nav-item group flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md
        text-[13px] font-medium text-[var(--text-muted)]
        hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)]
        data-[active=true]:bg-[var(--hover-strong)] data-[active=true]:text-[var(--text-primary)]
        transition-colors duration-150"
    >
      <Icon
        size={15}
        className="flex-shrink-0 text-[var(--text-faint)]
          group-hover:text-[var(--text-muted)] group-data-[active=true]:text-[var(--text-muted)]"
      />
      {label}
    </Link>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-4">
      <div className="px-3 pb-1">
        <span className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
          {label}
        </span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function DashboardShell({
  children,
  isAdmin,
  currentMemberId,
  orgName,
  memberName,
  memberAvatarUrl,
  slug,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const base = `/${slug}`;

  const NAV_ITEMS = useMemo(() => {
    const items = isAdmin
      ? [...BASE_NAV, ADMIN_NAV_ITEM]
      : [...BASE_NAV];
    return items.map((item) => ({
      ...item,
      href: `${base}${item.path}`,
    }));
  }, [isAdmin, base]);

  function isActive(item: { path: string; exact: boolean }) {
    const fullPath = `${base}${item.path}`;
    if (item.exact) return pathname === fullPath;
    return pathname === fullPath || pathname.startsWith(fullPath + '/');
  }

  // Only board pages (the global kanban at /{slug}/tasks and each project's
  // /{slug}/projects/<id>/board) have the sidebar-collapse toggle. Task/project
  // detail pages do not.
  const isGlobalTasksBoard = pathname === `${base}/tasks`;
  const isProjectBoardPage = new RegExp(`^${base}/projects/[^/]+/board$`).test(pathname);
  const isBoardPage = isGlobalTasksBoard || isProjectBoardPage;

  // Reset sidebar when navigating away from a board page
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    if (!isBoardPage) setSidebarCollapsed(false);
  }, [pathname, isBoardPage]);

  // Ctrl+K / Cmd+K to open search (case-insensitive — caps lock safe)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [mobileMenuOpen]);

  const toggleMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);

  const sidebarContent = (
    <>
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 h-[60px] shrink-0 border-b border-[var(--border-subtle)]">
        <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-medium">
            {orgName ? orgName[0].toUpperCase() : 'N'}
          </span>
        </div>
        <span className="text-[13px] font-medium text-[var(--text-primary)] flex-1 truncate">
          {orgName ?? 'Workspace'}
        </span>
        <ThemeToggle className="h-7 w-7" />
      </div>

      {/* Search button */}
      <div className="px-2 py-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md
          text-[13px] text-[var(--text-muted)] hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)]
          transition-colors duration-150">
          <Search size={15} />
          Search...
          <kbd className="ml-auto text-[11px] text-[var(--text-faint)] font-mono">Ctrl+K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-2 py-1 space-y-0.5">
        {/* Top-level nav */}
        <NavItem href={`${base}`} icon={Inbox} label="Overview" active={isActive({ path: "", exact: true })} />

        {/* Workspace section */}
        <SidebarSection label="Workspace">
          {NAV_ITEMS.filter(item => item.path !== "").map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item)}
            />
          ))}
        </SidebarSection>
      </nav>

      {/* User row — avatar + name/role (link to Settings) + logout icon */}
      <div className="flex items-center gap-3 px-3 py-3 mb-2 border-t border-[var(--border-subtle)]">
        <Link
          href={`${base}/settings`}
          title="Account settings"
          className="group flex items-center gap-3 flex-1 min-w-0 rounded-md px-1 py-1 -mx-1 -my-1
            hover:bg-[var(--hover-default)] transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          {memberAvatarUrl ? (
            <Image
              src={memberAvatarUrl}
              alt={memberName ?? 'User'}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover border border-[var(--accent-border)]"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
              bg-[var(--tint-accent-strong)] border border-[var(--accent-border)]">
              <span className="text-[12px] font-medium text-[var(--accent)]">
                {memberName ? memberName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {memberName ?? 'User'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {isAdmin ? 'Admin' : 'Member'}
            </p>
          </div>
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Sign out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md
              text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </>
  );

  return (
    <ConfirmProvider>
    <TaskFormProvider
      currentMemberId={currentMemberId}
      isAdmin={isAdmin}
    >
      <SidebarCollapsedContext.Provider value={sidebarCollapsed}>
      <div className="flex h-screen bg-[var(--bg-page)] overflow-hidden">

        {/* ── Mobile top bar ─────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between
          bg-[var(--bg-page)] border-b border-[var(--border-default)] px-4 h-12 lg:hidden">
          <button
            type="button"
            onClick={toggleMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="p-2 sm:p-1.5 rounded-md text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--hover-default)]
              transition-colors duration-150"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="text-[13px] font-medium text-[var(--text-primary)]">{orgName ?? 'Nexus'}</span>
          <div className="w-9" />
        </header>

        {/* ── Mobile backdrop ────────────────────────────────────────── */}
        <div
          className={[
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden",
            "transition-opacity duration-200",
            mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* ── Mobile drawer ──────────────────────────────────────────── */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-[min(260px,calc(100vw-48px))] flex flex-col h-full",
            "bg-[var(--bg-page)] border-r border-[var(--border-default)] lg:hidden",
            "transition-transform duration-200 ease-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {sidebarContent}
        </aside>

        {/* ── Desktop sidebar ────────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-shrink-0 flex-col h-full
            bg-[var(--bg-page)] border-r border-[var(--border-default)]
            transition-[width] duration-200 ease-out overflow-hidden relative"
          style={{ width: sidebarCollapsed ? 0 : 260 }}
        >
          <div className="w-[260px] flex flex-col h-full">
            {sidebarContent}
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden pt-12 lg:pt-0 relative">
          {/* Sidebar collapse toggle — stuck to left edge of content, board pages only */}
          {isBoardPage && (
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="group hidden lg:flex items-center justify-center
                absolute left-0 z-20 w-[14px] h-[56px]
                transition-opacity duration-200 ease-out"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              <svg
                width="6" height="48" viewBox="0 0 6 48" fill="none"
                className="transition-opacity duration-200 ease-out"
                style={{ color: 'var(--text-faint)' }}
              >
                <rect
                  x="1" y="2" width="4" height="44" rx="2"
                  fill="currentColor"
                  className="group-hover:fill-transparent transition-colors duration-200"
                />
                <path
                  d={sidebarCollapsed
                    ? "M1 4 C1 4, 5 14, 5 24 C5 34, 1 44, 1 44"
                    : "M5 4 C5 4, 1 14, 1 24 C1 34, 5 44, 5 44"
                  }
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  className="opacity-0 group-hover:opacity-100
                    transition-opacity duration-200"
                />
              </svg>
            </button>
          )}
          {children}
        </main>


        {/* ── Search command palette ────────────────────────────────── */}
        {searchOpen && (
          <SearchCommandPalette
            slug={slug}
            isAdmin={isAdmin}
            memberId={currentMemberId}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </div>
      </SidebarCollapsedContext.Provider>
    </TaskFormProvider>
    </ConfirmProvider>
  );
}

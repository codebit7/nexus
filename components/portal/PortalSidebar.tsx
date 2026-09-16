"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Receipt,
  FolderOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PortalSidebarProps {
  clientName: string;
}

const NAV = [
  { href: "/portal/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/files", label: "Files", icon: FolderOpen },
];

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

export function PortalSidebar({ clientName }: PortalSidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const sidebarContent = (
    <>
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border-subtle)]">
        <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-medium">C</span>
        </div>
        <span className="text-[13px] font-medium text-[var(--text-primary)] flex-1 truncate">
          Client Portal
        </span>
        <ThemeToggle className="h-7 w-7" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-2 py-1 space-y-0.5">
        <SidebarSection label="Portal">
          {NAV.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              icon={icon}
              label={label}
              active={isActive(href)}
            />
          ))}
        </SidebarSection>
      </nav>

      {/* User row — avatar + name (link to Settings) + logout icon */}
      <div className="flex items-center gap-3 px-3 py-3 mb-2 border-t border-[var(--border-subtle)]">
        <Link
          href="/portal/settings"
          title="Account settings"
          className="group flex items-center gap-3 flex-1 min-w-0 rounded-md px-1 py-1 -mx-1 -my-1
            hover:bg-[var(--hover-default)] transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
            bg-[var(--tint-accent-strong)] border border-[var(--accent-border)]">
            <span className="text-[12px] font-medium text-[var(--accent)]">
              {clientName ? clientName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "C"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {clientName ?? "Client"}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">Client</p>
          </div>
        </Link>
        <form action="/portal/logout" method="POST">
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
    <>
      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between
        bg-[var(--bg-page)] border-b border-[var(--border-default)] px-4 h-12 lg:hidden">
        <button
          type="button"
          onClick={toggleMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--hover-default)]
            transition-colors duration-150"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <span className="text-[13px] font-medium text-[var(--text-primary)]">Client Portal</span>
        <div className="w-9" />
      </header>

      {/* Mobile backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden",
          "transition-opacity duration-200",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile drawer */}
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-shrink-0 flex-col h-full
        bg-[var(--bg-page)] border-r border-[var(--border-default)]">
        {sidebarContent}
      </aside>
    </>
  );
}

export default PortalSidebar;

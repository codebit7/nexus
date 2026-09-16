'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles, ArrowRight, ArrowUpRight, Menu, X, Check, Minus, ChevronDown,
  Users, MessageSquare, BarChart3, ShieldCheck,
  FolderKanban, CheckSquare, Receipt,
  FileText, UserCircle2, CalendarDays, Inbox, Layers,
  Search, Settings, Plus, Filter,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

/* ─── In-view hook ───────────────────────────────────────────────────────── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Product',    href: '#product' },
  { label: 'Customers',  href: '#customers' },
  { label: 'Pricing',    href: '#pricing' },
  { label: 'FAQ',        href: '#faq' },
];

const PLAN_FEATURES = [
  'Custom task statuses, priorities, and filters',
  'Keyboard shortcuts for every action',
  'Inline comments with @mentions',
  'Role-based permissions for every member',
];

const PORTAL_FEATURES = [
  'Branded portal for each client',
  'Read-only views of shared work',
  'File sharing and PDF invoices in one place',
  'Bcrypt-hashed logins, row-level isolation',
];

const INVOICE_FEATURES = [
  'Generate professional PDF invoices in seconds',
  'Track pending, paid, and overdue statuses',
  'Monthly retainer and one-off project billing',
  'Revenue analytics across your full client base',
];

const METRICS = [
  { value: '12,000+', label: 'Tasks managed' },
  { value: '99.9%',   label: 'Uptime guarantee' },
  { value: '< 40ms',  label: 'Average query time' },
  { value: '200+',    label: 'Studios onboarded' },
];

const TESTIMONIALS = [
  { name: 'Sarah Chen',  role: 'Design Director, Studio Arc',   initials: 'SC',
    quote: 'We replaced ClickUp and our entire client email chain. The portal alone saves us five hours a week.' },
  { name: 'Marcus Webb', role: 'Founder, Pixel & Co.',          initials: 'MW',
    quote: 'Invoicing and project tracking in one place. Revenue visibility moved from quarterly guesses to real-time clarity.' },
  { name: 'Aisha Patel', role: 'Product Lead, Forma Labs',      initials: 'AP',
    quote: "Our clients actually log in now. We spend less time on update calls and more time building." },
];

const COMPARE_ROWS = [
  { feature: 'Client portals',               nexus: true, clickup: false, linear: false },
  { feature: 'Kanban, list, and table views',nexus: true, clickup: true,  linear: true  },
  { feature: 'PDF invoice generator',        nexus: true, clickup: false, linear: false },
  { feature: 'Revenue analytics',            nexus: true, clickup: false, linear: false },
  { feature: 'Dual login (team + client)',   nexus: true, clickup: false, linear: false },
  { feature: 'Row-level security',           nexus: true, clickup: false, linear: false },
  { feature: 'Built-in file storage',        nexus: true, clickup: true,  linear: false },
];

const FAQS = [
  { q: 'Is there a free plan?',
    a: 'Yes — Nexus is free for teams of up to five members. No credit card required. Paid plans unlock advanced analytics, custom branding, and priority support.' },
  { q: 'How does the dual login work?',
    a: 'Team members sign in with Supabase Auth. Clients use a separate bcrypt-hashed portal password. Both flows route automatically from the same login page.' },
  { q: 'Can clients see internal team discussions?',
    a: 'No. Client views are strictly filtered by row-level security enforced at the database. Internal comments, assignees, and team data are never exposed through the portal.' },
  { q: 'How is my data secured?',
    a: 'All data lives in Supabase Postgres with RLS enforced at the database level. Passwords are bcrypt-hashed. Sessions use SSR cookies, never localStorage.' },
  { q: 'Does it work for agencies with many clients?',
    a: 'Yes. Each client gets their own portal with filtered views of only their projects, tasks, invoices, and files. No cross-client data leakage by design.' },
  { q: 'Can I bring my own domain?',
    a: 'Custom domains and branded portals are available on paid plans. Point your DNS to Nexus and clients see your brand, not ours.' },
];

/* ─── Logo ───────────────────────────────────────────────────────────────── */
function Logo({ size = 'default' }: { size?: 'default' | 'sm' }) {
  const dims = size === 'sm'
    ? { tile: 'h-6 w-6', icon: 12, text: 'text-[13px]' }
    : { tile: 'h-7 w-7', icon: 13, text: 'text-[14px]' };
  return (
    <Link href="/" className="flex items-center gap-2 focus-visible:outline-none">
      <div className={`inline-flex ${dims.tile} items-center justify-center rounded
        bg-[var(--tint-accent)] border border-[var(--accent-border)]`}>
        <Sparkles size={dims.icon} className="text-[var(--accent)]" />
      </div>
      <span className={`${dims.text} font-medium text-[var(--text-primary)] tracking-[-0.02em]`}>Nexus</span>
    </Link>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-colors duration-150',
        scrolled
          ? 'bg-[var(--bg-page)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 h-[56px] gap-2">
        <Logo />

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href}
              className="rounded px-2.5 py-1.5 text-[13px] text-[var(--text-muted)]
                hover:text-[var(--text-primary)] transition-colors duration-150">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login"
            className="hidden md:inline-flex items-center rounded px-3 py-1.5
              text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150">
            Sign in
          </Link>
          <Link href="/signup"
            className="hidden md:inline-flex items-center gap-1 rounded-md px-3 py-1.5
              text-[13px] font-medium text-white
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors duration-150">
            Get started
          </Link>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded
              text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)]
          bg-[var(--bg-page)]/95 backdrop-blur-xl px-4 py-3 space-y-0.5">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}
              className="block rounded px-3 py-2.5 text-[13px] text-[var(--text-muted)]
                hover:text-[var(--text-primary)] transition-colors duration-150">
              {label}
            </a>
          ))}
          <Link href="/signup" onClick={() => setMenuOpen(false)}
            className="block rounded-md px-3 py-2.5 mt-2 text-[13px] font-medium text-white
              bg-[var(--accent)] text-center">
            Get started
          </Link>
          <Link href="/login" onClick={() => setMenuOpen(false)}
            className="block rounded px-3 py-2.5 text-[13px] text-[var(--text-muted)] text-center">
            Sign in
          </Link>
        </div>
      )}
    </header>
  );
}

/* ─── Section eyebrow ────────────────────────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-[var(--text-muted)] tracking-[-0.01em] mb-3">
      <span className="text-[var(--accent)]">·</span> {children}
    </p>
  );
}

/* ─── Dashboard mockup (hero) ────────────────────────────────────────────── */
function DashboardMockup() {
  const columns = [
    {
      title: 'Backlog', color: '#888', count: 4,
      tasks: [
        { title: 'Homepage hero iteration',          priority: 'urgent', due: 'May 2',  comments: 3 },
        { title: 'Competitor teardown: pricing',     priority: 'normal', due: 'May 6',  comments: 1 },
        { title: 'Brand guidelines v2 draft',        priority: 'low',    due: 'May 8',  comments: 0 },
      ],
    },
    {
      title: 'In Progress', color: '#5e6ad2', count: 3,
      tasks: [
        { title: 'Client portal design refresh',     priority: 'urgent', due: 'Apr 24', comments: 5 },
        { title: 'Invoice template — Q2 2026',       priority: 'high',   due: 'Apr 28', comments: 2 },
      ],
    },
    {
      title: 'Done', color: '#26c97f', count: 2,
      tasks: [
        { title: 'Kickoff meeting notes',            priority: 'normal', due: 'Apr 18', comments: 4 },
      ],
    },
  ];

  const pColor: Record<string, string> = {
    urgent: '#e5484d', high: '#e79d13', normal: '#5e6ad2', low: '#888',
  };

  const sidebarItems = [
    { icon: Inbox,       label: 'Overview' },
    { icon: Layers,      label: 'Projects', count: 7 },
    { icon: CheckSquare, label: 'Tasks', active: true, count: 23 },
    { icon: Users,       label: 'Clients' },
    { icon: FileText,    label: 'Invoices' },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden
      bg-[var(--bg-page)] border border-[var(--border-default)]
      shadow-[var(--shadow-modal)]">

      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
        {['#5a5a5a', '#5a5a5a', '#5a5a5a'].map((c, i) => (
          <span key={i} className="h-2 w-2 rounded-full" style={{ background: c }} />
        ))}
        <div className="mx-auto flex items-center gap-1.5 rounded
          bg-[var(--bg-input)] px-2.5 py-0.5 text-[10.5px] text-[var(--text-subtle)] font-mono">
          nexus.app / acme / tasks
        </div>
        <div className="w-12" />
      </div>

      {/* App body */}
      <div className="flex h-[440px]">
        {/* Sidebar */}
        <aside className="hidden sm:flex w-[190px] lg:w-[210px] shrink-0 flex-col
          bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded
            hover:bg-[var(--hover-default)]">
            <div className="h-5 w-5 rounded bg-[var(--tint-accent-strong)] flex items-center justify-center text-[10px] font-medium text-[var(--accent)]">A</div>
            <span className="text-[12px] text-[var(--text-secondary)] font-medium">Acme Ltd</span>
            <ChevronDown size={11} className="text-[var(--text-faint)] ml-auto" />
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 mb-4 rounded
            bg-[var(--bg-input)] border border-[var(--border-subtle)]">
            <Search size={11} className="text-[var(--text-faint)]" />
            <span className="text-[11px] text-[var(--text-faint)]">Search</span>
            <div className="ml-auto flex items-center gap-0.5 text-[9px] text-[var(--text-faint)] font-mono">
              <kbd className="px-1 rounded bg-[var(--bg-elevated)]">⌘K</kbd>
            </div>
          </div>

          <p className="px-2 mb-1.5 text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-[0.08em]">Workspace</p>
          <div className="space-y-0.5">
            {sidebarItems.map(({ icon: Icon, label, active, count }) => (
              <div key={label}
                className={[
                  'flex items-center gap-2 px-2 py-1.5 rounded text-[11.5px] font-medium',
                  active ? 'bg-[var(--hover-strong)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
                ].join(' ')}
              >
                <Icon size={12} className={active ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]'} />
                <span>{label}</span>
                {count && (
                  <span className={`ml-auto text-[9.5px] font-mono ${active ? 'text-[var(--text-muted)]' : 'text-[var(--text-faint)]'}`}>
                    {count}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-0.5">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded text-[11.5px] font-medium text-[var(--text-muted)]">
              <Settings size={12} className="text-[var(--text-faint)]" />
              Settings
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded">
              <div className="h-5 w-5 rounded-full bg-[var(--tint-accent-strong)] flex items-center justify-center text-[9px] text-[var(--accent)] font-medium">SC</div>
              <span className="text-[11.5px] text-[var(--text-muted)]">Sarah Chen</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 bg-[var(--bg-page)] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5
            border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <CheckSquare size={13} className="text-[var(--text-faint)]" />
              <span className="text-[12px] font-medium text-[var(--text-primary)]">Tasks</span>
              <span className="text-[10.5px] text-[var(--text-faint)]">· 23 total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1 rounded border border-[var(--border-default)]
                px-2 py-0.5 text-[10.5px] text-[var(--text-muted)]">
                <Filter size={10} />
                Filter
              </div>
              <div className="inline-flex items-center gap-1 rounded bg-[var(--accent)]
                px-2 py-0.5 text-[10.5px] font-medium text-white">
                <Plus size={10} />
                New task
              </div>
            </div>
          </div>

          <div className="flex sm:grid sm:grid-cols-3 gap-px bg-[var(--hover-subtle)] flex-1
            overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none">
            {columns.map((col) => (
              <div key={col.title}
                className="bg-[var(--bg-page)] p-3 sm:p-3.5 overflow-hidden
                  w-[75%] shrink-0 sm:w-auto sm:shrink snap-start">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    {col.title}
                  </span>
                  <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">{col.count}</span>
                </div>
                <div className="space-y-2">
                  {col.tasks.map((t) => (
                    <div key={t.title}
                      className="rounded bg-[var(--bg-card)] border border-[var(--border-default)] p-2.5">
                      <p className="text-[11.5px] text-[var(--text-secondary)] leading-[1.4] mb-2">{t.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full" style={{ background: pColor[t.priority] }} />
                        <span className="inline-flex items-center gap-1 text-[9.5px] text-[var(--text-faint)]">
                          <CalendarDays size={9} />
                          {t.due}
                        </span>
                        {t.comments > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9.5px] text-[var(--text-faint)] ml-auto">
                            <MessageSquare size={9} />
                            {t.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Portal mockup (feature section) ────────────────────────────────────── */
function PortalMockup() {
  return (
    <div className="rounded-md overflow-hidden bg-[var(--bg-page)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-2">
          <FolderKanban size={11} className="text-[var(--text-faint)]" />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">Acme Ltd · Portal</span>
        </div>
        <span className="text-[9.5px] text-[var(--text-faint)] uppercase tracking-[0.08em]">Read only</span>
      </div>
      <div className="p-4 space-y-2">
        {[
          { title: 'Homepage mockup',    status: 'Done',        color: '#26c97f' },
          { title: 'User flows',         status: 'In progress', color: '#5e6ad2' },
          { title: 'Brand guidelines',   status: 'In review',   color: '#e79d13' },
          { title: 'Final handoff',      status: 'To do',       color: '#888'    },
        ].map((t) => (
          <div key={t.title}
            className="flex items-center justify-between rounded
              bg-[var(--bg-card)] border border-[var(--border-default)]
              px-3 py-2">
            <span className="text-[11.5px] text-[var(--text-secondary)]">{t.title}</span>
            <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-medium"
              style={{ background: `${t.color}1e`, color: t.color }}>
              <span className="h-1 w-1 rounded-full" style={{ background: t.color }} />
              {t.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Invoice mockup ─────────────────────────────────────────────────────── */
function InvoiceMockup() {
  const rows = [
    { num: 'INV-0042', client: 'Studio Arc',   amount: '$4,200', status: 'Paid',    color: '#26c97f' },
    { num: 'INV-0041', client: 'Forma Labs',   amount: '$2,800', status: 'Paid',    color: '#26c97f' },
    { num: 'INV-0040', client: 'Pixel & Co.',  amount: '$6,500', status: 'Pending', color: '#e79d13' },
    { num: 'INV-0039', client: 'Northline',    amount: '$3,100', status: 'Overdue', color: '#e5484d' },
  ];

  return (
    <div className="rounded-md overflow-hidden bg-[var(--bg-page)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-2">
          <Receipt size={11} className="text-[var(--text-faint)]" />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">Invoices</span>
          <span className="text-[10px] text-[var(--text-faint)]">· Q2 2026</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--accent)]">$16,600</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2 text-[9.5px] text-[var(--text-faint)] uppercase tracking-[0.08em]">
          <span>#</span>
          <span>Client</span>
          <span className="text-right">Amount</span>
          <span>Status</span>
        </div>
        {rows.map((r) => (
          <div key={r.num} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2.5
            items-center hover:bg-[var(--hover-subtle)] transition-colors duration-150">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">{r.num}</span>
            <span className="text-[11.5px] text-[var(--text-secondary)]">{r.client}</span>
            <span className="text-[11.5px] text-[var(--text-secondary)] text-right font-mono">{r.amount}</span>
            <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-medium"
              style={{ background: `${r.color}1e`, color: r.color }}>
              <span className="h-1 w-1 rounded-full" style={{ background: r.color }} />
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature showcase block ─────────────────────────────────────────────── */
function FeatureBlock({
  eyebrow, title, desc, bullets, children, reverse = false,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  children: React.ReactNode;
  reverse?: boolean;
}) {
  const iv = useInView();
  return (
    <div ref={iv.ref}
      className={[
        'grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center',
        iv.inView ? 'fade-up' : 'opacity-0',
      ].join(' ')}
    >
      <div className={`lg:col-span-5 ${reverse ? 'lg:order-2' : ''}`}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="text-[clamp(24px,3vw,32px)] font-medium tracking-[-0.025em] text-[var(--text-primary)] leading-[1.15]">
          {title}
        </h3>
        <p className="mt-3 text-[14px] text-[var(--text-muted)] leading-[1.7] max-w-[440px]">{desc}</p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] text-[var(--text-muted)] leading-[1.6]">
              <Check size={13} className="text-[var(--accent)] mt-1 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={`lg:col-span-7 ${reverse ? 'lg:order-1' : ''}`}>
        {children}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const metricsIV = useInView();
  const testiIV   = useInView();
  const cmpIV     = useInView();
  const faqIV     = useInView();
  const ctaIV     = useInView(0.2);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] selection:bg-[var(--tint-accent-strong)]">
      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hero-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up  { animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hero-1   { animation: hero-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
        .hero-2   { animation: hero-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }
        .hero-3   { animation: hero-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both; }
        .hero-4   { animation: hero-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both; }
        .hero-5   { animation: hero-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.45s both; }
      `}</style>

      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-[120px] sm:pt-[140px] pb-20 px-4 sm:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(var(--dot-color) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative mx-auto max-w-5xl">
          <a href="#product" className="hero-1 inline-flex items-center gap-2
            text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150">
            <span className="inline-flex items-center rounded-sm bg-[var(--tint-accent)]
              px-1.5 py-px text-[10px] font-medium text-[var(--accent)] uppercase tracking-[0.06em]">
              New
            </span>
            Client portals are generally available
            <ArrowUpRight size={12} />
          </a>

          <h1 className="hero-2 mt-6 text-[clamp(40px,6vw,68px)] font-medium
            leading-[1.02] tracking-[-0.035em] text-[var(--text-primary)] max-w-[820px]">
            Project management
            <br className="hidden sm:block" />
            built for client work.
          </h1>

          <p className="hero-3 mt-6 max-w-[560px] text-[15px] sm:text-[16px]
            leading-[1.65] text-[var(--text-muted)]">
            Nexus gives agencies and studios one workspace for tasks, client portals,
            invoicing, and analytics — without the bloat of a general-purpose tool.
          </p>

          <div className="hero-4 mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md
                bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
                px-4 py-2 text-[13px] font-medium text-white
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
              Get started
              <ArrowRight size={13} />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-1.5 rounded-md
                border border-[var(--border-default)]
                hover:border-[var(--border-strong)] hover:bg-[var(--hover-subtle)]
                px-4 py-2 text-[13px] font-medium text-[var(--text-primary)]
                transition-colors duration-150">
              Sign in
            </Link>
            <span className="text-[12px] text-[var(--text-subtle)]">
              Free for teams up to 5 · No credit card required
            </span>
          </div>
        </div>

        <div className="hero-5 relative mx-auto mt-16 max-w-6xl">
          <DashboardMockup />
        </div>
      </section>

      {/* ── METRICS ─────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pb-20 sm:pb-28">
        <div ref={metricsIV.ref}
          className={`mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4
            border-y border-[var(--border-subtle)]
            ${metricsIV.inView ? 'fade-up' : 'opacity-0'}`}>
          {METRICS.map(({ value, label }, i) => {
            const isRightCol = i % 2 === 1;          // index 1, 3 — right column on 2-col
            const isTopRow   = i < 2;                // index 0, 1 — top row on 2-col
            return (
              <div key={label}
                className={[
                  'py-6 sm:py-8 px-4 sm:px-6 text-center sm:text-left',
                  // Vertical divider between columns (always on sm+, only between col 0/1 and 2/3 on mobile)
                  !isRightCol ? 'border-r border-[var(--border-subtle)]' : '',
                  // Horizontal divider between rows on mobile only
                  isTopRow ? 'border-b border-[var(--border-subtle)] sm:border-b-0' : '',
                ].join(' ')}>
                <p className="text-[clamp(22px,3vw,32px)] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                  {value}
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">{label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURE SHOWCASE ────────────────────────────────────────────── */}
      <section id="product" className="relative px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-28 sm:space-y-36">
          <FeatureBlock
            eyebrow="Tasks"
            title="Plan work with precision."
            desc="Custom statuses, priorities, and assignees across Kanban, list, and detail views. Fast to navigate, forgiving to revise."
            bullets={PLAN_FEATURES}
          >
            <div className="rounded-md overflow-hidden bg-[var(--bg-page)] border border-[var(--border-default)]">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
                {['#5a5a5a', '#5a5a5a', '#5a5a5a'].map((c, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                ))}
                <div className="mx-auto text-[10px] text-[var(--text-faint)] font-mono">tasks · 23 total</div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { t: 'Design system audit',         s: 'In progress', p: '#5e6ad2', c: '#5e6ad2' },
                  { t: 'Client portal refresh',       s: 'Urgent',      p: '#e5484d', c: '#5e6ad2' },
                  { t: 'Invoice template — Q2',       s: 'To do',       p: '#e79d13', c: '#888'    },
                  { t: 'Kickoff notes',               s: 'Done',        p: '#5e6ad2', c: '#26c97f' },
                ].map((r) => (
                  <div key={r.t} className="flex items-center gap-3 rounded
                    bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.p }} />
                    <span className="text-[12px] text-[var(--text-secondary)] flex-1">{r.t}</span>
                    <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: `${r.c}1e`, color: r.c }}>
                      <span className="h-1 w-1 rounded-full" style={{ background: r.c }} />
                      {r.s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FeatureBlock>

          <FeatureBlock
            reverse
            eyebrow="Portals"
            title="Share work, not access."
            desc="Give each client a read-only window into their own projects. They see tasks, files, and invoices — nothing else."
            bullets={PORTAL_FEATURES}
          >
            <PortalMockup />
          </FeatureBlock>

          <FeatureBlock
            eyebrow="Invoicing"
            title="Bill without breaking flow."
            desc="Generate professional PDFs directly from project data. Track payment status and retainer cycles alongside the work itself."
            bullets={INVOICE_FEATURES}
          >
            <InvoiceMockup />
          </FeatureBlock>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section id="customers" className="relative px-4 sm:px-6 py-20 sm:py-28 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-6xl">
          <div ref={testiIV.ref} className={`max-w-[600px] mb-12 ${testiIV.inView ? 'fade-up' : 'opacity-0'}`}>
            <Eyebrow>Customers</Eyebrow>
            <h2 className="text-[clamp(28px,4vw,40px)] font-medium tracking-[-0.025em] text-[var(--text-primary)] leading-[1.1]">
              Teams trust Nexus to run their studios.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(({ name, role, quote, initials }, i) => (
              <figure key={name}
                className={[
                  'rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)]',
                  'p-6 flex flex-col',
                  testiIV.inView ? 'fade-up' : 'opacity-0',
                ].join(' ')}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <blockquote className="flex-1 text-[14px] text-[var(--text-secondary)] leading-[1.7]">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-[var(--border-subtle)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                    bg-[var(--tint-accent-strong)] text-[11px] font-medium text-[var(--accent)]">
                    {initials}
                  </div>
                  <div>
                    <p className="text-[12.5px] font-medium text-[var(--text-primary)]">{name}</p>
                    <p className="text-[11.5px] text-[var(--text-subtle)]">{role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING / COMPARE ───────────────────────────────────────────── */}
      <section id="pricing" className="relative px-4 sm:px-6 py-20 sm:py-28 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl">
          <div ref={cmpIV.ref} className={`max-w-[600px] mb-12 ${cmpIV.inView ? 'fade-up' : 'opacity-0'}`}>
            <Eyebrow>Comparison</Eyebrow>
            <h2 className="text-[clamp(28px,4vw,40px)] font-medium tracking-[-0.025em] text-[var(--text-primary)] leading-[1.1]">
              Purpose-built, not another general-purpose app.
            </h2>
            <p className="mt-3 text-[14px] text-[var(--text-muted)] leading-[1.65]">
              Nexus is designed specifically for client-facing teams. See how it compares.
            </p>
          </div>

          {/* Mobile: stacked card list */}
          <div className={`sm:hidden space-y-3 ${cmpIV.inView ? 'fade-up' : 'opacity-0'}`}>
            {COMPARE_ROWS.map(({ feature, nexus, clickup, linear }) => (
              <div key={feature}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-page)] p-4">
                <p className="text-[13px] font-medium text-[var(--text-primary)] mb-3">{feature}</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {[
                    { label: 'Nexus',   has: nexus,   highlight: true  },
                    { label: 'ClickUp', has: clickup, highlight: false },
                    { label: 'Linear',  has: linear,  highlight: false },
                  ].map(({ label, has, highlight }) => (
                    <div key={label}
                      className="flex flex-col items-center gap-1.5 rounded-md py-2 px-1"
                      style={{
                        background: highlight ? 'rgba(94,106,210,0.06)' : 'transparent',
                        border: highlight ? '1px solid rgba(94,106,210,0.18)' : '1px solid transparent',
                      }}>
                      <span className="uppercase tracking-[0.06em]"
                        style={{ color: highlight ? 'var(--accent)' : 'var(--text-subtle)' }}>
                        {label}
                      </span>
                      {has
                        ? <Check size={14} className="text-[var(--accent)]" strokeWidth={2.5} />
                        : <Minus size={12} className="text-[var(--text-disabled)]" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tablet/Desktop: grid table */}
          <div className={`hidden sm:block overflow-x-auto rounded-lg border border-[var(--border-default)]
            ${cmpIV.inView ? 'fade-up' : 'opacity-0'}`}>
            <div className="min-w-[520px]">
              <div className="grid grid-cols-4 text-[11px] uppercase tracking-[0.08em]
                bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)]">
                <div className="px-5 py-3.5 text-[var(--text-subtle)]">Feature</div>
                {[
                  { label: 'Nexus',   highlight: true },
                  { label: 'ClickUp', highlight: false },
                  { label: 'Linear',  highlight: false },
                ].map(({ label, highlight }) => (
                  <div key={label}
                    className="px-4 py-3.5 text-center border-l border-[var(--border-subtle)]"
                    style={{
                      color: highlight ? 'var(--accent)' : 'var(--text-subtle)',
                      background: highlight ? 'rgba(94,106,210,0.05)' : 'transparent',
                    }}>
                    {label}
                  </div>
                ))}
              </div>

              {COMPARE_ROWS.map(({ feature, nexus, clickup, linear }, i) => (
                <div key={feature}
                  className="grid grid-cols-4 text-[13px] bg-[var(--bg-page)]"
                  style={{ borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div className="px-5 py-3.5 text-[var(--text-secondary)]">{feature}</div>
                  {[nexus, clickup, linear].map((has, j) => (
                    <div key={j}
                      className="flex items-center justify-center py-3.5 border-l border-[var(--border-subtle)]"
                      style={{ background: j === 0 ? 'rgba(94,106,210,0.03)' : 'transparent' }}>
                      {has
                        ? <Check size={14} className="text-[var(--accent)]" strokeWidth={2} />
                        : <Minus size={12} className="text-[var(--text-disabled)]" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative px-4 sm:px-6 py-20 sm:py-28 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
          <div ref={faqIV.ref} className={`${faqIV.inView ? 'fade-up' : 'opacity-0'}`}>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="text-[clamp(26px,3.5vw,36px)] font-medium tracking-[-0.025em] text-[var(--text-primary)] leading-[1.15]">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-[13px] text-[var(--text-muted)] leading-[1.65]">
              Still have questions?{' '}
              <a href="mailto:hi@nexus.app" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150">
                Get in touch
              </a>.
            </p>
          </div>

          <div className={`divide-y divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]
            ${faqIV.inView ? 'fade-up' : 'opacity-0'}`}>
            {FAQS.map(({ q, a }, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]"
                  >
                    <span className="text-[13.5px] font-medium text-[var(--text-primary)]">{q}</span>
                    <ChevronDown size={14}
                      className="shrink-0 text-[var(--text-subtle)] transition-transform duration-150"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  {isOpen && (
                    <p className="text-[13px] text-[var(--text-muted)] leading-[1.7] pb-5 sm:pr-10">{a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 sm:py-28 border-t border-[var(--border-subtle)]">
        <div ref={ctaIV.ref}
          className={`mx-auto max-w-4xl text-center ${ctaIV.inView ? 'fade-up' : 'opacity-0'}`}>
          <h2 className="text-[clamp(28px,4.5vw,44px)] font-medium
            tracking-[-0.03em] text-[var(--text-primary)] leading-[1.1]">
            Start running your studio on Nexus.
          </h2>
          <p className="mt-4 mx-auto max-w-[440px] text-[14px] text-[var(--text-muted)] leading-[1.65]">
            Create your workspace in under a minute. Free for small teams, forever.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md
                bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
                px-4 py-2 text-[13px] font-medium text-white
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
              Get started
              <ArrowRight size={13} />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-1.5 rounded-md
                border border-[var(--border-default)]
                hover:border-[var(--border-strong)] hover:bg-[var(--hover-subtle)]
                px-4 py-2 text-[13px] font-medium text-[var(--text-primary)]
                transition-colors duration-150">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="relative px-4 sm:px-6 pt-14 pb-8 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10 lg:grid-cols-5 mb-12">
            <div className="sm:col-span-2 space-y-4">
              <Logo size="sm" />
              <p className="max-w-[280px] text-[13px] text-[var(--text-muted)] leading-[1.65]">
                Project management built for client work.
              </p>
              <p className="text-[11px] text-[var(--text-faint)] inline-flex items-center gap-1.5">
                <ShieldCheck size={11} />
                SOC 2 ready · End-to-end encryption
              </p>
            </div>

            {[
              { title: 'Product',   links: NAV_LINKS },
              { title: 'Workspace', links: [
                { label: 'Dashboard',     href: '/login' },
                { label: 'Client portal', href: '/login' },
                { label: 'Invoicing',     href: '/login' },
                { label: 'Analytics',     href: '/login' },
              ]},
              { title: 'Company',   links: [
                { label: 'Privacy',   href: '#' },
                { label: 'Terms',     href: '#' },
                { label: 'Security',  href: '#' },
                { label: 'Contact',   href: '#' },
              ]},
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-[11px] text-[var(--text-subtle)] uppercase tracking-[0.12em] mb-4">
                  {title}
                </h4>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <a href={href}
                        className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3
            pt-8 border-t border-[var(--border-subtle)]">
            <p className="text-[12px] text-[var(--text-faint)]">
              © 2026 Nexus App. All rights reserved.
            </p>
            <p className="text-[12px] text-[var(--text-subtle)]">
              Built in quiet corners of the internet.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

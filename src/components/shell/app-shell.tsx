"use client";

import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Loader2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";
import { BreadcrumbBar } from "@/components/shell/breadcrumb-bar";
import { Logo } from "@/components/shell/logo";
import { TopBar } from "@/components/shell/top-bar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/store";

// ─── Sidebar nav ────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Active when the pathname starts with href (e.g. /empresas covers detail). */
  prefixMatch?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { href: "/painel", label: "Início", icon: LayoutDashboard },
      { href: "/consolidado", label: "Análise consolidada", icon: BarChart3 },
    ],
  },
  {
    label: "Gestão",
    items: [{ href: "/empresas", label: "Empresas", icon: Building2, prefixMatch: true }],
  },
  {
    label: "Conta",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

function ViewLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="h-7 w-7 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}

// ─── Sidebar content ────────────────────────────────────────────────────────

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand (shown on mobile drawer; desktop uses TopBar) */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0 lg:hidden">
        <Logo size={32} withWordmark variant="full" />
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-3 pt-4 pb-4 overflow-y-auto scroll-area"
        aria-label="Navegação principal"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            <div
              className={`text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground px-3 ${
                gi === 0 ? "pt-2" : "pt-4"
              } pb-1`}
            >
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.prefixMatch
                  ? pathname?.startsWith(item.href)
                  : pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                        active
                          ? "bg-sidebar-accent text-[var(--brand)] font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground font-normal"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function AppFooter() {
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="mt-auto bg-[var(--surface)] text-muted-foreground border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />
          <span className="font-medium text-foreground">NR-1 Copsoq</span>
          <span className="opacity-50">·</span>
          <span>COPSOQ II-BR (CC BY-NC-ND 4.0) · Conforme NR-1 / Portaria MTE 1.419/2024</span>
        </div>
        <div className="opacity-70">
          © {year} · Dados do trabalhador anonimizados por design (LGPD)
        </div>
      </div>
    </footer>
  );
}

// ─── App shell ──────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const { professional, loading, set, setLoading } = useAuth();

  // Bootstrap session on mount (the server layout already verified the cookie;
  // this populates useAuth for the TopBar profile + views that read it).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await api.me.get();
        if (!cancelled) set(p);
      } catch {
        if (!cancelled) set(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [set, setLoading]);

  // Seed COPSOQ on first mount (idempotent) so demo works.
  useEffect(() => {
    api.system.seedCopsoq().catch(() => {});
  }, []);

  if (loading || !professional) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar: logo + search + profile (full width, sticky) */}
      <TopBar />

      <div className="flex flex-1">
        {/* Desktop sidebar (nav only, no brand/user — those are in TopBar) */}
        <aside
          className="hidden lg:block w-56 shrink-0 border-r border-sidebar-border sticky top-16 h-[calc(100vh-4rem)]"
          aria-label="Barra lateral"
        >
          <SidebarContent />
        </aside>

        <div className="flex flex-col flex-1 min-w-0">
          <BreadcrumbBar />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--brand)] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand)]"
          >
            Pular para o conteúdo
          </a>
          <main id="main-content" className="flex-1 min-w-0">
            <React.Suspense fallback={<ViewLoader />}>{children}</React.Suspense>
          </main>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

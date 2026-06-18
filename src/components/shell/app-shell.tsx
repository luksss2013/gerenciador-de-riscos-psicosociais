"use client";

import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Loader2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { ConfiguracoesView } from "@/components/configuracoes/configuracoes-view";
import { PainelView } from "@/components/painel/painel-view";
import { BreadcrumbBar } from "@/components/shell/breadcrumb-bar";
import { Logo } from "@/components/shell/logo";
import { TopBar } from "@/components/shell/top-bar";
import { useView, type ViewName } from "@/lib/store";

// ─── View router ────────────────────────────────────────────────────────────

interface NavItem {
  view: ViewName;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { view: "painel", label: "Início", icon: LayoutDashboard },
      { view: "consolidado", label: "Análise consolidada", icon: BarChart3 },
    ],
  },
  {
    label: "Gestão",
    items: [{ view: "empresas", label: "Empresas", icon: Building2 }],
  },
  {
    label: "Conta",
    items: [{ view: "configuracoes", label: "Configurações", icon: Settings }],
  },
];

type AnyViewComponent = React.ComponentType<Record<string, never>>;

/**
 * Lazy-load views owned by other agents. If their module file is absent,
 * fall back to a graceful placeholder so the build never breaks.
 *
 * The placeholder is a no-prop component, matching the `AnyViewComponent`
 * signature used by the router.
 */
function lazyView(
  loader: () => Promise<unknown>,
  displayName: string,
): React.ComponentType<Record<string, never>> {
  return React.lazy(async () => {
    try {
      const mod = (await loader()) as {
        default?: AnyViewComponent;
      } & Record<string, AnyViewComponent>;
      const Resolved = mod.default ?? Object.values(mod)[0];
      if (!Resolved) throw new Error("module missing default export");
      return { default: Resolved };
    } catch {
      const Placeholder: AnyViewComponent = () => <ViewMissingPlaceholder name={displayName} />;
      return { default: Placeholder };
    }
  });
}

function ViewMissingPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Este módulo ainda está sendo carregado ou implementado por outra equipe. Tente novamente em
        instantes.
      </p>
    </div>
  );
}

const ConsolidadoView = lazyView(
  () => import("@/components/consolidado/consolidado-view"),
  "Consolidado",
);
const EmpresasView = lazyView(() => import("@/components/empresas/empresas-view"), "Empresas");
const EmpresaDetailView = lazyView(
  () => import("@/components/empresas/empresa-detail-view"),
  "Detalhe da empresa",
);
const AvaliacaoDetailView = lazyView(
  () => import("@/components/avaliacoes/avaliacao-detail-view"),
  "Detalhe da avaliação",
);
const ResultadosView = lazyView(
  () => import("@/components/resultados/resultados-view"),
  "Resultados",
);
const InventarioView = lazyView(
  () => import("@/components/inventario/inventario-view"),
  "Inventário de Riscos",
);
const PlanoView = lazyView(() => import("@/components/plano/plano-view"), "Plano de Ação");
const RelatorioView = lazyView(() => import("@/components/relatorio/relatorio-view"), "Relatório");

function ViewLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="h-7 w-7 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}

function renderView(view: ViewName): React.ReactNode {
  switch (view) {
    case "painel":
      return <PainelView />;
    case "consolidado":
      return <ConsolidadoView />;
    case "configuracoes":
      return <ConfiguracoesView />;
    case "empresas":
      return <EmpresasView />;
    case "empresa":
      return <EmpresaDetailView />;
    case "avaliacao":
      return <AvaliacaoDetailView />;
    case "resultados":
      return <ResultadosView />;
    case "inventario":
      return <InventarioView />;
    case "plano":
      return <PlanoView />;
    case "relatorio":
      return <RelatorioView />;
    case "worker":
      // handled by page.tsx — render nothing.
      return null;
    default:
      return <PainelView />;
  }
}

// ─── Sidebar content ────────────────────────────────────────────────────────

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { view, go } = useView();

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
                const active = view === item.view;
                return (
                  <li key={item.view}>
                    <button
                      type="button"
                      onClick={() => {
                        go(item.view);
                        onNavigate?.();
                      }}
                      className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors border-l-2 ${
                        active
                          ? "border-[var(--brand)] bg-sidebar-accent text-[var(--brand)]"
                          : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
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

// (MobileTopbar removed — TopBar handles both mobile + desktop)

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

export function AppShell() {
  const view = useView((s) => s.view);

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
            <React.Suspense fallback={<ViewLoader />}>{renderView(view)}</React.Suspense>
          </main>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

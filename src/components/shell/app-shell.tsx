"use client";

import * as React from "react";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useAuth, useView, type ViewName } from "@/lib/store";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PainelView } from "@/components/painel/painel-view";
import { ConfiguracoesView } from "@/components/configuracoes/configuracoes-view";

// ─── View router ────────────────────────────────────────────────────────────

interface NavItem {
  view: ViewName;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { view: "painel", label: "Painel", icon: LayoutDashboard },
  { view: "consolidado", label: "Consolidado", icon: BarChart3 },
  { view: "empresas", label: "Empresas", icon: Building2 },
  { view: "configuracoes", label: "Configurações", icon: Settings },
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
  displayName: string
): React.LazyExoticObject<AnyViewComponent> {
  return React.lazy(async () => {
    try {
      const mod = (await loader()) as {
        default?: AnyViewComponent;
      } & Record<string, AnyViewComponent>;
      const Resolved = mod.default ?? Object.values(mod)[0];
      if (!Resolved) throw new Error("module missing default export");
      return { default: Resolved };
    } catch {
      const Placeholder: AnyViewComponent = () => (
        <ViewMissingPlaceholder name={displayName} />
      );
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
        Este módulo ainda está sendo carregado ou implementado por outra
        equipe. Tente novamente em instantes.
      </p>
    </div>
  );
}

const ConsolidadoView = lazyView(
  () => import("@/components/consolidado/consolidado-view"),
  "Consolidado"
);
const EmpresasView = lazyView(
  () => import("@/components/empresas/empresas-view"),
  "Empresas"
);
const EmpresaDetailView = lazyView(
  () => import("@/components/empresas/empresa-detail-view"),
  "Detalhe da empresa"
);
const AvaliacaoDetailView = lazyView(
  () => import("@/components/avaliacoes/avaliacao-detail-view"),
  "Detalhe da avaliação"
);
const ResultadosView = lazyView(
  () => import("@/components/resultados/resultados-view"),
  "Resultados"
);
const InventarioView = lazyView(
  () => import("@/components/inventario/inventario-view"),
  "Inventário de Riscos"
);
const PlanoView = lazyView(
  () => import("@/components/plano/plano-view"),
  "Plano de Ação"
);
const RelatorioView = lazyView(
  () => import("@/components/relatorio/relatorio-view"),
  "Relatório"
);

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

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { view, go } = useView();
  const { professional } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await api.auth.logout();
    } catch (e) {
      // Even if the request fails (e.g. session already gone), clear local state.
      if (e instanceof ApiError) {
        // no-op
      }
    } finally {
      useAuth.getState().set(null);
      toast.success("Sessão encerrada.");
      setSigningOut(false);
    }
  };

  const initials = React.useMemo(() => {
    if (!professional?.name) return "?";
    const parts = professional.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [professional?.name]);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm">NR-1 Copsoq</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Riscos Psicossociais
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4" aria-label="Navegação principal">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => {
                    go(item.view);
                    onNavigate?.();
                  }}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
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
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-1 flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sidebar-accent/60 transition-colors text-left">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {professional?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {professional?.email ?? ""}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {professional?.name ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {professional?.email ?? ""}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  go("configuracoes");
                  onNavigate?.();
                }}
              >
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ─── Topbar (mobile) ────────────────────────────────────────────────────────

function MobileTopbar() {
  const { view } = useView();
  const [open, setOpen] = useState(false);

  const currentLabel =
    NAV_ITEMS.find((n) => n.view === view)?.label ?? "NR-1 Copsoq";

  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="absolute top-3 right-3 z-10">
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">{currentLabel}</span>
      </div>
    </header>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function AppFooter() {
  return (
    <footer
      className="mt-auto bg-primary text-primary-foreground"
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-medium">NR-1 Copsoq</span>
          <span className="opacity-60">·</span>
          <span className="opacity-80">
            COPSOQ II-BR (CC BY-NC-ND 4.0) · Conforme NR-1 / Portaria MTE 1.419/2024
          </span>
        </div>
        <div className="opacity-70">
          © {new Date().getFullYear()} · Dados do trabalhador anonimizados por design (LGPD)
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
      <div className="flex flex-1">
        {/* Desktop sidebar (fixed width 240px) */}
        <aside
          className="hidden lg:block w-60 shrink-0 border-r border-sidebar-border sticky top-0 h-screen"
          aria-label="Barra lateral"
        >
          <SidebarContent />
        </aside>

        <div className="flex flex-col flex-1 min-w-0">
          <MobileTopbar />
          <main className="flex-1 min-w-0">
            <React.Suspense fallback={<ViewLoader />}>
              {renderView(view)}
            </React.Suspense>
          </main>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { api } from "@/lib/api";
import { useView, type ViewName } from "@/lib/store";

// ─── Module-level name caches ───────────────────────────────────────────────
// Populated on-demand by the breadcrumb bar so repeated renders don't refetch.
// Kept simple (Map<string, string>) per task constraints — no context, no SWR.

const companyNameCache = new Map<string, string>();
const assessmentTitleCache = new Map<string, string>();

type GoFn = (
  view: ViewName,
  opts?: {
    companyId?: string | null;
    assessmentId?: string | null;
    workerToken?: string | null;
  },
) => void;

interface Crumb {
  label: string;
  /** Render as the current (bold, non-navigable) page crumb. */
  current?: boolean;
  /** Navigate when clicked (only for non-current ancestors). */
  onNavigate?: () => void;
}

const LEAF_LABEL: Partial<Record<ViewName, string>> = {
  resultados: "Resultados",
  inventario: "Inventário",
  plano: "Plano de ação",
  relatorio: "Relatório",
};

function buildTrail(opts: {
  view: ViewName;
  companyId: string | null;
  assessmentId: string | null;
  companyName: string | null;
  assessmentTitle: string | null;
  go: GoFn;
}): Crumb[] {
  const { view, companyId, assessmentId, companyName, assessmentTitle, go } = opts;

  const inicio: Crumb =
    view === "painel"
      ? { label: "Início", current: true }
      : { label: "Início", onNavigate: () => go("painel") };

  switch (view) {
    case "painel":
      return [inicio];

    case "consolidado":
      return [inicio, { label: "Análise consolidada", current: true }];

    case "empresas":
      return [inicio, { label: "Empresas", current: true }];

    case "configuracoes":
      return [inicio, { label: "Configurações", current: true }];

    case "empresa": {
      const crumbs: Crumb[] = [inicio, { label: "Empresas", onNavigate: () => go("empresas") }];
      crumbs.push({
        label: companyName ?? "Empresa",
        current: true,
      });
      return crumbs;
    }

    case "avaliacao":
    case "resultados":
    case "inventario":
    case "plano":
    case "relatorio": {
      const title = assessmentTitle ?? "Avaliação";
      const crumbs: Crumb[] = [
        inicio,
        { label: "Empresas", onNavigate: () => go("empresas") },
        {
          label: companyName ?? "Empresa",
          onNavigate: companyId ? () => go("empresa", { companyId }) : undefined,
        },
      ];

      if (view === "avaliacao") {
        crumbs.push({ label: title, current: true });
      } else {
        crumbs.push({
          label: title,
          onNavigate: assessmentId ? () => go("avaliacao", { assessmentId }) : undefined,
        });
        crumbs.push({ label: LEAF_LABEL[view] ?? "Detalhe", current: true });
      }
      return crumbs;
    }

    default:
      return [inicio];
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BreadcrumbBar() {
  const view = useView((s) => s.view);
  const companyId = useView((s) => s.companyId);
  const assessmentId = useView((s) => s.assessmentId);
  const go = useView((s) => s.go);

  const [companyName, setCompanyName] = React.useState<string | null>(() =>
    companyId ? (companyNameCache.get(companyId) ?? null) : null,
  );
  const [assessmentTitle, setAssessmentTitle] = React.useState<string | null>(() =>
    assessmentId ? (assessmentTitleCache.get(assessmentId) ?? null) : null,
  );

  // Fetch company name on-demand when an id is present and not yet cached.
  React.useEffect(() => {
    if (!companyId) {
      setCompanyName(null);
      return;
    }
    const cached = companyNameCache.get(companyId);
    if (cached) {
      setCompanyName(cached);
      return;
    }
    let cancelled = false;
    api.companies
      .get(companyId)
      .then((c) => {
        companyNameCache.set(companyId, c.name);
        if (!cancelled) setCompanyName(c.name);
      })
      .catch(() => {
        if (!cancelled) setCompanyName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Fetch assessment title on-demand when an id is present and not yet cached.
  React.useEffect(() => {
    if (!assessmentId) {
      setAssessmentTitle(null);
      return;
    }
    const cached = assessmentTitleCache.get(assessmentId);
    if (cached) {
      setAssessmentTitle(cached);
      return;
    }
    let cancelled = false;
    api.assessments
      .get(assessmentId)
      .then((a) => {
        assessmentTitleCache.set(assessmentId, a.title);
        if (!cancelled) setAssessmentTitle(a.title);
      })
      .catch(() => {
        if (!cancelled) setAssessmentTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const trail = buildTrail({
    view,
    companyId,
    assessmentId,
    companyName,
    assessmentTitle,
    go,
  });

  if (trail.length === 0) return null;

  return (
    <nav
      className="border-b border-border bg-background px-4 sm:px-6 lg:px-8 py-3 text-sm"
      aria-label="Trilha de navegação"
    >
      <Breadcrumb>
        <BreadcrumbList className="gap-1.5 sm:gap-2">
          {trail.map((crumb, idx) => {
            const isLast = idx === trail.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                <BreadcrumbItem>
                  {crumb.current ? (
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      asChild
                      className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <button type="button" onClick={crumb.onNavigate} className="text-left">
                        {crumb.label}
                      </button>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
}

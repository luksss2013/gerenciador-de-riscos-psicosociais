"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
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

// ─── Module-level name caches ───────────────────────────────────────────────
// Populated on-demand by the breadcrumb bar so repeated renders don't refetch.

const companyNameCache = new Map<string, string>();
const assessmentTitleCache = new Map<string, string>();

const LEAF_LABEL: Record<string, string> = {
  resultados: "Resultados",
  inventario: "Inventário",
  "plano-de-acao": "Plano de ação",
  relatorio: "Relatório",
};

interface Crumb {
  label: string;
  href?: string;
  current?: boolean;
}

export function BreadcrumbBar() {
  const pathname = usePathname() ?? "";
  const params = useParams<{ companyId?: string | string[]; assessmentId?: string | string[] }>();
  const companyId = Array.isArray(params?.companyId) ? params.companyId[0] : params?.companyId;
  const assessmentId = Array.isArray(params?.assessmentId)
    ? params.assessmentId[0]
    : params?.assessmentId;

  const [companyName, setCompanyName] = React.useState<string | null>(() =>
    companyId ? (companyNameCache.get(companyId) ?? null) : null,
  );
  const [assessmentTitle, setAssessmentTitle] = React.useState<string | null>(() =>
    assessmentId ? (assessmentTitleCache.get(assessmentId) ?? null) : null,
  );

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

  const trail = React.useMemo<Crumb[]>(() => {
    const inicio: Crumb =
      pathname === "/painel"
        ? { label: "Início", current: true }
        : { label: "Início", href: "/painel" };

    if (pathname === "/painel") return [inicio];
    if (pathname === "/consolidado")
      return [inicio, { label: "Análise consolidada", current: true }];
    if (pathname === "/configuracoes") return [inicio, { label: "Configurações", current: true }];

    if (pathname === "/empresas") return [inicio, { label: "Empresas", current: true }];

    if (pathname.startsWith("/empresas/")) {
      const crumbs: Crumb[] = [inicio, { label: "Empresas", href: "/empresas" }];
      if (!companyId) return crumbs;
      const companyHref = `/empresas/${companyId}`;
      const hasAssessment = pathname.includes("/avaliacoes/");
      crumbs.push({
        label: companyName ?? "Empresa",
        href: hasAssessment ? companyHref : undefined,
        current: !hasAssessment,
      });
      if (hasAssessment && assessmentId) {
        const assessmentHref = `/empresas/${companyId}/avaliacoes/${assessmentId}`;
        const leaf = pathname.split("/").pop() ?? "";
        const isLeaf = leaf in LEAF_LABEL;
        crumbs.push({
          label: assessmentTitle ?? "Avaliação",
          href: isLeaf ? assessmentHref : undefined,
          current: !isLeaf,
        });
        if (isLeaf) crumbs.push({ label: LEAF_LABEL[leaf], current: true });
      }
      return crumbs;
    }

    return [inicio];
  }, [pathname, companyId, assessmentId, companyName, assessmentTitle]);

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
              <React.Fragment key={`${crumb.label}-${idx}`}>
                <BreadcrumbItem>
                  {crumb.current || !crumb.href ? (
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      asChild
                      className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <Link href={crumb.href}>{crumb.label}</Link>
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

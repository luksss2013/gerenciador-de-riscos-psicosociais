"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardList,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/errors";
import type {
  AssessmentStatus,
  CompanySummary,
  ProfessionalDashboard,
} from "@/lib/types";
import { formatCnpj } from "@/lib/cnpj";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NrStatusBadge, type NrStatus } from "@/components/shell/nr-status-badge";

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;

/** Derive the NR-1 status badge from a company's lastAssessment summary. */
function deriveStatus(c: CompanySummary): NrStatus {
  const { lastAssessmentStatus, lastAssessmentCompletedAt } = c.summary;
  if (!lastAssessmentStatus) return "no_assessment";
  if (lastAssessmentStatus === "collecting") return "collecting";
  if (lastAssessmentStatus === "processing") return "processing";
  if (lastAssessmentStatus === "draft") return "draft";
  if (lastAssessmentStatus === "archived") return "archived";
  if (lastAssessmentStatus === "completed") {
    if (lastAssessmentCompletedAt) {
      const age = Date.now() - new Date(lastAssessmentCompletedAt).getTime();
      if (age > TWO_YEARS_MS) return "review_recommended";
    }
    return "completed";
  }
  return "no_assessment";
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

// ─── Status accent color (for CompanyRow status dot) ────────────────────────

function statusAccentClass(status: NrStatus): string {
  switch (status) {
    case "completed":
      return "var(--risk-low)";
    case "collecting":
    case "processing":
      return "var(--brand-light)";
    case "review_recommended":
      return "var(--risk-medium)";
    case "draft":
    case "archived":
    case "no_assessment":
    default:
      return "var(--muted-foreground)";
  }
}

// ─── View ───────────────────────────────────────────────────────────────────

export function PainelView() {
  const go = useView((s) => s.go);
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch companies + dashboard in parallel. A dashboard failure shouldn't
      // block the whole page — degrade gracefully with a null dashboard.
      const companiesPromise: Promise<CompanySummary[]> = api
        .companies
        .list({ limit: 100 })
        .then((res) => res.data);
      const dashboardPromise: Promise<ProfessionalDashboard | null> = api
        .me
        .dashboard()
        .then((d) => d as ProfessionalDashboard | null)
        .catch(() => null);

      const [companiesData, dashboardData] = await Promise.all([
        companiesPromise,
        dashboardPromise,
      ]);

      setCompanies(companiesData);
      setDashboard(dashboardData);
      if (dashboardData === null) {
        toast.error("Indicadores consolidados indisponíveis no momento.");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar suas empresas.");
      }
      setCompanies(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCompanies = dashboard?.kpis.totalCompanies ?? companies?.length ?? 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      {/* Page header — compact, 1-liner title + subtitle + inline action */}
      <HeroHeader onAddCompany={() => go("empresas")} />

      {/* Loading */}
      {loading && <PainelSkeleton />}

      {/* Error */}
      {!loading && error && (
        <section
          aria-label="Erro ao carregar painel"
          className="border-b border-border py-10 flex flex-col items-center text-center gap-3"
        >
          <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium">Falha ao carregar o painel</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </section>
      )}

      {/* Loaded */}
      {!loading && !error && companies && (
        <div className="animate-in fade-in duration-300">
          {totalCompanies === 0 ? (
            <EmptyState onAdd={() => go("empresas")} />
          ) : (
            <div className="space-y-8">
              {/* Compact stat strip — 4 inline stats, single row on sm+ */}
              <KpiRow dashboard={dashboard} />

              {/* Main content — companies list (2/3) + recent assessments sidebar (1/3) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Primary: companies list (full-width list rows, not cards) */}
                <section aria-label="Empresas" className="lg:col-span-2">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="font-display text-xl tracking-tight text-foreground">
                      Empresas
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {totalCompanies} {totalCompanies === 1 ? "cliente" : "clientes"}
                    </span>
                  </div>
                  <div className="divide-y divide-border border-y border-border">
                    {companies.map((c) => (
                      <CompanyRow
                        key={c.id}
                        company={c}
                        onOpen={() => go("empresa", { companyId: c.id })}
                      />
                    ))}
                  </div>
                </section>

                {/* Secondary: recent assessments sidebar */}
                <aside aria-label="Avaliações recentes" className="lg:col-span-1">
                  <RecentAssessmentsSidebar
                    items={dashboard?.recentAssessments ?? []}
                    onPick={(a) =>
                      go("avaliacao", {
                        assessmentId: a.id,
                        companyId: a.companyId,
                      })
                    }
                  />
                </aside>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page header (compact, on warm paper — no marketing text) ───────────────

function HeroHeader({ onAddCompany }: { onAddCompany: () => void }) {
  return (
    <header
      className="border-b border-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      aria-label="Cabeçalho do painel"
    >
      <div className="min-w-0">
        <h1 className="font-display text-xl sm:text-2xl tracking-tight text-foreground">
          Painel de conformidade
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Visão geral das suas empresas e avaliações em andamento.
        </p>
      </div>
      <Button
        onClick={onAddCompany}
        className="shrink-0 bg-[var(--brand)] text-[var(--accent-foreground)] hover:bg-[var(--brand-light)]"
      >
        <Plus className="h-4 w-4" />
        Nova empresa
      </Button>
    </header>
  );
}

// ─── Stat strip (compact, single row on sm+, 2x2 on mobile) ─────────────────

function KpiRow({ dashboard }: { dashboard: ProfessionalDashboard | null }) {
  const k = dashboard?.kpis;
  const atRisk = k?.atRiskGhes ?? 0;
  const mediumRisk = k?.mediumRiskGhes ?? 0;
  const completed = k?.completedAssessments ?? 0;
  const active = k?.activeAssessments ?? 0;
  const totalCompanies = k?.totalCompanies ?? 0;
  const totalRespondents = k?.totalRespondents ?? 0;

  const stats: {
    value: number;
    label: string;
    secondary?: string;
    ariaLabel: string;
  }[] = [
    {
      value: totalCompanies,
      label: "Empresas",
      ariaLabel: `Empresas: ${totalCompanies}`,
    },
    {
      value: active,
      label: "Avaliações ativas",
      secondary: `${completed} concluída${completed === 1 ? "" : "s"}`,
      ariaLabel: `Avaliações ativas: ${active}. ${completed} concluídas.`,
    },
    {
      value: atRisk,
      label: "GHEs em risco",
      secondary: `${mediumRisk} intermediário${mediumRisk === 1 ? "" : "s"}`,
      ariaLabel: `GHEs em risco alto: ${atRisk}. ${mediumRisk} em risco intermediário.`,
    },
    {
      value: totalRespondents,
      label: "Total respondentes",
      ariaLabel: `Total de respondentes: ${totalRespondents}`,
    },
  ];

  return (
    <section
      aria-label="Indicadores principais"
      className="bg-[var(--surface)] rounded-lg px-4 sm:px-5 py-3 sm:py-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`px-3 sm:px-5 py-1 ${i === 0 ? "pl-0" : ""}`}
            role="group"
            aria-label={s.ariaLabel}
          >
            <div className="font-mono-numeric text-xl sm:text-2xl leading-none text-foreground">
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {s.label}
            </div>
            {s.secondary && (
              <div className="text-[11px] text-muted-foreground/80 mt-0.5 font-mono-numeric">
                {s.secondary}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Company list-row (full-width row, not a card) ──────────────────────────

function CompanyRow({
  company,
  onOpen,
}: {
  company: CompanySummary;
  onOpen: () => void;
}) {
  const status = deriveStatus(company);
  const accent = statusAccentClass(status);
  const location =
    company.city || company.state
      ? [company.city, company.state].filter(Boolean).join(" · ")
      : null;

  return (
    <div className="surface-hover py-4 -mx-2 px-2 rounded-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Status dot + name/CNPJ/location */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-[var(--surface)]"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-medium text-base text-foreground leading-tight line-clamp-1">
                {company.name}
              </h3>
              <NrStatusBadge status={status} />
            </div>
            <div className="font-mono-numeric text-xs text-muted-foreground mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span>{formatCnpj(company.cnpj)}</span>
              {location && (
                <>
                  <span className="text-muted-foreground/40" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 align-middle">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {location}
                  </span>
                </>
              )}
              {company.cnaePrimary && (
                <>
                  <span className="text-muted-foreground/40" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 align-middle">
                    <ClipboardList className="h-3 w-3" aria-hidden="true" />
                    CNAE {company.cnaePrimary}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Counts + action */}
        <div className="flex items-center justify-between gap-4 sm:shrink-0 pl-5 sm:pl-0">
          <div className="text-xs text-muted-foreground font-mono-numeric">
            {company.summary.departmentsCount} GHE
            {company.summary.departmentsCount !== 1 ? "s" : ""} ·{" "}
            {company.summary.assessmentsCount} avalia
            {company.summary.assessmentsCount !== 1 ? "ções" : "ção"}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpen}
            className="text-[var(--brand)] hover:bg-[var(--surface)] hover:text-[var(--brand)]"
          >
            Acessar
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Recent assessments sidebar (compact, max 5 items, list rows) ───────────

type RecentAssessmentItem = ProfessionalDashboard["recentAssessments"][number];

function statusDotColor(status: AssessmentStatus): string {
  switch (status) {
    case "collecting":
    case "processing":
      return "var(--brand-light)";
    case "completed":
      return "var(--risk-low)";
    case "archived":
      return "var(--muted-foreground)";
    case "draft":
    default:
      return "var(--muted-foreground)";
  }
}

function RecentAssessmentsSidebar({
  items,
  onPick,
}: {
  items: RecentAssessmentItem[];
  onPick: (item: RecentAssessmentItem) => void;
}) {
  const top = items.slice(0, 5);

  return (
    <div className="lg:sticky lg:top-4">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-base sm:text-lg tracking-tight text-foreground">
          Avaliações recentes
        </h2>
        <span className="text-xs text-muted-foreground">{top.length} recente{top.length !== 1 ? "s" : ""}</span>
      </div>

      {top.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border-y border-border">
          Nenhuma avaliação registrada.
        </div>
      ) : (
        <ol className="divide-y divide-border border-y border-border">
          {top.map((a) => {
            const statusLabel =
              ASSESSMENT_STATUS_LABELS[a.status] ?? a.status;
            return (
              <li key={a.id}>
                <button
                  onClick={() => onPick(a)}
                  className="w-full text-left flex gap-2.5 py-3 px-1 -mx-1 cursor-pointer rounded-sm transition-colors hover:bg-[var(--surface)]"
                >
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusDotColor(a.status) }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug">
                      <span className="font-medium truncate block text-foreground">
                        {a.companyName}
                      </span>
                      <span className="text-muted-foreground truncate block">
                        {a.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {statusLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70">
                        · {relativeTime(a.updatedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ─── Empty state — centered on warm paper, no card chrome ───────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="flex flex-col items-center text-center gap-4 pt-12 sm:pt-16">
      <div className="h-14 w-14 rounded-full bg-[var(--surface)] flex items-center justify-center">
        <Building2 className="h-7 w-7 text-[var(--brand)]" />
      </div>
      <div className="max-w-md">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Nenhuma empresa cadastrada
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione a primeira para começar.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Nova empresa
      </Button>
    </section>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PainelSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {/* Stat strip skeleton — compact surface-backed bar with 4 divided cells */}
      <div className="bg-[var(--surface)] rounded-lg px-4 sm:px-5 py-3 sm:py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`px-3 sm:px-5 py-1 ${i === 0 ? "pl-0" : ""}`}>
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-20 mt-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content skeleton — 2/3 companies list + 1/3 sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Companies list skeleton */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-4 flex items-center gap-3">
                <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-3 w-24 hidden sm:block" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent assessments sidebar skeleton */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="flex items-baseline justify-between mb-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-3 flex items-start gap-2.5">
                <Skeleton className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

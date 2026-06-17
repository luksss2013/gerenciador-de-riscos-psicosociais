"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  History,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useAuth, useView } from "@/lib/store";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/errors";
import type {
  AssessmentStatus,
  CompanySummary,
  ProfessionalDashboard,
  RiskLevel,
} from "@/lib/types";
import { formatCnpj } from "@/lib/cnpj";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// ─── Alert types ────────────────────────────────────────────────────────────

interface PainelAlert {
  kind: "no_assessment" | "low_adhesion" | "review_recommended";
  companyName: string;
  companyId: string;
  message: string;
  icon: React.ElementType;
  tone: "muted" | "warning";
}

function buildAlerts(companies: CompanySummary[]): PainelAlert[] {
  const alerts: PainelAlert[] = [];
  for (const c of companies) {
    const { summary } = c;
    if (summary.assessmentsCount === 0) {
      alerts.push({
        kind: "no_assessment",
        companyName: c.name,
        companyId: c.id,
        message: "Sem ciclos de avaliação cadastrados.",
        icon: ClipboardList,
        tone: "muted",
      });
    } else if (
      summary.lastAssessmentStatus === "collecting" &&
      summary.lastAssessmentCompletedAt == null
    ) {
      alerts.push({
        kind: "low_adhesion",
        companyName: c.name,
        companyId: c.id,
        message: "Avaliação em coleta — acompanhe a adesão.",
        icon: AlertTriangle,
        tone: "warning",
      });
    } else if (
      summary.lastAssessmentStatus === "completed" &&
      summary.lastAssessmentCompletedAt &&
      Date.now() - new Date(summary.lastAssessmentCompletedAt).getTime() >
        TWO_YEARS_MS
    ) {
      alerts.push({
        kind: "review_recommended",
        companyName: c.name,
        companyId: c.id,
        message: "Última avaliação concluída há mais de 2 anos — revisão recomendada.",
        icon: CalendarClock,
        tone: "warning",
      });
    }
  }
  return alerts.slice(0, 5);
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

function firstName(full: string | null | undefined): string {
  if (!full) return "";
  const trimmed = full.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  // Skip common Portuguese-language honorifics/titles to reach the actual given name.
  const HONORIFICS = new Set([
    "dr", "dra", "sr", "sra", "srta", "prof", "profa",
    "dr.", "dra.", "sr.", "sra.", "srta.", "prof.", "profa.",
  ]);
  for (const p of parts) {
    if (!HONORIFICS.has(p.toLowerCase())) return p;
  }
  return parts[0];
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
  const { professional } = useAuth();
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

  const alerts = useMemo(
    () => (companies ? buildAlerts(companies) : []),
    [companies],
  );

  const totalCompanies = dashboard?.kpis.totalCompanies ?? companies?.length ?? 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      {/* Page header */}
      <HeroHeader
        professionalName={professional?.name ?? null}
        onAddCompany={() => go("empresas")}
      />

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
        <>
          {/* Alerts banner — refined: border-b dividers + small status dot, no warning card chrome */}
          {alerts.length > 0 && (
            <section className="mb-8" aria-label="Alertas de conformidade">
              <h2 className="font-display text-sm tracking-tight text-muted-foreground mb-3">
                Alertas
              </h2>
              <ScrollArea className="w-full">
                <div className="flex gap-0 pb-1">
                  {alerts.map((a, idx) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={`${a.kind}-${a.companyId}`}
                        onClick={() => go("empresa", { companyId: a.companyId })}
                        className={`shrink-0 w-72 text-left px-4 py-3 transition-colors hover:bg-[var(--surface)] ${
                          idx === 0 ? "pl-0" : ""
                        } ${idx < alerts.length - 1 ? "border-r border-border" : ""}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                              a.tone === "warning"
                                ? "bg-[var(--risk-medium)]"
                                : "bg-[var(--muted-foreground)]"
                            }`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate text-foreground">
                              {a.companyName}
                            </div>
                            <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                              {a.message}
                            </div>
                          </div>
                          <Icon
                            className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/70"
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </section>
          )}

          {/* Empty state */}
          {totalCompanies === 0 ? (
            <EmptyState onAdd={() => go("empresas")} />
          ) : (
            <div className="space-y-10">
              {/* Stat strip */}
              <KpiRow dashboard={dashboard} />

              {/* Compliance overview */}
              <ComplianceOverview
                compliance={dashboard?.compliance ?? null}
                totalCompanies={totalCompanies}
              />

              {/* Companies list — 2/3 width on desktop */}
              <section aria-label="Empresas" className="lg:col-span-2">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-xl tracking-tight text-foreground">
                    Empresas
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {totalCompanies} {totalCompanies === 1 ? "cliente" : "clientes"}
                  </span>
                </div>
                <div className="divide-y divide-border border-b border-border">
                  {companies.map((c) => (
                    <CompanyRow
                      key={c.id}
                      company={c}
                      onOpen={() => go("empresa", { companyId: c.id })}
                    />
                  ))}
                </div>
              </section>

              {/* Recent assessments feed */}
              <RecentAssessmentsFeed
                items={dashboard?.recentAssessments ?? []}
                onPick={(a) =>
                  go("avaliacao", {
                    assessmentId: a.id,
                    companyId: a.companyId,
                  })
                }
              />

              {/* Heatmap + Trend row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <DimensionHeatmapMini
                  heatmap={dashboard?.dimensionHeatmap ?? []}
                />
                <TrendMiniChart trend={dashboard?.trend ?? []} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page header (clean, on warm paper — no gradient hero) ──────────────────

function HeroHeader({
  professionalName,
  onAddCompany,
}: {
  professionalName: string | null;
  onAddCompany: () => void;
}) {
  const greeting = professionalName
    ? `Bem-vindo(a) de volta, ${firstName(professionalName)}`
    : "Painel do profissional SST";
  return (
    <header
      className="border-b border-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      aria-label="Cabeçalho do painel"
    >
      <div>
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground">
          Painel de Conformidade NR-1
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">{greeting}</p>
      </div>
      <Button
        variant="outline"
        onClick={onAddCompany}
        className="shrink-0 border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--surface)] hover:text-[var(--brand)]"
      >
        <Plus className="h-4 w-4" />
        Nova Empresa
      </Button>
    </header>
  );
}

// ─── Stat strip (replaces 4-card KPI grid) ──────────────────────────────────

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
      className="bg-[var(--surface)] rounded-lg p-5"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`px-4 sm:px-6 py-1 ${i === 0 ? "pl-0" : ""}`}
            role="group"
            aria-label={s.ariaLabel}
          >
            <div className="font-mono-numeric text-2xl leading-none text-foreground">
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {s.label}
            </div>
            {s.secondary && (
              <div className="text-[11px] text-muted-foreground/80 mt-1 font-mono-numeric">
                {s.secondary}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Compliance overview (section, no Card wrapper) ─────────────────────────

interface ComplianceBucket {
  key: "compliant" | "inProgress" | "pendingReview" | "noAssessment";
  label: string;
  value: number;
  colorVar: string; // CSS variable for the bar segment
}

function ComplianceOverview({
  compliance,
  totalCompanies,
}: {
  compliance: ProfessionalDashboard["compliance"] | null;
  totalCompanies: number;
}) {
  if (!compliance || totalCompanies === 0) {
    return null;
  }

  const buckets: ComplianceBucket[] = [
    {
      key: "compliant",
      label: "Em conformidade",
      value: compliance.compliant,
      colorVar: "var(--risk-low)",
    },
    {
      key: "inProgress",
      label: "Em andamento",
      value: compliance.inProgress,
      colorVar: "var(--brand-light)",
    },
    {
      key: "pendingReview",
      label: "Revisão pendente",
      value: compliance.pendingReview,
      colorVar: "var(--risk-medium)",
    },
    {
      key: "noAssessment",
      label: "Sem avaliação",
      value: compliance.noAssessment,
      colorVar: "var(--muted-foreground)",
    },
  ];

  const total = buckets.reduce((acc, b) => acc + b.value, 0);
  const nonZero = buckets.filter((b) => b.value > 0);

  return (
    <section aria-label="Conformidade NR-1">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Conformidade NR-1
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalCompanies} {totalCompanies === 1 ? "empresa" : "empresas"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Distribuição do estado de conformidade dos clientes sob gestão.
      </p>

      {/* Stacked bar */}
      <div
        className="h-2.5 w-full rounded-full overflow-hidden flex bg-[var(--surface)]"
        role="img"
        aria-label={`Conformidade: ${compliance.compliant} em conformidade, ${compliance.inProgress} em andamento, ${compliance.pendingReview} em revisão pendente, ${compliance.noAssessment} sem avaliação.`}
      >
        {total > 0 ? (
          nonZero.map((b) => (
            <div
              key={b.key}
              style={{
                width: `${(b.value / total) * 100}%`,
                backgroundColor: b.colorVar,
              }}
              title={`${b.label}: ${b.value}`}
            />
          ))
        ) : (
          <div className="w-full bg-[var(--surface)]" />
        )}
      </div>

      {/* Legend */}
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-5">
        {buckets.map((b) => (
          <li key={b.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: b.colorVar }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-muted-foreground truncate">{b.label}</div>
              <div className="font-medium font-mono-numeric text-foreground">
                {b.value}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Company list-row (replaces Card pattern) ───────────────────────────────

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

  // Last assessment adesão proxy — surfaced as a small progress bar when
  // the company has a "collecting" assessment.
  const isCollecting = company.summary.lastAssessmentStatus === "collecting";

  return (
    <div className="surface-hover py-4 -mx-2 px-2 rounded-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Status dot + name/CNPJ */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            className="mt-1.5 h-2 w-2 rounded-full shrink-0"
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
            <div className="font-mono-numeric text-xs text-muted-foreground mt-1">
              {formatCnpj(company.cnpj)}
              {location && (
                <span className="mx-2" aria-hidden="true">·</span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1 align-middle">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {location}
                </span>
              )}
              {company.cnaePrimary && (
                <>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 align-middle">
                    <ClipboardList className="h-3 w-3" aria-hidden="true" />
                    CNAE {company.cnaePrimary}
                  </span>
                </>
              )}
            </div>
            {isCollecting && (
              <div className="mt-2 max-w-xs">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Coleta em andamento</span>
                  <span className="text-muted-foreground font-mono-numeric">—</span>
                </div>
                <Progress
                  value={0}
                  className="h-1"
                  aria-label="Avaliação em coleta"
                />
              </div>
            )}
          </div>
        </div>

        {/* Counts + action */}
        <div className="flex items-center justify-between gap-4 sm:shrink-0 pl-5 sm:pl-0">
          <div className="text-xs text-muted-foreground font-mono-numeric">
            {company.summary.departmentsCount} GHE
            {company.summary.departmentsCount !== 1 ? "s" : ""} ·{" "}
            {company.summary.assessmentsCount} aval.
            {company.summary.assessmentsCount !== 1 ? "ões" : "ão"}
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

// ─── Recent assessments feed (list with border-b dividers, no Card) ─────────

type RecentAssessmentItem = ProfessionalDashboard["recentAssessments"][number];

function assessmentStatusIcon(status: AssessmentStatus): React.ElementType {
  switch (status) {
    case "collecting":
      return Activity;
    case "processing":
      return Loader2;
    case "completed":
      return ShieldCheck;
    case "archived":
      return History;
    case "draft":
    default:
      return ClipboardList;
  }
}

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

function RecentAssessmentsFeed({
  items,
  onPick,
}: {
  items: RecentAssessmentItem[];
  onPick: (item: RecentAssessmentItem) => void;
}) {
  const top = items.slice(0, 5);
  return (
    <section aria-label="Avaliações recentes">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Avaliações recentes
        </h2>
        <span className="text-xs text-muted-foreground">Últimos ciclos atualizados</span>
      </div>

      {top.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border-b border-border">
          Nenhuma avaliação registrada.
        </div>
      ) : (
        <ScrollArea className="max-h-96 scroll-area border-b border-border">
          <ol>
            {top.map((a) => {
              const Icon = assessmentStatusIcon(a.status);
              const statusLabel =
                ASSESSMENT_STATUS_LABELS[a.status] ?? a.status;
              return (
                <li key={a.id} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => onPick(a)}
                    className="w-full text-left flex gap-3 py-3 px-1 -mx-1 rounded-sm transition-colors hover:bg-[var(--surface)]"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusDotColor(a.status) }}
                      aria-hidden="true"
                    />
                    <Icon
                      className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/70"
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
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {statusLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · {relativeTime(a.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      )}
    </section>
  );
}

// ─── Dimension heatmap mini (section, no Card wrapper) ──────────────────────

type HeatmapItem = ProfessionalDashboard["dimensionHeatmap"][number];

function riskBarVar(level: RiskLevel): string {
  switch (level) {
    case "HIGH":
      return "var(--risk-high)";
    case "MEDIUM":
      return "var(--risk-medium)";
    case "LOW":
    default:
      return "var(--risk-low)";
  }
}

function DimensionHeatmapMini({ heatmap }: { heatmap: HeatmapItem[] }) {
  if (!heatmap || heatmap.length === 0) {
    return null;
  }
  const allZero = heatmap.every((d) => d.weightedAvgRiskScore === 0);

  return (
    <section aria-label="Risco médio por dimensão" className="border-b border-border pb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Risco médio por dimensão
        </h2>
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Todos os ciclos concluídos — COPSOQ II-BR (D1–D11).
      </p>

      {allZero ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Sem dados de dimensão ainda.
        </div>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div
            className="flex items-end justify-between gap-1.5 h-32"
            role="img"
            aria-label="Risco médio por dimensão COPSOQ. Veja a tabela sr-only abaixo para os valores completos."
          >
            {heatmap.map((d) => {
              const heightPct = Math.max(
                4,
                Math.min(100, Math.round(d.weightedAvgRiskScore)),
              );
              return (
                <Tooltip key={d.code}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                      <div className="w-full h-full flex items-end">
                        <div
                          className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: riskBarVar(d.riskLevel),
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono-numeric">
                        {d.code}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="font-medium">{d.code} · {d.name}</div>
                    <div className="text-muted-foreground">
                      Escore: {Math.round(d.weightedAvgRiskScore)}/100 ·{" "}
                      {d.riskLevel === "HIGH"
                        ? "Desfavorável"
                        : d.riskLevel === "MEDIUM"
                          ? "Intermediário"
                          : "Favorável"}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          {/* sr-only data table for screen readers */}
          <table className="sr-only">
            <caption>
              Risco médio por dimensão (todos os ciclos concluídos)
            </caption>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Dimensão</th>
                <th scope="col">Escore (0-100)</th>
                <th scope="col">Nível</th>
              </tr>
            </thead>
            <tbody>
              {heatmap.map((d) => (
                <tr key={d.code}>
                  <td>{d.code}</td>
                  <td>{d.name}</td>
                  <td>{Math.round(d.weightedAvgRiskScore)}</td>
                  <td>{d.riskLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      )}
    </section>
  );
}

// ─── Trend mini-chart (section, no Card wrapper; recolored to chart palette) ─

type TrendPoint = ProfessionalDashboard["trend"][number];

function TrendMiniChart({ trend }: { trend: TrendPoint[] }) {
  if (!trend || trend.length === 0) {
    return null;
  }
  const allZero = trend.every((p) => p.count === 0);

  // SVG geometry — fixed viewBox, scales to container width.
  const W = 320;
  const H = 120;
  const PAD_X = 28;
  const PAD_Y_TOP = 12;
  const PAD_Y_BOTTOM = 28;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y_TOP - PAD_Y_BOTTOM;
  const max = Math.max(1, ...trend.map((p) => p.count));
  const stepX = trend.length > 1 ? innerW / (trend.length - 1) : 0;

  const points = trend.map((p, i) => {
    const x = PAD_X + i * stepX;
    const y = PAD_Y_TOP + innerH - (p.count / max) * innerH;
    return { x, y, ...p };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `M ${points[0].x.toFixed(2)} ${(PAD_Y_TOP + innerH).toFixed(2)} ` +
        points
          .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(" ") +
        ` L ${points[points.length - 1].x.toFixed(2)} ${(
          PAD_Y_TOP + innerH
        ).toFixed(2)} Z`
      : "";

  return (
    <section aria-label="Avaliações por mês" className="border-b border-border pb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Avaliações por mês
        </h2>
        <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Últimos 6 meses.
      </p>

      {allZero ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma avaliação nos últimos 6 meses.
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Avaliações por mês: ${trend
              .map((p) => `${p.label}: ${p.count}`)
              .join(", ")}.`}
          >
            {/* Y baseline */}
            <line
              x1={PAD_X}
              y1={PAD_Y_TOP + innerH}
              x2={PAD_X + innerW}
              y2={PAD_Y_TOP + innerH}
              stroke="var(--border)"
              strokeWidth={1}
            />
            {/* Area fill */}
            <path
              d={areaPath}
              fill="var(--chart-2)"
              fillOpacity={0.15}
              stroke="none"
            />
            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Points + X labels */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill="var(--brand)"
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
                <text
                  x={p.x}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--muted-foreground)"
                  fontFamily="var(--font-geist-mono, monospace)"
                >
                  {p.label.split(" ")[0]}
                </text>
                {p.count > 0 && (
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill="var(--foreground)"
                    fontFamily="var(--font-geist-mono, monospace)"
                  >
                    {p.count}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {/* sr-only data table */}
          <table className="sr-only">
            <caption>Avaliações por mês (últimos 6 meses)</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">Avaliações</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((p) => (
                <tr key={p.month}>
                  <td>{p.label}</td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="border border-dashed border-border rounded-lg py-16 flex flex-col items-center text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-[var(--surface)] flex items-center justify-center">
        <Building2 className="h-8 w-8 text-[var(--brand)]" />
      </div>
      <div className="max-w-md">
        <h2 className="font-display text-lg tracking-tight text-foreground">
          Nenhuma empresa cadastrada
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione seu primeiro cliente para começar a gerenciar riscos
          psicossociais conforme a NR-1.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Adicionar empresa
      </Button>
    </section>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PainelSkeleton() {
  return (
    <div className="space-y-8">
      {/* Alerts skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-72 shrink-0 rounded-md" />
        ))}
      </div>
      {/* Stat strip skeleton */}
      <Skeleton className="h-20 w-full rounded-lg" />
      {/* Compliance skeleton */}
      <Skeleton className="h-28 w-full rounded-md" />
      {/* Companies list skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
      {/* Heatmap + trend skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-56 w-full rounded-md" />
        <Skeleton className="h-56 w-full rounded-md" />
      </div>
    </div>
  );
}

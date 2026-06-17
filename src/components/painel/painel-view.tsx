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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// ─── Status accent color (for CompanyCard top border) ───────────────────────

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
      {/* Hero header */}
      <HeroHeader
        professionalName={professional?.name ?? null}
        onAddCompany={() => go("empresas")}
      />

      {/* Loading */}
      {loading && <PainelSkeleton />}

      {/* Error */}
      {!loading && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
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
          </CardContent>
        </Card>
      )}

      {/* Loaded */}
      {!loading && !error && companies && (
        <>
          {/* Alerts banner (still useful — kept above the KPI row) */}
          {alerts.length > 0 && (
            <section className="mb-6" aria-label="Alertas de conformidade">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Alertas
              </h2>
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2">
                  {alerts.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={`${a.kind}-${a.companyId}`}
                        onClick={() => go("empresa", { companyId: a.companyId })}
                        className={`shrink-0 w-72 text-left rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                          a.tone === "warning"
                            ? "border-warning/40 bg-warning/10"
                            : "border-border bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <Icon
                            className={`h-4 w-4 mt-0.5 shrink-0 ${
                              a.tone === "warning"
                                ? "text-warning"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {a.companyName}
                            </div>
                            <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                              {a.message}
                            </div>
                          </div>
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
            <div className="space-y-6">
              {/* KPI summary row */}
              <KpiRow dashboard={dashboard} />

              {/* Compliance overview */}
              <ComplianceOverview
                compliance={dashboard?.compliance ?? null}
                totalCompanies={totalCompanies}
              />

              {/* Two-column section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Companies grid — 2/3 width on desktop */}
                <section
                  className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
                  aria-label="Empresas"
                >
                  {companies.map((c) => (
                    <CompanyCard
                      key={c.id}
                      company={c}
                      onOpen={() => go("empresa", { companyId: c.id })}
                    />
                  ))}
                </section>

                {/* Recent assessments feed — 1/3 width on desktop */}
                <aside
                  aria-label="Avaliações recentes"
                  className="lg:col-span-1"
                >
                  <RecentAssessmentsFeed
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

              {/* Heatmap + Trend row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

// ─── Hero header ────────────────────────────────────────────────────────────

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
      className="mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 rounded-none sm:rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-light)] text-white"
      aria-label="Cabeçalho do painel"
    >
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Painel de Conformidade NR-1
          </h1>
          <p className="text-sm text-white/80 mt-1">{greeting}</p>
        </div>
        <Button
          variant="outline"
          onClick={onAddCompany}
          className="shrink-0 bg-white text-foreground border-white hover:bg-white/90 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>
    </header>
  );
}

// ─── KPI row ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconTone: "brand" | "warning" | "risk" | "muted";
  secondary?: string;
  ariaLabel: string;
}

const KPI_ICON_TONE_CLASS: Record<KpiCardProps["iconTone"], string> = {
  brand: "bg-brand-light/15 text-brand-light",
  warning: "bg-warning/15 text-warning",
  risk: "bg-risk-high/15 text-risk-high",
  muted: "bg-muted text-muted-foreground",
};

function KpiCard({
  label,
  value,
  icon: Icon,
  iconTone,
  secondary,
  ariaLabel,
}: KpiCardProps) {
  return (
    <Card className="card-hover" role="group" aria-label={ariaLabel}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-3xl font-bold font-mono-numeric leading-none">
              {value}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
              {label}
            </div>
            {secondary && (
              <div className="text-xs text-muted-foreground mt-1">
                {secondary}
              </div>
            )}
          </div>
          <div
            className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${KPI_ICON_TONE_CLASS[iconTone]}`}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiRow({ dashboard }: { dashboard: ProfessionalDashboard | null }) {
  const k = dashboard?.kpis;
  const atRisk = k?.atRiskGhes ?? 0;
  const mediumRisk = k?.mediumRiskGhes ?? 0;
  const completed = k?.completedAssessments ?? 0;
  const active = k?.activeAssessments ?? 0;
  const totalCompanies = k?.totalCompanies ?? 0;
  const totalRespondents = k?.totalRespondents ?? 0;

  return (
    <section aria-label="Indicadores principais" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Empresas"
        value={totalCompanies}
        icon={Building2}
        iconTone="brand"
        ariaLabel={`Empresas: ${totalCompanies}`}
      />
      <KpiCard
        label="Avaliações ativas"
        value={active}
        icon={Activity}
        iconTone="brand"
        secondary={`${completed} concluída${completed === 1 ? "" : "s"}`}
        ariaLabel={`Avaliações ativas: ${active}. ${completed} concluídas.`}
      />
      <KpiCard
        label="GHEs em risco"
        value={atRisk}
        icon={ShieldAlert}
        iconTone={atRisk > 0 ? "risk" : "muted"}
        secondary={`${mediumRisk} intermediário${mediumRisk === 1 ? "" : "s"}`}
        ariaLabel={`GHEs em risco alto: ${atRisk}. ${mediumRisk} em risco intermediário.`}
      />
      <KpiCard
        label="Total respondentes"
        value={totalRespondents}
        icon={Users}
        iconTone="brand"
        ariaLabel={`Total de respondentes: ${totalRespondents}`}
      />
    </section>
  );
}

// ─── Compliance overview ────────────────────────────────────────────────────

interface ComplianceBucket {
  key: "compliant" | "inProgress" | "pendingReview" | "noAssessment";
  label: string;
  value: number;
  colorClass: string; // tailwind bg-* utility for the bar segment
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
      colorClass: "bg-risk-low",
    },
    {
      key: "inProgress",
      label: "Em andamento",
      value: compliance.inProgress,
      colorClass: "bg-brand-light",
    },
    {
      key: "pendingReview",
      label: "Revisão pendente",
      value: compliance.pendingReview,
      colorClass: "bg-warning",
    },
    {
      key: "noAssessment",
      label: "Sem avaliação",
      value: compliance.noAssessment,
      colorClass: "bg-muted-foreground/40",
    },
  ];

  const total = buckets.reduce((acc, b) => acc + b.value, 0);
  const nonZero = buckets.filter((b) => b.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Conformidade NR-1</CardTitle>
        </div>
        <CardDescription>
          Distribuição do estado de conformidade das {totalCompanies} empresa
          {totalCompanies === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div
          className="h-3 w-full rounded-full overflow-hidden flex bg-muted"
          role="img"
          aria-label={`Conformidade: ${compliance.compliant} em conformidade, ${compliance.inProgress} em andamento, ${compliance.pendingReview} em revisão pendente, ${compliance.noAssessment} sem avaliação.`}
        >
          {total > 0 ? (
            nonZero.map((b) => (
              <div
                key={b.key}
                className={b.colorClass}
                style={{
                  width: `${(b.value / total) * 100}%`,
                }}
                title={`${b.label}: ${b.value}`}
              />
            ))
          ) : (
            <div className="w-full bg-muted" />
          )}
        </div>

        {/* Legend */}
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {buckets.map((b) => (
            <li key={b.key} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-sm ${b.colorClass}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-muted-foreground truncate">{b.label}</div>
                <div className="font-medium font-mono-numeric">{b.value}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Company card ───────────────────────────────────────────────────────────

function CompanyCard({
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
    <Card className="card-hover h-full overflow-hidden">
      {/* Status accent top border */}
      <div
        className="h-0.5 w-full"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {company.name}
          </CardTitle>
          <NrStatusBadge status={status} />
        </div>
        <CardDescription className="font-mono-numeric">
          {formatCnpj(company.cnpj)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{location}</span>
          </div>
        )}
        {company.cnaePrimary && (
          <div className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>CNAE: {company.cnaePrimary}</span>
          </div>
        )}
        {isCollecting && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Coleta em andamento</span>
              <span className="text-muted-foreground font-mono-numeric">—</span>
            </div>
            <Progress
              value={0}
              className="h-1.5"
              aria-label="Avaliação em coleta"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>
            {company.summary.departmentsCount} GHE
            {company.summary.departmentsCount !== 1 ? "s" : ""} ·{" "}
            {company.summary.assessmentsCount} aval.
            {company.summary.assessmentsCount !== 1 ? "ões" : "ão"}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Acessar
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Recent assessments feed ────────────────────────────────────────────────

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

function RecentAssessmentsFeed({
  items,
  onPick,
}: {
  items: RecentAssessmentItem[];
  onPick: (item: RecentAssessmentItem) => void;
}) {
  const top = items.slice(0, 5);
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Avaliações recentes</CardTitle>
        </div>
        <CardDescription>Últimos ciclos atualizados.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        {top.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhuma avaliação registrada.
          </div>
        ) : (
          <ScrollArea className="max-h-96 px-6 scroll-area">
            <ol className="space-y-1 py-2">
              {top.map((a) => {
                const Icon = assessmentStatusIcon(a.status);
                const statusLabel =
                  ASSESSMENT_STATUS_LABELS[a.status] ?? a.status;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => onPick(a)}
                      className="w-full text-left flex gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-accent/60 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-foreground/70" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="text-sm leading-snug">
                          <span className="font-medium truncate block">
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
      </CardContent>
    </Card>
  );
}

// ─── Dimension heatmap mini ────────────────────────────────────────────────

type HeatmapItem = ProfessionalDashboard["dimensionHeatmap"][number];

function riskBarClass(level: RiskLevel): string {
  switch (level) {
    case "HIGH":
      return "bg-risk-high";
    case "MEDIUM":
      return "bg-risk-medium";
    case "LOW":
    default:
      return "bg-risk-low";
  }
}

function DimensionHeatmapMini({ heatmap }: { heatmap: HeatmapItem[] }) {
  if (!heatmap || heatmap.length === 0) {
    return null;
  }
  const allZero = heatmap.every((d) => d.weightedAvgRiskScore === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">
            Risco médio por dimensão
          </CardTitle>
        </div>
        <CardDescription>
          Todos os ciclos concluídos — COPSOQ II-BR (D1–D11).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allZero ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sem dados de dimension ainda.
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
                            className={`w-full rounded-t-sm transition-all ${riskBarClass(
                              d.riskLevel,
                            )} group-hover:opacity-80`}
                            style={{ height: `${heightPct}%` }}
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
      </CardContent>
    </Card>
  );
}

// ─── Trend mini-chart (pure SVG) ────────────────────────────────────────────

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Avaliações por mês</CardTitle>
        </div>
        <CardDescription>Últimos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent>
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
                fill="var(--brand-light)"
                fillOpacity={0.15}
                stroke="none"
              />
              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke="var(--brand-light)"
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
      </CardContent>
    </Card>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold">Nenhuma empresa cadastrada</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione seu primeiro cliente para começar a gerenciar riscos
            psicossociais conforme a NR-1.
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Adicionar empresa
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PainelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Alerts skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-72 shrink-0" />
        ))}
      </div>
      {/* KPI row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      {/* Compliance skeleton */}
      <Skeleton className="h-32 w-full rounded-xl" />
      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 lg:col-span-1 rounded-xl" />
      </div>
      {/* Heatmap + trend skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}

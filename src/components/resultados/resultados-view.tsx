"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ClipboardList,
  ListChecks,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type {
  Assessment,
  CycleTrend,
  DashboardData,
  DimensionCode,
  DimensionResultDTO,
  RiskLevel,
} from "@/lib/types";
import {
  COPSOQ_DIMENSIONS,
  INVENTORY_TEMPLATES,
  getDimension,
} from "@/lib/copsoq-data";
import { RISK_LEVEL_LABELS } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Color helpers ──────────────────────────────────────────────────────────

function riskScoreBg(score: number): string {
  // Interpolate hue 120 (green) → 60 (yellow) → 0 (red) across 0..100.
  const h = score <= 50 ? 120 - (score / 50) * 60 : 60 - ((score - 50) / 50) * 60;
  return `hsl(${h}, 65%, 45%)`;
}

function riskScoreFg(score: number): string {
  return score > 50 ? "#ffffff" : "#1A2535";
}

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function chartColor(idx: number): string {
  return CHART_PALETTE[idx % CHART_PALETTE.length];
}

const DIM_SHORT_NAMES: Record<DimensionCode, string> = {
  D1: "Demandas",
  D2: "Influência",
  D3: "Significado",
  D4: "Valores",
  D5: "Liderança",
  D6: "Relações",
  D7: "Saúde",
  D8: "Burnout",
  D9: "Conflito T-F",
  D10: "Satisfação",
  D11: "Ofensivos",
};

function fmtShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yy", { locale: ptBR });
  } catch {
    return "—";
  }
}

// ─── DashboardKpis ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  accentClass: string;
  tintClass: string;
  borderClass: string;
  description?: string;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accentClass,
  tintClass,
  borderClass,
  description,
}: KpiCardProps) {
  return (
    <Card
      className={`card-hover py-4 overflow-hidden relative ${tintClass} ${borderClass}`}
      role="group"
      aria-label={`${label}: ${value}${description ? `. ${description}` : ""}`}
    >
      <CardContent className="flex items-start gap-3">
        <div
          className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center ${accentClass}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground leading-tight">
            {label}
          </div>
          <div className="text-2xl md:text-4xl font-semibold font-mono-numeric mt-1 leading-tight">
            {value}
          </div>
          {description ? (
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              {description}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardKpis({ kpis }: { kpis: DashboardData["kpis"] }) {
  return (
    <section
      aria-label="Indicadores-chave"
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
    >
      <KpiCard
        label="Adesão Global"
        value={`${kpis.globalAdesao.toFixed(0)}%`}
        icon={Users}
        accentClass="bg-brand-light/10 text-brand-light"
        tintClass="bg-gradient-to-br from-brand-light/5 to-transparent"
        borderClass="border-b-2 border-brand-light"
        description="Participação sobre o esperado"
      />
      <KpiCard
        label="GHEs Alto Risco"
        value={String(kpis.ghesHighRisk)}
        icon={ShieldAlert}
        accentClass="risk-high-bg"
        tintClass="bg-gradient-to-br from-risk-high/5 to-transparent"
        borderClass="border-b-2 border-risk-high"
        description="≥1 dimensão HIGH"
      />
      <KpiCard
        label="GHEs Médio Risco"
        value={String(kpis.ghesMediumRisk)}
        icon={ShieldAlert}
        accentClass="risk-medium-bg"
        tintClass="bg-gradient-to-br from-risk-medium/5 to-transparent"
        borderClass="border-b-2 border-risk-medium"
        description="≥1 dimensão MEDIUM"
      />
      <KpiCard
        label="GHEs Inelegíveis"
        value={String(kpis.ghesIneligible)}
        icon={Lock}
        accentClass="bg-muted text-muted-foreground"
        tintClass="bg-gradient-to-br from-muted/30 to-transparent"
        borderClass="border-b-2 border-muted-foreground/40"
        description="< 5 respostas"
      />
      <KpiCard
        label="Total Respondentes"
        value={String(kpis.totalRespondents)}
        icon={Activity}
        accentClass="bg-brand/10 text-brand"
        tintClass="bg-gradient-to-br from-brand/5 to-transparent"
        borderClass="border-b-2 border-brand"
        description="Trabalhadores que responderam"
      />
    </section>
  );
}

// ─── HeatMap ────────────────────────────────────────────────────────────────

function ScoreCell({
  dimName,
  gheName,
  dr,
}: {
  dimName: string;
  gheName: string;
  dr: DimensionResultDTO;
}) {
  const bg = riskScoreBg(dr.riskScore);
  const fg = riskScoreFg(dr.riskScore);
  const lowAlpha = dr.cronbachAlpha !== null && dr.cronbachAlpha < 0.5;
  const ariaLabel = `${dr.code} ${dimName} — GHE ${gheName}: risco ${dr.riskScore.toFixed(0)}, bruto ${dr.rawScore.toFixed(0)}, N=${dr.nResponses}${lowAlpha ? ". Baixa confiabilidade (α < 0.5)" : ""}`;
  const tooltipText = `${dimName} — ${gheName}: bruto ${dr.rawScore.toFixed(0)}, risco ${dr.riskScore.toFixed(0)}, N=${dr.nResponses}${lowAlpha ? " · Baixa confiabilidade (α < 0.5)" : ""}`;

  return (
    <td
      className="p-0 text-center align-middle border-r border-border/40"
      style={{ background: bg, color: fg }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="gridcell"
            aria-label={ariaLabel}
            className="flex items-center justify-center gap-1 px-2 py-2.5 min-w-[3rem] min-h-[2.5rem] cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span
              className="font-mono-numeric text-sm font-semibold"
              aria-hidden="true"
            >
              {dr.riskScore.toFixed(0)}
            </span>
            {lowAlpha ? (
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </td>
  );
}

function HeatRow({
  row,
}: {
  row: DashboardData["heatmap"][number];
}) {
  if (!row.isEligible || !row.dimensions) {
    return (
      <tr className="bg-muted/40 text-muted-foreground hover:bg-accent/30 transition-colors">
        <td className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium border-b border-r border-border/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.15)]">
          <div className="truncate max-w-[10rem]" title={row.deptName}>
            {row.deptName}
          </div>
          <div className="text-xs font-normal opacity-80 font-mono-numeric">
            N={row.nResponses}
          </div>
        </td>
        <td
          colSpan={COPSOQ_DIMENSIONS.length}
          className="px-3 py-2.5 text-center border-b border-border/60"
        >
          <div className="flex items-center justify-center gap-2 text-sm">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>&lt; 5 respostas — GHE inelegível (RB-03)</span>
          </div>
        </td>
      </tr>
    );
  }

  const dimMap = new Map(row.dimensions.map((d) => [d.code, d]));
  return (
    <tr className="border-b border-border/60 hover:bg-accent/30 transition-colors">
      <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium border-r border-b border-border/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.15)]">
        <div className="truncate max-w-[10rem]" title={row.deptName}>
          {row.deptName}
        </div>
        <div className="text-xs text-muted-foreground font-normal font-mono-numeric">
          N={row.nResponses}
        </div>
      </td>
      {COPSOQ_DIMENSIONS.map((d) => {
        const dr = dimMap.get(d.code);
        if (!dr) {
          return (
            <td
              key={d.code}
              className="px-2 py-2.5 text-center text-muted-foreground/50 border-r border-border/40"
            >
              —
            </td>
          );
        }
        return (
          <ScoreCell
            key={d.code}
            dimName={d.namePtBr}
            gheName={row.deptName}
            dr={dr}
          />
        );
      })}
    </tr>
  );
}

function HeatMap({ heatmap }: { heatmap: DashboardData["heatmap"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Mapa de calor — GHE × Dimensão
        </CardTitle>
        <CardDescription>
          Cores verde → amarelo → vermelho indicam risco crescente (0 a 100).
          GHEs com menos de 5 respostas são exibidas como inelegíveis (RB-03).
          Ícone <AlertTriangle className="inline h-3 w-3" aria-hidden="true" />{" "}
          indica baixa confiabilidade (α &lt; 0,5).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[28rem] overflow-auto scroll-area rounded-md border">
          <table className="w-full text-sm border-collapse" role="grid">
            <caption className="sr-only">
              Mapa de calor dos escores de risco por GHE (linha) e dimensão
              psicossocial D1 a D11 (coluna). GHEs inelegíveis apresentam menos
              de 5 respostas.
            </caption>
            <thead className="sticky top-0 z-20">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-30 bg-card px-3 py-2 text-left font-medium border-b border-r border-border/60 min-w-[10rem] shadow-[4px_0_8px_-4px_rgba(15,23,42,0.15)]"
                >
                  GHE
                </th>
                {COPSOQ_DIMENSIONS.map((d) => (
                  <th
                    key={d.code}
                    scope="col"
                    className="px-2 py-2 text-center font-medium border-b border-border/60 min-w-[3.5rem]"
                  >
                    <div className="font-mono-numeric text-xs">{d.code}</div>
                    <div className="text-[10px] text-muted-foreground font-normal leading-tight">
                      {DIM_SHORT_NAMES[d.code]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row) => (
                <HeatRow key={row.deptId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Escala de risco:</span>
          <div className="flex flex-col gap-0.5">
            <div
              className="h-3 w-40 sm:w-48 rounded-sm border border-border/40"
              style={{
                background:
                  "linear-gradient(to right, hsl(120,65%,45%), hsl(60,65%,45%), hsl(0,65%,45%))",
              }}
              aria-hidden="true"
            />
            <div className="flex justify-between w-40 sm:w-48 text-[10px] font-mono-numeric">
              <span>0</span>
              <span>33</span>
              <span>66</span>
              <span>100</span>
            </div>
          </div>
          <span className="hidden md:inline text-muted-foreground/80">
            verde: favorável · amarelo: intermediário · vermelho: desfavorável
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CompanyAvgBars ─────────────────────────────────────────────────────────

function CompanyAvgBars({
  companyAvg,
}: {
  companyAvg: DashboardData["companyAvg"];
}) {
  const sorted = useMemo(
    () =>
      [...companyAvg].sort(
        (a, b) => b.weightedAvgRiskScore - a.weightedAvgRiskScore
      ),
    [companyAvg]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Média da empresa por dimensão
        </CardTitle>
        <CardDescription>
          Escore médio ponderado por número de respondentes em GHEs elegíveis.
          Ordenado decrescente. Linhas de referência em 33 (médio) e 66 (alto).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          <div className="grid grid-cols-[8rem_1fr_2.5rem_1.5rem] sm:grid-cols-[14rem_1fr_3rem_2rem] items-center gap-2 sm:gap-3">
            <div />
            <div className="relative h-3 text-[10px] font-mono-numeric">
              <span
                className="absolute -translate-x-1/2 text-risk-medium font-semibold"
                style={{ left: "33%" }}
              >
                33
              </span>
              <span
                className="absolute -translate-x-1/2 text-risk-high font-semibold"
                style={{ left: "66%" }}
              >
                66
              </span>
            </div>
            <div />
            <div />
          </div>
          {sorted.map((item) => {
            const dim = getDimension(item.code);
            const bg =
              item.riskLevel === "HIGH"
                ? "var(--risk-high)"
                : item.riskLevel === "MEDIUM"
                ? "var(--risk-medium)"
                : "var(--risk-low)";
            const width = Math.max(2, Math.min(100, item.weightedAvgRiskScore));
            const ariaLabel = `${item.code} ${dim.namePtBr}: risco ${item.weightedAvgRiskScore.toFixed(0)} de 100, classificação ${RISK_LEVEL_LABELS[item.riskLevel]}`;
            const RiskIcon =
              item.riskLevel === "HIGH"
                ? AlertTriangle
                : item.riskLevel === "MEDIUM"
                ? AlertCircle
                : ShieldCheck;
            const riskIconClass =
              item.riskLevel === "HIGH"
                ? "text-risk-high"
                : item.riskLevel === "MEDIUM"
                ? "text-risk-medium"
                : "text-risk-low";
            return (
              <div
                key={item.code}
                className="grid grid-cols-[8rem_1fr_2.5rem_1.5rem] sm:grid-cols-[14rem_1fr_3rem_2rem] items-center gap-2 sm:gap-3"
              >
                <div
                  className="text-sm flex items-center gap-1.5 min-w-0"
                  title={`${item.code} — ${dim.namePtBr}`}
                >
                  <Badge
                    variant="outline"
                    className="font-mono-numeric text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {item.code}
                  </Badge>
                  <span className="text-foreground truncate min-w-0">
                    {dim.namePtBr}
                  </span>
                </div>
                <div
                  className="relative h-7 rounded-md bg-muted overflow-hidden"
                  role="img"
                  aria-label={ariaLabel}
                >
                  <div
                    className="absolute inset-y-0 z-10"
                    style={{
                      left: "33%",
                      borderLeft: "2px dashed var(--risk-medium)",
                      opacity: 0.7,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute inset-y-0 z-10"
                    style={{
                      left: "66%",
                      borderLeft: "2px dashed var(--risk-high)",
                      opacity: 0.7,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{ width: `${width}%`, backgroundColor: bg }}
                  />
                </div>
                <div className="text-right font-mono-numeric text-sm font-semibold">
                  {item.weightedAvgRiskScore.toFixed(0)}
                </div>
                <div className="flex justify-center" aria-hidden="true">
                  <RiskIcon className={`h-4 w-4 ${riskIconClass}`} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: "var(--risk-low)" }}
              aria-hidden="true"
            />
            {RISK_LEVEL_LABELS.LOW}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: "var(--risk-medium)" }}
              aria-hidden="true"
            />
            {RISK_LEVEL_LABELS.MEDIUM}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: "var(--risk-high)" }}
              aria-hidden="true"
            />
            {RISK_LEVEL_LABELS.HIGH}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-block w-px h-3 bg-foreground/40"
              aria-hidden="true"
            />
            <span>refs. 33 / 66</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CriticalDimensionsTable ────────────────────────────────────────────────

function CriticalDimensionsTable({
  critical,
  heatmap,
}: {
  critical: DashboardData["criticalDimensions"];
  heatmap: DashboardData["heatmap"];
}) {
  const go = useView((s) => s.go);
  const assessmentId = useView((s) => s.assessmentId);
  const setActionItemPrefill = useView((s) => s.setActionItemPrefill);
  const setInventoryPrefill = useView((s) => s.setInventoryPrefill);

  const deptNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of heatmap) m.set(row.deptId, row.deptName);
    return m;
  }, [heatmap]);

  const sorted = useMemo(
    () => [...critical].sort((a, b) => b.avgRiskScore - a.avgRiskScore),
    [critical]
  );

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            Dimensões críticas
          </CardTitle>
          <CardDescription>
            Dimensões com classificação HIGH na média da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
            <div className="h-12 w-12 rounded-full bg-risk-low/15 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-risk-low" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Nenhuma dimensão com risco alto (HIGH) na média da empresa.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleInventory = (code: DimensionCode) => {
    if (!assessmentId) return;
    const mteFactorCode = INVENTORY_TEMPLATES[code].mteFactorCode;
    setInventoryPrefill({ mteFactorCode });
    go("inventario", { assessmentId });
  };

  const handleAction = (code: DimensionCode) => {
    if (!assessmentId) return;
    setActionItemPrefill({ dimensionCode: code, riskLevelTrigger: "HIGH" });
    go("plano", { assessmentId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-risk-high" />
          Dimensões críticas
        </CardTitle>
        <CardDescription>
          Dimensões com classificação HIGH na média da empresa. Priorize a
          elaboração de inventário de fatores de risco e ações de melhoria das
          condições de trabalho.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-2 rounded-md border border-risk-high/30 bg-risk-high/5 px-3 py-2 text-sm">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-risk-high"
            aria-hidden="true"
          />
          <span className="font-medium text-risk-high">
            Atenção: dimensões críticas identificadas
          </span>
          <span className="text-muted-foreground hidden sm:inline">
            — priorize a elaboração de inventário e plano de ação.
          </span>
        </div>
        <div className="max-h-[28rem] overflow-y-auto scroll-area rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>GHEs afetados</TableHead>
                <TableHead className="text-right">Escore médio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const dim = getDimension(c.code);
                return (
                  <TableRow key={c.code}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono-numeric">
                        {c.code} · {dim.groupName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {c.affectedDepts.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <>
                            {c.affectedDepts.slice(0, 5).map((deptId) => (
                              <button
                                key={deptId}
                                type="button"
                                onClick={() => handleInventory(c.code)}
                                className="inline-flex items-center text-[10px] px-1.5 h-5 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Abrir inventário de riscos para a dimensão ${c.code} (${c.name})`}
                              >
                                {deptNameMap.get(deptId) ?? deptId.slice(0, 8)}
                              </button>
                            ))}
                            {c.affectedDepts.length > 5 ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                +{c.affectedDepts.length - 5}
                              </Badge>
                            ) : null}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="risk-high-bg inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded font-mono-numeric font-semibold text-sm">
                        {c.avgRiskScore.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInventory(c.code)}
                          aria-label={`Ir para o inventário de riscos com fator ${INVENTORY_TEMPLATES[c.code].mteFactorCode} pré-preenchido (${c.name})`}
                        >
                          <ListChecks className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Inventário</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(c.code)}
                          aria-label={`Ir para o plano de ação com dimensão ${c.code} pré-preenchida`}
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ação</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DimensionRadar ─────────────────────────────────────────────────────────

function DimensionRadar({
  companyAvg,
}: {
  companyAvg: DashboardData["companyAvg"];
}) {
  const CX = 200;
  const CY = 200;
  const R_MAX = 150;
  const N = COPSOQ_DIMENSIONS.length;

  const scoreMap = useMemo(() => {
    const m = new Map<
      DimensionCode,
      { score: number; riskLevel: RiskLevel }
    >();
    for (const item of companyAvg) {
      m.set(item.code, {
        score: item.weightedAvgRiskScore,
        riskLevel: item.riskLevel,
      });
    }
    return m;
  }, [companyAvg]);

  const angleAt = (i: number) => ((-90 + (i * 360) / N) * Math.PI) / 180;
  const pointFor = (i: number, score: number) => ({
    x: CX + R_MAX * (score / 100) * Math.cos(angleAt(i)),
    y: CY + R_MAX * (score / 100) * Math.sin(angleAt(i)),
  });

  const points = COPSOQ_DIMENSIONS.map((d, i) => {
    const entry = scoreMap.get(d.code);
    const score = entry?.score ?? 0;
    const riskLevel = entry?.riskLevel ?? "LOW";
    return { dim: d, i, score, riskLevel, ...pointFor(i, score) };
  });

  const polygonPoints = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const rings = [25, 50, 75, 100];
  const labelR = R_MAX + 18;

  const dotColor = (level: RiskLevel) =>
    level === "HIGH"
      ? "var(--risk-high)"
      : level === "MEDIUM"
      ? "var(--risk-medium)"
      : "var(--risk-low)";

  const ariaSummary =
    `Perfil psicossocial da empresa — radar de 11 dimensões COPSOQ II-BR ` +
    `(média ponderada entre GHEs elegíveis). ${points
      .map(
        (p) =>
          `${p.dim.code} ${p.dim.namePtBr}: ${p.score.toFixed(0)} (${
            RISK_LEVEL_LABELS[p.riskLevel]
          })`
      )
      .join("; ")}.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Perfil psicossocial da empresa
        </CardTitle>
        <CardDescription>
          Distribuição do risco médio por dimensão COPSOQ II-BR (média ponderada
          entre GHEs elegíveis).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox="0 0 400 400"
          className="w-full h-auto max-w-lg mx-auto"
          role="img"
          aria-label={ariaSummary}
        >
          {/* Concentric reference rings */}
          {rings.map((r) => {
            const ringPts = COPSOQ_DIMENSIONS.map((_, i) => {
              const x = CX + R_MAX * (r / 100) * Math.cos(angleAt(i));
              const y = CY + R_MAX * (r / 100) * Math.sin(angleAt(i));
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");
            return (
              <polygon
                key={r}
                points={ringPts}
                fill="none"
                stroke="var(--border)"
                strokeWidth={0.5}
                opacity={0.7}
              />
            );
          })}

          {/* Axis lines from center to outer edge */}
          {COPSOQ_DIMENSIONS.map((d, i) => {
            const end = pointFor(i, 100);
            return (
              <line
                key={d.code}
                x1={CX}
                y1={CY}
                x2={end.x}
                y2={end.y}
                stroke="var(--border)"
                strokeWidth={0.5}
                opacity={0.7}
              />
            );
          })}

          {/* Ring scale labels along the top axis */}
          {rings.map((r) => {
            const y = CY - R_MAX * (r / 100);
            return (
              <text
                key={r}
                x={CX + 4}
                y={y + 3}
                fontSize="9"
                fill="var(--muted-foreground)"
                className="font-mono-numeric"
              >
                {r}
              </text>
            );
          })}

          {/* Axis labels (D1..D11) at outer edge */}
          {COPSOQ_DIMENSIONS.map((d, i) => {
            const x = CX + labelR * Math.cos(angleAt(i));
            const y = CY + labelR * Math.sin(angleAt(i));
            return (
              <text
                key={d.code}
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--muted-foreground)"
                className="font-mono-numeric"
              >
                {d.code}
              </text>
            );
          })}

          {/* Filled polygon — company risk profile */}
          <polygon
            points={polygonPoints}
            fill="var(--brand)"
            fillOpacity={0.3}
            stroke="var(--brand)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Vertex dots colored by dimension risk level */}
          {points.map((p) => (
            <circle
              key={p.dim.code}
              cx={p.x}
              cy={p.y}
              r={4.5}
              fill={dotColor(p.riskLevel)}
              stroke="var(--card)"
              strokeWidth={1.5}
            >
              <title>{`${p.dim.code} ${p.dim.namePtBr}: risco ${p.score.toFixed(0)} de 100 (${RISK_LEVEL_LABELS[p.riskLevel]})`}</title>
            </circle>
          ))}

          {/* Center marker */}
          <circle
            cx={CX}
            cy={CY}
            r={1.5}
            fill="var(--muted-foreground)"
            opacity={0.5}
          />
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--risk-low)" }}
              aria-hidden="true"
            />
            {RISK_LEVEL_LABELS.LOW}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--risk-medium)" }}
              aria-hidden="true"
            />
            {RISK_LEVEL_LABELS.MEDIUM}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--risk-high)" }}
              aria-hidden="true"
            />
            {RISK_LEVEL_LABELS.HIGH}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-2 rounded-sm"
              style={{ backgroundColor: "var(--brand)", opacity: 0.3 }}
              aria-hidden="true"
            />
            <span>Perfil da empresa</span>
          </div>
        </div>

        {/* sr-only data table alternative */}
        <div className="sr-only">
          <table>
            <caption>
              Tabela alternativa ao radar: escore de risco médio ponderado por
              dimensão COPSOQ II-BR.
            </caption>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Dimensão</th>
                <th scope="col">Grupo</th>
                <th scope="col">Escore (0–100)</th>
                <th scope="col">Classificação</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.dim.code}>
                  <th scope="row">{p.dim.code}</th>
                  <td>{p.dim.namePtBr}</td>
                  <td>{p.dim.groupName}</td>
                  <td>{p.score.toFixed(0)}</td>
                  <td>{RISK_LEVEL_LABELS[p.riskLevel]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DimensionDetailCards ───────────────────────────────────────────────────

function DimensionDetailCards({
  companyAvg,
}: {
  companyAvg: DashboardData["companyAvg"];
}) {
  const scoreMap = useMemo(() => {
    const m = new Map<
      DimensionCode,
      { score: number; riskLevel: RiskLevel }
    >();
    for (const item of companyAvg) {
      m.set(item.code, {
        score: item.weightedAvgRiskScore,
        riskLevel: item.riskLevel,
      });
    }
    return m;
  }, [companyAvg]);

  const riskColor = (level: RiskLevel) =>
    level === "HIGH"
      ? "var(--risk-high)"
      : level === "MEDIUM"
      ? "var(--risk-medium)"
      : "var(--risk-low)";

  const riskTextClass = (level: RiskLevel) =>
    level === "HIGH"
      ? "text-risk-high"
      : level === "MEDIUM"
      ? "text-risk-medium"
      : "text-risk-low";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Detalhamento por dimensão
        </CardTitle>
        <CardDescription>
          Visão analítica das 11 dimensões psicossociais avaliadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {COPSOQ_DIMENSIONS.map((d) => {
            const entry = scoreMap.get(d.code);
            const score = entry?.score ?? 0;
            const level = entry?.riskLevel ?? "LOW";
            const width = Math.max(2, Math.min(100, score));
            return (
              <div
                key={d.code}
                className="rounded-lg border border-border/60 bg-card p-4 card-hover relative overflow-hidden min-h-[10rem]"
                aria-label={`${d.code} ${d.namePtBr}: risco ${score.toFixed(0)} de 100, classificação ${RISK_LEVEL_LABELS[level]}, grupo ${d.groupName}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant="outline"
                    className="font-mono-numeric text-xs px-2"
                  >
                    {d.code}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: riskColor(level) }}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {RISK_LEVEL_LABELS[level]}
                    </span>
                  </div>
                </div>

                <div
                  className="text-sm font-medium text-foreground leading-snug mb-2 min-h-[2.5rem]"
                  title={d.namePtBr}
                >
                  {d.namePtBr}
                </div>

                <div
                  className={`font-mono-numeric text-3xl font-semibold leading-none mb-1 ${riskTextClass(level)}`}
                >
                  {score.toFixed(0)}
                  <span className="text-sm text-muted-foreground font-normal ml-1">
                    /100
                  </span>
                </div>

                <div
                  className="text-[11px] text-muted-foreground mb-2 truncate"
                  title={d.groupName}
                >
                  {d.groupName}
                </div>

                <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
                  {d.mteFactorsCovered.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic">
                      Sem fator MTE direto
                    </span>
                  ) : (
                    d.mteFactorsCovered.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center text-[10px] font-mono-numeric px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground"
                      >
                        {f}
                      </span>
                    ))
                  )}
                </div>

                <div
                  className="absolute bottom-0 left-0 h-1"
                  style={{
                    width: `${width}%`,
                    backgroundColor: riskColor(level),
                  }}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CycleComparisonChart ───────────────────────────────────────────────────

function CycleComparisonChart({ trend }: { trend: CycleTrend[] | null | undefined }) {
  const cycles = useMemo(
    () =>
      [...(trend ?? [])].sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      ),
    [trend]
  );

  if (cycles.length < 2) {
    const message =
      cycles.length === 0
        ? "Nenhum ciclo concluído para esta empresa. Conclua uma avaliação para visualizar a evolução temporal."
        : "Apenas 1 ciclo concluído. Conclua mais avaliações para visualizar a evolução temporal.";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Evolução temporal
          </CardTitle>
          <CardDescription>
            Comparação de ciclos de avaliação concluídos por dimensão
            psicossocial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md">{message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Chart geometry
  const W = 800;
  const H = 400;
  const M = { top: 20, right: 24, bottom: 48, left: 44 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const xStep = plotW / (cycles.length - 1);
  const yScale = (score: number) => M.top + plotH - (score / 100) * plotH;
  const xScale = (i: number) => M.left + i * xStep;

  const lines = COPSOQ_DIMENSIONS.map((d, idx) => {
    const scores: (number | null)[] = cycles.map((c) => {
      const dim = c.dimensions.find((x) => x.code === d.code);
      return dim ? dim.avgRiskScore : null;
    });
    const svgPoints = scores
      .map((s, i) =>
        s === null
          ? null
          : {
              x: xScale(i),
              y: yScale(s),
              score: s,
            }
      )
      .filter((p): p is { x: number; y: number; score: number } => p !== null);
    return {
      code: d.code,
      name: d.namePtBr,
      color: chartColor(idx),
      scores,
      svgPoints,
    };
  });

  const yTicks = [0, 25, 50, 75, 100];
  const refLines = [33, 66];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          Evolução temporal por dimensão
        </CardTitle>
        <CardDescription>
          Escore médio de risco (0–100) por dimensão psicossocial ao longo dos
          ciclos de avaliação concluídos. Linhas tracejadas marcam os limiares
          de risco médio (33) e alto (66).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scroll-area">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto min-w-[36rem]"
            role="img"
            aria-label={`Gráfico de evolução temporal: ${cycles.length} ciclos concluídos (${cycles
              .map((c) => fmtShortDate(c.completedAt))
              .join(", ")}), ${lines.length} dimensões psicossociais. Eixo Y: escore de risco 0 a 100.`}
          >
            {/* Y-axis */}
            <line
              x1={M.left}
              y1={M.top}
              x2={M.left}
              y2={M.top + plotH}
              stroke="var(--border)"
              strokeWidth={1}
            />
            {/* X-axis */}
            <line
              x1={M.left}
              y1={M.top + plotH}
              x2={M.left + plotW}
              y2={M.top + plotH}
              stroke="var(--border)"
              strokeWidth={1}
            />

            {/* Y-axis grid + ticks */}
            {yTicks.map((t) => {
              const y = yScale(t);
              return (
                <g key={t}>
                  <line
                    x1={M.left}
                    y1={y}
                    x2={M.left + plotW}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    strokeDasharray="2 4"
                    opacity={0.6}
                  />
                  <text
                    x={M.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--muted-foreground)"
                    className="font-mono-numeric"
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* Reference lines at 33 and 66 */}
            {refLines.map((r) => {
              const y = yScale(r);
              return (
                <g key={r}>
                  <line
                    x1={M.left}
                    y1={y}
                    x2={M.left + plotW}
                    y2={y}
                    stroke="var(--risk-medium)"
                    strokeWidth={1}
                    strokeDasharray="6 3"
                    opacity={0.5}
                  />
                  <text
                    x={M.left + plotW - 4}
                    y={y - 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="var(--risk-medium)"
                    className="font-mono-numeric"
                  >
                    {r}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels (cycle dates) */}
            {cycles.map((c, i) => (
              <text
                key={c.assessmentId}
                x={xScale(i)}
                y={M.top + plotH + 16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted-foreground)"
                className="font-mono-numeric"
              >
                {fmtShortDate(c.completedAt)}
              </text>
            ))}

            {/* Lines per dimension */}
            {lines.map((line) => {
              if (line.svgPoints.length < 2) return null;
              const path = line.svgPoints
                .map((p, i) =>
                  `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
                )
                .join(" ");
              return (
                <g key={line.code}>
                  <path
                    d={path}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {line.svgPoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={3}
                      fill={line.color}
                      stroke="var(--card)"
                      strokeWidth={1}
                    />
                  ))}
                </g>
              );
            })}

            {/* Y-axis title */}
            <text
              x={M.left - 30}
              y={M.top + plotH / 2}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
              transform={`rotate(-90, ${M.left - 30}, ${M.top + plotH / 2})`}
            >
              Risco (0–100)
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
          {lines.map((line) => (
            <div
              key={line.code}
              className="flex items-center gap-2 text-xs min-w-0"
            >
              <span
                className="inline-block w-3 h-0.5 shrink-0"
                style={{ backgroundColor: line.color }}
                aria-hidden="true"
              />
              <span className="font-mono-numeric text-muted-foreground shrink-0">
                {line.code}
              </span>
              <span className="truncate" title={line.name}>
                {line.name}
              </span>
            </div>
          ))}
        </div>

        {/* sr-only data table alternative */}
        <div className="sr-only">
          <table>
            <caption>
              Tabela alternativa ao gráfico: escore de risco por dimensão e
              ciclo.
            </caption>
            <thead>
              <tr>
                <th scope="col">Dimensão</th>
                {cycles.map((c) => (
                  <th key={c.assessmentId} scope="col">
                    {fmtShortDate(c.completedAt)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.code}>
                  <th scope="row">
                    {line.code} {line.name}
                  </th>
                  {line.scores.map((s, i) => (
                    <td key={i}>{s === null ? "—" : s.toFixed(0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function ResultadosSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
      <Skeleton className="h-64" />
      <Skeleton className="h-72" />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ResultadosView() {
  const go = useView((s) => s.go);
  const assessmentId = useView((s) => s.assessmentId);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<CycleTrend[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notCompleted, setNotCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!assessmentId) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setNotCompleted(false);
      try {
        const a = await api.assessments.get(assessmentId);
        if (cancelled) return;
        setAssessment(a);

        if (a.status !== "completed") {
          setNotCompleted(true);
          setDashboard(null);
          setTrend(null);
          setLoading(false);
          return;
        }

        const [d, t] = await Promise.all([
          api.assessments.dashboard(assessmentId),
          a.companyId
            ? api.assessments.trend(a.companyId).catch(
                () => [] as CycleTrend[]
              )
            : Promise.resolve([] as CycleTrend[]),
        ]);
        if (cancelled) return;
        setDashboard(d);
        setTrend(t);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === "ASSESSMENT_NOT_COMPLETED") {
          setNotCompleted(true);
          setDashboard(null);
          setTrend(null);
          setLoading(false);
          return;
        }
        const msg =
          e instanceof ApiError
            ? e.message
            : "Erro inesperado ao carregar os resultados.";
        setError(msg);
        setDashboard(null);
        setTrend(null);
        setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [assessmentId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Empty state: no assessment selected.
  if (!assessmentId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Nenhuma avaliação selecionada</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Acesse uma avaliação concluída para visualizar os resultados
                consolidados.
              </p>
            </div>
            <Button onClick={() => go("painel")}>
              <ChevronLeft className="h-4 w-4" />
              Voltar ao painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtitle = loading
    ? "Carregando…"
    : assessment
    ? assessment.title
    : error
    ? "Resultado"
    : "—";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      <TooltipProvider delayDuration={200}>
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-start gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => go("avaliacao", { assessmentId })}
              aria-label="Voltar à avaliação"
              className="shrink-0 -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Resultados</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                Linguagem não-clínica: usa &ldquo;fator de risco&rdquo;,
                &ldquo;dimensão psicossocial&rdquo; e &ldquo;condições de
                trabalho&rdquo; (nunca &ldquo;diagnóstico&rdquo;,
                &ldquo;transtorno&rdquo; ou &ldquo;doença&rdquo;).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
        </header>

        {error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  Não foi possível carregar os resultados
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">{error}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => go("avaliacao", { assessmentId })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar à avaliação
                </Button>
                <Button onClick={refresh}>
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : notCompleted ? (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-4">
              <div className="h-12 w-12 rounded-full bg-warning/15 flex items-center justify-center">
                <Lock className="h-6 w-6 text-warning" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Avaliação não concluída</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Esta avaliação ainda não foi concluída. Encerre a coleta para
                  visualizar os resultados.
                </p>
              </div>
              <Button onClick={() => go("avaliacao", { assessmentId })}>
                <ChevronLeft className="h-4 w-4" />
                Voltar à avaliação
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <ResultadosSkeleton />
        ) : dashboard ? (
          <div className="space-y-6">
            <DashboardKpis kpis={dashboard.kpis} />
            <HeatMap heatmap={dashboard.heatmap} />
            <CompanyAvgBars companyAvg={dashboard.companyAvg} />
            <DimensionRadar companyAvg={dashboard.companyAvg} />
            <CriticalDimensionsTable
              critical={dashboard.criticalDimensions}
              heatmap={dashboard.heatmap}
            />
            <DimensionDetailCards companyAvg={dashboard.companyAvg} />
            <CycleComparisonChart trend={trend ?? []} />
          </div>
        ) : null}
      </TooltipProvider>
    </div>
  );
}

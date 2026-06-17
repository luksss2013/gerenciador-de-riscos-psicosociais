"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type { CompanyBreakdown, DimensionCode, RiskLevel } from "@/lib/types";
import { COPSOQ_DIMENSIONS, getDimension } from "@/lib/copsoq-data";
import { ASSESSMENT_STATUS_LABELS, RISK_LEVEL_LABELS } from "@/lib/errors";
import { formatCnpj } from "@/lib/cnpj";

import { Button } from "@/components/ui/button";
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

// ─── Color helpers (muted sage → ochre → clay ramp) ──────────────────────────

function riskScoreBg(score: number): string {
  // Interpolate hue 120° (sage) → 45° (ochre) → 10° (clay) across 0..100.
  // Lower saturation (~45%) and ~48% lightness for the muted ramp.
  const clamped = Math.max(0, Math.min(100, score));
  const h =
    clamped <= 50
      ? 120 - (clamped / 50) * 75 // 120 → 45 (sage → ochre)
      : 45 - ((clamped - 50) / 50) * 35; // 45 → 10 (ochre → clay)
  return `hsl(${h}, 45%, 48%)`;
}

function riskScoreFg(score: number): string {
  // Warm paper on the darker clay end, warm ink on the lighter sage end.
  return score > 55 ? "#FAF8F4" : "#2A2620";
}

function riskBg(level: RiskLevel): string {
  return level === "HIGH"
    ? "risk-high-bg"
    : level === "MEDIUM"
    ? "risk-medium-bg"
    : "risk-low-bg";
}

function riskText(level: RiskLevel): string {
  return level === "HIGH"
    ? "text-risk-high"
    : level === "MEDIUM"
    ? "text-risk-medium"
    : "text-risk-low";
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

// ─── Stat strip (replaces gradient-tinted KPI cards) ────────────────────────

function SummaryKpis({ data }: { data: CompanyBreakdown[] }) {
  const highRisk = data.filter((c) => c.overallRiskLevel === "HIGH").length;
  const mediumRisk = data.filter((c) => c.overallRiskLevel === "MEDIUM").length;
  const atRiskGhesTotal = data.reduce((s, c) => s + c.atRiskGhes, 0);

  const stats: {
    value: number;
    label: string;
    secondary?: string;
    ariaLabel: string;
  }[] = [
    {
      value: data.length,
      label: "Total de empresas",
      secondary: "Clientes ativos",
      ariaLabel: `Total de empresas: ${data.length}. Clientes ativos sob sua gestão.`,
    },
    {
      value: highRisk,
      label: "Em risco alto",
      secondary: "overallRiskLevel = HIGH",
      ariaLabel: `Empresas em risco alto: ${highRisk}.`,
    },
    {
      value: mediumRisk,
      label: "Em risco intermediário",
      secondary: "overallRiskLevel = MEDIUM",
      ariaLabel: `Empresas em risco intermediário: ${mediumRisk}.`,
    },
    {
      value: atRiskGhesTotal,
      label: "GHEs em risco",
      secondary: "≥1 dimensão HIGH",
      ariaLabel: `GHEs em risco: ${atRiskGhesTotal}. GHEs elegíveis com ao menos uma dimensão HIGH.`,
    },
  ];

  return (
    <section
      aria-label="Indicadores-chave"
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
              <div className="text-[11px] text-muted-foreground/80 mt-1">
                {s.secondary}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Heatmap table (companies × D1..D11 + Geral) — no Card wrapper ──────────

function HeatmapTable({ data }: { data: CompanyBreakdown[] }) {
  const go = useView((s) => s.go);

  return (
    <section aria-label="Mapa de calor por dimensão">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Mapa de calor — Empresa × Dimensão
        </h2>
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Escore médio ponderado (0 a 100) por dimensão COPSOQ II-BR para cada
        cliente. Clique em uma linha para acessar o detalhe da empresa.
      </p>

      <div className="max-h-[32rem] overflow-auto scroll-area rounded-md border border-border">
        <table className="w-full text-sm border-collapse" role="grid">
          <caption className="sr-only">
            Mapa de calor dos escores médios ponderados de risco por empresa
            (linha) e dimensão psicossocial D1 a D11 (coluna). A última
            coluna apresenta o escore geral da empresa.
          </caption>
          <thead className="sticky top-0 z-20">
            <TableRow>
              <TableHead
                scope="col"
                className="sticky left-0 z-30 bg-card px-3 py-3 text-left font-medium border-b border-r border-border min-w-[12rem] shadow-[4px_0_8px_-4px_rgba(15,23,42,0.15)]"
              >
                Empresa
              </TableHead>
              {COPSOQ_DIMENSIONS.map((d) => (
                <TableHead
                  key={d.code}
                  scope="col"
                  className="px-2 py-3 text-center font-medium border-b border-border min-w-[3.5rem]"
                >
                  <div className="font-mono-numeric text-xs">{d.code}</div>
                  <div className="text-[10px] text-muted-foreground font-normal leading-tight">
                    {DIM_SHORT_NAMES[d.code]}
                  </div>
                </TableHead>
              ))}
              <TableHead
                scope="col"
                className="px-3 py-3 text-center font-medium border-b border-border min-w-[4rem] sticky right-0 z-30 bg-card shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.15)]"
              >
                Geral
              </TableHead>
            </TableRow>
          </thead>
          <TableBody>
            {data.map((c) => {
              const dimMap = new Map(
                c.dimensions.map((d) => [d.code, d])
              );
              return (
                <TableRow
                  key={c.companyId}
                  className="border-b border-border hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  onClick={() => go("empresa", { companyId: c.companyId })}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      go("empresa", { companyId: c.companyId });
                    }
                  }}
                >
                  <TableCell className="sticky left-0 z-10 bg-card px-3 py-3 font-medium border-r border-b border-border shadow-[4px_0_8px_-4px_rgba(15,23,42,0.15)]">
                    <div
                      className="truncate max-w-[12rem]"
                      title={c.companyName}
                    >
                      {c.companyName}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal font-mono-numeric">
                      {formatCnpj(c.cnpj)}
                    </div>
                  </TableCell>
                  {COPSOQ_DIMENSIONS.map((d) => {
                    const dr = dimMap.get(d.code);
                    const score = dr?.weightedAvgRiskScore ?? 0;
                    const bg = riskScoreBg(score);
                    const fg = riskScoreFg(score);
                    const level =
                      dr?.riskLevel ?? ("LOW" as RiskLevel);
                    const ariaLabel = `${c.companyName} — ${d.code} ${d.namePtBr}: risco ${score.toFixed(0)}, nível ${RISK_LEVEL_LABELS[level]}`;
                    const tooltipText = `${d.namePtBr} — ${c.companyName}: ${score.toFixed(0)} (${RISK_LEVEL_LABELS[level]})`;
                    return (
                      <TableCell
                        key={d.code}
                        className="p-0 text-center align-middle border-r border-border"
                        style={{ background: bg, color: fg }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              tabIndex={0}
                              role="gridcell"
                              aria-label={ariaLabel}
                              className="flex items-center justify-center px-2 py-2.5 min-w-[3rem] min-h-[2.5rem] cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <span
                                className="font-mono-numeric text-sm font-semibold"
                                aria-hidden="true"
                              >
                                {score.toFixed(0)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{tooltipText}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                  <TableCell className="sticky right-0 z-10 bg-card px-3 py-3 text-center border-l border-b border-border shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.15)]">
                    <div
                      className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-md ${riskBg(
                        c.overallRiskLevel
                      )}`}
                      role="gridcell"
                      aria-label={`${c.companyName} — Geral: ${c.overallRiskScore.toFixed(
                        0
                      )}, nível ${RISK_LEVEL_LABELS[c.overallRiskLevel]}`}
                    >
                      <span className="font-mono-numeric text-sm font-semibold leading-none">
                        {c.overallRiskScore.toFixed(0)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wide opacity-80 leading-none">
                        {RISK_LEVEL_LABELS[c.overallRiskLevel]}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>

      {/* Legend with muted sage → ochre → clay ramp */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">Escala de risco:</span>
        <div className="flex flex-col gap-0.5">
          <div
            className="h-3 w-40 sm:w-48 rounded-sm border border-border"
            style={{
              background:
                "linear-gradient(to right, hsl(120,45%,48%), hsl(45,45%,48%), hsl(10,45%,48%))",
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
    </section>
  );
}

// ─── Risk distribution chart (horizontal bars) — no Card wrapper ────────────

function RiskDistributionChart({ data }: { data: CompanyBreakdown[] }) {
  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => b.overallRiskScore - a.overallRiskScore
      ),
    [data]
  );

  return (
    <section aria-label="Distribuição de risco geral">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Distribuição de risco geral
        </h2>
        <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Escore geral (0–100) por empresa, ordenado decrescente. Linhas de
        referência em 33 (médio) e 66 (alto).
      </p>

      {sorted.length === 0 ? null : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-[8rem_1fr_2.5rem] sm:grid-cols-[16rem_1fr_3rem] items-center gap-2 sm:gap-3">
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
          </div>
          {sorted.map((c) => {
            const bg =
              c.overallRiskLevel === "HIGH"
                ? "var(--risk-high)"
                : c.overallRiskLevel === "MEDIUM"
                ? "var(--risk-medium)"
                : "var(--risk-low)";
            const width = Math.max(
              2,
              Math.min(100, c.overallRiskScore)
            );
            const ariaLabel = `${c.companyName}: risco geral ${c.overallRiskScore.toFixed(
              0
            )} de 100, classificação ${RISK_LEVEL_LABELS[c.overallRiskLevel]}`;
            return (
              <div
                key={c.companyId}
                className="grid grid-cols-[8rem_1fr_2.5rem] sm:grid-cols-[16rem_1fr_3rem] items-center gap-2 sm:gap-3"
              >
                <div
                  className="text-sm flex items-center gap-1.5 min-w-0"
                  title={c.companyName}
                >
                  <Building2
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-foreground truncate min-w-0">
                    {c.companyName}
                  </span>
                </div>
                <div
                  className="relative h-7 rounded-md bg-[var(--surface)] overflow-hidden"
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
                  {c.overallRiskScore.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </section>
  );
}

// ─── Company detail row (replaces Card) ─────────────────────────────────────

function topRiskDimensions(c: CompanyBreakdown, n: number) {
  return [...c.dimensions]
    .sort((a, b) => b.weightedAvgRiskScore - a.weightedAvgRiskScore)
    .slice(0, n);
}

function CompanyRow({ c }: { c: CompanyBreakdown }) {
  const go = useView((s) => s.go);
  const top3 = topRiskDimensions(c, 3);
  const lastStatusLabel = c.lastAssessmentStatus
    ? ASSESSMENT_STATUS_LABELS[c.lastAssessmentStatus] ?? c.lastAssessmentStatus
    : "Sem avaliação";

  const overallColor =
    c.overallRiskLevel === "HIGH"
      ? "var(--risk-high)"
      : c.overallRiskLevel === "MEDIUM"
      ? "var(--risk-medium)"
      : "var(--risk-low)";

  return (
    <div
      className="surface-hover py-5 -mx-2 px-2 rounded-sm cursor-pointer transition-colors"
      onClick={() => go("empresa", { companyId: c.companyId })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go("empresa", { companyId: c.companyId });
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Acessar detalhe de ${c.companyName}. Risco geral ${c.overallRiskScore.toFixed(0)} — ${RISK_LEVEL_LABELS[c.overallRiskLevel]}.`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Left: identity + status badge */}
        <div className="flex items-start gap-3 min-w-0 lg:w-[20rem] lg:shrink-0">
          <span
            className="mt-1.5 h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: overallColor }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="font-display font-medium text-base text-foreground leading-tight truncate"
                title={c.companyName}
              >
                {c.companyName}
              </h3>
            </div>
            <div className="font-mono-numeric text-xs text-muted-foreground mt-1">
              {formatCnpj(c.cnpj)}
            </div>
            {(c.city || c.state) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {[c.city, c.state].filter(Boolean).join(" — ")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border mt-3 pt-2">
              <span className="truncate">{lastStatusLabel}</span>
              <span className="font-mono-numeric shrink-0 ml-2">
                {fmtShortDate(c.lastAssessmentCompletedAt)}
              </span>
            </div>
          </div>
          {/* Overall risk badge */}
          <div
            className={`inline-flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md shrink-0 ${riskBg(
              c.overallRiskLevel
            )}`}
            aria-label={`Risco geral: ${RISK_LEVEL_LABELS[c.overallRiskLevel]} (${c.overallRiskScore.toFixed(
              0
            )})`}
          >
            <span className="font-mono-numeric text-base font-semibold leading-none">
              {c.overallRiskScore.toFixed(0)}
            </span>
            <span className="text-[9px] uppercase tracking-wide opacity-90 leading-none">
              {RISK_LEVEL_LABELS[c.overallRiskLevel]}
            </span>
          </div>
        </div>

        {/* Middle: counts */}
        <div className="grid grid-cols-3 gap-3 lg:gap-6 lg:flex-1 lg:max-w-md">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Avaliações
            </div>
            <div className="font-mono-numeric text-lg font-semibold text-foreground mt-0.5">
              {c.assessmentsCount}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              GHEs elegíveis
            </div>
            <div className="font-mono-numeric text-lg font-semibold text-foreground mt-0.5">
              {c.eligibleGhes}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Respondentes
            </div>
            <div className="font-mono-numeric text-lg font-semibold text-foreground mt-0.5">
              {c.totalRespondents}
            </div>
          </div>
        </div>

        {/* Right: top risk dimensions + action */}
        <div className="lg:flex-1 lg:min-w-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
            Dimensões de maior risco
          </div>
          <ul className="space-y-1">
            {top3.map((d) => {
              const dim = getDimension(d.code);
              return (
                <li
                  key={d.code}
                  className="flex items-center gap-2 text-xs"
                  aria-label={`${d.code} ${dim.namePtBr}: risco ${d.weightedAvgRiskScore.toFixed(
                    0
                  )}, nível ${RISK_LEVEL_LABELS[d.riskLevel]}`}
                >
                  <span
                    className="font-mono-numeric text-[10px] px-1.5 py-0.5 rounded-sm border border-border shrink-0"
                  >
                    {d.code}
                  </span>
                  <span
                    className="flex-1 truncate text-foreground"
                    title={dim.namePtBr}
                  >
                    {dim.namePtBr}
                  </span>
                  <span
                    className={`font-mono-numeric font-semibold ${riskText(
                      d.riskLevel
                    )}`}
                  >
                    {d.weightedAvgRiskScore.toFixed(0)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--brand)] hover:bg-[var(--surface)] hover:text-[var(--brand)]"
              onClick={(e) => {
                e.stopPropagation();
                go("empresa", { companyId: c.companyId });
              }}
            >
              Acessar
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyDetailCards({ data }: { data: CompanyBreakdown[] }) {
  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => b.overallRiskScore - a.overallRiskScore
      ),
    [data]
  );

  return (
    <section aria-label="Detalhe por empresa" className="border-b border-border pb-4">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">
          Detalhe por empresa
        </h2>
        <span className="text-xs text-muted-foreground">
          Ordenado por risco geral decrescente
        </span>
      </div>
      <div className="divide-y divide-border border-t border-border">
        {sorted.map((c) => (
          <CompanyRow key={c.companyId} c={c} />
        ))}
      </div>
    </section>
  );
}

// ─── Loading / empty / error (no Card wrappers) ─────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-md" />
      <Skeleton className="h-72 w-full rounded-md" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  const go = useView((s) => s.go);
  return (
    <section className="border border-dashed border-border rounded-lg py-16 flex flex-col items-center justify-center text-center gap-4">
      <div className="h-14 w-14 rounded-full bg-[var(--surface)] flex items-center justify-center">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base tracking-tight text-foreground">
          Nenhuma empresa cadastrada
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Adicione seu primeiro cliente para visualizar a análise
          consolidada.
        </p>
      </div>
      <Button onClick={() => go("empresas")}>
        <Building2 className="h-4 w-4" aria-hidden="true" />
        Cadastrar empresa
      </Button>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="border border-dashed border-border rounded-lg py-16 flex flex-col items-center justify-center text-center gap-4">
      <div className="h-14 w-14 rounded-full risk-high-bg flex items-center justify-center">
        <ShieldAlert className="h-7 w-7 text-risk-high" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base tracking-tight text-foreground">
          Não foi possível carregar a análise consolidada
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Tente novamente em instantes. Se o erro persistir, verifique sua
          conexão.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Tentar novamente
      </Button>
    </section>
  );
}

// ─── Header (serif + border-b, no gradient) ─────────────────────────────────

interface HeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
}

function Header({ onRefresh, refreshing }: HeaderProps) {
  return (
    <header className="border-b border-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground">
          Análise Consolidada
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Comparação de risco psicossocial entre todos os clientes
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
        className="self-start sm:self-auto"
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        Atualizar
      </Button>
    </header>
  );
}

// ─── Main view ──────────────────────────────────────────────────────────────

export function ConsolidadoView() {
  const [data, setData] = useState<CompanyBreakdown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await api.me.companiesBreakdown();
      setData(res.data);
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message || "Falha ao carregar análise consolidada.");
      } else {
        toast.error("Falha ao carregar análise consolidada.");
      }
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      <TooltipProvider delayDuration={200}>
        <Header onRefresh={() => load(true)} refreshing={refreshing} />

        <div className="space-y-10">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState onRetry={() => load()} />
          ) : !data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <SummaryKpis data={data} />
              <HeatmapTable data={data} />
              <RiskDistributionChart data={data} />
              <CompanyDetailCards data={data} />
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

export default ConsolidadoView;

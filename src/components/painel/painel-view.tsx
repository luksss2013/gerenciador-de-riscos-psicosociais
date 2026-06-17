"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  ClipboardList,
  History,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type { CompanySummary } from "@/lib/types";
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

// ─── Activity feed ──────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  companyId: string;
  companyName: string;
  description: string;
  icon: React.ElementType;
  timestamp: string;
}

function buildActivities(companies: CompanySummary[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const c of companies) {
    items.push({
      id: `${c.id}-created`,
      companyId: c.id,
      companyName: c.name,
      description: "Empresa cadastrada no painel.",
      icon: Building2,
      timestamp: c.createdAt,
    });
    if (c.summary.lastAssessmentCompletedAt) {
      items.push({
        id: `${c.id}-completed`,
        companyId: c.id,
        companyName: c.name,
        description: "Ciclo de avaliação concluído.",
        icon: ClipboardList,
        timestamp: c.summary.lastAssessmentCompletedAt,
      });
    }
  }
  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

// ─── View ───────────────────────────────────────────────────────────────────

export function PainelView() {
  const go = useView((s) => s.go);
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.companies.list({ limit: 100 });
      setCompanies(res.data);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar suas empresas.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const alerts = useMemo(
    () => (companies ? buildAlerts(companies) : []),
    [companies]
  );
  const activities = useMemo(
    () => (companies ? buildActivities(companies) : []),
    [companies]
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada de conformidade NR-1 dos seus clientes.
          </p>
        </div>
        <Button onClick={() => go("empresas")} className="shrink-0">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </header>

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
          {/* Alerts banner */}
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
          {companies.length === 0 ? (
            <EmptyState onAdd={() => go("empresas")} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Companies grid — 2/3 width on desktop */}
              <section
                className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
                aria-label="Empresas"
              >
                {companies.map((c) => (
                  <CompanyCard key={c.id} company={c} onOpen={() => go("empresa", { companyId: c.id })} />
                ))}
              </section>

              {/* Activity feed — 1/3 width on desktop */}
              <aside aria-label="Atividades recentes" className="lg:col-span-1">
                <ActivityFeed activities={activities} onPick={(id) => go("empresa", { companyId: id })} />
              </aside>
            </div>
          )}
        </>
      )}
    </div>
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
  const location =
    company.city || company.state
      ? [company.city, company.state].filter(Boolean).join(" · ")
      : null;

  return (
    <Card className="card-hover h-full">
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
      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
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

// ─── Activity feed ──────────────────────────────────────────────────────────

function ActivityFeed({
  activities,
  onPick,
}: {
  activities: ActivityItem[];
  onPick: (companyId: string) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Atividades recentes</CardTitle>
        </div>
        <CardDescription>Últimos eventos dos seus clientes.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhuma atividade registrada.
          </div>
        ) : (
          <ScrollArea className="h-[28rem] px-6 scroll-area">
            <ol className="space-y-1 py-2">
              {activities.map((a, idx) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => onPick(a.companyId)}
                      className="w-full text-left flex gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-accent/60 transition-colors"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-foreground/70" />
                        </div>
                        {idx < activities.length - 1 && (
                          <span className="absolute top-8 bottom-0 w-px bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="text-sm leading-snug">
                          <span className="font-medium">{a.companyName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            — {a.description}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {relativeTime(a.timestamp)}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 lg:col-span-1 rounded-xl" />
      </div>
    </div>
  );
}

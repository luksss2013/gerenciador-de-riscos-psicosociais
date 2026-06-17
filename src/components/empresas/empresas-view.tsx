"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type { CompanySummary } from "@/lib/types";
import { formatCnpj, sanitizeCnpj } from "@/lib/cnpj";
import { CompanyFormDialog } from "@/components/empresas/company-form-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;
const PAGE_SIZE = 20;

type RowStatus =
  | "no_assessment"
  | "collecting"
  | "processing"
  | "completed"
  | "review_recommended"
  | "draft"
  | "archived";

/** Status dot color (matched to NrStatusBadge tokens from R-1). */
const STATUS_DOT_CLASS: Record<RowStatus, string> = {
  no_assessment: "bg-[var(--muted-foreground)]",
  draft: "bg-[var(--muted-foreground)]",
  collecting: "bg-[var(--brand)]",
  processing: "bg-[var(--brand-light)]",
  completed: "bg-[var(--risk-low)]",
  review_recommended: "bg-[var(--risk-medium)]",
  archived: "bg-[var(--muted-foreground)]",
};

/** Derive the NR-1 status from a company's lastAssessment summary. */
function deriveStatus(c: CompanySummary): RowStatus {
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

const STATUS_LABEL: Record<RowStatus, string> = {
  no_assessment: "Sem avaliação",
  draft: "Rascunho",
  collecting: "Coletando",
  processing: "Processando",
  completed: "Concluída",
  review_recommended: "Revisão recomendada",
  archived: "Arquivada",
};

// ─── View ────────────────────────────────────────────────────────────────────

export function EmpresasView() {
  const go = useView((s) => s.go);

  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination (client-side at PAGE_SIZE)
  const [page, setPage] = useState(1);

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

  // Debounce 300ms search → refilter client-side against fetched list.
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Client-side filter on name / CNPJ.
  const filtered = useMemo(() => {
    if (!companies) return [];
    const q = searchTerm.toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const name = c.name.toLowerCase();
      const cnpj = sanitizeCnpj(c.cnpj);
      const formatted = formatCnpj(c.cnpj).toLowerCase();
      return (
        name.includes(q) ||
        cnpj.includes(q) ||
        formatted.includes(q)
      );
    });
  }, [companies, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // Form modal state (create + edit share one component).
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanySummary | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: CompanySummary) => {
    setEditing(c);
    setFormOpen(true);
  };

  const onCreated = (c: CompanySummary) => {
    setFormOpen(false);
    toast.success(`Empresa "${c.name}" cadastrada.`);
    void load();
  };
  const onUpdated = (c: CompanySummary) => {
    setFormOpen(false);
    toast.success("Empresa atualizada.");
    void load();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-border pb-6 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight">
            Empresas
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Gerencie seus clientes e seus ciclos de avaliação.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </header>

      {/* Search bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Label htmlFor="empresas-search" className="sr-only">
            Buscar empresa por nome ou CNPJ
          </Label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            id="empresas-search"
            type="search"
            inputMode="search"
            placeholder="Buscar por nome ou CNPJ…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-[var(--surface)] border-border"
            aria-label="Buscar empresa por nome ou CNPJ"
          />
          {searchInput && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchInput("")}
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando…</span>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && <EmpresasSkeleton />}

      {/* Error */}
      {!loading && error && (
        <section
          role="alert"
          className="border border-dashed border-border rounded-lg py-12 flex flex-col items-center text-center gap-3"
        >
          <div className="h-11 w-11 rounded-full risk-high-bg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg">Falha ao carregar empresas</p>
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
        <>
          {companies.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : filtered.length === 0 ? (
            <NoResults onClear={() => setSearchInput("")} />
          ) : (
            <>
              <section
                aria-label="Lista de empresas"
                className="border-t border-border"
              >
                {pageItems.map((c) => (
                  <CompanyRow
                    key={c.id}
                    company={c}
                    onOpen={() => go("empresa", { companyId: c.id })}
                    onEdit={() => openEdit(c)}
                  />
                ))}
              </section>

              {totalPages > 1 && (
                <nav
                  className="mt-6 flex items-center justify-between gap-2"
                  aria-label="Paginação de empresas"
                >
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono-numeric">{pageStart + 1}</span>
                    {"–"}
                    <span className="font-mono-numeric">
                      {Math.min(pageStart + PAGE_SIZE, filtered.length)}
                    </span>{" "}
                    de <span className="font-mono-numeric">{filtered.length}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2 font-mono-numeric">
                      {safePage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      aria-label="Próxima página"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </>
        </div>
      )}

      {/* Create / Edit modal */}
      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />
    </div>
  );
}

// ─── Company row ─────────────────────────────────────────────────────────────

function CompanyRow({
  company,
  onOpen,
  onEdit,
}: {
  company: CompanySummary;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const status = deriveStatus(company);
  const location =
    company.city || company.state
      ? [company.city, company.state].filter(Boolean).join(" · ")
      : null;
  const deptCount = company.summary.departmentsCount;
  const asmtCount = company.summary.assessmentsCount;

  return (
    <div className="surface-hover border-b border-border py-4 px-1 group">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        {/* Identity */}
        <div className="min-w-0 flex-1 flex items-start gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT_CLASS[status]}`}
            aria-label={`Status: ${STATUS_LABEL[status]}`}
            title={STATUS_LABEL[status]}
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpen}
                className="font-display font-medium text-lg leading-tight text-foreground text-left hover:text-[var(--brand-light)] cursor-pointer transition-colors truncate"
                aria-label={`Acessar empresa ${company.name}`}
              >
                {company.name}
              </button>
              <span className="font-mono-numeric text-sm text-muted-foreground">
                {formatCnpj(company.cnpj)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {location && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
              {company.cnaePrimary && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-mono-numeric">
                    CNAE {company.cnaePrimary}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-5 text-sm text-muted-foreground shrink-0 lg:pr-2">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono-numeric">{deptCount}</span>
            <span>{deptCount !== 1 ? "GHEs" : "GHE"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="font-mono-numeric">{asmtCount}</span>
            <span>{asmtCount !== 1 ? "avaliações" : "avaliação"}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            aria-label={`Editar empresa ${company.name}`}
          >
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={onOpen} className="text-[var(--brand)] hover:text-[var(--brand-light)]">
            Acessar
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty states ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="border border-dashed border-border rounded-lg py-16 flex flex-col items-center text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-[var(--surface)] flex items-center justify-center">
        <Building2 className="h-8 w-8 text-[var(--brand)]" />
      </div>
      <div className="max-w-md">
        <h2 className="font-display text-xl">Nenhuma empresa cadastrada</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Adicione a primeira para começar.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Adicionar empresa
      </Button>
    </section>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <section className="border border-dashed border-border rounded-lg py-12 flex flex-col items-center text-center gap-3">
      <div className="h-11 w-11 rounded-full bg-[var(--surface)] flex items-center justify-center">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-display text-lg">Nenhuma empresa encontrada</p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste os termos da busca ou cadastre uma nova empresa.
        </p>
      </div>
      <Button variant="outline" onClick={onClear}>
        Limpar busca
      </Button>
    </section>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function EmpresasSkeleton() {
  return (
    <div className="border-t border-border" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border-b border-border py-4 px-1 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6"
        >
          {/* Identity — dot + name + CNPJ + meta line */}
          <div className="min-w-0 flex-1 flex items-start gap-3">
            <Skeleton className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
          </div>
          {/* Counts */}
          <div className="flex items-center gap-5 shrink-0 lg:pr-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

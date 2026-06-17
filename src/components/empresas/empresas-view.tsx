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
  Pencil,
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
import { NrStatusBadge, type NrStatus } from "@/components/shell/nr-status-badge";
import { CompanyFormDialog } from "@/components/empresas/company-form-dialog";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;
const PAGE_SIZE = 20;

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
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Empresas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus clientes e seus ciclos de avaliação NR-1.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </header>

      {/* Search bar */}
      <div className="mb-5 flex flex-col sm:flex-row gap-2 sm:items-center">
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
            className="pl-9"
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
        <Card className="border-destructive/30">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium">Falha ao carregar empresas</p>
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
          {companies.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : filtered.length === 0 ? (
            <NoResults onClear={() => setSearchInput("")} />
          ) : (
            <>
              <section
                aria-label="Lista de empresas"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {pageItems.map((c) => (
                  <CompanyCard
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
                    {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}{" "}
                    de {filtered.length}
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

// ─── Company card ────────────────────────────────────────────────────────────

function CompanyCard({
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

  return (
    <Card className="card-hover h-full flex flex-col">
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
      <CardContent className="space-y-1.5 text-sm text-muted-foreground flex-1">
        {location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {company.cnaePrimary && (
          <div className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">CNAE: {company.cnaePrimary}</span>
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
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            aria-label={`Editar empresa ${company.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button size="sm" variant="outline" onClick={onOpen}>
            Acessar
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// ─── Empty states ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold">
            Nenhuma empresa cadastrada
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione seu primeiro cliente.
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

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 flex flex-col items-center text-center gap-3">
        <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Nenhuma empresa encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ajuste os termos da busca ou cadastre uma nova empresa.
          </p>
        </div>
        <Button variant="outline" onClick={onClear}>
          Limpar busca
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function EmpresasSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-44 w-full rounded-xl" />
      ))}
    </div>
  );
}

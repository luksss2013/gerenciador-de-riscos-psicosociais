"use client";

import {
  AlertTriangle,
  Building2,
  ClipboardList,
  ListChecks,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCnpj } from "@/lib/cnpj";
import { ACTION_STATUS_LABELS, ASSESSMENT_STATUS_LABELS } from "@/lib/errors";
import { useGo } from "@/lib/nav";
import type { SearchResults } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Result item ────────────────────────────────────────────────────────────

interface ResultItemProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  badge?: string;
  onSelect: () => void;
}

function ResultItem({ icon: Icon, title, subtitle, badge, onSelect }: ResultItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface)] cursor-pointer text-left transition-colors"
    >
      <div className="h-8 w-8 rounded-md bg-[var(--surface)] flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-[var(--brand)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      {badge && (
        <span className="text-[11px] text-muted-foreground shrink-0 px-2 py-0.5 rounded bg-[var(--surface)]">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Global search ──────────────────────────────────────────────────────────

export function GlobalSearch() {
  const go = useGo();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounced(query, 250);

  // Fetch results when debounced query changes
  React.useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .search(debouncedQuery.trim())
      .then((r) => {
        if (!cancelled) {
          setResults(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Keyboard shortcut: Cmd/Ctrl+K
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        // focus input on next tick
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const totalResults = results
    ? results.companies.length +
      results.departments.length +
      results.assessments.length +
      results.actionItems.length +
      results.inventoryItems.length
    : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hidden md:flex items-center gap-2 w-full max-w-md h-9 px-3 rounded-md border border-border bg-[var(--surface)] text-sm text-muted-foreground hover:border-[var(--brand-light)] hover:text-foreground cursor-pointer transition-colors"
          aria-label="Busca global"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Buscar em todo o sistema…</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono-numeric px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </PopoverTrigger>
      {/* Mobile: just a search icon that opens the same popover */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-[var(--surface)] cursor-pointer"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </button>
      <PopoverContent
        className="w-[95vw] max-w-2xl p-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
        align="center"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresas, avaliações, GHEs, ações…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-6 px-1.5 text-[10px] font-mono-numeric text-muted-foreground hover:text-foreground"
            aria-label="Fechar busca"
          >
            ESC
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scroll-area">
          {/* Loading skeleton */}
          {loading && !results && (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No query */}
          {!loading && query.trim().length < 2 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Digite ao menos 2 caracteres para buscar.
            </div>
          )}

          {/* No results */}
          {!loading && results && totalResults === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum resultado para &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Results */}
          {results && totalResults > 0 && (
            <div className="py-1">
              {results.companies.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Empresas
                  </div>
                  {results.companies.map((c) => (
                    <ResultItem
                      key={`co-${c.id}`}
                      icon={Building2}
                      title={c.name}
                      subtitle={`${formatCnpj(c.cnpj)}${c.city ? ` · ${c.city}` : ""}${c.state ? `/${c.state}` : ""}`}
                      onSelect={() => {
                        go("empresa", { companyId: c.id });
                        setOpen(false);
                        setQuery("");
                      }}
                    />
                  ))}
                </div>
              )}

              {results.assessments.length > 0 && (
                <div className="py-1 border-t border-border">
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Avaliações
                  </div>
                  {results.assessments.map((a) => (
                    <ResultItem
                      key={`as-${a.id}`}
                      icon={ClipboardList}
                      title={a.title}
                      subtitle={`${a.companyName} · ${ASSESSMENT_STATUS_LABELS[a.status] ?? a.status}`}
                      badge="Avaliação"
                      onSelect={() => {
                        go("avaliacao", { assessmentId: a.id, companyId: a.companyId });
                        setOpen(false);
                        setQuery("");
                      }}
                    />
                  ))}
                </div>
              )}

              {results.departments.length > 0 && (
                <div className="py-1 border-t border-border">
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    GHEs / Departamentos
                  </div>
                  {results.departments.map((d) => (
                    <ResultItem
                      key={`de-${d.id}`}
                      icon={Users}
                      title={d.name}
                      subtitle={`${d.companyName} · ${d.workerCount} trabalhadores`}
                      onSelect={() => {
                        go("empresa", { companyId: d.companyId });
                        setOpen(false);
                        setQuery("");
                      }}
                    />
                  ))}
                </div>
              )}

              {results.actionItems.length > 0 && (
                <div className="py-1 border-t border-border">
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Ações do plano
                  </div>
                  {results.actionItems.map((ai) => (
                    <ResultItem
                      key={`ai-${ai.id}`}
                      icon={ListChecks}
                      title={ai.what}
                      subtitle={`${ai.companyName} · ${ai.assessmentTitle} · ${ACTION_STATUS_LABELS[ai.status] ?? ai.status}`}
                      onSelect={() => {
                        go("plano", { assessmentId: ai.assessmentId, companyId: ai.companyId });
                        setOpen(false);
                        setQuery("");
                      }}
                    />
                  ))}
                </div>
              )}

              {results.inventoryItems.length > 0 && (
                <div className="py-1 border-t border-border">
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Inventário de riscos
                  </div>
                  {results.inventoryItems.map((inv) => (
                    <ResultItem
                      key={`inv-${inv.id}`}
                      icon={AlertTriangle}
                      title={inv.hazardDescription}
                      subtitle={`${inv.companyName} · ${inv.assessmentTitle}${inv.mteFactorCode ? ` · ${inv.mteFactorCode}` : ""}`}
                      onSelect={() => {
                        go("inventario", {
                          assessmentId: inv.assessmentId,
                          companyId: inv.companyId,
                        });
                        setOpen(false);
                        setQuery("");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

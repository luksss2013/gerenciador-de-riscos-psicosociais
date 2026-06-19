"use client";

import { format, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  Filter,
  Info,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, api } from "@/lib/api";
import { COPSOQ_DIMENSIONS, getDimension } from "@/lib/copsoq-data";
import { ACTION_STATUS_LABELS, RISK_LEVEL_LABELS } from "@/lib/errors";
import {
  FIELD_ERROR_CLASS,
  FieldError,
  maskCurrency,
  parseCurrencyBRL,
  validateRequired,
} from "@/lib/form-utils";
import { useAssessmentIdParam, useGo } from "@/lib/nav";
import { useView } from "@/lib/store";
import type {
  ActionItem,
  ActionStatus,
  Assessment,
  AssessmentDepartment,
  DimensionCode,
} from "@/lib/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ActionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-[var(--sidebar-accent)] text-[var(--brand)]",
  completed: "risk-low-bg",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const STATUS_ORDER: Record<ActionStatus, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
};

const STATUS_OPTIONS: ActionStatus[] = ["pending", "in_progress", "completed", "cancelled"];

const FILTER_ALL = "__all__";
const DEPT_COMPANY = "__company__"; // represents "Toda a empresa" (null departmentId)

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatWhenDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function isOverdue(item: ActionItem): boolean {
  try {
    const d = parseISO(item.whenDate);
    if (!isValid(d)) return false;
    return (
      isBefore(d, startOfDay(new Date())) &&
      (item.status === "pending" || item.status === "in_progress")
    );
  } catch {
    return false;
  }
}

function formatBRL(value: number | null): string | null {
  if (value == null) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function deptDisplayName(item: ActionItem): string {
  return item.departmentName ?? "Toda a empresa";
}

function dimInfo(code: DimensionCode | null) {
  if (!code) return null;
  try {
    return getDimension(code);
  } catch {
    return null;
  }
}

// ─── OverdueBadge ───────────────────────────────────────────────────────────

function OverdueBadge() {
  return (
    <Badge className="bg-[var(--risk-high)]/10 text-[var(--risk-high)] border-transparent gap-1">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      Vencido
    </Badge>
  );
}

// ─── PlanHeaderKpis ─────────────────────────────────────────────────────────

interface PlanHeaderKpisProps {
  items: ActionItem[];
}

function PlanHeaderKpis({ items }: PlanHeaderKpisProps) {
  const total = items.length;
  const pending = items.filter((i) => i.status === "pending").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const completed = items.filter((i) => i.status === "completed").length;

  // % dimensões HIGH com ≥1 ação concluída:
  //   of all dimensions that have ≥1 item with riskLevelTrigger=HIGH,
  //   what fraction have ≥1 item with status=completed
  const highDimCodes = new Set(
    items
      .filter((i) => i.riskLevelTrigger === "HIGH" && i.dimensionCode)
      .map((i) => i.dimensionCode as string),
  );
  const completedDimCodes = new Set(
    items
      .filter((i) => i.status === "completed" && i.dimensionCode)
      .map((i) => i.dimensionCode as string),
  );
  let highCompletedPct = 0;
  if (highDimCodes.size > 0) {
    let count = 0;
    highDimCodes.forEach((code) => {
      if (completedDimCodes.has(code)) count += 1;
    });
    highCompletedPct = Math.round((count / highDimCodes.size) * 100);
  }

  const kpis: { label: string; value: string; hint?: string }[] = [
    {
      label: "Total de Ações",
      value: String(total),
      hint: "cadastradas no plano",
    },
    {
      label: "Pendentes",
      value: String(pending),
      hint: "aguardando início",
    },
    {
      label: "Em Andamento",
      value: String(inProgress),
      hint: "em execução",
    },
    {
      label: "Concluídas",
      value: String(completed),
      hint: "finalizadas",
    },
    {
      label: "% Dim. HIGH c/ ação concluída",
      value: `${highCompletedPct}%`,
      hint: `${highDimCodes.size} dimensão(ões) HIGH`,
    },
  ];

  return (
    <section
      aria-label="Indicadores do plano de ação"
      className="bg-[var(--surface)] rounded-lg p-5"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-border">
        {kpis.map((k) => (
          <div key={k.label} className="px-3 first:pl-0 last:pr-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">
              {k.label}
            </div>
            <div className="font-mono-numeric text-2xl md:text-3xl font-semibold mt-1 leading-tight text-foreground">
              {k.value}
            </div>
            {k.hint ? (
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{k.hint}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── PlanFilters ────────────────────────────────────────────────────────────

interface PlanFiltersProps {
  departments: AssessmentDepartment[];
  statusFilter: string;
  deptFilter: string;
  dimFilter: string;
  responsibleFilter: string;
  onStatusChange: (v: string) => void;
  onDeptChange: (v: string) => void;
  onDimChange: (v: string) => void;
  onResponsibleChange: (v: string) => void;
  onClear: () => void;
}

function PlanFilters({
  departments,
  statusFilter,
  deptFilter,
  dimFilter,
  responsibleFilter,
  onStatusChange,
  onDeptChange,
  onDimChange,
  onResponsibleChange,
  onClear,
}: PlanFiltersProps) {
  const hasActiveFilters =
    statusFilter !== FILTER_ALL ||
    deptFilter !== FILTER_ALL ||
    dimFilter !== FILTER_ALL ||
    responsibleFilter.trim() !== "";

  return (
    <section aria-label="Filtros do plano de ação" className="border-t border-border pt-5 pb-5">
      <div className="flex items-start gap-2 mb-4">
        <Filter className="h-4 w-4 text-[var(--brand)] mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-display text-base tracking-tight text-foreground">Filtros</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Combine status, GHE, dimensão e responsável para localizar ações.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-status" className="sr-only">
            Status
          </Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger id="filter-status" className="w-full" aria-label="Filtrar por status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ACTION_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-dept" className="sr-only">
            GHE
          </Label>
          <Select value={deptFilter} onValueChange={onDeptChange}>
            <SelectTrigger id="filter-dept" className="w-full" aria-label="Filtrar por GHE">
              <SelectValue placeholder="GHE" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Todos os GHEs</SelectItem>
              <SelectItem value={DEPT_COMPANY}>Toda a empresa</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-dim" className="sr-only">
            Dimensão
          </Label>
          <Select value={dimFilter} onValueChange={onDimChange}>
            <SelectTrigger id="filter-dim" className="w-full" aria-label="Filtrar por dimensão">
              <SelectValue placeholder="Dimensão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Todas as dimensões</SelectItem>
              {COPSOQ_DIMENSIONS.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.code} · {d.namePtBr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-resp" className="sr-only">
            Responsável
          </Label>
          <Input
            id="filter-resp"
            type="text"
            placeholder="Buscar responsável…"
            value={responsibleFilter}
            onChange={(e) => onResponsibleChange(e.target.value)}
            aria-label="Filtrar por responsável"
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="flex justify-end mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-[var(--brand)]"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ─── InlineStatusSelect (used inside ActionItemsTable) ──────────────────────

interface InlineStatusSelectProps {
  item: ActionItem;
  onStatusChange: (itemId: string, status: ActionStatus) => Promise<void>;
  pendingItemId: string | null;
}

function InlineStatusSelect({ item, onStatusChange, pendingItemId }: InlineStatusSelectProps) {
  const isUpdating = pendingItemId === item.id;
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={item.status}
        onValueChange={(v) => {
          void onStatusChange(item.id, v as ActionStatus);
        }}
        disabled={isUpdating}
      >
        <SelectTrigger size="sm" className="w-[160px] h-8" aria-label="Alterar status da ação">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {ACTION_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isUpdating ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Salvando" />
      ) : null}
    </div>
  );
}

// ─── ActionItemsTable ───────────────────────────────────────────────────────

interface ActionItemsTableProps {
  items: ActionItem[];
  onStatusChange: (itemId: string, status: ActionStatus) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (item: ActionItem) => void;
  pendingItemId: string | null;
}

function ActionItemsTable({
  items,
  onStatusChange,
  onDelete,
  onEdit,
  pendingItemId,
}: ActionItemsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      await onDelete(itemId);
    } finally {
      setDeletingId(null);
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (so !== 0) return so;
      const aw = a.whenDate ?? "";
      const bw = b.whenDate ?? "";
      if (aw < bw) return -1;
      if (aw > bw) return 1;
      return 0;
    });
  }, [items]);

  return (
    <section aria-label="Ações 5W2H" className="border-t border-border">
      <div className="pt-5 pb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
          Ações 5W2H
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {sorted.length} ação(ões) listada(s). Altere o status diretamente na linha ou clique em
          editar para ajustar os campos 5W2H.
        </p>
      </div>
      <div className="overflow-x-auto scroll-area border-t border-border">
        <Table className="min-w-[1120px]">
          <caption className="sr-only">
            Lista de ações 5W2H do plano de ação. Colunas: GHE, dimensão, o quê, responsável, prazo
            (com indicação de vencido quando aplicável), status (seleção inline) e ações de editar e
            excluir.
          </caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[150px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                GHE
              </TableHead>
              <TableHead className="w-[120px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Dimensão
              </TableHead>
              <TableHead className="w-[280px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                O Quê
              </TableHead>
              <TableHead className="w-[160px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Responsável
              </TableHead>
              <TableHead className="w-[150px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Prazo
              </TableHead>
              <TableHead className="w-[190px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Status
              </TableHead>
              <TableHead className="w-[100px] text-right text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                  Nenhuma ação encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((item) => {
                const dim = dimInfo(item.dimensionCode);
                const overdue = isOverdue(item);
                const statusLabel = ACTION_STATUS_LABELS[item.status];
                return (
                  <TableRow
                    key={item.id}
                    className="border-b border-border hover:bg-[var(--surface)] transition-colors align-top"
                  >
                    <TableCell className="py-3 align-top">
                      <div className="truncate max-w-[150px] text-sm" title={deptDisplayName(item)}>
                        {deptDisplayName(item)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      {dim ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex"
                              role="img"
                              aria-label={`${dim.code} · ${dim.namePtBr}`}
                            >
                              <Badge
                                variant="outline"
                                className="font-mono-numeric font-semibold bg-transparent"
                              >
                                {dim.code}
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {dim.code} · {dim.namePtBr}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[280px] truncate text-sm" title={item.what}>
                            {item.what}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm whitespace-pre-wrap text-left">
                          {item.what}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="flex items-center gap-1.5 text-sm">
                        <User
                          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate max-w-[140px]" title={item.who}>
                          {item.who}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-mono-numeric">
                          <Calendar
                            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <span>{formatWhenDate(item.whenDate)}</span>
                        </div>
                        {overdue ? <OverdueBadge /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="sr-only">{statusLabel}</span>
                        <InlineStatusSelect
                          item={item}
                          onStatusChange={onStatusChange}
                          pendingItemId={pendingItemId}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 align-top text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-[var(--brand)]"
                          onClick={() => onEdit(item)}
                          aria-label={`Editar ação: ${item.what.slice(0, 40)}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-[var(--risk-high)]"
                              aria-label={`Excluir ação: ${item.what.slice(0, 40)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-display text-xl">
                                Excluir ação do plano?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação remove o item 5W2H e não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={deletingId === item.id}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.preventDefault();
                                  void handleDelete(item.id);
                                }}
                                disabled={deletingId === item.id}
                                className="bg-[var(--risk-high)] text-[var(--accent-foreground)] hover:bg-[var(--risk-high)]/90"
                              >
                                {deletingId === item.id && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// ─── ActionItemForm (Dialog used for create AND edit) ───────────────────────

interface ActionItemFormPrefill {
  dimensionCode?: string;
  riskLevelTrigger?: string;
  departmentId?: string;
  what?: string;
}

interface ActionItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
  mode: "create" | "edit";
  initialItem?: ActionItem | null;
  prefill?: ActionItemFormPrefill | null;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}

function ActionItemForm({
  open,
  onOpenChange,
  assessment,
  mode,
  initialItem,
  prefill,
  onSubmit,
}: ActionItemFormProps) {
  // Keyed remount: when mode or initialItem.id changes the inner contents
  // remount with fresh useState values (avoids setState-in-effect).
  // For create mode, the prefill signature is encoded so consecutive opens
  // with different prefills produce distinct remounts.
  const contentsKey =
    mode === "edit"
      ? `edit-${initialItem?.id ?? "none"}`
      : `create-${prefill?.dimensionCode ?? ""}-${prefill?.departmentId ?? ""}-${prefill?.riskLevelTrigger ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            {mode === "edit" ? (
              <Pencil className="h-4 w-4 text-[var(--brand)]" />
            ) : (
              <Plus className="h-4 w-4 text-[var(--brand)]" />
            )}
            {mode === "edit" ? "Editar Ação 5W2H" : "Nova Ação 5W2H"}
          </DialogTitle>
          <DialogDescription>
            Descreva a medida de intervenção conforme a metodologia 5W2H (O quê, Por quê, Quem,
            Onde, Quando, Como e Quanto custa).
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ActionItemFormContents
            key={contentsKey}
            assessment={assessment}
            mode={mode}
            initialItem={initialItem ?? null}
            prefill={prefill ?? null}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface ActionItemFormContentsProps {
  assessment: Assessment | null;
  mode: "create" | "edit";
  initialItem: ActionItem | null;
  prefill: ActionItemFormPrefill | null;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function ActionItemFormContents({
  assessment,
  mode,
  initialItem,
  prefill,
  onSubmit,
  onCancel,
}: ActionItemFormContentsProps) {
  const departments = assessment?.departments ?? [];

  // Lazy useState initializers — read initialItem (edit) or prefill (create)
  // at mount time only. Evaluated once when this contents component mounts.
  const [what, setWhat] = useState<string>(initialItem?.what ?? prefill?.what ?? "");
  const [why, setWhy] = useState<string>(initialItem?.why ?? "");
  const [who, setWho] = useState<string>(initialItem?.who ?? "");
  const [whereVal, setWhereVal] = useState<string>(initialItem?.where ?? "");
  const [whenDate, setWhenDate] = useState<string>(
    initialItem?.whenDate ? initialItem.whenDate.slice(0, 10) : "",
  );
  const [how, setHow] = useState<string>(initialItem?.how ?? "");
  const [estimatedCost, setEstimatedCost] = useState<string>(
    initialItem?.estimatedCost != null
      ? maskCurrency(
          // Re-render the stored number as a BRL-formatted string. Multiply
          // by 100 because maskCurrency expects cents-as-digits.
          String(Math.round(initialItem.estimatedCost * 100)),
        )
      : "",
  );
  const [departmentId, setDepartmentId] = useState<string>(
    initialItem?.departmentId ?? prefill?.departmentId ?? "",
  );
  const [dimensionCode, setDimensionCode] = useState<string>(
    initialItem?.dimensionCode ?? prefill?.dimensionCode ?? "",
  );
  const [riskLevelTrigger, setRiskLevelTrigger] = useState<string>(
    initialItem?.riskLevelTrigger ?? prefill?.riskLevelTrigger ?? "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<string, string>> = {};
    if (!validateRequired(what, 2)) errs.what = "Mínimo de 2 caracteres.";
    if (!validateRequired(why, 2)) errs.why = "Mínimo de 2 caracteres.";
    if (!validateRequired(who, 2)) errs.who = "Mínimo de 2 caracteres.";
    if (!validateRequired(whereVal, 2)) errs.where = "Mínimo de 2 caracteres.";
    if (!validateRequired(how, 2)) errs.how = "Mínimo de 2 caracteres.";
    if (!whenDate) {
      errs.whenDate = "Informe a data prevista.";
    } else {
      const d = new Date(`${whenDate}T00:00:00`);
      if (Number.isNaN(d.getTime())) {
        errs.whenDate = "Data inválida (use AAAA-MM-DD).";
      } else {
        // Future-or-today check (NR-1 action plan: prazo deve estar no
        // futuro ou hoje).
        const today = startOfDay(new Date());
        const dDay = startOfDay(d);
        if (isBefore(dDay, today)) {
          errs.whenDate = "A data prevista deve ser hoje ou no futuro.";
        }
      }
    }
    if (estimatedCost.trim() !== "") {
      const n = parseCurrencyBRL(estimatedCost);
      if (!Number.isFinite(n) || n < 0) errs.estimatedCost = "Valor inválido.";
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const body: Record<string, unknown> = {
        what: what.trim(),
        why: why.trim(),
        who: who.trim(),
        where: whereVal.trim(),
        whenDate,
        how: how.trim(),
      };
      if (departmentId && departmentId !== DEPT_COMPANY) {
        body.departmentId = departmentId;
      }
      if (dimensionCode) body.dimensionCode = dimensionCode;
      if (riskLevelTrigger) body.riskLevelTrigger = riskLevelTrigger;
      if (estimatedCost.trim() !== "") {
        body.estimatedCost = parseCurrencyBRL(estimatedCost);
      }
      await onSubmit(body);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "VALIDATION_ERROR") {
          // Backend validation error → map to the relevant field with the
          // SAME shared FieldError + FIELD_ERROR_CLASS styling used by the
          // front-side onBlur errors.
          const msg = e.message || "Dados inválidos. Verifique os campos.";
          setErrors({ form: msg });
          toast.error(msg);
        } else if (e.code === "ASSESSMENT_NOT_COMPLETED") {
          toast.error("A avaliação precisa estar concluída para cadastrar ações.");
        } else {
          toast.error(e.message);
        }
      } else {
        toast.error("Erro ao salvar ação.");
      }
      setSubmitting(false);
    }
  };

  // Per-field onBlur validators — keep the same shared FieldError styling
  // for front-side validation as the submit-time validation uses.
  const validateOnBlur = (field: keyof typeof errors) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "what") {
        next.what = validateRequired(what, 2) ? undefined : "Mínimo de 2 caracteres.";
      } else if (field === "why") {
        next.why = validateRequired(why, 2) ? undefined : "Mínimo de 2 caracteres.";
      } else if (field === "who") {
        next.who = validateRequired(who, 2) ? undefined : "Mínimo de 2 caracteres.";
      } else if (field === "where") {
        next.where = validateRequired(whereVal, 2) ? undefined : "Mínimo de 2 caracteres.";
      } else if (field === "how") {
        next.how = validateRequired(how, 2) ? undefined : "Mínimo de 2 caracteres.";
      } else if (field === "whenDate") {
        if (!whenDate) next.whenDate = "Informe a data prevista.";
        else {
          const d = new Date(`${whenDate}T00:00:00`);
          if (Number.isNaN(d.getTime())) {
            next.whenDate = "Data inválida (use AAAA-MM-DD).";
          } else {
            const today = startOfDay(new Date());
            const dDay = startOfDay(d);
            next.whenDate = isBefore(dDay, today)
              ? "A data prevista deve ser hoje ou no futuro."
              : undefined;
          }
        }
      } else if (field === "estimatedCost") {
        if (estimatedCost.trim() !== "") {
          const n = parseCurrencyBRL(estimatedCost);
          next.estimatedCost = !Number.isFinite(n) || n < 0 ? "Valor inválido." : undefined;
        } else {
          next.estimatedCost = undefined;
        }
      }
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* NR-1 info banner */}
      <Alert className="border-[var(--brand-light)]/30 bg-[var(--surface)]">
        <Info className="h-4 w-4 text-[var(--brand)]" />
        <AlertTitle className="text-[var(--brand)]">Orientação NR-1</AlertTitle>
        <AlertDescription>
          NR-1 orienta priorizar medidas na organização do trabalho antes de ações individuais.
        </AlertDescription>
      </Alert>

      {/* Backend VALIDATION_ERROR → render with the SAME shared FieldError
          styling used by front-side onBlur errors. The backend doesn't tell
          us which specific field failed, so we surface it as a form-level
          banner above the field grid. */}
      {errors.form ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--risk-high)]/40 bg-[var(--surface)] p-3"
        >
          <FieldError message={errors.form} />
        </div>
      ) : null}

      {/* O Quê */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-what">
          O Quê <span className="text-[var(--risk-high)]">*</span>
        </Label>
        <Textarea
          id="ai-what"
          value={what}
          onChange={(e) => {
            setWhat(e.target.value);
            if (errors.what) setErrors((p) => ({ ...p, what: undefined }));
          }}
          onBlur={() => validateOnBlur("what")}
          placeholder="Descreva a ação a ser executada…"
          rows={2}
          aria-invalid={!!errors.what}
          aria-describedby={errors.what ? "ai-what-err" : undefined}
          className={errors.what ? FIELD_ERROR_CLASS : ""}
        />
        {errors.what ? <FieldError id="ai-what-err" message={errors.what} /> : null}
      </div>

      {/* Por Quê */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-why">
          Por Quê <span className="text-[var(--risk-high)]">*</span>
        </Label>
        <Textarea
          id="ai-why"
          value={why}
          onChange={(e) => {
            setWhy(e.target.value);
            if (errors.why) setErrors((p) => ({ ...p, why: undefined }));
          }}
          onBlur={() => validateOnBlur("why")}
          placeholder="Justifique o motivo da ação…"
          rows={2}
          aria-invalid={!!errors.why}
          aria-describedby={errors.why ? "ai-why-err" : undefined}
          className={errors.why ? FIELD_ERROR_CLASS : ""}
        />
        {errors.why ? <FieldError id="ai-why-err" message={errors.why} /> : null}
      </div>

      {/* Quem + Onde */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-who">
            Quem <span className="text-[var(--risk-high)]">*</span>
          </Label>
          <Input
            id="ai-who"
            type="text"
            autoComplete="name"
            value={who}
            onChange={(e) => {
              setWho(e.target.value);
              if (errors.who) setErrors((p) => ({ ...p, who: undefined }));
            }}
            onBlur={() => validateOnBlur("who")}
            placeholder="Responsável pela ação"
            aria-invalid={!!errors.who}
            aria-describedby={errors.who ? "ai-who-err" : undefined}
            className={errors.who ? FIELD_ERROR_CLASS : ""}
          />
          {errors.who ? <FieldError id="ai-who-err" message={errors.who} /> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-where">
            Onde <span className="text-[var(--risk-high)]">*</span>
          </Label>
          <Input
            id="ai-where"
            type="text"
            value={whereVal}
            onChange={(e) => {
              setWhereVal(e.target.value);
              if (errors.where) setErrors((p) => ({ ...p, where: undefined }));
            }}
            onBlur={() => validateOnBlur("where")}
            placeholder="Local de execução"
            aria-invalid={!!errors.where}
            aria-describedby={errors.where ? "ai-where-err" : undefined}
            className={errors.where ? FIELD_ERROR_CLASS : ""}
          />
          {errors.where ? <FieldError id="ai-where-err" message={errors.where} /> : null}
        </div>
      </div>

      {/* Quando + Quanto custa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-when">
            Quando <span className="text-[var(--risk-high)]">*</span>
          </Label>
          <Input
            id="ai-when"
            type="date"
            value={whenDate}
            onChange={(e) => {
              setWhenDate(e.target.value);
              if (errors.whenDate) setErrors((p) => ({ ...p, whenDate: undefined }));
            }}
            onBlur={() => validateOnBlur("whenDate")}
            aria-invalid={!!errors.whenDate}
            aria-describedby={errors.whenDate ? "ai-when-err" : undefined}
            className={`font-mono-numeric ${errors.whenDate ? FIELD_ERROR_CLASS : ""}`}
          />
          {errors.whenDate ? <FieldError id="ai-when-err" message={errors.whenDate} /> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-cost">Quanto custa (opcional)</Label>
          <Input
            id="ai-cost"
            type="text"
            inputMode="numeric"
            value={estimatedCost}
            onChange={(e) => {
              setEstimatedCost(maskCurrency(e.target.value));
              if (errors.estimatedCost) setErrors((p) => ({ ...p, estimatedCost: undefined }));
            }}
            onBlur={() => validateOnBlur("estimatedCost")}
            placeholder="0,00"
            aria-invalid={!!errors.estimatedCost}
            aria-describedby={errors.estimatedCost ? "ai-cost-err" : undefined}
            className={`font-mono-numeric ${errors.estimatedCost ? FIELD_ERROR_CLASS : ""}`}
          />
          {errors.estimatedCost ? (
            <FieldError id="ai-cost-err" message={errors.estimatedCost} />
          ) : null}
        </div>
      </div>

      {/* Como */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-how">
          Como <span className="text-[var(--risk-high)]">*</span>
        </Label>
        <Textarea
          id="ai-how"
          value={how}
          onChange={(e) => {
            setHow(e.target.value);
            if (errors.how) setErrors((p) => ({ ...p, how: undefined }));
          }}
          onBlur={() => validateOnBlur("how")}
          placeholder="Descreva o método de execução da ação…"
          rows={3}
          aria-invalid={!!errors.how}
          aria-describedby={errors.how ? "ai-how-err" : undefined}
          className={errors.how ? FIELD_ERROR_CLASS : ""}
        />
        {errors.how ? <FieldError id="ai-how-err" message={errors.how} /> : null}
      </div>

      {/* GHE afetado + Dimensão + Nível de risco que originou */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-dept">GHE afetado (opcional)</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger id="ai-dept" className="w-full" aria-label="Selecionar GHE afetado">
              <SelectValue placeholder="Toda a empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEPT_COMPANY}>Toda a empresa</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-dim">Dimensão (opcional)</Label>
          <Select value={dimensionCode} onValueChange={setDimensionCode}>
            <SelectTrigger id="ai-dim" className="w-full" aria-label="Selecionar dimensão COPSOQ">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {COPSOQ_DIMENSIONS.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.code} · {d.namePtBr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-risk">Nível de risco que originou (opcional)</Label>
          <Select value={riskLevelTrigger} onValueChange={setRiskLevelTrigger}>
            <SelectTrigger
              id="ai-risk"
              className="w-full"
              aria-label="Selecionar nível de risco que originou a ação"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">{RISK_LEVEL_LABELS.LOW}</SelectItem>
              <SelectItem value="MEDIUM">{RISK_LEVEL_LABELS.MEDIUM}</SelectItem>
              <SelectItem value="HIGH">{RISK_LEVEL_LABELS.HIGH}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "edit" ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {mode === "edit" ? "Salvar alterações" : "Criar ação"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function PlanoSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {/* KPI stat strip skeleton — 5 divided cells */}
      <div className="bg-[var(--surface)] rounded-lg p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-${i}`} className="px-3 first:pl-0 last:pr-0">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-7 w-10 mt-2" />
              <Skeleton className="h-2.5 w-24 mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Filters skeleton — chip row */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Action items table skeleton — title + header + 6 rows */}
      <div className="border-t border-border">
        <div className="pt-5 pb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-3 w-72 mb-3" />
        <div className="rounded-md border border-border overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-3 border-b border-border bg-[var(--surface)] px-4 py-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
          {/* Body rows */}
          {Array.from({ length: 6 }).map((_, r) => (
            <div
              key={`skel-r-${r}`}
              className="flex items-center gap-3 border-b border-border last:border-b-0 px-4 py-3"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-28 rounded-md" />
              <div className="flex gap-1 ml-auto">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PlanoView() {
  const go = useGo();
  const assessmentId = useAssessmentIdParam();
  const actionItemPrefill = useView((s) => s.actionItemPrefill);
  const setActionItemPrefill = useView((s) => s.setActionItemPrefill);

  const [items, setItems] = useState<ActionItem[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state (client-side derivation)
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [deptFilter, setDeptFilter] = useState<string>(FILTER_ALL);
  const [dimFilter, setDimFilter] = useState<string>(FILTER_ALL);
  const [responsibleFilter, setResponsibleFilter] = useState<string>("");

  // Form modal state
  // Lazy initializers consume actionItemPrefill at mount — if arriving from a
  // cross-module shortcut (resultados critical-dimension or inventário
  // "Criar Ação"), the form opens pre-filled without any setState-in-effect.
  const [formOpen, setFormOpen] = useState<boolean>(() => !!actionItemPrefill);
  const [formPrefill, setFormPrefill] = useState<ActionItemFormPrefill | null>(() =>
    actionItemPrefill ? { ...actionItemPrefill } : null,
  );
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  // Fetch action plan + assessment on mount / refresh.
  useEffect(() => {
    if (!assessmentId) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        let plan = await api.actionPlan.get(assessmentId);
        if (!plan.id) {
          plan = await api.actionPlan.create(assessmentId);
        }
        const [a] = await Promise.all([api.assessments.get(assessmentId)]);
        if (cancelled) return;
        setItems(plan.actionItems);
        setAssessment(a);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.message : "Erro inesperado ao carregar o plano de ação.";
        setError(msg);
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  // Consume the cross-module prefill: clear it once on mount so it doesn't
  // re-trigger after the user closes the auto-opened form.
  // setActionItemPrefill is a Zustand store setter (not a React useState
  // setter), so this is safe from the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (!actionItemPrefill) return;
    setActionItemPrefill(null);
  }, [actionItemPrefill, setActionItemPrefill]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter !== FILTER_ALL && i.status !== statusFilter) return false;
      if (deptFilter !== FILTER_ALL) {
        if (deptFilter === DEPT_COMPANY) {
          if (i.departmentId != null) return false;
        } else if (i.departmentId !== deptFilter) {
          return false;
        }
      }
      if (dimFilter !== FILTER_ALL && i.dimensionCode !== dimFilter) return false;
      if (responsibleFilter.trim() !== "") {
        const q = responsibleFilter.trim().toLowerCase();
        if (!i.who.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, deptFilter, dimFilter, responsibleFilter]);

  const clearFilters = () => {
    setStatusFilter(FILTER_ALL);
    setDeptFilter(FILTER_ALL);
    setDimFilter(FILTER_ALL);
    setResponsibleFilter("");
  };

  // ─── Mutations ────────────────────────────────────────────────────────────

  const handleStatusChange = async (itemId: string, status: ActionStatus) => {
    const prev = items;
    // Optimistic update
    setItems((cur) => cur.map((i) => (i.id === itemId ? { ...i, status } : i)));
    setPendingItemId(itemId);
    try {
      const updated = await api.actionPlan.updateItem(itemId, { status });
      setItems((cur) => cur.map((i) => (i.id === itemId ? updated : i)));
      toast.success(`Status alterado para "${ACTION_STATUS_LABELS[status]}".`);
    } catch (e) {
      // Revert on error
      setItems(prev);
      const msg = e instanceof ApiError ? e.message : "Erro ao alterar status.";
      toast.error(msg);
    } finally {
      setPendingItemId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await api.actionPlan.deleteItem(itemId);
      setItems((cur) => cur.filter((i) => i.id !== itemId));
      toast.success("Ação excluída do plano.");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro ao excluir ação.";
      toast.error(msg);
    }
  };

  const handleSubmit = async (body: Record<string, unknown>) => {
    if (editingItem) {
      const updated = await api.actionPlan.updateItem(editingItem.id, body);
      setItems((cur) => cur.map((i) => (i.id === editingItem.id ? updated : i)));
      toast.success("Ação atualizada.");
      setFormOpen(false);
      setEditingItem(null);
    } else {
      if (!assessmentId) {
        toast.error("Nenhuma avaliação selecionada.");
        throw new Error("no assessment");
      }
      const created = await api.actionPlan.addItem(assessmentId, body);
      setItems((cur) => [...cur, created]);
      toast.success("Ação criada no plano 5W2H.");
      setFormOpen(false);
      setFormPrefill(null);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormPrefill(null);
    setFormOpen(true);
  };

  const openEdit = (item: ActionItem) => {
    setEditingItem(item);
    setFormPrefill(null);
    setFormOpen(true);
  };

  // ─── Empty state: no assessment selected ──────────────────────────────────

  if (!assessmentId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
        <section className="border border-dashed border-border rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <ListChecks className="h-6 w-6 text-[var(--brand)]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg tracking-tight">Nenhuma avaliação selecionada</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Acesse uma avaliação concluída para visualizar e gerenciar o plano de ação 5W2H.
            </p>
          </div>
          <Button onClick={() => go("painel")}>
            <ChevronLeft className="h-4 w-4" />
            Voltar ao painel
          </Button>
        </section>
      </div>
    );
  }

  const formMode: "create" | "edit" = editingItem ? "edit" : "create";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      <TooltipProvider delayDuration={200}>
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-6 mb-8">
          <div className="flex items-start gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => go("avaliacao", { assessmentId })}
              aria-label="Voltar à avaliação"
              className="shrink-0 -ml-2 text-muted-foreground hover:text-[var(--brand)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground">
                Plano de Ação 5W2H
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Priorização de medidas de intervenção (NR-1)
              </p>
              {assessment ? (
                <p className="text-xs text-muted-foreground mt-1 truncate" title={assessment.title}>
                  {assessment.title}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova Ação
            </Button>
          </div>
        </header>

        {/* Main content */}
        {error ? (
          <section className="border border-dashed border-[var(--risk-high)]/30 rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-12 w-12 rounded-full risk-high-bg flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg tracking-tight">
                Não foi possível carregar o plano de ação
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={() => go("avaliacao", { assessmentId })}>
                <ChevronLeft className="h-4 w-4" />
                Voltar à avaliação
              </Button>
              <Button onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </section>
        ) : loading ? (
          <PlanoSkeleton />
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            <PlanHeaderKpis items={items} />

            {items.length === 0 ? (
              <section className="border border-dashed border-border rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
                  <ListChecks className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-lg tracking-tight">Plano de ação vazio</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Nenhuma ação cadastrada. Crie a primeira ação 5W2H para esta avaliação.
                  </p>
                </div>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Nova Ação
                </Button>
              </section>
            ) : (
              <>
                <PlanFilters
                  departments={assessment?.departments ?? []}
                  statusFilter={statusFilter}
                  deptFilter={deptFilter}
                  dimFilter={dimFilter}
                  responsibleFilter={responsibleFilter}
                  onStatusChange={setStatusFilter}
                  onDeptChange={setDeptFilter}
                  onDimChange={setDimFilter}
                  onResponsibleChange={setResponsibleFilter}
                  onClear={clearFilters}
                />
                <ActionItemsTable
                  items={filteredItems}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                  pendingItemId={pendingItemId}
                />
              </>
            )}
          </div>
        )}

        {/* Create / edit dialog */}
        <ActionItemForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) {
              setEditingItem(null);
              setFormPrefill(null);
            }
          }}
          assessment={assessment}
          mode={formMode}
          initialItem={editingItem}
          prefill={formPrefill}
          onSubmit={handleSubmit}
        />
      </TooltipProvider>
    </div>
  );
}

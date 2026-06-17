"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
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
import { toast } from "sonner";
import { format, parseISO, isBefore, startOfDay, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type {
  ActionItem,
  ActionStatus,
  Assessment,
  AssessmentDepartment,
  DimensionCode,
} from "@/lib/types";
import { COPSOQ_DIMENSIONS, getDimension } from "@/lib/copsoq-data";
import { ACTION_STATUS_LABELS, RISK_LEVEL_LABELS } from "@/lib/errors";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ActionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-brand-light text-white",
  completed: "risk-low-bg",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const STATUS_ORDER: Record<ActionStatus, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
};

const STATUS_OPTIONS: ActionStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

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
    <Badge className="bg-destructive text-white border-transparent gap-1">
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
      .map((i) => i.dimensionCode as string)
  );
  const completedDimCodes = new Set(
    items
      .filter((i) => i.status === "completed" && i.dimensionCode)
      .map((i) => i.dimensionCode as string)
  );
  let highCompletedPct = 0;
  if (highDimCodes.size > 0) {
    let count = 0;
    highDimCodes.forEach((code) => {
      if (completedDimCodes.has(code)) count += 1;
    });
    highCompletedPct = Math.round((count / highDimCodes.size) * 100);
  }

  const accentForPct =
    highCompletedPct >= 50
      ? "risk-low-bg"
      : highCompletedPct >= 25
        ? "risk-medium-bg"
        : "risk-high-bg";

  const kpis: {
    label: string;
    value: string;
    description: string;
    accent: string;
    icon: React.ElementType;
  }[] = [
    {
      label: "Total de Ações",
      value: String(total),
      description: "cadastradas no plano",
      accent: "bg-brand-light/15 text-brand-light",
      icon: ListChecks,
    },
    {
      label: "Pendentes",
      value: String(pending),
      description: "aguardando início",
      accent: "bg-muted text-muted-foreground",
      icon: Clock,
    },
    {
      label: "Em Andamento",
      value: String(inProgress),
      description: "em execução",
      accent: "bg-brand-light/15 text-brand-light",
      icon: RefreshCw,
    },
    {
      label: "Concluídas",
      value: String(completed),
      description: "finalizadas",
      accent: "risk-low-bg",
      icon: CheckCircle2,
    },
    {
      label: "% Dim. HIGH c/ ação concluída",
      value: `${highCompletedPct}%`,
      description: `${highDimCodes.size} dimensão(ões) HIGH`,
      accent: accentForPct,
      icon: CheckCircle2,
    },
  ];

  return (
    <section
      aria-label="Indicadores do plano de ação"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.label} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
                    {k.label}
                  </p>
                  <p className="text-2xl font-semibold font-mono-numeric mt-1">
                    {k.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {k.description}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center justify-center h-8 w-8 rounded-md shrink-0 ${k.accent}`}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
        <CardDescription>
          Combine status, GHE, dimensão e responsável para localizar ações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-status" className="sr-only">
              Status
            </Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger
                id="filter-status"
                className="w-full"
                aria-label="Filtrar por status"
              >
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
              <SelectTrigger
                id="filter-dept"
                className="w-full"
                aria-label="Filtrar por GHE"
              >
                <SelectValue placeholder="GHE" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todos os GHEs</SelectItem>
                <SelectItem value={DEPT_COMPANY}>Toda a empresa</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.departmentName}
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
              <SelectTrigger
                id="filter-dim"
                className="w-full"
                aria-label="Filtrar por dimensão"
              >
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
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── InlineStatusSelect (used inside ActionItemsTable) ──────────────────────

interface InlineStatusSelectProps {
  item: ActionItem;
  onStatusChange: (itemId: string, status: ActionStatus) => Promise<void>;
  pendingItemId: string | null;
}

function InlineStatusSelect({
  item,
  onStatusChange,
  pendingItemId,
}: InlineStatusSelectProps) {
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
        <SelectTrigger
          size="sm"
          className="w-[160px] h-8"
          aria-label="Alterar status da ação"
        >
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
        <Loader2
          className="h-3 w-3 animate-spin text-muted-foreground"
          aria-label="Salvando"
        />
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4" />
          Ações 5W2H
        </CardTitle>
        <CardDescription>
          {sorted.length} ação(ões) listada(s). Altere o status diretamente na
          linha ou clique em editar para ajustar os campos 5W2H.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scroll-area">
          <Table className="min-w-[1120px]">
            <caption className="sr-only">
              Lista de ações 5W2H do plano de ação. Colunas: GHE, dimensão, o
              quê, responsável, prazo (com indicação de vencido quando
              aplicável), status (seleção inline) e ações de editar e excluir.
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">GHE</TableHead>
                <TableHead className="w-[120px]">Dimensão</TableHead>
                <TableHead className="w-[280px]">O Quê</TableHead>
                <TableHead className="w-[160px]">Responsável</TableHead>
                <TableHead className="w-[150px]">Prazo</TableHead>
                <TableHead className="w-[190px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8 text-sm"
                  >
                    Nenhuma ação encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((item) => {
                  const dim = dimInfo(item.dimensionCode);
                  const overdue = isOverdue(item);
                  const statusLabel = ACTION_STATUS_LABELS[item.status];
                  return (
                    <TableRow key={item.id} className="align-top">
                      <TableCell className="align-top">
                        <div
                          className="truncate max-w-[150px] text-sm"
                          title={deptDisplayName(item)}
                        >
                          {deptDisplayName(item)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {dim ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={0}
                                className="inline-flex"
                                aria-label={`${dim.code} · ${dim.namePtBr}`}
                              >
                                <Badge
                                  variant="outline"
                                  className="font-mono-numeric font-semibold"
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
                      <TableCell className="align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="block max-w-[280px] truncate text-sm"
                              title={item.what}
                            >
                              {item.what}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm whitespace-pre-wrap text-left">
                            {item.what}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-1.5 text-sm">
                          <User
                            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <span
                            className="truncate max-w-[140px]"
                            title={item.who}
                          >
                            {item.who}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
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
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          <span className="sr-only">{statusLabel}</span>
                          <InlineStatusSelect
                            item={item}
                            onStatusChange={onStatusChange}
                            pendingItemId={pendingItemId}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                aria-label={`Excluir ação: ${item.what.slice(0, 40)}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir ação do plano?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação remove o item 5W2H e não pode ser
                                  desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    void onDelete(item.id);
                                  }}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
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
      </CardContent>
    </Card>
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
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {mode === "edit" ? "Editar Ação 5W2H" : "Nova Ação 5W2H"}
          </DialogTitle>
          <DialogDescription>
            Descreva a medida de intervenção conforme a metodologia 5W2H
            (O quê, Por quê, Quem, Onde, Quando, Como e Quanto custa).
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
  const [what, setWhat] = useState<string>(
    initialItem?.what ?? prefill?.what ?? ""
  );
  const [why, setWhy] = useState<string>(initialItem?.why ?? "");
  const [who, setWho] = useState<string>(initialItem?.who ?? "");
  const [whereVal, setWhereVal] = useState<string>(initialItem?.where ?? "");
  const [whenDate, setWhenDate] = useState<string>(
    initialItem?.whenDate ? initialItem.whenDate.slice(0, 10) : ""
  );
  const [how, setHow] = useState<string>(initialItem?.how ?? "");
  const [estimatedCost, setEstimatedCost] = useState<string>(
    initialItem?.estimatedCost != null ? String(initialItem.estimatedCost) : ""
  );
  const [departmentId, setDepartmentId] = useState<string>(
    initialItem?.departmentId ?? prefill?.departmentId ?? ""
  );
  const [dimensionCode, setDimensionCode] = useState<string>(
    initialItem?.dimensionCode ?? prefill?.dimensionCode ?? ""
  );
  const [riskLevelTrigger, setRiskLevelTrigger] = useState<string>(
    initialItem?.riskLevelTrigger ?? prefill?.riskLevelTrigger ?? ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (what.trim().length < 2) errs.what = "Mínimo de 2 caracteres.";
    if (why.trim().length < 2) errs.why = "Mínimo de 2 caracteres.";
    if (who.trim().length < 2) errs.who = "Mínimo de 2 caracteres.";
    if (whereVal.trim().length < 2) errs.where = "Mínimo de 2 caracteres.";
    if (how.trim().length < 2) errs.how = "Mínimo de 2 caracteres.";
    if (!whenDate) {
      errs.whenDate = "Informe a data prevista.";
    } else {
      const d = new Date(whenDate);
      if (Number.isNaN(d.getTime())) {
        errs.whenDate = "Data inválida (use AAAA-MM-DD).";
      }
    }
    if (estimatedCost.trim() !== "") {
      const n = Number(estimatedCost.replace(",", "."));
      if (Number.isNaN(n) || n < 0) errs.estimatedCost = "Valor inválido.";
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
        const n = Number(estimatedCost.replace(",", "."));
        body.estimatedCost = n;
      }
      await onSubmit(body);
    } catch (e) {
      let msg = "Erro ao salvar ação.";
      if (e instanceof ApiError) {
        if (e.code === "VALIDATION_ERROR") {
          msg = "Dados inválidos. Verifique os campos.";
        } else if (e.code === "ASSESSMENT_NOT_COMPLETED") {
          msg = "A avaliação precisa estar concluída para cadastrar ações.";
        } else {
          msg = e.message;
        }
      }
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* NR-1 info banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Orientação NR-1</AlertTitle>
        <AlertDescription>
          NR-1 orienta priorizar medidas na organização do trabalho antes de
          ações individuais.
        </AlertDescription>
      </Alert>

      {/* O Quê */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-what">
          O Quê <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ai-what"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="Descreva a ação a ser executada…"
          rows={2}
          aria-invalid={!!errors.what}
        />
        {errors.what ? (
          <p className="text-xs text-destructive">{errors.what}</p>
        ) : null}
      </div>

      {/* Por Quê */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-why">
          Por Quê <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ai-why"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Justifique o motivo da ação…"
          rows={2}
          aria-invalid={!!errors.why}
        />
        {errors.why ? (
          <p className="text-xs text-destructive">{errors.why}</p>
        ) : null}
      </div>

      {/* Quem + Onde */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-who">
            Quem <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ai-who"
            type="text"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="Responsável pela ação"
            aria-invalid={!!errors.who}
          />
          {errors.who ? (
            <p className="text-xs text-destructive">{errors.who}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-where">
            Onde <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ai-where"
            type="text"
            value={whereVal}
            onChange={(e) => setWhereVal(e.target.value)}
            placeholder="Local de execução"
            aria-invalid={!!errors.where}
          />
          {errors.where ? (
            <p className="text-xs text-destructive">{errors.where}</p>
          ) : null}
        </div>
      </div>

      {/* Quando + Quanto custa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-when">
            Quando <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ai-when"
            type="date"
            value={whenDate}
            onChange={(e) => setWhenDate(e.target.value)}
            aria-invalid={!!errors.whenDate}
          />
          {errors.whenDate ? (
            <p className="text-xs text-destructive">{errors.whenDate}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-cost">Quanto custa (opcional)</Label>
          <Input
            id="ai-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0,00"
            aria-invalid={!!errors.estimatedCost}
          />
          {errors.estimatedCost ? (
            <p className="text-xs text-destructive">{errors.estimatedCost}</p>
          ) : null}
        </div>
      </div>

      {/* Como */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-how">
          Como <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ai-how"
          value={how}
          onChange={(e) => setHow(e.target.value)}
          placeholder="Descreva o método de execução da ação…"
          rows={3}
          aria-invalid={!!errors.how}
        />
        {errors.how ? (
          <p className="text-xs text-destructive">{errors.how}</p>
        ) : null}
      </div>

      {/* GHE afetado + Dimensão + Nível de risco que originou */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-dept">GHE afetado (opcional)</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger
              id="ai-dept"
              className="w-full"
              aria-label="Selecionar GHE afetado"
            >
              <SelectValue placeholder="Toda a empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEPT_COMPANY}>Toda a empresa</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-dim">Dimensão (opcional)</Label>
          <Select value={dimensionCode} onValueChange={setDimensionCode}>
            <SelectTrigger
              id="ai-dim"
              className="w-full"
              aria-label="Selecionar dimensão COPSOQ"
            >
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
          <Label htmlFor="ai-risk">
            Nível de risco que originou (opcional)
          </Label>
          <Select
            value={riskLevelTrigger}
            onValueChange={setRiskLevelTrigger}
          >
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
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
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
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-96" />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PlanoView() {
  const go = useView((s) => s.go);
  const assessmentId = useView((s) => s.assessmentId);
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
  const [formPrefill, setFormPrefill] =
    useState<ActionItemFormPrefill | null>(
      () =>
        actionItemPrefill
          ? { ...actionItemPrefill }
          : null
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
        const [plan, a] = await Promise.all([
          api.actionPlan.get(assessmentId),
          api.assessments.get(assessmentId),
        ]);
        if (cancelled) return;
        setItems(plan.actionItems);
        setAssessment(a);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError
            ? e.message
            : "Erro inesperado ao carregar o plano de ação.";
        setError(msg);
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, refreshKey]);

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
      if (dimFilter !== FILTER_ALL && i.dimensionCode !== dimFilter)
        return false;
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
    setItems((cur) =>
      cur.map((i) => (i.id === itemId ? { ...i, status } : i))
    );
    setPendingItemId(itemId);
    try {
      const updated = await api.actionPlan.updateItem(itemId, { status });
      setItems((cur) => cur.map((i) => (i.id === itemId ? updated : i)));
      toast.success(`Status alterado para "${ACTION_STATUS_LABELS[status]}".`);
    } catch (e) {
      // Revert on error
      setItems(prev);
      const msg =
        e instanceof ApiError ? e.message : "Erro ao alterar status.";
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
      const msg =
        e instanceof ApiError ? e.message : "Erro ao excluir ação.";
      toast.error(msg);
    }
  };

  const handleSubmit = async (body: Record<string, unknown>) => {
    if (editingItem) {
      const updated = await api.actionPlan.updateItem(editingItem.id, body);
      setItems((cur) =>
        cur.map((i) => (i.id === editingItem.id ? updated : i))
      );
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ListChecks className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                Nenhuma avaliação selecionada
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Acesse uma avaliação concluída para visualizar e gerenciar o
                plano de ação 5W2H.
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

  const formMode: "create" | "edit" = editingItem ? "edit" : "create";

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
              <h1 className="text-2xl font-semibold tracking-tight">
                Plano de Ação 5W2H
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Priorização de medidas de intervenção (NR-1)
              </p>
              {assessment ? (
                <p
                  className="text-xs text-muted-foreground mt-1 truncate"
                  title={assessment.title}
                >
                  {assessment.title}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
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
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  Não foi possível carregar o plano de ação
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  {error}
                </p>
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
        ) : loading ? (
          <PlanoSkeleton />
        ) : (
          <div className="space-y-6">
            <PlanHeaderKpis items={items} />

            {items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <ListChecks className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">
                      Plano de ação vazio
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Nenhuma ação cadastrada. Crie a primeira ação 5W2H para
                      esta avaliação.
                    </p>
                  </div>
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Nova Ação
                  </Button>
                </CardContent>
              </Card>
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

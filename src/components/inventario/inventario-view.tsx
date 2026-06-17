"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Info,
  ListPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type {
  Assessment,
  DimensionCode,
  RiskInventoryItem,
  RiskLevel,
} from "@/lib/types";
import {
  COPSOQ_DIMENSIONS,
  MTE_FACTORS,
  getDimension,
} from "@/lib/copsoq-data";
import { classifyInventoryRisk } from "@/lib/scoring";
import { RISK_LEVEL_LABELS } from "@/lib/errors";
import {
  FIELD_ERROR_CLASS,
  FieldError,
  maskNumber,
  validateRequired,
} from "@/lib/form-utils";

import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ─── Helpers ────────────────────────────────────────────────────────────────

type EditableField =
  | "hazardDescription"
  | "possibleHarms"
  | "probability"
  | "severity"
  | "existingControls"
  | "proposedMeasures";

interface CellEdit {
  itemId: string;
  field: EditableField;
}

const PROB_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 — Improvável" },
  { value: 2, label: "2 — Possível" },
  { value: 3, label: "3 — Provável" },
];

const SEV_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 — Leve" },
  { value: 2, label: "2 — Moderado" },
  { value: 3, label: "3 — Grave" },
];

function mteFactorInfo(code: string | null) {
  if (!code) return null;
  return MTE_FACTORS.find((f) => f.code === code) ?? null;
}

function riskLevelClass(level: RiskLevel): string {
  switch (level) {
    case "LOW":
      return "risk-low-bg";
    case "MEDIUM":
      return "risk-medium-bg";
    case "HIGH":
    default:
      return "risk-high-bg";
  }
}

// ─── RiskLevelCell ──────────────────────────────────────────────────────────

function RiskLevelCell({
  probability,
  severity,
}: {
  probability: number;
  severity: number;
}) {
  const { level, score } = classifyInventoryRisk(probability, severity);
  const label = RISK_LEVEL_LABELS[level] ?? level;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2.75rem] px-2 py-0.5 rounded text-[11px] font-semibold font-mono-numeric ${riskLevelClass(level)}`}
      aria-label={`Nível de risco: ${label}, pontuação ${score}`}
      title={`${label} · P${probability} × S${severity} = ${score}`}
    >
      {label}
    </span>
  );
}

// ─── EditableTextCell ───────────────────────────────────────────────────────

interface EditableTextCellProps {
  item: RiskInventoryItem;
  field: EditableField;
  value: string | null;
  placeholder: string;
  ariaLabel: string;
  onPatch: (itemId: string, body: Record<string, unknown>, field: EditableField) => Promise<void>;
  savingCell: CellEdit | null;
  savedCell: CellEdit | null;
  editingCell: CellEdit | null;
  setEditingCell: (c: CellEdit | null) => void;
  draft: string;
  setDraft: (s: string) => void;
}

function EditableTextCell({
  item,
  field,
  value,
  placeholder,
  ariaLabel,
  onPatch,
  savingCell,
  savedCell,
  editingCell,
  setEditingCell,
  draft,
  setDraft,
}: EditableTextCellProps) {
  const isEditing = editingCell?.itemId === item.id && editingCell.field === field;
  const isSaving = savingCell?.itemId === item.id && savingCell.field === field;
  const isSaved = savedCell?.itemId === item.id && savedCell.field === field;

  if (isEditing) {
    return (
      <Textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          setEditingCell(null);
          if (trimmed === (value ?? "")) return;
          void onPatch(item.id, { [field]: trimmed }, field);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEditingCell(null);
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        className="min-h-[60px] resize-y text-xs leading-relaxed"
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setEditingCell({ itemId: item.id, field });
        setDraft(value ?? "");
      }}
      className="group w-full text-left text-xs rounded-sm px-2 py-1.5 -mx-2 -my-1 hover:bg-[var(--surface)] cursor-pointer transition-colors min-h-[36px] flex items-start gap-1.5"
      aria-label={ariaLabel}
    >
      {value && value.trim().length > 0 ? (
        <span className="whitespace-pre-wrap break-words flex-1 leading-relaxed">
          {value}
        </span>
      ) : (
        <span className="text-muted-foreground italic flex-1">{placeholder}</span>
      )}
      <span className="flex items-center shrink-0 mt-0.5">
        {isSaving ? (
          <Loader2
            className="h-3 w-3 animate-spin text-muted-foreground"
            aria-label="Salvando"
          />
        ) : isSaved ? (
          <Check
            className="h-3 w-3 text-[var(--risk-low)]"
            aria-label="Salvo"
          />
        ) : (
          <Pencil
            className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}

// ─── EditableSelectCell ─────────────────────────────────────────────────────

interface EditableSelectCellProps {
  item: RiskInventoryItem;
  field: "probability" | "severity";
  value: number;
  options: { value: number; label: string }[];
  ariaLabel: string;
  onPatch: (itemId: string, body: Record<string, unknown>, field: EditableField) => Promise<void>;
  savingCell: CellEdit | null;
  savedCell: CellEdit | null;
  editingCell: CellEdit | null;
  setEditingCell: (c: CellEdit | null) => void;
}

function EditableSelectCell({
  item,
  field,
  value,
  options,
  ariaLabel,
  onPatch,
  savingCell,
  savedCell,
  editingCell,
  setEditingCell,
}: EditableSelectCellProps) {
  const isEditing = editingCell?.itemId === item.id && editingCell.field === field;
  const isSaving = savingCell?.itemId === item.id && savingCell.field === field;
  const isSaved = savedCell?.itemId === item.id && savedCell.field === field;
  const currentLabel = options.find((o) => o.value === value)?.label ?? String(value);

  if (isEditing) {
    return (
      <Select
        defaultOpen
        value={String(value)}
        onValueChange={(v) => {
          const n = Number(v);
          setEditingCell(null);
          if (n === value) return;
          void onPatch(item.id, { [field]: n }, field);
        }}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null);
        }}
      >
        <SelectTrigger size="sm" className="w-full min-w-[7rem] h-8" aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditingCell({ itemId: item.id, field })}
      className="group w-full inline-flex items-center justify-between gap-1 text-xs rounded-sm px-2 py-1 -mx-2 -my-1 hover:bg-[var(--surface)] cursor-pointer transition-colors min-h-[28px]"
      aria-label={ariaLabel}
    >
      <span className="font-mono-numeric font-medium">{currentLabel}</span>
      {isSaving ? (
        <Loader2
          className="h-3 w-3 animate-spin text-muted-foreground"
          aria-label="Salvando"
        />
      ) : isSaved ? (
        <Check
          className="h-3 w-3 text-[var(--risk-low)]"
          aria-label="Salvo"
        />
      ) : (
        <Pencil
          className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── InventoryTable ─────────────────────────────────────────────────────────

interface InventoryTableProps {
  items: RiskInventoryItem[];
  onPatch: (itemId: string, body: Record<string, unknown>, field: EditableField) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onCreateAction: (item: RiskInventoryItem) => void;
  savingCell: CellEdit | null;
  savedCell: CellEdit | null;
}

function InventoryTable({
  items,
  onPatch,
  onDelete,
  onCreateAction,
  savingCell,
  savedCell,
}: InventoryTableProps) {
  const [editingCell, setEditingCell] = useState<CellEdit | null>(null);
  const [draft, setDraft] = useState<string>("");
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
      const an = (a.departmentName ?? "").toLowerCase();
      const bn = (b.departmentName ?? "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      const ad = a.dimensionCode ?? "ZZZ";
      const bd = b.dimensionCode ?? "ZZZ";
      return ad.localeCompare(bd);
    });
  }, [items]);

  return (
    <section
      aria-label="Itens do inventário"
      className="border-t border-border"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pt-4 pb-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-tight text-foreground flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
            Itens do inventário
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} item(ns) no inventário. Clique em uma célula para
            editar — as alterações são salvas automaticamente.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto scroll-area border-t border-border">
        <Table className="min-w-[1280px]">
          <caption className="sr-only">
            Inventário de riscos psicossociais. Colunas: tipo (automático ou
            manual), GHE, fator FRPRT MTE, dimensão COPSOQ, perigo
            identificado, possíveis danos, probabilidade, severidade, nível de
            risco calculado, controles existentes, medidas propostas, ações.
          </caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[80px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Tipo
              </TableHead>
              <TableHead className="w-[140px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                GHE
              </TableHead>
              <TableHead className="w-[200px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Fator FRPRT MTE
              </TableHead>
              <TableHead className="w-[200px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Dimensão
              </TableHead>
              <TableHead className="w-[220px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Perigo Identificado
              </TableHead>
              <TableHead className="w-[220px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Possíveis Danos
              </TableHead>
              <TableHead className="w-[150px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Probabilidade
              </TableHead>
              <TableHead className="w-[150px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Severidade
              </TableHead>
              <TableHead className="w-[110px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Nível
              </TableHead>
              <TableHead className="w-[220px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Controles Existentes
              </TableHead>
              <TableHead className="w-[260px] text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Medidas Propostas
              </TableHead>
              <TableHead className="w-[80px] text-right text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => {
              const mte = mteFactorInfo(item.mteFactorCode);
              const dim = item.dimensionCode
                ? (() => {
                    try {
                      return getDimension(item.dimensionCode as DimensionCode);
                    } catch {
                      return null;
                    }
                  })()
                : null;
              return (
                <TableRow
                  key={item.id}
                  className="border-b border-border hover:bg-[var(--surface)] transition-colors"
                >
                  <TableCell className="py-3 align-top">
                    {item.isManual ? (
                      <Badge
                        variant="outline"
                        className="border-[var(--brand-light)]/40 text-[var(--brand-light)] bg-transparent"
                      >
                        Manual
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-border bg-transparent"
                      >
                        Auto
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 align-top font-medium">
                    <div
                      className="truncate max-w-[140px] text-sm"
                      title={item.departmentName ?? "—"}
                    >
                      {item.departmentName ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    {mte ? (
                      <Badge
                        variant="outline"
                        className="font-mono-numeric gap-1 max-w-[200px] bg-transparent"
                      >
                        <span className="font-semibold">{mte.code}</span>
                        <span className="text-muted-foreground font-sans">·</span>
                        <span className="font-sans font-normal truncate">
                          {mte.name}
                        </span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    {dim ? (
                      <Badge
                        variant="outline"
                        className="font-mono-numeric gap-1 max-w-[200px] bg-transparent"
                      >
                        <span className="font-semibold">{dim.code}</span>
                        <span className="text-muted-foreground font-sans">·</span>
                        <span className="font-sans font-normal truncate">
                          {dim.namePtBr}
                        </span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <EditableTextCell
                      item={item}
                      field="hazardDescription"
                      value={item.hazardDescription}
                      placeholder="Clique para descrever o perigo…"
                      ariaLabel="Editar perigo identificado"
                      onPatch={onPatch}
                      savingCell={savingCell}
                      savedCell={savedCell}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      draft={draft}
                      setDraft={setDraft}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <EditableTextCell
                      item={item}
                      field="possibleHarms"
                      value={item.possibleHarms}
                      placeholder="Clique para descrever os danos…"
                      ariaLabel="Editar possíveis danos"
                      onPatch={onPatch}
                      savingCell={savingCell}
                      savedCell={savedCell}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      draft={draft}
                      setDraft={setDraft}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <EditableSelectCell
                      item={item}
                      field="probability"
                      value={item.probability}
                      options={PROB_OPTIONS}
                      ariaLabel={`Editar probabilidade do item ${item.id}`}
                      onPatch={onPatch}
                      savingCell={savingCell}
                      savedCell={savedCell}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <EditableSelectCell
                      item={item}
                      field="severity"
                      value={item.severity}
                      options={SEV_OPTIONS}
                      ariaLabel={`Editar severidade do item ${item.id}`}
                      onPatch={onPatch}
                      savingCell={savingCell}
                      savedCell={savedCell}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <RiskLevelCell
                      probability={item.probability}
                      severity={item.severity}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <EditableTextCell
                      item={item}
                      field="existingControls"
                      value={item.existingControls}
                      placeholder="Clique para descrever controles…"
                      ariaLabel="Editar controles existentes"
                      onPatch={onPatch}
                      savingCell={savingCell}
                      savedCell={savedCell}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      draft={draft}
                      setDraft={setDraft}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <EditableTextCell
                        item={item}
                        field="proposedMeasures"
                        value={item.proposedMeasures}
                        placeholder="Clique para propor medidas…"
                        ariaLabel="Editar medidas propostas"
                        onPatch={onPatch}
                        savingCell={savingCell}
                        savedCell={savedCell}
                        editingCell={editingCell}
                        setEditingCell={setEditingCell}
                        draft={draft}
                        setDraft={setDraft}
                      />
                      {item.proposedMeasures &&
                      item.proposedMeasures.trim().length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onCreateAction(item)}
                          className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:text-[var(--brand-light)] hover:underline self-start font-medium cursor-pointer"
                          aria-label={`Criar ação a partir das medidas propostas do item ${item.id}`}
                        >
                          <ArrowRight className="h-3 w-3" />
                          Criar Ação
                        </button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 align-top text-right">
                    {item.isManual ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-[var(--risk-high)]"
                            aria-label="Excluir item manual do inventário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display text-xl">
                              Excluir item do inventário?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação remove o risco manual do inventário
                              e não pode ser desfeita.
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
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="inline-flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground/40 cursor-not-allowed"
                              disabled
                              aria-label="Itens automáticos não podem ser excluídos"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Itens automáticos não podem ser excluídos
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
    </section>
  );
}

// ─── ManualRiskForm ─────────────────────────────────────────────────────────

interface ManualRiskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
  prefillMteFactor?: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}

function ManualRiskForm({
  open,
  onOpenChange,
  assessment,
  prefillMteFactor,
  onSubmit,
}: ManualRiskFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--brand)]" />
            Adicionar Risco Manual
          </DialogTitle>
          <DialogDescription>
            Inclua um fator de risco psicossocial identificado por observação
            direta ou apontamento do GHE, não coberto automaticamente pela
            pesquisa COPSOQ II-BR.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ManualRiskFormContents
            key={prefillMteFactor ?? "none"}
            assessment={assessment}
            prefillMteFactor={prefillMteFactor}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface ManualRiskFormContentsProps {
  assessment: Assessment | null;
  prefillMteFactor?: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function ManualRiskFormContents({
  assessment,
  prefillMteFactor,
  onSubmit,
  onCancel,
}: ManualRiskFormContentsProps) {
  const departments = assessment?.departments ?? [];

  const [assessmentDepartmentId, setAssessmentDepartmentId] = useState<string>("");
  const [mteFactorCode, setMteFactorCode] = useState<string>(prefillMteFactor ?? "");
  const [dimensionCode, setDimensionCode] = useState<string>("");
  const [hazardDescription, setHazardDescription] = useState("");
  const [possibleHarms, setPossibleHarms] = useState("");
  const [probability, setProbability] = useState<string>("2");
  const [severity, setSeverity] = useState<string>("2");
  const [existingControls, setExistingControls] = useState("");
  const [proposedMeasures, setProposedMeasures] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!mteFactorCode) errs.mteFactorCode = "Selecione um fator FRPRT MTE.";
    if (!validateRequired(hazardDescription, 3))
      errs.hazardDescription = "Mínimo de 3 caracteres.";
    if (!validateRequired(possibleHarms, 3))
      errs.possibleHarms = "Mínimo de 3 caracteres.";
    if (!probability) errs.probability = "Selecione a probabilidade.";
    if (!severity) errs.severity = "Selecione a severidade.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const body: Record<string, unknown> = {
        mteFactorCode,
        hazardDescription: hazardDescription.trim(),
        possibleHarms: possibleHarms.trim(),
        probability: Number(probability),
        severity: Number(severity),
      };
      if (assessmentDepartmentId)
        body.assessmentDepartmentId = assessmentDepartmentId;
      if (dimensionCode) body.dimensionCode = dimensionCode;
      if (existingControls.trim())
        body.existingControls = existingControls.trim();
      if (proposedMeasures.trim())
        body.proposedMeasures = proposedMeasures.trim();
      await onSubmit(body);
    } catch (e) {
      let msg = "Erro ao adicionar risco manual.";
      if (e instanceof ApiError) {
        if (e.code === "VALIDATION_ERROR") {
          // Backend validation error → map to form-level FieldError display
          // with the SAME shared styling used by the front-side onBlur errors.
          msg = e.message || "Dados inválidos. Verifique os campos.";
          setErrors({ form: msg });
        } else if (e.code === "ASSESSMENT_NOT_COMPLETED") {
          msg = "A avaliação precisa estar concluída para incluir itens no inventário.";
        } else if (e.code === "ASSESSMENT_DEPT_NOT_FOUND") {
          msg = "GHE selecionado não pertence a esta avaliação.";
        } else {
          msg = e.message;
        }
      }
      toast.error(msg);
      setSubmitting(false);
    }
  };

  // Per-field onBlur validators — same shared FieldError styling as submit.
  const validateOnBlur = (field: "hazardDescription" | "possibleHarms") => {
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "hazardDescription") {
        next.hazardDescription = validateRequired(hazardDescription, 3)
          ? undefined
          : "Mínimo de 3 caracteres.";
      } else if (field === "possibleHarms") {
        next.possibleHarms = validateRequired(possibleHarms, 3)
          ? undefined
          : "Mínimo de 3 caracteres.";
      }
      return next;
    });
  };

  const probNum = Number(probability) || 2;
  const sevNum = Number(severity) || 2;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Backend VALIDATION_ERROR → render with the SAME shared FieldError
          styling used by front-side onBlur errors. */}
      {errors.form ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--risk-high)]/40 bg-[var(--surface)] p-3"
        >
          <FieldError message={errors.form} />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="manual-ghe">GHE</Label>
        <Select
          value={assessmentDepartmentId}
          onValueChange={setAssessmentDepartmentId}
        >
          <SelectTrigger
            id="manual-ghe"
            className="w-full"
            aria-label="Selecionar GHE"
          >
            <SelectValue placeholder="Selecionar GHE (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.departmentName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Opcional — vincule este risco a um GHE específico da avaliação.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-mte">
          Fator FRPRT MTE <span className="text-[var(--risk-high)]">*</span>
        </Label>
        <Select value={mteFactorCode} onValueChange={setMteFactorCode}>
          <SelectTrigger
            id="manual-mte"
            className={`w-full ${errors.mteFactorCode ? FIELD_ERROR_CLASS : ""}`}
            aria-label="Selecionar fator FRPRT MTE"
            aria-invalid={!!errors.mteFactorCode}
            aria-describedby={
              errors.mteFactorCode ? "manual-mte-err" : undefined
            }
          >
            <SelectValue placeholder="Selecionar fator" />
          </SelectTrigger>
          <SelectContent>
            {MTE_FACTORS.map((f) => (
              <SelectItem key={f.code} value={f.code}>
                {f.code} · {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.mteFactorCode ? (
          <FieldError id="manual-mte-err" message={errors.mteFactorCode} />
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-dim">Dimensão COPSOQ (opcional)</Label>
        <Select value={dimensionCode} onValueChange={setDimensionCode}>
          <SelectTrigger
            id="manual-dim"
            className="w-full"
            aria-label="Selecionar dimensão COPSOQ"
          >
            <SelectValue placeholder="Selecionar dimensão" />
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
        <Label htmlFor="manual-hazard">
          Perigo Identificado <span className="text-[var(--risk-high)]">*</span>
        </Label>
        <Textarea
          id="manual-hazard"
          value={hazardDescription}
          onChange={(e) => {
            setHazardDescription(e.target.value);
            if (errors.hazardDescription)
              setErrors((p) => ({ ...p, hazardDescription: undefined }));
          }}
          onBlur={() => validateOnBlur("hazardDescription")}
          placeholder="Descreva o perigo identificado (mínimo 3 caracteres)…"
          rows={2}
          aria-invalid={!!errors.hazardDescription}
          aria-describedby={
            errors.hazardDescription ? "manual-hazard-err" : undefined
          }
          className={errors.hazardDescription ? FIELD_ERROR_CLASS : ""}
        />
        {errors.hazardDescription ? (
          <FieldError
            id="manual-hazard-err"
            message={errors.hazardDescription}
          />
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-harms">
          Possíveis Danos <span className="text-[var(--risk-high)]">*</span>
        </Label>
        <Textarea
          id="manual-harms"
          value={possibleHarms}
          onChange={(e) => {
            setPossibleHarms(e.target.value);
            if (errors.possibleHarms)
              setErrors((p) => ({ ...p, possibleHarms: undefined }));
          }}
          onBlur={() => validateOnBlur("possibleHarms")}
          placeholder="Descreva os possíveis danos (mínimo 3 caracteres)…"
          rows={2}
          aria-invalid={!!errors.possibleHarms}
          aria-describedby={
            errors.possibleHarms ? "manual-harms-err" : undefined
          }
          className={errors.possibleHarms ? FIELD_ERROR_CLASS : ""}
        />
        {errors.possibleHarms ? (
          <FieldError id="manual-harms-err" message={errors.possibleHarms} />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="manual-prob">
            Probabilidade <span className="text-[var(--risk-high)]">*</span>
          </Label>
          <Select
            value={probability}
            onValueChange={(v) =>
              // maskNumber defensively clamps to [1,3] — the Select options
              // already constrain to this, but the mask guards against any
              // future programmatic value.
              setProbability(maskNumber(v, { min: 1, max: 3 }))
            }
          >
            <SelectTrigger
              id="manual-prob"
              className={`w-full ${errors.probability ? FIELD_ERROR_CLASS : ""}`}
              aria-label="Selecionar probabilidade"
              aria-invalid={!!errors.probability}
              aria-describedby={
                errors.probability ? "manual-prob-err" : undefined
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROB_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.probability ? (
            <FieldError id="manual-prob-err" message={errors.probability} />
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-sev">
            Severidade <span className="text-[var(--risk-high)]">*</span>
          </Label>
          <Select
            value={severity}
            onValueChange={(v) =>
              setSeverity(maskNumber(v, { min: 1, max: 3 }))
            }
          >
            <SelectTrigger
              id="manual-sev"
              className={`w-full ${errors.severity ? FIELD_ERROR_CLASS : ""}`}
              aria-label="Selecionar severidade"
              aria-invalid={!!errors.severity}
              aria-describedby={
                errors.severity ? "manual-sev-err" : undefined
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEV_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.severity ? (
            <FieldError id="manual-sev-err" message={errors.severity} />
          ) : null}
        </div>
      </div>

      <div className="rounded-md border border-[var(--brand-light)]/30 bg-[var(--surface)] p-3 text-xs flex items-center gap-2 flex-wrap">
        <Info className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
        <span className="text-muted-foreground">Nível calculado (P × S):</span>
        <RiskLevelCell probability={probNum} severity={sevNum} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-controls">Controles Existentes (opcional)</Label>
        <Textarea
          id="manual-controls"
          value={existingControls}
          onChange={(e) => setExistingControls(e.target.value)}
          placeholder="Descreva os controles existentes…"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-measures">Medidas Propostas (opcional)</Label>
        <Textarea
          id="manual-measures"
          value={proposedMeasures}
          onChange={(e) => setProposedMeasures(e.target.value)}
          placeholder="Descreva as medidas propostas…"
          rows={2}
        />
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
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── UncoveredFactorsSection ────────────────────────────────────────────────

function UncoveredFactorsSection({
  onAddFactor,
}: {
  onAddFactor: (mteFactorCode: string) => void;
}) {
  const uncovered = useMemo(
    () => MTE_FACTORS.filter((f) => !f.coveredByCopsoq),
    []
  );

  return (
    <Collapsible defaultOpen={false} asChild>
      <section
        aria-label="Fatores MTE não cobertos pelo COPSOQ II-BR"
        className="border-t border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group w-full text-left pt-5 pb-4 flex items-start justify-between gap-3 hover:bg-[var(--surface)] cursor-pointer transition-colors -mx-2 px-2 rounded-sm"
            aria-label="Alternar fatores MTE não cobertos"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Info className="h-4 w-4 text-[var(--brand)] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-display text-base tracking-tight text-foreground">
                  Fatores MTE não cobertos pelo COPSOQ II-BR
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {uncovered.length} fator(es) FRPRT do MTE não são medidos
                  pelo instrumento. Clique em &ldquo;Adicionar&rdquo; para
                  incluí-los manualmente no inventário.
                </p>
              </div>
            </div>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="border-t border-border divide-y divide-border">
            {uncovered.map((f) => (
              <li
                key={f.code}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="font-mono-numeric font-semibold bg-transparent"
                    >
                      {f.code}
                    </Badge>
                    <span className="font-medium text-sm">{f.name}</span>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-[10px] font-normal bg-[var(--surface)] border-border"
                    >
                      {f.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Não coberto pelo COPSOQ II-BR.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddFactor(f.code)}
                  className="shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function InventarioSkeleton() {
  return (
    <div className="space-y-10" aria-hidden="true">
      {/* Filter chips skeleton */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>

      {/* Inventory table skeleton — header + 6 rows with cell-shaped blocks */}
      <div className="rounded-md border border-border overflow-hidden">
        {/* Header row — surface-tinted background, ~12 small cell blocks */}
        <div className="flex items-center gap-2 border-b border-border bg-[var(--surface)] px-3 py-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-3 ${i === 0 ? "w-12" : i === 1 ? "w-20" : i === 2 ? "w-32" : i === 3 ? "w-28" : i === 4 ? "w-24" : i === 5 ? "w-20" : i === 6 ? "w-16" : i === 7 ? "w-20" : "w-24"}`}
            />
          ))}
        </div>
        {/* Body rows */}
        {Array.from({ length: 6 }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-2 border-b border-border last:border-b-0 px-3 py-3"
          >
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Uncovered factors section skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="rounded-md border border-border p-5 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-7 w-40 rounded-md mt-2" />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function InventarioView() {
  const go = useView((s) => s.go);
  const assessmentId = useView((s) => s.assessmentId);
  const inventoryPrefill = useView((s) => s.inventoryPrefill);
  const setInventoryPrefill = useView((s) => s.setInventoryPrefill);
  const setActionItemPrefill = useView((s) => s.setActionItemPrefill);

  const [autoItems, setAutoItems] = useState<RiskInventoryItem[]>([]);
  const [manualItems, setManualItems] = useState<RiskInventoryItem[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lazy initial state so the form auto-opens when arriving from the
  // resultados uncovered-factors shortcut (inventoryPrefill.mteFactorCode).
  const [manualFormPrefill, setManualFormPrefill] = useState<{
    mteFactorCode?: string;
  } | null>(() =>
    inventoryPrefill?.mteFactorCode
      ? { mteFactorCode: inventoryPrefill.mteFactorCode }
      : null
  );
  const [manualFormOpen, setManualFormOpen] = useState<boolean>(
    () => !!inventoryPrefill?.mteFactorCode
  );

  const [savingCell, setSavingCell] = useState<CellEdit | null>(null);
  const [savedCell, setSavedCell] = useState<CellEdit | null>(null);

  // Fetch inventory + assessment on mount / refresh.
  useEffect(() => {
    if (!assessmentId) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [group, a] = await Promise.all([
          api.inventory.list(assessmentId),
          api.assessments.get(assessmentId),
        ]);
        if (cancelled) return;
        setAutoItems(group.autoItems);
        setManualItems(group.manualItems);
        setAssessment(a);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError
            ? e.message
            : "Erro inesperado ao carregar o inventário.";
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
  // re-trigger after the user closes the auto-opened form. setInventoryPrefill
  // is a Zustand store setter (not a React useState setter), so this is safe.
  useEffect(() => {
    if (!inventoryPrefill?.mteFactorCode) return;
    setInventoryPrefill(null);
  }, [inventoryPrefill, setInventoryPrefill]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const allItems = useMemo(
    () => [...autoItems, ...manualItems],
    [autoItems, manualItems]
  );

  const highRiskCount = useMemo(
    () =>
      allItems.filter(
        (i) => classifyInventoryRisk(i.probability, i.severity).level === "HIGH"
      ).length,
    [allItems]
  );

  const handlePatch = async (
    itemId: string,
    body: Record<string, unknown>,
    field: EditableField
  ) => {
    setSavingCell({ itemId, field });
    setSavedCell(null);
    try {
      const updated = await api.inventory.update(itemId, body);
      setAutoItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      setManualItems((prev) =>
        prev.map((i) => (i.id === itemId ? updated : i))
      );
      setSavingCell(null);
      setSavedCell({ itemId, field });
      window.setTimeout(() => {
        setSavedCell((cur) =>
          cur && cur.itemId === itemId && cur.field === field ? null : cur
        );
      }, 1500);
      // No success toast — the inline savedCell indicator confirms the save.
      // Errors still surface via toast below.
    } catch (e) {
      setSavingCell(null);
      const msg =
        e instanceof ApiError ? e.message : "Erro ao salvar alteração.";
      toast.error(msg);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await api.inventory.delete(itemId);
      setManualItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Item removido do inventário.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "ITEM_NOT_MANUAL") {
        toast.error("Itens automáticos não podem ser excluídos.");
        return;
      }
      const msg =
        e instanceof ApiError ? e.message : "Erro ao excluir item.";
      toast.error(msg);
    }
  };

  const handleAddManual = async (body: Record<string, unknown>) => {
    if (!assessmentId) {
      toast.error("Nenhuma avaliação selecionada.");
      throw new Error("no assessment");
    }
    const item = await api.inventory.addManual(assessmentId, body);
    setManualItems((prev) => [...prev, item]);
    toast.success("Risco manual adicionado ao inventário.");
    setManualFormOpen(false);
    setManualFormPrefill(null);
  };

  const handleCreateAction = (item: RiskInventoryItem) => {
    setActionItemPrefill({
      departmentId: item.departmentId ?? undefined,
      dimensionCode: item.dimensionCode ?? undefined,
      what: item.proposedMeasures ?? "",
    });
    if (assessmentId) go("plano", { assessmentId });
  };

  const openManualForm = (mteFactorCode?: string) => {
    setManualFormPrefill(mteFactorCode ? { mteFactorCode } : null);
    setManualFormOpen(true);
  };

  // Empty state: no assessment selected.
  if (!assessmentId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
        <section className="border border-dashed border-border rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-[var(--brand)]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg tracking-tight">
              Nenhuma avaliação selecionada
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Acesse uma avaliação concluída para visualizar o inventário de
              riscos psicossociais.
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
                Inventário de Riscos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Identificação de perigos e avaliação prioritária (NR-1)
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
            <Button size="sm" onClick={() => openManualForm()}>
              <Plus className="h-4 w-4" />
              Adicionar Risco Manual
            </Button>
          </div>
        </header>

        {/* Summary chips */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge variant="outline" className="gap-1.5 bg-transparent">
            <span className="font-mono-numeric font-semibold">
              {autoItems.length}
            </span>
            <span className="text-muted-foreground">automáticos</span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 bg-transparent">
            <span className="font-mono-numeric font-semibold">
              {manualItems.length}
            </span>
            <span className="text-muted-foreground">manuais</span>
          </Badge>
          <Badge className="risk-high-bg gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="font-mono-numeric font-semibold">
              {highRiskCount}
            </span>
            <span>alto risco</span>
          </Badge>
        </div>

        {/* Main content */}
        {error ? (
          <section className="border border-dashed border-[var(--risk-high)]/30 rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-12 w-12 rounded-full risk-high-bg flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg tracking-tight">
                Não foi possível carregar o inventário
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
          </section>
        ) : loading ? (
          <InventarioSkeleton />
        ) : allItems.length === 0 ? (
          <section className="border border-dashed border-border rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
              <ListPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg tracking-tight">Inventário vazio</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Nenhum item automático foi gerado (nenhum GHE elegível
                apresentou dimensão com risco médio ou alto). Adicione riscos
                manualmente ou verifique o resultado da avaliação.
              </p>
            </div>
            <Button onClick={() => openManualForm()}>
              <Plus className="h-4 w-4" />
              Adicionar Risco Manual
            </Button>
          </section>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-300">
            <InventoryTable
              items={allItems}
              onPatch={handlePatch}
              onDelete={handleDelete}
              onCreateAction={handleCreateAction}
              savingCell={savingCell}
              savedCell={savedCell}
            />
            <UncoveredFactorsSection onAddFactor={openManualForm} />
          </div>
        )}

        {/* Manual risk form dialog */}
        <ManualRiskForm
          open={manualFormOpen}
          onOpenChange={setManualFormOpen}
          assessment={assessment}
          prefillMteFactor={manualFormPrefill?.mteFactorCode}
          onSubmit={handleAddManual}
        />
      </TooltipProvider>
    </div>
  );
}

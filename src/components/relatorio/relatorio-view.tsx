"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  FileDown,
  FileSpreadsheet,
  FileText,
  Info,
  ListChecks,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { addYears, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { api, ApiError } from "@/lib/api";
import { useAuth, useView } from "@/lib/store";
import type {
  ActionPlan,
  Assessment,
  AssessmentProgress,
  CompanySummary,
  DashboardData,
  DimensionCode,
  Report,
  RiskInventoryGroup,
  RiskLevel,
} from "@/lib/types";
import {
  COPSOQ_DIMENSIONS,
  getDimension,
} from "@/lib/copsoq-data";
import {
  ASSESSMENT_STATUS_LABELS,
  PROFESSION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
} from "@/lib/errors";
import { formatCnpj } from "@/lib/cnpj";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

// ─── Types & helpers ─────────────────────────────────────────────────────────

type ReportType = Report["type"];

/**
 * The backend reports GET route returns `metadataJson` (string) instead of the
 * `metadata` object promised by the Report DTO. Normalise to either shape so
 * the rest of the component can rely on `report.metadata`.
 */
type RawReport = Omit<Report, "metadata"> & {
  metadataJson?: string;
  metadata?: Report["metadata"];
};

function normalizeReport(raw: RawReport): Report {
  let metadata: Report["metadata"] = null;
  if (raw.metadata && typeof raw.metadata === "object") {
    metadata = raw.metadata as Report["metadata"];
  } else if (typeof raw.metadataJson === "string" && raw.metadataJson) {
    try {
      const parsed: unknown = JSON.parse(raw.metadataJson);
      if (parsed && typeof parsed === "object") {
        metadata = parsed as Report["metadata"];
      }
    } catch {
      // ignore parse error — metadata stays null
    }
  }
  const { metadataJson: _ignored, ...rest } = raw;
  void _ignored;
  return { ...(rest as Omit<Report, "metadata">), metadata };
}

function formatDateTime(iso: string): string {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function formatLongDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function formatBRL(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function riskHex(level: RiskLevel): string {
  if (level === "HIGH") return "var(--risk-high)";
  if (level === "MEDIUM") return "var(--risk-medium)";
  return "var(--risk-low)";
}

function riskFg(level: RiskLevel): string {
  return level === "MEDIUM" ? "#2A2620" : "#FAF8F4";
}

function classifyPS(prob: number, sev: number): RiskLevel {
  const ps = prob * sev;
  if (ps >= 6) return "HIGH";
  if (ps >= 3) return "MEDIUM";
  return "LOW";
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  pdf: "PDF",
  docx: "DOCX",
  html: "HTML",
};

const STATUS_LABELS: Record<Report["status"], string> = {
  processing: "Processando",
  ready: "Pronto",
  error: "Erro",
};

const STATUS_BADGE_CLASS: Record<Report["status"], string> = {
  processing: "bg-muted text-muted-foreground",
  ready: "risk-low-bg",
  error: "risk-high-bg",
};

const FAILED_CHECK_LABELS: Record<string, string> = {
  ASSESSMENT_NOT_COMPLETED: "Avaliação não concluída",
  PARTICIPATION_NOT_REGISTERED: "Evidência de participação não registrada",
  NO_ELIGIBLE_DEPARTMENTS: "Nenhum GHE elegível",
};

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      <section className="border border-dashed border-border rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
          <FileText className="h-6 w-6 text-[var(--brand)]" aria-hidden="true" />
        </div>
        <h2 className="font-display text-lg tracking-tight">Nenhuma avaliação selecionada</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Selecione uma avaliação concluída para gerar o Relatório PGR
          (Programa de Gerenciamento de Riscos Psicossociais).
        </p>
        <Button onClick={onBack} variant="outline" className="mt-2">
          <ChevronLeft className="h-4 w-4" />
          Voltar ao painel
        </Button>
      </section>
    </div>
  );
}

// ─── Loading state ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

// ─── PrerequisitesChecklist ──────────────────────────────────────────────────

interface PrereqItem {
  id: string;
  label: string;
  description: string;
  met: boolean;
  required: boolean; // false = recommended
}

function PrerequisitesChecklist({ items }: { items: PrereqItem[] }) {
  const requiredItems = items.filter((i) => i.required);
  const requiredMet = requiredItems.filter((i) => i.met).length;
  const allRequiredMet = requiredMet === requiredItems.length;

  return (
    <section
      aria-label="Pré-requisitos"
      className="border-t border-border pt-5 pb-5"
    >
      <div className="flex items-start gap-2 mb-4">
        <ListChecks className="h-4 w-4 text-[var(--brand)] mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-tight text-foreground">
            Pré-requisitos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allRequiredMet
              ? "Todos os pré-requisitos obrigatórios foram atendidos."
              : `${requiredMet}/${requiredItems.length} pré-requisitos obrigatórios atendidos.`}
          </p>
        </div>
      </div>
      <ul className="border-t border-border divide-y divide-border">
        {items.map((item) => {
          const Icon = item.met ? CheckCircle2 : XCircle;
          const iconColor = item.met
            ? "text-[var(--risk-low)]"
            : item.required
              ? "text-[var(--risk-high)]"
              : "text-[var(--risk-medium)]";
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 py-3"
              role="status"
              aria-label={`${item.met ? "Concluído" : "Pendente"}: ${item.label}`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{item.label}</span>
                  {!item.required && (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider bg-[var(--surface)] text-muted-foreground border-border"
                    >
                      Recomendado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              <span className="sr-only">
                {item.met ? "Concluído" : "Pendente"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── LowAdhesionWarning ──────────────────────────────────────────────────────

function LowAdhesionWarning({ adesaoPct }: { adesaoPct: number }) {
  return (
    <Alert className="border-[var(--risk-medium)]/40 bg-[var(--surface)]">
      <AlertTriangle
        className="h-4 w-4 text-[var(--risk-medium)]"
        aria-hidden="true"
      />
      <AlertTitle className="text-[var(--risk-medium)]">
        Taxa de adesão baixa
      </AlertTitle>
      <AlertDescription className="text-sm">
        A taxa de adesão foi de{" "}
        <strong className="font-mono-numeric">{adesaoPct}%</strong>. O relatório
        incluirá nota de limitação interpretativa, pois resultados com adesão
        inferior a 60% podem não representar adequadamente a percepção de toda a
        população trabalhadora.
      </AlertDescription>
    </Alert>
  );
}

// ─── ReportMetadataForm ──────────────────────────────────────────────────────

interface MetadataFormValues {
  responsibleName: string;
  credentialNumber: string;
  reportDate: string;
  notes: string;
}

interface ReportMetadataFormProps {
  values: MetadataFormValues;
  onChange: (v: MetadataFormValues) => void;
  disabled: boolean;
}

function ReportMetadataForm({ values, onChange, disabled }: ReportMetadataFormProps) {
  return (
    <section
      aria-label="Dados do relatório"
      className="border-t border-border pt-5 pb-5"
    >
      <div className="flex items-start gap-2 mb-4">
        <User className="h-4 w-4 text-[var(--brand)] mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-tight text-foreground">
            Dados do relatório
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Metadados que serão impressos no cabeçalho e na assinatura do
            documento.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="rep-responsible">Responsável técnico</Label>
          <Input
            id="rep-responsible"
            value={values.responsibleName}
            onChange={(e) =>
              onChange({ ...values, responsibleName: e.target.value })
            }
            disabled={disabled}
            placeholder="Nome do responsável"
            aria-describedby="rep-responsible-help"
          />
          <p id="rep-responsible-help" className="text-[11px] text-muted-foreground">
            Profissional que assina o relatório.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-credential">Número de registro</Label>
          <Input
            id="rep-credential"
            value={values.credentialNumber}
            onChange={(e) =>
              onChange({ ...values, credentialNumber: e.target.value })
            }
            disabled={disabled}
            placeholder="CRP / CREA / registro profissional"
            aria-describedby="rep-credential-help"
          />
          <p id="rep-credential-help" className="text-[11px] text-muted-foreground">
            Registro profissional (CRP, CREA, etc.).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-date">Data do relatório</Label>
          <Input
            id="rep-date"
            type="date"
            value={values.reportDate}
            onChange={(e) =>
              onChange({ ...values, reportDate: e.target.value })
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="rep-notes">Observações (opcional)</Label>
          <Textarea
            id="rep-notes"
            value={values.notes}
            onChange={(e) => onChange({ ...values, notes: e.target.value })}
            disabled={disabled}
            rows={3}
            placeholder="Notas adicionais que aparecerão ao final do relatório."
          />
        </div>
      </div>
    </section>
  );
}

// ─── GenerateButtons ─────────────────────────────────────────────────────────

interface GenerateButtonsProps {
  disabled: boolean;
  generatingType: ReportType | null;
  onGenerate: (type: ReportType) => void;
}

function GenerateButtons({
  disabled,
  generatingType,
  onGenerate,
}: GenerateButtonsProps) {
  return (
    <section
      aria-label="Gerar relatório"
      className="border-t border-border pt-5 pb-5"
    >
      <div className="flex items-start gap-2 mb-4">
        <FileDown className="h-4 w-4 text-[var(--brand)] mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-tight text-foreground">
            Gerar relatório
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {disabled
              ? "Atenda aos pré-requisitos obrigatórios para habilitar a geração."
              : "Escolha o formato desejado. O relatório será gerado e aberto para pré-visualização."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => onGenerate("pdf")}
          disabled={disabled || generatingType !== null}
          aria-disabled={disabled || generatingType !== null}
          aria-label="Gerar relatório em PDF"
        >
          {generatingType === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Gerar PDF
        </Button>
        <Button
          onClick={() => onGenerate("docx")}
          disabled={disabled || generatingType !== null}
          aria-disabled={disabled || generatingType !== null}
          aria-label="Gerar relatório em DOCX"
          variant="outline"
        >
          {generatingType === "docx" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Gerar DOCX
        </Button>
        <Button
          onClick={() => onGenerate("html")}
          disabled={disabled || generatingType !== null}
          aria-disabled={disabled || generatingType !== null}
          aria-label="Gerar relatório em HTML"
          variant="outline"
        >
          {generatingType === "html" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Gerar HTML
        </Button>
      </div>
    </section>
  );
}

// ─── ReportOutline ───────────────────────────────────────────────────────────

interface OutlineSection {
  num: string;
  title: string;
  description: string;
}

const OUTLINE_SECTIONS: OutlineSection[] = [
  {
    num: "1",
    title: "Identificação",
    description:
      "Empresa, CNPJ, profissional responsável, período da avaliação e status.",
  },
  {
    num: "2",
    title: "Metodologia",
    description:
      "COPSOQ II-BR, 40 itens, 11 dimensões, escala Likert de 5 pontos.",
  },
  {
    num: "3",
    title: "Identificação de Perigos",
    description: "Inventário de riscos psicossociais consolidado.",
  },
  {
    num: "4",
    title: "Avaliação de Riscos",
    description:
      "Heatmap GHE × dimensão, médias por dimensão e dimensões críticas.",
  },
  {
    num: "5",
    title: "Plano de Ação 5W2H",
    description: "Ações de mitigação com What, Why, Who, Where, When, How, Cost.",
  },
  {
    num: "6",
    title: "Monitoramento e Revisão",
    description: "Periodicidade NR-1 e data recomendada para o próximo ciclo.",
  },
];

const OUTLINE_APPENDICES: OutlineSection[] = [
  {
    num: "A",
    title: "Escores completos por GHE",
    description: "Tabela detalhada com escores por GHE e por dimensão.",
  },
  {
    num: "B",
    title: "Heatmap consolidado",
    description: "Matriz visual de risco GHE × dimensão.",
  },
  {
    num: "C",
    title: "Assinatura",
    description: "Bloco de assinatura do responsável técnico e da empresa.",
  },
];

function ReportOutline() {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section
        aria-label="Estrutura do documento"
        className="border-t border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group w-full text-left pt-5 pb-4 flex items-start justify-between gap-3 hover:bg-[var(--surface)] transition-colors -mx-2 px-2 rounded-sm"
            aria-label="Alternar estrutura do documento"
          >
            <div className="flex items-start gap-2 min-w-0">
              <Info className="h-4 w-4 text-[var(--brand)] mt-1 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-display text-xl tracking-tight text-foreground">
                  Estrutura do documento
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Seções e apêndices do Relatório PGR (NR-1 / COPSOQ II-BR).
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border pt-4 pb-6 space-y-6">
            <ol className="space-y-1">
              {OUTLINE_SECTIONS.map((s) => (
                <li
                  key={s.num}
                  className="flex items-start gap-3 py-2"
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--brand)] text-xs font-mono-numeric border border-border"
                    aria-hidden="true"
                  >
                    {s.num}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-medium text-foreground">{s.title}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <Separator />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Apêndices
              </p>
              <ol className="space-y-1">
                {OUTLINE_APPENDICES.map((s) => (
                  <li
                    key={s.num}
                    className="flex items-start gap-3 py-2"
                  >
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent text-muted-foreground text-xs font-mono-numeric border border-dashed border-border"
                      aria-hidden="true"
                    >
                      {s.num}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-medium text-foreground">{s.title}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

// ─── ReportsHistory ──────────────────────────────────────────────────────────

interface ReportsHistoryProps {
  reports: Report[];
  loading: boolean;
  onPreview: (report: Report) => void;
  onRegenerate: (report: Report) => void;
  regeneratingId: string | null;
}

function ReportsHistory({
  reports,
  loading,
  onPreview,
  onRegenerate,
  regeneratingId,
}: ReportsHistoryProps) {
  return (
    <section
      aria-label="Histórico de relatórios"
      className="border-t border-border pt-5"
    >
      <div className="flex items-start gap-2 mb-4">
        <RefreshCw className="h-4 w-4 text-[var(--brand)] mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-tight text-foreground">
            Histórico de relatórios
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Relatórios gerados anteriormente para esta avaliação.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2 border-t border-border pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="border-t border-border pt-6">
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <FileText
              className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Nenhum relatório gerado ainda.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Atenda aos pré-requisitos e clique em &ldquo;Gerar PDF&rdquo;,
              &ldquo;Gerar DOCX&rdquo; ou &ldquo;Gerar HTML&rdquo; acima.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto scroll-area border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                  Gerado em
                </TableHead>
                <TableHead className="text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                  Tipo
                </TableHead>
                <TableHead className="text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                  Tamanho
                </TableHead>
                <TableHead className="text-right text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} className="border-b border-border hover:bg-[var(--surface)] transition-colors">
                  <TableCell className="font-mono-numeric text-xs py-3">
                    {formatDateTime(r.generatedAt)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="font-mono-numeric bg-transparent">
                      {REPORT_TYPE_LABELS[r.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      className={`border-transparent ${STATUS_BADGE_CLASS[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono-numeric py-3">
                    {formatFileSize(r.fileSizeBytes)}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onPreview(r)}
                        disabled={r.status !== "ready"}
                        aria-label={`Visualizar relatório ${REPORT_TYPE_LABELS[r.type]} gerado em ${formatDateTime(r.generatedAt)}`}
                        className="text-muted-foreground hover:text-[var(--brand)]"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Visualizar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRegenerate(r)}
                        disabled={regeneratingId === r.id}
                        aria-label={`Regerar relatório ${REPORT_TYPE_LABELS[r.type]}`}
                        className="text-muted-foreground hover:text-[var(--brand)]"
                      >
                        {regeneratingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Regerar</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

// ─── ReportPreviewDialog ─────────────────────────────────────────────────────

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
  assessment: Assessment | null;
  company: CompanySummary | null;
  dashboard: DashboardData | null;
  inventory: RiskInventoryGroup | null;
  actionPlan: ActionPlan | null;
  globalAdesao: number | null;
  lowAdesao: boolean;
  professionalEmail: string | null;
  professionalProfessionType: keyof typeof PROFESSION_TYPE_LABELS | null;
}

function ReportPreviewDialog({
  open,
  onOpenChange,
  report,
  assessment,
  company,
  dashboard,
  inventory,
  actionPlan,
  globalAdesao,
  lowAdesao,
  professionalEmail,
  professionalProfessionType,
}: ReportPreviewDialogProps) {
  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const metadata = report?.metadata ?? null;
  const reportDate = metadata?.reportDate ?? todayISO();
  const eligibleGhes = dashboard?.heatmap.filter((h) => h.isEligible) ?? [];

  const allInventoryItems = useMemo(() => {
    if (!inventory) return [];
    return [...inventory.autoItems, ...inventory.manualItems];
  }, [inventory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto scroll-area"
        aria-describedby="report-preview-desc"
      >
        <DialogHeader className="no-print">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />
            Pré-visualização do Relatório PGR
          </DialogTitle>
          <DialogDescription id="report-preview-desc">
            Pré-visualização em HTML do documento gerado. Use o botão
            &ldquo;Imprimir / Salvar PDF&rdquo; para salvar como PDF no
            navegador.
          </DialogDescription>
        </DialogHeader>

        {report && (
          <div
            className="print-area bg-white text-[var(--foreground)] rounded-sm shadow-2xl px-6 sm:px-12 py-10 space-y-10 text-sm leading-relaxed"
            aria-label="Conteúdo do relatório PGR"
          >
            {/* Header */}
            <header className="border-b-2 border-[var(--foreground)] pb-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                    Relatório PGR
                  </h1>
                  <p className="text-sm mt-1 text-[var(--foreground)]">
                    Programa de Gerenciamento de Riscos Psicossociais
                  </p>
                  <p className="text-[11px] mt-3 text-[var(--muted-foreground)]">
                    Conforme NR-1 / Portaria MTE 1.419/2024 · Instrumento
                    COPSOQ II-BR
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold font-mono-numeric">
                    {formatLongDate(reportDate)}
                  </div>
                  <div className="mt-2 text-[var(--muted-foreground)] font-mono-numeric">
                    Relatório #{report.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="mt-1 text-[var(--muted-foreground)]">
                    Formato: {REPORT_TYPE_LABELS[report.type]}
                  </div>
                </div>
              </div>
            </header>

            {/* Section 1 — Identificação */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                1. Identificação
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="font-semibold w-1/3 py-1.5 align-top">
                      Empresa
                    </td>
                    <td className="py-1.5">{company?.name ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">CNPJ</td>
                    <td className="py-1.5 font-mono-numeric">
                      {company ? formatCnpj(company.cnpj) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">CNAE</td>
                    <td className="py-1.5">{company?.cnaePrimary ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">Localidade</td>
                    <td className="py-1.5">
                      {company?.city ?? "—"}
                      {company?.state ? ` / ${company.state}` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">Avaliação</td>
                    <td className="py-1.5">{assessment?.title ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">Período</td>
                    <td className="py-1.5 font-mono-numeric">
                      {formatDateShort(assessment?.startDate ?? null)} a{" "}
                      {formatDateShort(assessment?.endDate ?? null)}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">Status</td>
                    <td className="py-1.5">
                      {assessment
                        ? ASSESSMENT_STATUS_LABELS[assessment.status] ??
                          assessment.status
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">
                      Concluída em
                    </td>
                    <td className="py-1.5">
                      {formatDateShort(assessment?.completedAt ?? null)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <h3 className="font-display text-lg font-semibold mt-6 mb-3 text-[var(--foreground)]">
                Responsável técnico
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="font-semibold w-1/3 py-1.5 align-top">
                      Profissional
                    </td>
                    <td className="py-1.5">
                      {metadata?.responsibleName ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">
                      Profissão
                    </td>
                    <td className="py-1.5">
                      {professionalProfessionType
                        ? PROFESSION_TYPE_LABELS[professionalProfessionType]
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">
                      Registro
                    </td>
                    <td className="py-1.5 font-mono-numeric">
                      {metadata?.credentialNumber || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-1.5 align-top">E-mail</td>
                    <td className="py-1.5">{professionalEmail ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Section 2 — Metodologia */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                2. Metodologia
              </h2>
              <p className="text-sm leading-relaxed">
                O presente relatório foi elaborado com base no instrumento{" "}
                <strong>
                  Copenhagen Psychosocial Questionnaire II-BR (COPSOQ II-BR)
                </strong>
                , versão brasileira validada por Gonçalves et al. (2021),
                publicada na Revista de Saúde Pública (DOI:
                10.11606/s1518-8787.2021055003123), sob licença CC BY-NC-ND
                4.0.
              </p>
              <p className="text-sm leading-relaxed mt-3">
                O instrumento é composto por <strong>40 itens</strong>{" "}
                distribuídos em <strong>11 dimensões</strong> psicossociais,
                respondidos em <strong>escala Likert de 5 pontos</strong> (1 =
                Nunca / quase nunca a 5 = Sempre / quase sempre). A aplicação
                segue o protocolo da NR-1 (Portaria MTE 1.419/2024) para
                identificação e avaliação de riscos psicossociais no trabalho.
              </p>
              <table className="w-full text-xs mt-5 border border-[var(--foreground)] border-collapse">
                <thead className="bg-[var(--surface)]">
                  <tr>
                    <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                      Código
                    </th>
                    <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                      Dimensão
                    </th>
                    <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                      Grupo
                    </th>
                    <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                      Itens
                    </th>
                    <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                      Fatores MTE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COPSOQ_DIMENSIONS.map((dim) => (
                    <tr key={dim.code}>
                      <td className="p-2 border border-[var(--foreground)] font-mono-numeric">
                        {dim.code}
                      </td>
                      <td className="p-2 border border-[var(--foreground)]">
                        {dim.namePtBr}
                      </td>
                      <td className="p-2 border border-[var(--foreground)]">
                        {dim.groupName}
                      </td>
                      <td className="p-2 border border-[var(--foreground)] text-center font-mono-numeric">
                        {dim.itemCount}
                      </td>
                      <td className="p-2 border border-[var(--foreground)]">
                        {dim.mteFactorsCovered.length > 0
                          ? dim.mteFactorsCovered.join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Section 3 — Identificação de Perigos */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                3. Identificação de Perigos
              </h2>
              <p className="text-sm leading-relaxed mb-4">
                Inventário de riscos psicossociais elaborado a partir das
                dimensões classificadas como Intermediário ou Desfavorável nos
                GHES elegíveis, complementado por itens manuais registrados
                pelo responsável técnico.
              </p>
              {allInventoryItems.length > 0 ? (
                <table className="w-full text-xs border border-[var(--foreground)] border-collapse">
                  <thead className="bg-[var(--surface)]">
                    <tr>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        GHE
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Perigo
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Possíveis danos
                      </th>
                      <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        P
                      </th>
                      <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        S
                      </th>
                      <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Nível
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInventoryItems.map((item) => {
                      const level = classifyPS(
                        item.probability,
                        item.severity,
                      );
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="p-2 border border-[var(--foreground)]">
                            {item.departmentName ?? "Toda a empresa"}
                          </td>
                          <td className="p-2 border border-[var(--foreground)]">
                            {item.hazardDescription}
                          </td>
                          <td className="p-2 border border-[var(--foreground)]">
                            {item.possibleHarms}
                          </td>
                          <td className="p-2 border border-[var(--foreground)] text-center font-mono-numeric">
                            {item.probability}
                          </td>
                          <td className="p-2 border border-[var(--foreground)] text-center font-mono-numeric">
                            {item.severity}
                          </td>
                          <td
                            className="p-2 border border-[var(--foreground)] text-center font-semibold"
                            style={{
                              backgroundColor: riskHex(level),
                              color: riskFg(level),
                            }}
                          >
                            {RISK_LEVEL_LABELS[level]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm italic text-[var(--muted-foreground)]">
                  Nenhum item de inventário registrado para esta avaliação.
                </p>
              )}
            </section>

            {/* Section 4 — Avaliação de Riscos */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                4. Avaliação de Riscos
              </h2>
              {dashboard ? (
                <>
                  <p className="text-sm leading-relaxed mb-4">
                    A avaliação considera o escore de risco (0&ndash;100) por
                    dimensão, classificado em três níveis:{" "}
                    <strong>Favorável</strong> (0&ndash;39),{" "}
                    <strong>Intermediário</strong> (40&ndash;69) e{" "}
                    <strong>Desfavorável</strong> (70&ndash;100). A análise
                    abrange {eligibleGhes.length} GHE(s) elegível(is) de um
                    total de {dashboard.heatmap.length} GHE(s) cadastrado(s).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--foreground)] border border-[var(--foreground)] mb-5">
                    <div className="bg-white p-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                        Adesão global
                      </div>
                      <div className="text-xl font-semibold font-mono-numeric mt-1 text-[var(--foreground)]">
                        {dashboard.kpis.globalAdesao}%
                      </div>
                    </div>
                    <div className="bg-white p-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                        Respondentes
                      </div>
                      <div className="text-xl font-semibold font-mono-numeric mt-1 text-[var(--foreground)]">
                        {dashboard.kpis.totalRespondents}
                      </div>
                    </div>
                    <div className="bg-white p-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                        GHEs alto risco
                      </div>
                      <div className="text-xl font-semibold font-mono-numeric mt-1 text-[var(--foreground)]">
                        {dashboard.kpis.ghesHighRisk}
                      </div>
                    </div>
                    <div className="bg-white p-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                        GHEs médio risco
                      </div>
                      <div className="text-xl font-semibold font-mono-numeric mt-1 text-[var(--foreground)]">
                        {dashboard.kpis.ghesMediumRisk}
                      </div>
                    </div>
                  </div>

                  {/* Heatmap */}
                  <h3 className="font-display text-lg font-semibold mb-3 text-[var(--foreground)]">
                    Heatmap por GHE × Dimensão
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="text-xs border border-[var(--foreground)] border-collapse">
                      <thead className="bg-[var(--surface)]">
                        <tr>
                          <th className="text-left p-1.5 border border-[var(--foreground)] sticky left-0 bg-[var(--surface)]">
                            GHE
                          </th>
                          {COPSOQ_DIMENSIONS.map((dim) => (
                            <th
                              key={dim.code}
                              className="text-center p-1.5 border border-[var(--foreground)] font-mono-numeric"
                              style={{ minWidth: 38 }}
                              title={dim.namePtBr}
                            >
                              {dim.code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.heatmap.map((row) => (
                          <tr key={row.deptId}>
                            <td className="p-1.5 border border-[var(--foreground)] text-xs sticky left-0 bg-white">
                              <div className="font-medium">{row.deptName}</div>
                              <div className="text-[10px] text-[var(--muted-foreground)]">
                                n={row.nResponses}
                                {!row.isEligible && " · inelegível"}
                              </div>
                            </td>
                            {COPSOQ_DIMENSIONS.map((dim) => {
                              const cell = row.dimensions?.find(
                                (d) => d.code === dim.code,
                              );
                              if (!cell) {
                                return (
                                  <td
                                    key={dim.code}
                                    className="p-1 border border-[var(--foreground)] text-center text-[var(--muted-foreground)]"
                                  >
                                    —
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={dim.code}
                                  className="p-1 border border-[var(--foreground)] text-center font-mono-numeric text-[10px]"
                                  style={{
                                    backgroundColor: riskHex(cell.riskLevel),
                                    color: riskFg(cell.riskLevel),
                                  }}
                                  title={`${dim.namePtBr}: ${Math.round(cell.riskScore)} (${RISK_LEVEL_LABELS[cell.riskLevel]})`}
                                >
                                  {Math.round(cell.riskScore)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Company averages */}
                  <h3 className="font-display text-lg font-semibold mb-3 mt-6 text-[var(--foreground)]">
                    Médias por dimensão (empresa)
                  </h3>
                  <table className="w-full text-xs border border-[var(--foreground)] border-collapse">
                    <thead className="bg-[var(--surface)]">
                      <tr>
                        <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                          Código
                        </th>
                        <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                          Dimensão
                        </th>
                        <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                          Escore médio
                        </th>
                        <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                          Nível
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.companyAvg.map((c) => {
                        const dim = getDimension(c.code as DimensionCode);
                        return (
                          <tr key={c.code}>
                            <td className="p-2 border border-[var(--foreground)] font-mono-numeric">
                              {c.code}
                            </td>
                            <td className="p-2 border border-[var(--foreground)]">
                              {dim.namePtBr}
                            </td>
                            <td className="p-2 border border-[var(--foreground)] text-center font-mono-numeric">
                              {Math.round(c.weightedAvgRiskScore)}
                            </td>
                            <td
                              className="p-2 border border-[var(--foreground)] text-center font-semibold"
                              style={{
                                backgroundColor: riskHex(c.riskLevel),
                                color: riskFg(c.riskLevel),
                              }}
                            >
                              {RISK_LEVEL_LABELS[c.riskLevel]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Critical dimensions */}
                  {dashboard.criticalDimensions.length > 0 && (
                    <>
                      <h3 className="font-display text-lg font-semibold mb-3 mt-6 text-[var(--foreground)]">
                        Dimensões críticas (Desfavorável)
                      </h3>
                      <table className="w-full text-xs border border-[var(--foreground)] border-collapse">
                        <thead className="bg-[var(--surface)]">
                          <tr>
                            <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                              Dimensão
                            </th>
                            <th className="text-center p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                              Escore médio
                            </th>
                            <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                              GHEs afetados
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.criticalDimensions.map((c) => (
                            <tr key={c.code}>
                              <td className="p-2 border border-[var(--foreground)]">
                                <strong>{c.code}</strong> — {c.name}
                              </td>
                              <td className="p-2 border border-[var(--foreground)] text-center font-mono-numeric">
                                {Math.round(c.avgRiskScore)}
                              </td>
                              <td className="p-2 border border-[var(--foreground)]">
                                {c.affectedDepts.length} GHE(s)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm italic text-[var(--muted-foreground)]">
                  Avaliação de riscos indisponível (a avaliação não foi
                  concluída ou os escores não foram calculados).
                </p>
              )}
            </section>

            {/* Section 5 — Plano de Ação */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                5. Plano de Ação 5W2H
              </h2>
              {actionPlan && actionPlan.actionItems.length > 0 ? (
                <table className="w-full text-xs border border-[var(--foreground)] border-collapse">
                  <thead className="bg-[var(--surface)]">
                    <tr>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        O que (What)
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Por que (Why)
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Quem (Who)
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Onde (Where)
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Quando (When)
                      </th>
                      <th className="text-left p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Como (How)
                      </th>
                      <th className="text-right p-2 border border-[var(--foreground)] uppercase tracking-wider font-medium">
                        Custo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionPlan.actionItems.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="p-2 border border-[var(--foreground)]">
                          {item.what}
                        </td>
                        <td className="p-2 border border-[var(--foreground)]">
                          {item.why}
                        </td>
                        <td className="p-2 border border-[var(--foreground)]">
                          {item.who}
                        </td>
                        <td className="p-2 border border-[var(--foreground)]">
                          {item.where}
                        </td>
                        <td className="p-2 border border-[var(--foreground)] font-mono-numeric">
                          {formatDateShort(item.whenDate)}
                        </td>
                        <td className="p-2 border border-[var(--foreground)]">
                          {item.how}
                        </td>
                        <td className="p-2 border border-[var(--foreground)] text-right font-mono-numeric">
                          {formatBRL(item.estimatedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm italic text-[var(--muted-foreground)]">
                  Nenhuma ação registrada no plano de ação para esta avaliação.
                </p>
              )}
            </section>

            {/* Section 6 — Monitoramento e Revisão */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                6. Monitoramento e Revisão
              </h2>
              <p className="text-sm leading-relaxed">
                Conforme a NR-1, o Programa de Gerenciamento de Riscos (PGR)
                deve ser revisado:
              </p>
              <ul className="text-sm list-disc pl-6 mt-3 space-y-1.5">
                <li>
                  No máximo a cada <strong>2 (dois) anos</strong> para riscos
                  psicossociais;
                </li>
                <li>
                  Em caso de mudança significativa nos processos ou estrutura
                  organizacional;
                </li>
                <li>
                  Após acidentes ou incidentes relacionados à saúde mental ou
                  adoecimento ocupacional;
                </li>
                <li>
                  Quando da identificação de novas fontes de risco psicossocial.
                </li>
              </ul>
              {assessment?.completedAt && (
                <p className="text-sm mt-4">
                  <strong>Próximo ciclo recomendado:</strong>{" "}
                  <span className="font-mono-numeric">
                    {formatDateShort(
                      addYears(parseISO(assessment.completedAt), 2).toISOString(),
                    )}
                  </span>
                </p>
              )}
            </section>

            {/* Apêndices — referência às seções anteriores + assinatura */}
            <section>
              <h2 className="font-display text-xl font-semibold border-b border-[var(--foreground)] pb-2 mb-4 text-[var(--foreground)]">
                Apêndices
              </h2>
              <ul className="text-sm list-disc pl-6 space-y-1.5">
                <li>
                  <strong>Apêndice A — Escores completos por GHE:</strong>{" "}
                  detalhados no heatmap da Seção 4.
                </li>
                <li>
                  <strong>Apêndice B — Heatmap consolidado:</strong> apresentado
                  na Seção 4.
                </li>
                <li>
                  <strong>Apêndice C — Assinatura:</strong> abaixo.
                </li>
              </ul>
            </section>

            {/* Signature */}
            <section className="mt-16 pt-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <div className="border-t border-[var(--foreground)] pt-3 text-center text-xs">
                    <p className="font-semibold">
                      {metadata?.responsibleName ?? "—"}
                    </p>
                    <p className="mt-0.5">
                      {professionalProfessionType
                        ? PROFESSION_TYPE_LABELS[professionalProfessionType]
                        : "—"}
                    </p>
                    <p className="font-mono-numeric mt-0.5">
                      Registro: {metadata?.credentialNumber || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="border-t border-[var(--foreground)] pt-3 text-center text-xs">
                    <p className="font-semibold">{company?.name ?? "—"}</p>
                    <p className="font-mono-numeric mt-0.5">
                      CNPJ: {company ? formatCnpj(company.cnpj) : "—"}
                    </p>
                    <p className="mt-0.5">{formatLongDate(reportDate)}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            {metadata?.notes && (
              <section className="mt-8 pt-4 border-t border-[var(--foreground)]">
                <h3 className="font-display text-sm font-semibold mb-2 text-[var(--foreground)]">Observações</h3>
                <p className="text-xs whitespace-pre-wrap">
                  {metadata.notes}
                </p>
              </section>
            )}

            {/* Low adhesion note */}
            {lowAdesao && globalAdesao != null && (
              <section className="mt-4 p-3 border border-[var(--risk-medium)]/50 bg-[var(--surface)] text-[var(--foreground)]">
                <p className="text-xs">
                  <strong>Nota de limitação interpretativa:</strong> A taxa de
                  adesão à pesquisa foi de{" "}
                  <span className="font-mono-numeric">{globalAdesao}%</span>,
                  abaixo do mínimo recomendado de 60%. Os resultados devem ser
                  interpretados com cautela, pois podem não representar
                  adequadamente a percepção de toda a população trabalhadora.
                </p>
              </section>
            )}

            <footer className="pt-4 border-t border-[var(--foreground)] text-[10px] text-[var(--muted-foreground)] text-center">
              Documento gerado em {formatDateTime(report.generatedAt)} pelo
              sistema NR-1 Copsoq · Conforme NR-1 / Portaria MTE 1.419/2024 ·
              Instrumento COPSOQ II-BR (CC BY-NC-ND 4.0)
            </footer>
          </div>
        )}

        <DialogFooter className="no-print">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function RelatorioView() {
  const go = useView((s) => s.go);
  const assessmentId = useView((s) => s.assessmentId);
  const { professional } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [inventory, setInventory] = useState<RiskInventoryGroup | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  const [generatingType, setGeneratingType] = useState<ReportType | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Metadata form defaults — set once we have the professional
  const defaultMetadata = useMemo<MetadataFormValues>(
    () => ({
      responsibleName: professional?.name ?? "",
      credentialNumber: professional?.credentialNumber ?? "",
      reportDate: todayISO(),
      notes: "",
    }),
    [professional],
  );
  const [metadata, setMetadata] = useState<MetadataFormValues>(defaultMetadata);

  // Sync metadata defaults once when professional first loads
  useEffect(() => {
    if (professional && !metadata.responsibleName) {
      setMetadata((prev) => ({
        ...prev,
        responsibleName: prev.responsibleName || professional.name,
        credentialNumber: prev.credentialNumber || professional.credentialNumber || "",
      }));
    }
  }, [professional, metadata.responsibleName, metadata.credentialNumber]);

  // Initial parallel fetch
  const fetchInitial = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    const [assRes, progRes, invRes, planRes, repRes] = await Promise.allSettled([
      api.assessments.get(assessmentId),
      api.assessments.progress(assessmentId),
      api.inventory.list(assessmentId),
      api.actionPlan.get(assessmentId),
      api.reports.list(assessmentId),
    ]);

    if (assRes.status === "rejected") {
      const e = assRes.reason;
      const code = e instanceof ApiError ? e.code : "INTERNAL_ERROR";
      if (code === "UNAUTHORIZED") {
        setError("Sessão expirada. Faça login novamente.");
      } else if (code === "NOT_FOUND") {
        setError("Avaliação não encontrada.");
      } else {
        setError("Não foi possível carregar a avaliação.");
      }
      setLoading(false);
      return;
    }

    const ass = assRes.value;
    setAssessment(ass);
    if (progRes.status === "fulfilled") setProgress(progRes.value);
    if (invRes.status === "fulfilled") setInventory(invRes.value);
    if (planRes.status === "fulfilled") setActionPlan(planRes.value);
    if (repRes.status === "fulfilled") {
      setReports(repRes.value.data.map((r) => normalizeReport(r as RawReport)));
    }

    // Second batch: company + dashboard (if completed)
    const secondBatch: Promise<unknown>[] = [
      api.companies.get(ass.companyId).then(setCompany).catch(() => undefined),
    ];
    if (ass.status === "completed") {
      secondBatch.push(
        api.assessments
          .dashboard(assessmentId)
          .then(setDashboard)
          .catch(() => undefined),
      );
    }
    await Promise.allSettled(secondBatch);

    setLoading(false);
  }, [assessmentId]);

  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  const refreshReports = useCallback(async () => {
    if (!assessmentId) return;
    try {
      const res = await api.reports.list(assessmentId);
      setReports(res.data.map((r) => normalizeReport(r as RawReport)));
    } catch {
      // ignore — already showed toast on generate failure
    }
  }, [assessmentId]);

  // Prereq computation
  const prereqItems = useMemo<PrereqItem[]>(() => {
    const completed = assessment?.status === "completed";
    const hasParticipation = !!(
      assessment?.participationRegistration &&
      assessment.participationRegistration.trim().length > 0
    );
    const eligibleDepts = (assessment?.departments ?? []).filter(
      (d) => d.isEligible,
    );
    const hasEligible = eligibleDepts.length >= 1;
    const inventoryCount = inventory
      ? inventory.autoItems.length + inventory.manualItems.length
      : 0;
    const hasInventory = inventoryCount > 0;
    const hasActionPlan = !!(actionPlan && actionPlan.actionItems.length > 0);

    return [
      {
        id: "completed",
        label: "Avaliação concluída",
        description: completed
          ? `Status: ${ASSESSMENT_STATUS_LABELS[assessment!.status]}.`
          : "A avaliação precisa estar com status 'Concluída' (fechamento + scoring aplicados).",
        met: completed,
        required: true,
      },
      {
        id: "participation",
        label: "Evidência de participação registrada",
        description: hasParticipation
          ? "Comprovante de participação registrado."
          : "Registre a evidência de participação (ata, e-mail, lista de presença) na avaliação.",
        met: hasParticipation,
        required: true,
      },
      {
        id: "eligible",
        label: "Ao menos 1 GHE elegível",
        description: hasEligible
          ? `${eligibleDepts.length} GHE(s) elegível(is) (≥5 respostas).`
          : "Nenhum GHE atingiu o mínimo de 5 respostas. Encerre a coleta e execute o scoring.",
        met: hasEligible,
        required: true,
      },
      {
        id: "inventory",
        label: "Inventário de riscos revisado",
        description:
          inventoryCount > 0
            ? `${inventoryCount} item(ns) no inventário (automáticos + manuais).`
            : "Revise o inventário de riscos antes de gerar o relatório. Itens automáticos são criados ao fechar a avaliação.",
        met: hasInventory,
        required: false,
      },
      {
        id: "action-plan",
        label: "Plano de ação criado",
        description:
          hasActionPlan
            ? `${actionPlan!.actionItems.length} ação(ões) registrada(s).`
            : "Crie ao menos uma ação 5W2H no plano de ação para complementar o relatório.",
        met: hasActionPlan,
        required: false,
      },
    ];
  }, [assessment, inventory, actionPlan]);

  const allRequiredMet = prereqItems
    .filter((i) => i.required)
    .every((i) => i.met);

  const globalAdesao = progress?.globalAdesao ?? null;
  const lowAdesao = globalAdesao != null && globalAdesao < 60;

  const handleGenerate = useCallback(
    async (type: ReportType) => {
      if (!assessmentId) return;
      if (!allRequiredMet) {
        toast.error("Pré-requisitos obrigatórios não atendidos.");
        return;
      }
      setGeneratingType(type);
      try {
        const payload = {
          type,
          metadata: {
            responsibleName: metadata.responsibleName.trim(),
            credentialNumber: metadata.credentialNumber.trim(),
            reportDate: metadata.reportDate,
            ...(metadata.notes.trim() ? { notes: metadata.notes.trim() } : {}),
          },
        };
        const result = await api.reports.generate(assessmentId, payload);
        toast.success("Relatório gerado.", {
          description: `Formato ${REPORT_TYPE_LABELS[type]} · pronto para pré-visualização.`,
        });
        // Refresh history
        await refreshReports();
        // Open preview — find the new report by id in the refreshed list
        const newReport = (
          await api.reports.list(assessmentId)
        ).data
          .map((r) => normalizeReport(r as RawReport))
          .find((r) => r.id === result.reportId);
        if (newReport) {
          setPreviewReport(newReport);
          setPreviewOpen(true);
        }
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.code === "REPORT_PREREQUISITES_UNMET") {
            const details = e.details as
              | { failedChecks?: string[] }
              | undefined;
            const failed = details?.failedChecks ?? [];
            const labels = failed.map(
              (c) => FAILED_CHECK_LABELS[c] ?? c,
            );
            toast.error("Pré-requisitos não atendidos", {
              description:
                labels.length > 0
                  ? labels.join(" · ")
                  : "Verifique os pré-requisitos e tente novamente.",
            });
          } else {
            toast.error("Erro ao gerar relatório", {
              description: e.message,
            });
          }
        } else {
          toast.error("Erro inesperado ao gerar relatório.");
        }
      } finally {
        setGeneratingType(null);
      }
    },
    [assessmentId, allRequiredMet, metadata, refreshReports],
  );

  const handleRegenerate = useCallback(
    async (report: Report) => {
      if (!assessmentId) return;
      setRegeneratingId(report.id);
      try {
        const meta = report.metadata;
        const payload = {
          type: report.type,
          metadata: {
            responsibleName: meta?.responsibleName ?? metadata.responsibleName.trim(),
            credentialNumber:
              meta?.credentialNumber ?? metadata.credentialNumber.trim(),
            reportDate: meta?.reportDate ?? metadata.reportDate,
            ...(meta?.notes || metadata.notes.trim()
              ? { notes: (meta?.notes ?? metadata.notes).trim() }
              : {}),
          },
        };
        await api.reports.generate(assessmentId, payload);
        toast.success("Relatório regerado.", {
          description: `Novo ${REPORT_TYPE_LABELS[report.type]} gerado com sucesso.`,
        });
        await refreshReports();
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.code === "REPORT_PREREQUISITES_UNMET") {
            const details = e.details as
              | { failedChecks?: string[] }
              | undefined;
            const failed = details?.failedChecks ?? [];
            const labels = failed.map(
              (c) => FAILED_CHECK_LABELS[c] ?? c,
            );
            toast.error("Pré-requisitos não atendidos", {
              description:
                labels.length > 0
                  ? labels.join(" · ")
                  : "Verifique os pré-requisitos e tente novamente.",
            });
          } else {
            toast.error("Erro ao regerar relatório", {
              description: e.message,
            });
          }
        } else {
          toast.error("Erro inesperado ao regerar relatório.");
        }
      } finally {
        setRegeneratingId(null);
      }
    },
    [assessmentId, metadata, refreshReports],
  );

  const handlePreview = useCallback((report: Report) => {
    setPreviewReport(report);
    setPreviewOpen(true);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!assessmentId) {
    return <EmptyState onBack={() => go("painel")} />;
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go("avaliacao", { assessmentId })}
            className="text-muted-foreground hover:text-[var(--brand)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar à avaliação
          </Button>
        </div>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
        <section className="border border-dashed border-[var(--risk-high)]/30 rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="h-12 w-12 rounded-full risk-high-bg flex items-center justify-center">
            <AlertTriangle
              className="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <h2 className="font-display text-lg tracking-tight">Falha ao carregar</h2>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => void fetchInitial()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
            <Button
              variant="ghost"
              onClick={() => go("avaliacao", { assessmentId })}
              className="text-muted-foreground hover:text-[var(--brand)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      {/* Print-only CSS — hides everything except .print-area while preview is open */}
      {previewOpen && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * { visibility: hidden !important; }
              .print-area, .print-area * { visibility: visible !important; }
              [data-slot="dialog-overlay"] { display: none !important; }
              [data-slot="dialog-content"] {
                position: static !important;
                transform: none !important;
                translate: 0 0 !important;
                inset: auto !important;
                max-width: 100% !important;
                width: 100% !important;
                max-height: none !important;
                height: auto !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: #ffffff !important;
              }
              .print-area {
                border: none !important;
                box-shadow: none !important;
                padding: 24px !important;
                margin: 0 !important;
                border-radius: 0 !important;
              }
            }
            `,
          }}
        />
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-6">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go("avaliacao", { assessmentId })}
              className="shrink-0 text-muted-foreground hover:text-[var(--brand)]"
              aria-label="Voltar à avaliação"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-5 w-5 text-[var(--brand)] shrink-0"
                  aria-hidden="true"
                />
                <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground truncate">
                  Relatório PGR
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {assessment?.title ?? "—"} ·{" "}
                {assessment
                  ? (ASSESSMENT_STATUS_LABELS[assessment.status] ??
                    assessment.status)
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-numeric">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {formatDateShort(assessment?.startDate ?? null)} a{" "}
              {formatDateShort(assessment?.endDate ?? null)}
            </span>
          </div>
        </header>

        {/* Prerequisites checklist */}
        <PrerequisitesChecklist items={prereqItems} />

        {/* Low adhesion warning */}
        {lowAdesao && globalAdesao != null && (
          <LowAdhesionWarning adesaoPct={globalAdesao} />
        )}

        {/* Metadata form */}
        <ReportMetadataForm
          values={metadata}
          onChange={setMetadata}
          disabled={generatingType !== null}
        />

        {/* Generate buttons */}
        <GenerateButtons
          disabled={!allRequiredMet}
          generatingType={generatingType}
          onGenerate={handleGenerate}
        />

        {/* Report outline */}
        <ReportOutline />

        {/* History */}
        <ReportsHistory
          reports={reports}
          loading={false}
          onPreview={handlePreview}
          onRegenerate={handleRegenerate}
          regeneratingId={regeneratingId}
        />
      </div>

      {/* Report preview dialog */}
      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        report={previewReport}
        assessment={assessment}
        company={company}
        dashboard={dashboard}
        inventory={inventory}
        actionPlan={actionPlan}
        globalAdesao={globalAdesao}
        lowAdesao={lowAdesao}
        professionalEmail={professional?.email ?? null}
        professionalProfessionType={
          (professional?.professionType ?? null) as keyof typeof PROFESSION_TYPE_LABELS | null
        }
      />
    </>
  );
}

"use client";

import { differenceInDays, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Copy,
  CopyPlus,
  FileText,
  FlaskConical,
  ListChecks,
  Loader2,
  Lock,
  MessageCircle,
  Pencil,
  RefreshCw,
  Rocket,
  Users,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { ApiError, api } from "@/lib/api";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/errors";
import { useView } from "@/lib/store";
import type {
  Assessment,
  AssessmentDepartment,
  AssessmentProgress,
  AssessmentStatus,
} from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return fallback;
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return fallback;
  }
}

function fmtPeriod(start: string | null, end: string | null): string {
  const s = start ? fmtDate(start) : "—";
  const e = end ? fmtDate(end) : "—";
  return `${s} → ${e}`;
}

function statusBadgeClass(status: AssessmentStatus): string {
  switch (status) {
    case "collecting":
    case "processing":
      return "bg-[var(--sidebar-accent)] text-[var(--brand)] border-transparent";
    case "completed":
      return "risk-low-bg border-transparent";
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
}

function safePct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function adesaoColorClass(pct: number): string {
  if (pct < 30) return "text-[var(--muted-foreground)]";
  if (pct < 70) return "text-[var(--risk-medium)]";
  return "text-[var(--risk-low)]";
}

function adesaoStroke(pct: number): string {
  if (pct < 30) return "var(--muted-foreground)";
  if (pct < 70) return "var(--risk-medium)";
  return "var(--risk-low)";
}

// ─── AdesaoRing ──────────────────────────────────────────────────────────────

function AdesaoRing({ pct }: { pct: number }) {
  const value = safePct(pct);
  const R = 36;
  const C = 2 * Math.PI * R;
  const offset = C - (value / 100) * C;
  const stroke = adesaoStroke(value);
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-24 w-24 sm:h-28 sm:w-28"
      role="img"
      aria-label={`Adesão global: ${value} por cento`}
    >
      <circle cx="50" cy="50" r={R} fill="none" stroke="var(--muted)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        className="ring-progress"
        style={
          {
            "--ring-circumference": C,
            "--ring-offset": offset,
          } as React.CSSProperties
        }
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-mono-numeric"
        fontSize="18"
        fontWeight="700"
      >
        {value}%
      </text>
    </svg>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const label = ASSESSMENT_STATUS_LABELS[status] ?? status;
  return (
    <Badge className={statusBadgeClass(status)} aria-label={`Status: ${label}`}>
      {label}
    </Badge>
  );
}

// ─── EligibilityBadge ────────────────────────────────────────────────────────

function EligibilityBadge({ isEligible }: { isEligible: boolean }) {
  if (isEligible) {
    return <Badge className="risk-low-bg border-transparent">Elegível</Badge>;
  }
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex outline-none">
            <Badge variant="outline" className="text-muted-foreground cursor-help">
              Inelegível
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>Menos de 5 respostas registradas.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── AssessmentHeader ────────────────────────────────────────────────────────

function AssessmentHeader({
  assessment,
  progress,
  onEdit,
  onDuplicate,
  duplicating,
}: {
  assessment: Assessment;
  progress: AssessmentProgress | null;
  onEdit: () => void;
  onDuplicate: () => void;
  duplicating: boolean;
}) {
  const showRing =
    (assessment.status === "collecting" || assessment.status === "completed") && progress != null;
  const canEdit = assessment.status === "draft" || assessment.status === "collecting";
  return (
    <header className="border-b border-border pb-6">
      <div className="flex flex-col lg:flex-row gap-5 lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2.5">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Avaliação psicossocial</span>
            <Badge variant="outline" className="font-mono-numeric text-[10px] px-1.5 py-0">
              COPSOQ II-BR · 40 itens
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl leading-tight tracking-tight text-foreground">
            {assessment.title}
          </h1>
          <p className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground font-mono-numeric">
            <Calendar className="h-3.5 w-3.5" />
            {fmtPeriod(assessment.startDate, assessment.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={assessment.status} />
          {showRing && <AdesaoRing pct={progress!.globalAdesao} />}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            disabled={duplicating}
            aria-label="Duplicar avaliação"
            className="text-[var(--brand)] hover:text-[var(--brand-light)]"
          >
            {duplicating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CopyPlus className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Duplicar</span>
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-[var(--brand)] hover:text-[var(--brand-light)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── GheProgressRows ─────────────────────────────────────────────────────────

function GheProgressRows({
  byDept,
  status,
  onSimulate,
  simulatingId,
}: {
  byDept: AssessmentProgress["byDept"];
  status: AssessmentStatus;
  onSimulate: (ad: { id: string; name: string }) => void;
  simulatingId: string | null;
}) {
  if (byDept.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg py-10 flex flex-col items-center text-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhum GHE vinculado a esta avaliação.</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto scroll-area border-t border-border">
      <ul className="divide-y divide-border">
        {byDept.map((d) => {
          const pct = safePct(d.pct);
          return (
            <li
              key={d.id}
              className="surface-hover px-1 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6"
            >
              <div className="min-w-0 lg:flex-1 lg:max-w-[40%]">
                <div className="font-display font-medium text-base truncate" title={d.name}>
                  {d.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">GHE</div>
              </div>

              <div className="flex items-center gap-6 lg:gap-8">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Esperados
                  </div>
                  <div className="font-mono-numeric font-semibold text-foreground">
                    {d.expected.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Respondidos
                  </div>
                  <div className="font-mono-numeric font-semibold text-foreground">
                    {d.responded.toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 lg:ml-auto">
                <EligibilityBadge isEligible={d.isEligible} />
                <div className="w-32 lg:w-40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Adesão</span>
                    <span className={`font-mono-numeric font-semibold ${adesaoColorClass(pct)}`}>
                      {pct}%
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5"
                    aria-label={`Adesão do GHE ${d.name}: ${pct} por cento`}
                  />
                </div>
                {status === "collecting" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSimulate({ id: d.id, name: d.name })}
                    disabled={simulatingId === d.id}
                    aria-label={`Simular respostas do GHE ${d.name}`}
                    className="text-[var(--brand)] hover:text-[var(--brand-light)] shrink-0"
                  >
                    {simulatingId === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FlaskConical className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Simular</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── ParticipationField ──────────────────────────────────────────────────────

function ParticipationField({
  assessmentId,
  initial,
  disabled,
}: {
  assessmentId: string;
  initial: string;
  disabled: boolean;
}) {
  // Local draft mirrors the last server value when the field becomes editable.
  // When the field is read-only (disabled), the displayed value comes directly
  // from `initial` so server truth is always shown without clobbering in-flight
  // edits via a setState-in-effect.
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = disabled ? initial : draft;

  const save = useCallback(
    async (text: string) => {
      setStatus("saving");
      try {
        await api.assessments.update(assessmentId, {
          participationRegistration: text,
        });
        setStatus("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setStatus("idle"), 1800);
      } catch (e) {
        if (e instanceof ApiError) {
          toast.error(e.message);
        } else {
          toast.error("Falha ao salvar o registro de participação.");
        }
        setStatus("idle");
      }
    },
    [assessmentId],
  );

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const text = e.target.value;
    setDraft(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(text), 1000);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useUnsavedChangesWarning(draft !== initial || status === "saving");

  return (
    <section className="border-b border-border pb-8">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="font-display text-base text-foreground">Registro de participação</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registre como os trabalhadores foram comunicados. Esta evidência é exigida para a
            geração do relatório NR-1.
          </p>
        </div>
        {status === "saving" && (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando…
          </span>
        )}
        {status === "saved" && (
          <span
            className="inline-flex items-center gap-1 text-xs text-[var(--risk-low)] shrink-0"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-3 w-3" />
            Salvo
          </span>
        )}
      </div>
      <Label htmlFor="participation-registration" className="sr-only">
        Registre como os trabalhadores foram comunicados.
      </Label>
      <Textarea
        id="participation-registration"
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={5}
        placeholder="Ex.: Reuniões de segurança em cada turno nos dias 12 e 13 de março; cartazes afixados nos murais; panfletos distribuídos nos vestiários; comunicado via e-mail corporativo."
        className="resize-y bg-[var(--surface)]"
      />
      <p className="text-xs text-muted-foreground mt-2">
        {disabled
          ? "Campo somente leitura — a avaliação não está em rascunho ou coleta."
          : "Salvamento automático 1 segundo após você parar de digitar."}
      </p>
    </section>
  );
}

// ─── CollectionLinks ─────────────────────────────────────────────────────────

function CollectionLinks({
  departments,
  assessmentId: _assessmentId,
}: {
  departments: AssessmentDepartment[];
  assessmentId: string;
}) {
  const tokenCacheRef = useRef<Map<string, string>>(new Map());
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const buildLink = useCallback((token: string) => {
    if (typeof window === "undefined") return `/?worker=${token}`;
    return `${window.location.origin}/?worker=${token}`;
  }, []);

  const flashCopied = useCallback((deptId: string) => {
    setCopied(deptId);
    setTimeout(() => setCopied((c) => (c === deptId ? null : c)), 1500);
  }, []);

  const copyLink = useCallback(
    async (token: string, deptId: string) => {
      try {
        await navigator.clipboard.writeText(buildLink(token));
        toast.success("Link copiado para a área de transferência.");
        flashCopied(deptId);
      } catch {
        toast.error("Não foi possível copiar o link.");
      }
    },
    [buildLink, flashCopied],
  );

  const copyWhatsApp = useCallback(
    async (token: string, deptId: string) => {
      const link = buildLink(token);
      const msg =
        "Olá! Sua empresa está realizando uma pesquisa sobre condições de trabalho. " +
        "Sua participação é anônima e voluntária. Acesse: " +
        link;
      try {
        await navigator.clipboard.writeText(msg);
        toast.success("Mensagem de WhatsApp copiada.");
        flashCopied(deptId);
      } catch {
        toast.error("Não foi possível copiar a mensagem.");
      }
    },
    [buildLink, flashCopied],
  );

  // Pre-mint one demo token per dept so the link can be displayed and copied.
  // Tokens are cached by dept id so subsequent re-renders (e.g. parent polling)
  // don't mint new single-use tokens needlessly.
  useEffect(() => {
    let cancelled = false;
    const mint = async () => {
      const cache = tokenCacheRef.current;
      const next: Record<string, string> = {};
      let allFailed = true;
      for (const ad of departments) {
        const cached = cache.get(ad.id);
        if (cached) {
          next[ad.id] = cached;
          allFailed = false;
          continue;
        }
        try {
          const r = await api.worker.enterDept(ad.id);
          cache.set(ad.id, r.token);
          next[ad.id] = r.token;
          allFailed = false;
        } catch {
          // Skip — link will display "Indisponível".
        }
        if (cancelled) return;
      }
      if (cancelled) return;
      setTokens(next);
      setError(
        allFailed && Object.keys(next).length === 0
          ? "Não foi possível gerar os links de coleta."
          : null,
      );
      setLoading(false);
    };
    void mint();
    return () => {
      cancelled = true;
    };
  }, [departments]);

  if (departments.length === 0) return null;

  return (
    <section className="border-b border-border pb-8">
      <div className="mb-3">
        <h2 className="font-display text-base text-foreground">Links de coleta</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Distribua um link exclusivo por GHE. Cada link abre o portal do trabalhador e aceita uma
          única resposta anônima.
        </p>
      </div>
      <div className="border-t border-border">
        <ul className="divide-y divide-border">
          {departments.map((ad) => {
            const token = tokens[ad.id] ?? null;
            const link = token ? buildLink(token) : null;
            return (
              <li key={ad.id} className="surface-hover py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-medium truncate" title={ad.name}>
                      {ad.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono-numeric">
                      GHE · {ad.expected} esperados · {ad.responded} respondidos
                    </div>
                  </div>
                  <EligibilityBadge isEligible={ad.isEligible} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <code className="flex-1 min-w-0 truncate rounded-md bg-[var(--surface)] px-2 py-1.5 text-xs font-mono-numeric text-muted-foreground">
                    {loading ? "Gerando link…" : (link ?? "Indisponível")}
                  </code>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => token && void copyLink(token, ad.id)}
                      disabled={!token}
                      aria-label={`Copiar link do GHE ${ad.name}`}
                      className="text-[var(--brand)] hover:text-[var(--brand-light)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => token && void copyWhatsApp(token, ad.id)}
                      disabled={!token}
                      aria-label={`Copiar mensagem de WhatsApp do GHE ${ad.name}`}
                      className="text-[var(--brand)] hover:text-[var(--brand-light)]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
                {copied === ad.id && (
                  <p
                    className="text-xs text-[var(--risk-low)] inline-flex items-center gap-1"
                    role="status"
                    aria-live="polite"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Copiado.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {error && (
        <div className="mt-3 text-xs text-[var(--risk-high)]" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

// ─── StatusActions ───────────────────────────────────────────────────────────

type ResultView = "resultados" | "inventario" | "plano" | "relatorio";

function StatusActions({
  status,
  launching,
  closing,
  simulating,
  onLaunch,
  onClose,
  onSimulate,
  onNavigate,
}: {
  status: AssessmentStatus;
  launching: boolean;
  closing: boolean;
  simulating: boolean;
  onLaunch: () => void;
  onClose: () => void;
  onSimulate: () => void;
  onNavigate: (view: ResultView) => void;
}) {
  if (status === "draft") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-[var(--sidebar-accent)] flex items-center justify-center shrink-0">
            <Rocket className="h-4 w-4 text-[var(--brand)]" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-medium text-foreground">Avaliação pronta para lançar</p>
            <p className="text-sm text-muted-foreground">
              Ao lançar, os links de coleta serão gerados e o status mudará para &quot;Coletando
              respostas&quot;.
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={launching} className="shrink-0">
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Lançar Avaliação
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl">Lançar avaliação</AlertDialogTitle>
              <AlertDialogDescription>
                Os links de coleta serão gerados e a avaliação mudará para &quot;Coletando
                respostas&quot;. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={launching}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={launching}
                onClick={(e) => {
                  e.preventDefault();
                  onLaunch();
                }}
              >
                {launching && <Loader2 className="h-4 w-4 animate-spin" />}
                Lançar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (status === "collecting") {
    return (
      <div className="flex flex-col gap-4 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-[var(--surface)] flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-[var(--risk-medium)]" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-medium text-foreground">Coleta em andamento</p>
              <p className="text-sm text-muted-foreground">
                Encerre a coleta para calcular os escores. Esta ação é irreversível e bloqueará
                novas respostas.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="shrink-0 bg-[var(--risk-high)] text-[var(--accent-foreground)] hover:bg-[var(--risk-high)]/90">
                <Lock className="h-4 w-4" />
                Encerrar Coleta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-xl">
                  Encerrar coleta?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é <strong>irreversível</strong>. Após o encerramento, novos respondentes
                  não poderão participar, os escores serão calculados e o status mudará para
                  &quot;Concluída&quot;. GHEs com menos de 5 respostas serão marcados como
                  inelegíveis.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={closing}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={closing}
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                  }}
                  className="bg-[var(--risk-high)] text-[var(--accent-foreground)] hover:bg-[var(--risk-high)]/90"
                >
                  {closing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Encerrar e calcular
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-[var(--surface)] flex items-center justify-center shrink-0">
              <FlaskConical className="h-4 w-4 text-[var(--risk-medium)]" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-medium text-foreground">Simular respostas (demo)</p>
              <p className="text-sm text-muted-foreground">
                Gere respostas fictícias em massa para demonstração e testes. Use apenas em
                ambientes de demonstração.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onSimulate}
            disabled={simulating}
            className="shrink-0"
            aria-label="Simular respostas em todos os GHEs"
          >
            {simulating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            Simular respostas
          </Button>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-[var(--surface)] flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-[var(--risk-low)]" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-medium text-foreground">Avaliação concluída</p>
              <p className="text-sm text-muted-foreground">
                Acesse os resultados e dê continuidade ao ciclo.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button onClick={() => onNavigate("resultados")} className="w-full">
            <BarChart3 className="h-4 w-4" />
            Ver Resultados
          </Button>
          <Button variant="outline" onClick={() => onNavigate("inventario")} className="w-full">
            <ListChecks className="h-4 w-4" />
            Inventário de Riscos
          </Button>
          <Button variant="outline" onClick={() => onNavigate("plano")} className="w-full">
            <ClipboardList className="h-4 w-4" />
            Plano de Ação
          </Button>
          <Button variant="outline" onClick={() => onNavigate("relatorio")} className="w-full">
            <FileText className="h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="py-5 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Processando resultados…</p>
      </div>
    );
  }

  // archived or unknown
  return (
    <div className="py-5 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Esta avaliação foi arquivada.</p>
    </div>
  );
}

// ─── DuplicateAssessmentDialog ──────────────────────────────────────────────

function DuplicateAssessmentDialog({
  open,
  onOpenChange,
  assessment,
  onSuccess,
  onSavingChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessment: Assessment;
  onSuccess: (a: Assessment) => void;
  onSavingChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Duplicar avaliação</DialogTitle>
          <DialogDescription>
            Será criada uma nova avaliação em rascunho com os mesmos GHEs e respostas esperadas. As
            respostas anteriores não serão copiadas.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <DuplicateAssessmentForm
            key={assessment.id}
            assessment={assessment}
            onSavingChange={onSavingChange}
            onSuccess={(a) => {
              onSuccess(a);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DuplicateAssessmentForm({
  assessment,
  onSuccess,
  onCancel,
  onSavingChange,
}: {
  assessment: Assessment;
  onSuccess: (a: Assessment) => void;
  onCancel: () => void;
  onSavingChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState(`${assessment.title} (cópia)`);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!title.trim() || title.trim().length < 2) {
      setErr("Título deve ter ao menos 2 caracteres.");
      return;
    }
    setSaving(true);
    onSavingChange(true);
    try {
      const created = await api.assessments.duplicate(assessment.id, {
        title: title.trim(),
      });
      toast.success("Avaliação duplicada com sucesso.");
      onSuccess(created);
    } catch (e2) {
      const msg = e2 instanceof ApiError ? e2.message : "Falha ao duplicar a avaliação.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="duplicate-title">Título da nova avaliação</Label>
        <Input
          id="duplicate-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
        />
      </div>
      {err && (
        <p className="text-sm text-[var(--risk-high)]" role="alert">
          {err}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          Duplicar
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── EditAssessmentDialog ────────────────────────────────────────────────────

function EditAssessmentDialog({
  open,
  onOpenChange,
  assessment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessment: Assessment;
  onSaved: (a: Assessment) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar avaliação</DialogTitle>
          <DialogDescription>
            Ajuste os dados do ciclo. Disponível apenas em rascunho ou durante a coleta.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <EditAssessmentForm
            key={assessment.id}
            assessment={assessment}
            onSaved={(a) => {
              onSaved(a);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditAssessmentForm({
  assessment,
  onSaved,
  onCancel,
}: {
  assessment: Assessment;
  onSaved: (a: Assessment) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(assessment.title);
  const [startDate, setStartDate] = useState(assessment.startDate ?? "");
  const [endDate, setEndDate] = useState(assessment.endDate ?? "");
  const [participation, setParticipation] = useState(assessment.participationRegistration ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr("Título é obrigatório.");
      return;
    }
    if (!endDate) {
      setErr("Data final é obrigatória.");
      return;
    }
    if (startDate && endDate < startDate) {
      setErr("Data final deve ser posterior à data inicial.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.assessments.update(assessment.id, {
        title: title.trim(),
        startDate: startDate || undefined,
        endDate,
        participationRegistration: participation,
      });
      toast.success("Avaliação atualizada.");
      onSaved(updated);
    } catch (e2) {
      if (e2 instanceof ApiError) {
        setErr(e2.message);
      } else {
        setErr("Falha ao atualizar a avaliação.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Título</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="edit-start">Início</Label>
          <Input
            id="edit-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-end">Fim</Label>
          <Input
            id="edit-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-participation">Registro de participação</Label>
        <Textarea
          id="edit-participation"
          rows={4}
          value={participation}
          onChange={(e) => setParticipation(e.target.value)}
          placeholder="Como os trabalhadores foram comunicados."
          className="bg-[var(--surface)]"
        />
      </div>
      {err && (
        <p className="text-sm text-[var(--risk-high)]" role="alert">
          {err}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── SimulateResponsesDialog ─────────────────────────────────────────────────

type SimulateBias = "low" | "medium" | "high";

const BIAS_OPTIONS: Array<{ value: SimulateBias; label: string }> = [
  { value: "low", label: "Favorável" },
  { value: "medium", label: "Intermediário" },
  { value: "high", label: "Desfavorável" },
];

function SimulateResponsesDialog({
  open,
  onOpenChange,
  assessment,
  departments,
  initialAssessmentDeptId,
  onSavingChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessment: Assessment;
  departments: AssessmentDepartment[];
  initialAssessmentDeptId: string | null;
  onSavingChange: (v: boolean) => void;
  onSuccess: (simulated: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Simular respostas (demo)</DialogTitle>
          <DialogDescription>
            Gera respostas simuladas para demonstração e testes. Os dados são fictícios e não
            representam trabalhadores reais. Use apenas em ambientes de demonstração.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SimulateResponsesForm
            key={`${assessment.id}:${initialAssessmentDeptId ?? "all"}`}
            assessment={assessment}
            departments={departments}
            initialAssessmentDeptId={initialAssessmentDeptId}
            onSavingChange={onSavingChange}
            onSuccess={(simulated) => {
              onSuccess(simulated);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SimulateResponsesForm({
  assessment,
  departments,
  initialAssessmentDeptId,
  onSavingChange,
  onSuccess,
  onCancel,
}: {
  assessment: Assessment;
  departments: AssessmentDepartment[];
  initialAssessmentDeptId: string | null;
  onSavingChange: (v: boolean) => void;
  onSuccess: (simulated: number) => void;
  onCancel: () => void;
}) {
  // initialAssessmentDeptId === null means "Todos os GHEs" pre-selected.
  const [assessmentDeptId, setAssessmentDeptId] = useState<string>(
    initialAssessmentDeptId ?? "__all__",
  );
  const [countStr, setCountStr] = useState<string>("5");
  const [bias, setBias] = useState<SimulateBias>("medium");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const countNum = Number.parseInt(countStr, 10);
  const countValid =
    Number.isFinite(countNum) && Number.isInteger(countNum) && countNum >= 1 && countNum <= 50;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!countValid) {
      setErr("Número de respostas deve ser um inteiro entre 1 e 50.");
      return;
    }
    setSaving(true);
    onSavingChange(true);
    try {
      const targetDeptId = assessmentDeptId === "__all__" ? undefined : assessmentDeptId;
      const r = await api.assessments.simulate(assessment.id, {
        count: countNum,
        assessmentDeptId: targetDeptId,
        bias,
      });
      toast.success(`${r.simulated} respostas simuladas com sucesso.`);
      onSuccess(r.simulated);
    } catch (e2) {
      const msg = e2 instanceof ApiError ? e2.message : "Falha ao simular respostas.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="simulate-dept">GHE</Label>
        <Select value={assessmentDeptId} onValueChange={(v) => setAssessmentDeptId(v)}>
          <SelectTrigger id="simulate-dept" className="w-full">
            <SelectValue placeholder="Selecione o GHE" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os GHEs</SelectItem>
            {departments.map((ad) => (
              <SelectItem key={ad.id} value={ad.id}>
                {ad.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="simulate-count">Respostas por GHE</Label>
        <Input
          id="simulate-count"
          type="number"
          min={1}
          max={50}
          step={1}
          value={countStr}
          onChange={(e) => setCountStr(e.target.value)}
          inputMode="numeric"
          aria-describedby="simulate-count-help"
        />
        <p id="simulate-count-help" className="text-xs text-muted-foreground">
          Entre 1 e 50 respostas serão geradas por GHE selecionado.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="simulate-bias">Perfil de risco</Label>
        <Select value={bias} onValueChange={(v) => setBias(v as SimulateBias)}>
          <SelectTrigger id="simulate-bias" className="w-full">
            <SelectValue placeholder="Selecione o perfil" />
          </SelectTrigger>
          <SelectContent>
            {BIAS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controla a tendência das respostas simuladas (Favorável = baixo risco, Desfavorável = alto
          risco).
        </p>
      </div>

      <Alert className="border-[var(--risk-medium)]/40 bg-[var(--surface)] text-[var(--risk-medium)]">
        <AlertTriangle className="h-4 w-4 text-[var(--risk-medium)]" />
        <AlertDescription className="text-[var(--risk-medium)]">
          As respostas simuladas não podem ser removidas individualmente. Se necessário, encerre e
          duplique a avaliação para recomeçar.
        </AlertDescription>
      </Alert>

      {err && (
        <p className="text-sm text-[var(--risk-high)]" role="alert">
          {err}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !countValid}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4" />
          )}
          Simular
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div
      className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full space-y-6"
      aria-hidden="true"
    >
      {/* Top nav skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>

      {/* Header skeleton — breadcrumb chips, title, period, status badges */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* Status actions skeleton — icon block + label + button */}
      <div className="border-b border-border py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-40 rounded-md shrink-0" />
      </div>

      {/* GHE progress rows skeleton — section title + 3 list rows */}
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="border-t border-border divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6"
            >
              <div className="lg:flex-1 lg:max-w-[40%] space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center gap-6 lg:gap-8">
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
              <div className="flex items-center gap-3 lg:ml-auto">
                <Skeleton className="h-5 w-20 rounded-full" />
                <div className="w-32 lg:w-40 space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-10" />
                    <Skeleton className="h-2.5 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participation field skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function AvaliacaoDetailView() {
  const assessmentId = useView((s) => s.assessmentId);
  const companyId = useView((s) => s.companyId);
  const go = useView((s) => s.go);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [closing, setClosing] = useState(false);
  // Simulate-responses dialog state.
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateInitialDeptId, setSimulateInitialDeptId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const load = useCallback(async () => {
    if (!assessmentId) {
      setError("Nenhuma avaliação selecionada.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const a = await api.assessments.get(assessmentId);
      setAssessment(a);
      if (a.status === "collecting" || a.status === "completed") {
        try {
          const p = await api.assessments.progress(assessmentId);
          setProgress(p);
        } catch {
          setProgress(null);
        }
      } else {
        setProgress(null);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar a avaliação.");
      }
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Polling — every 30s while collecting. Pauses automatically when status
  // changes (the effect re-runs and returns early).
  const isCollecting = assessment?.status === "collecting";
  useEffect(() => {
    if (!assessmentId || !isCollecting) return;
    const id = setInterval(() => {
      void (async () => {
        try {
          const [a, p] = await Promise.all([
            api.assessments.get(assessmentId),
            api.assessments.progress(assessmentId),
          ]);
          setAssessment(a);
          setProgress(p);
        } catch {
          // Silent — next tick will retry.
        }
      })();
    }, 30000);
    return () => clearInterval(id);
  }, [assessmentId, isCollecting]);

  // Actions ──────────────────────────────────────────────────────────────────

  const onLaunch = useCallback(async () => {
    if (!assessment) return;
    setLaunching(true);
    try {
      await api.assessments.launch(assessment.id);
      toast.success("Avaliação lançada. Links de coleta disponíveis.");
      void load();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Falha ao lançar a avaliação.");
      }
    } finally {
      setLaunching(false);
    }
  }, [assessment, load]);

  const onClose = useCallback(async () => {
    if (!assessment) return;
    setClosing(true);
    try {
      const r = await api.assessments.close(assessment.id);
      toast.success(
        `Avaliação concluída. ${r.eligibleDepts} GHE(s) elegível(is), ${r.totalDimensions} dimensão(ões) processadas.`,
      );
      go("resultados", { assessmentId: assessment.id });
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Falha ao encerrar a coleta.");
      }
    } finally {
      setClosing(false);
    }
  }, [assessment, go]);

  // Per-GHE simulate button: opens the dialog with that GHE pre-selected.
  const onSimulatePerGhe = useCallback((ad: { id: string; name: string }) => {
    setSimulateInitialDeptId(ad.id);
    setSimulateOpen(true);
  }, []);

  // Global simulate button (status=collecting only): opens the dialog with
  // "Todos os GHEs" pre-selected.
  const onSimulateAll = useCallback(() => {
    setSimulateInitialDeptId(null);
    setSimulateOpen(true);
  }, []);

  const onNavigate = useCallback(
    (view: ResultView) => {
      if (!assessment) return;
      go(view, { assessmentId: assessment.id });
    },
    [assessment, go],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!assessmentId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto w-full">
        <div className="border border-dashed border-border rounded-lg py-12 flex flex-col items-center text-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-lg text-foreground">Nenhuma avaliação selecionada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Volte para a empresa e selecione uma avaliação para visualizar seus detalhes.
            </p>
          </div>
          <Button onClick={() => go("painel")}>Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  if (loading) return <DetailSkeleton />;

  if (error || !assessment) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto w-full">
        <div className="border border-dashed border-border rounded-lg py-10 flex flex-col items-center text-center gap-3">
          <div className="h-11 w-11 rounded-full risk-high-bg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg text-foreground">Falha ao carregar a avaliação</p>
            <p className="text-sm text-muted-foreground mt-1">{error ?? "Tente novamente."}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => go("painel")}>
              Voltar ao painel
            </Button>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = assessment.status;
  const isDraft = status === "draft";
  const canEdit = isDraft || isCollecting;

  // "Dias restantes" hint while collecting.
  let daysHint: string | null = null;
  if (isCollecting && assessment.endDate) {
    try {
      const end = parseISO(assessment.endDate);
      if (isValid(end)) {
        const diff = differenceInDays(end, new Date());
        if (diff > 0) daysHint = `Encerra em ${diff} dia${diff === 1 ? "" : "s"}.`;
        else if (diff === 0) daysHint = "Encerra hoje.";
        else
          daysHint = `Prazo encerrado há ${Math.abs(
            diff,
          )} dia(s) — encerre a coleta para prosseguir.`;
      }
    } catch {
      daysHint = null;
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Top bar: back + refresh */}
      <nav className="mb-4 flex items-center justify-between gap-3" aria-label="Navegação">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (companyId ? go("empresa", { companyId }) : go("painel"))}
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar à empresa
        </Button>
        <Button variant="ghost" size="sm" onClick={refresh} aria-label="Atualizar avaliação">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="sr-only">Atualizar</span>
        </Button>
      </nav>

      <AssessmentHeader
        assessment={assessment}
        progress={progress}
        onEdit={() => setEditOpen(true)}
        onDuplicate={() => setDuplicateOpen(true)}
        duplicating={duplicating}
      />

      {/* Duplicate dialog */}
      <DuplicateAssessmentDialog
        open={duplicateOpen}
        onOpenChange={(v) => {
          setDuplicateOpen(v);
          if (!v) setDuplicating(false);
        }}
        assessment={assessment}
        onSavingChange={setDuplicating}
        onSuccess={(newA) => {
          setDuplicating(false);
          setDuplicateOpen(false);
          go("avaliacao", {
            assessmentId: newA.id,
            companyId: newA.companyId,
          });
        }}
      />

      {isCollecting && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Clock className="h-3.5 w-3.5" />
          <span role="status">Atualizando a cada 30s.</span>
          {daysHint && (
            <>
              <span aria-hidden>·</span>
              <span>{daysHint}</span>
            </>
          )}
        </div>
      )}

      {/* Status action buttons */}
      <section className="mt-4 border-b border-border" aria-label="Ações da avaliação">
        <StatusActions
          status={status}
          launching={launching}
          closing={closing}
          simulating={simulating}
          onLaunch={() => void onLaunch()}
          onClose={() => void onClose()}
          onSimulate={() => onSimulateAll()}
          onNavigate={onNavigate}
        />
      </section>

      {/* GHE progress rows */}
      <section className="mt-6" aria-label="Progresso por GHE">
        <h2 className="font-display text-xl text-foreground mb-3">Progresso por GHE</h2>
        {progress ? (
          <GheProgressRows
            byDept={progress.byDept}
            status={status}
            onSimulate={(d) => onSimulatePerGhe(d)}
            simulatingId={simulating ? "__global__" : null}
          />
        ) : (
          <div className="border border-dashed border-border rounded-lg py-8 flex flex-col items-center text-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDraft
                ? "Lance a avaliação para começar a acompanhar o progresso de coleta."
                : "Sem dados de progresso disponíveis."}
            </p>
          </div>
        )}
      </section>

      {/* Participation field */}
      <section className="mt-8" aria-label="Registro de participação">
        <ParticipationField
          assessmentId={assessment.id}
          initial={assessment.participationRegistration ?? ""}
          disabled={!canEdit}
        />
      </section>

      {/* Collection links — only while collecting */}
      {isCollecting && assessment.departments && assessment.departments.length > 0 && (
        <section className="mt-8" aria-label="Links de coleta">
          <CollectionLinks departments={assessment.departments} assessmentId={assessment.id} />
        </section>
      )}

      {/* Simulate responses dialog (demo) */}
      <SimulateResponsesDialog
        open={simulateOpen}
        onOpenChange={(v) => {
          setSimulateOpen(v);
          if (!v) setSimulating(false);
        }}
        assessment={assessment}
        departments={assessment.departments ?? []}
        initialAssessmentDeptId={simulateInitialDeptId}
        onSavingChange={setSimulating}
        onSuccess={() => {
          setSimulating(false);
          setSimulateOpen(false);
          // Refresh the assessment + progress so the new response counts
          // and eligibility badges are reflected immediately.
          void load();
        }}
      />

      {/* Edit dialog */}
      <EditAssessmentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        assessment={assessment}
        onSaved={(a) => {
          setAssessment(a);
          refresh();
        }}
      />
    </div>
  );
}

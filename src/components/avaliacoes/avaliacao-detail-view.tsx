"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  ExternalLink,
  FileText,
  ListChecks,
  Loader2,
  Lock,
  MessageCircle,
  Pencil,
  RefreshCw,
  Rocket,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type {
  Assessment,
  AssessmentDepartment,
  AssessmentProgress,
  AssessmentStatus,
} from "@/lib/types";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      return "bg-brand-light text-white border-transparent";
    case "completed":
      return "risk-low-bg border-transparent";
    case "draft":
    case "archived":
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
}

function safePct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function adesaoColorClass(pct: number): string {
  if (pct < 30) return "text-muted-foreground";
  if (pct < 70) return "text-risk-medium";
  return "text-risk-low";
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
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="8"
      />
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
    return (
      <Badge className="risk-low-bg border-transparent">Elegível</Badge>
    );
  }
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex outline-none"
            aria-label="Inelegível — menos de 5 respostas registradas"
          >
            <Badge
              variant="outline"
              className="text-muted-foreground cursor-help"
            >
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
}: {
  assessment: Assessment;
  progress: AssessmentProgress | null;
  onEdit: () => void;
}) {
  const showRing =
    (assessment.status === "collecting" ||
      assessment.status === "completed") &&
    progress != null;
  const canEdit =
    assessment.status === "draft" || assessment.status === "collecting";
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Avaliação psicossocial</span>
              <Badge variant="outline" className="font-mono-numeric">
                COPSOQ II-BR · 40 itens
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl leading-tight">
              {assessment.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {fmtPeriod(assessment.startDate, assessment.endDate)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={assessment.status} />
            {showRing && <AdesaoRing pct={progress!.globalAdesao} />}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// ─── GheProgressCards ────────────────────────────────────────────────────────

function GheProgressCards({
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
      <Card>
        <CardContent className="py-10 flex flex-col items-center text-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum GHE vinculado a esta avaliação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto scroll-area pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {byDept.map((d) => {
          const pct = safePct(d.pct);
          return (
            <Card key={d.id} className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate" title={d.name}>
                      {d.name}
                    </CardTitle>
                    <CardDescription className="mt-0.5">GHE</CardDescription>
                  </div>
                  <EligibilityBadge isEligible={d.isEligible} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Esperados
                    </div>
                    <div className="font-mono-numeric font-semibold">
                      {d.expected.toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Respondidos
                    </div>
                    <div className="font-mono-numeric font-semibold">
                      {d.responded.toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Adesão</span>
                    <span
                      className={`font-mono-numeric font-semibold ${adesaoColorClass(pct)}`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </CardContent>
              {status === "collecting" && (
                <CardFooter className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onSimulate({ id: d.id, name: d.name })}
                    disabled={simulatingId === d.id}
                    aria-label={`Simular resposta do GHE ${d.name}`}
                  >
                    {simulatingId === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    Simular resposta (demo)
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
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
    [assessmentId]
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Registro de participação</CardTitle>
            <CardDescription>
              Registre como os trabalhadores foram comunicados. Esta evidência
              é exigida para a geração do relatório NR-1.
            </CardDescription>
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
              className="inline-flex items-center gap-1 text-xs text-risk-low shrink-0"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="h-3 w-3" />
              Salvo
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {disabled
            ? "Campo somente leitura — a avaliação não está em rascunho ou coleta."
            : "Salvamento automático 1 segundo após você parar de digitar."}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── CollectionLinks ─────────────────────────────────────────────────────────

function CollectionLinks({
  departments,
  assessmentId,
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
    setTimeout(
      () => setCopied((c) => (c === deptId ? null : c)),
      1500
    );
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
    [buildLink, flashCopied]
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
    [buildLink, flashCopied]
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
          : null
      );
      setLoading(false);
    };
    void mint();
    return () => {
      cancelled = true;
    };
  }, [departments, assessmentId]);

  if (departments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Links de coleta</CardTitle>
        <CardDescription>
          Distribua um link exclusivo por GHE. Cada link abre o portal do
          trabalhador e aceita uma única resposta anônima.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto scroll-area">
          <ul className="divide-y divide-border">
            {departments.map((ad) => {
              const token = tokens[ad.id] ?? null;
              const link = token ? buildLink(token) : null;
              return (
                <li
                  key={ad.id}
                  className="px-6 py-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="font-medium truncate"
                        title={ad.name}
                      >
                        {ad.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        GHE · {ad.expected} esperados ·{" "}
                        {ad.responded} respondidos
                      </div>
                    </div>
                    <EligibilityBadge isEligible={ad.isEligible} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <code
                      className="flex-1 min-w-0 truncate rounded-md bg-muted px-2 py-1.5 text-xs font-mono-numeric text-muted-foreground"
                      aria-label={
                        link
                          ? `Link do GHE ${ad.name}`
                          : `Link do GHE ${ad.name} indisponível`
                      }
                    >
                      {loading
                        ? "Gerando link…"
                        : link ?? "Indisponível"}
                    </code>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          token && void copyLink(token, ad.id)
                        }
                        disabled={!token}
                        aria-label={`Copiar link do GHE ${ad.name}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          token && void copyWhatsApp(token, ad.id)
                        }
                        disabled={!token}
                        aria-label={`Copiar mensagem de WhatsApp do GHE ${ad.name}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                  {copied === ad.id && (
                    <p
                      className="text-xs text-risk-low inline-flex items-center gap-1"
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
          <div className="px-6 py-3 text-xs text-destructive" role="alert">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── StatusActions ───────────────────────────────────────────────────────────

type ResultView = "resultados" | "inventario" | "plano" | "relatorio";

function StatusActions({
  status,
  launching,
  closing,
  onLaunch,
  onClose,
  onNavigate,
}: {
  status: AssessmentStatus;
  launching: boolean;
  closing: boolean;
  onLaunch: () => void;
  onClose: () => void;
  onNavigate: (view: ResultView) => void;
}) {
  if (status === "draft") {
    return (
      <Card>
        <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-brand-light/15 flex items-center justify-center shrink-0">
              <Rocket className="h-4 w-4 text-brand-light" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Avaliação pronta para lançar</p>
              <p className="text-sm text-muted-foreground">
                Ao lançar, os links de coleta serão gerados e o status mudará
                para &quot;Coletando respostas&quot;.
              </p>
            </div>
          </div>
          <Button
            onClick={onLaunch}
            disabled={launching}
            className="shrink-0"
          >
            {launching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            Lançar Avaliação
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "collecting") {
    return (
      <Card>
        <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-risk-medium/15 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-risk-medium" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Coleta em andamento</p>
              <p className="text-sm text-muted-foreground">
                Encerre a coleta para calcular os escores. Esta ação é
                irreversível e bloqueará novas respostas.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <Lock className="h-4 w-4" />
                Encerrar Coleta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar coleta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é <strong>irreversível</strong>. Após o
                  encerramento, novos respondentes não poderão participar, os
                  escores serão calculados e o status mudará para
                  &quot;Concluída&quot;. GHEs com menos de 5 respostas serão
                  marcados como inelegíveis.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={closing}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={closing}
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                  }}
                >
                  {closing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Encerrar e calcular
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  if (status === "completed") {
    return (
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-risk-low/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-risk-low" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Avaliação concluída</p>
                <p className="text-sm text-muted-foreground">
                  Acesse os resultados e dê continuidade ao ciclo NR-1.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              onClick={() => onNavigate("resultados")}
              className="w-full"
            >
              <BarChart3 className="h-4 w-4" />
              Ver Resultados
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("inventario")}
              className="w-full"
            >
              <ListChecks className="h-4 w-4" />
              Inventário de Riscos
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("plano")}
              className="w-full"
            >
              <ClipboardList className="h-4 w-4" />
              Plano de Ação
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("relatorio")}
              className="w-full"
            >
              <FileText className="h-4 w-4" />
              Relatório
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "processing") {
    return (
      <Card>
        <CardContent className="py-5 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Processando resultados…
          </p>
        </CardContent>
      </Card>
    );
  }

  // archived or unknown
  return (
    <Card>
      <CardContent className="py-5 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Esta avaliação foi arquivada.
        </p>
      </CardContent>
    </Card>
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
          <DialogTitle>Editar avaliação</DialogTitle>
          <DialogDescription>
            Ajuste os dados do ciclo. Disponível apenas em rascunho ou durante
            a coleta.
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
  const [participation, setParticipation] = useState(
    assessment.participationRegistration ?? ""
  );
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
        />
      </div>
      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
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

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function AvaliacaoDetailView() {
  const assessmentId = useView((s) => s.assessmentId);
  const companyId = useView((s) => s.companyId);
  const go = useView((s) => s.go);
  const openWorker = useView((s) => s.openWorker);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [closing, setClosing] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

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
  }, [load, refreshKey]);

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
        `Avaliação concluída. ${r.eligibleDepts} GHE(s) elegível(is), ${r.totalDimensions} dimensão(ões) processadas.`
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

  const onSimulate = useCallback(
    async (ad: { id: string; name: string }) => {
      setSimulatingId(ad.id);
      try {
        const r = await api.worker.enterDept(ad.id);
        openWorker(r.token);
        toast.info(`Abrindo portal do trabalhador para "${ad.name}".`);
      } catch (e) {
        if (e instanceof ApiError) {
          toast.error(e.message);
        } else {
          toast.error("Não foi possível iniciar a simulação.");
        }
      } finally {
        setSimulatingId(null);
      }
    },
    [openWorker]
  );

  const onNavigate = useCallback(
    (view: ResultView) => {
      if (!assessment) return;
      go(view, { assessmentId: assessment.id });
    },
    [assessment, go]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!assessmentId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto w-full">
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhuma avaliação selecionada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Volte para a empresa e selecione uma avaliação para visualizar
                seus detalhes.
              </p>
            </div>
            <Button onClick={() => go("painel")}>Voltar ao painel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <DetailSkeleton />;

  if (error || !assessment) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto w-full">
        <Card className="border-destructive/30">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium">Falha ao carregar a avaliação</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error ?? "Tente novamente."}
              </p>
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
          </CardContent>
        </Card>
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
        if (diff > 0)
          daysHint = `Encerra em ${diff} dia${diff === 1 ? "" : "s"}.`;
        else if (diff === 0) daysHint = "Encerra hoje.";
        else
          daysHint = `Prazo encerrado há ${Math.abs(
            diff
          )} dia(s) — encerre a coleta para prosseguir.`;
      }
    } catch {
      daysHint = null;
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      {/* Top bar: back + refresh */}
      <nav
        className="mb-4 flex items-center justify-between gap-3"
        aria-label="Navegação"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            companyId ? go("empresa", { companyId }) : go("painel")
          }
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar à empresa
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          aria-label="Atualizar avaliação"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="sr-only">Atualizar</span>
        </Button>
      </nav>

      <AssessmentHeader
        assessment={assessment}
        progress={progress}
        onEdit={() => setEditOpen(true)}
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
      <section className="mt-4" aria-label="Ações da avaliação">
        <StatusActions
          status={status}
          launching={launching}
          closing={closing}
          onLaunch={() => void onLaunch()}
          onClose={() => void onClose()}
          onNavigate={onNavigate}
        />
      </section>

      {/* GHE progress cards */}
      <section className="mt-6" aria-label="Progresso por GHE">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Progresso por GHE
        </h2>
        {progress ? (
          <GheProgressCards
            byDept={progress.byDept}
            status={status}
            onSimulate={(d) => void onSimulate(d)}
            simulatingId={simulatingId}
          />
        ) : (
          <Card>
            <CardContent className="py-8 flex flex-col items-center text-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDraft
                  ? "Lance a avaliação para começar a acompanhar o progresso de coleta."
                  : "Sem dados de progresso disponíveis."}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Participation field */}
      <section className="mt-6" aria-label="Registro de participação">
        <ParticipationField
          assessmentId={assessment.id}
          initial={assessment.participationRegistration ?? ""}
          disabled={!canEdit}
        />
      </section>

      {/* Collection links — only while collecting */}
      {isCollecting &&
        assessment.departments &&
        assessment.departments.length > 0 && (
          <section className="mt-6" aria-label="Links de coleta">
            <CollectionLinks
              departments={assessment.departments}
              assessmentId={assessment.id}
            />
          </section>
        )}

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

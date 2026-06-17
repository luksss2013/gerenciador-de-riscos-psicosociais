"use client";

// Worker Portal (Módulo 6 — spec §4.8)
// Anonymous, one-question-per-screen COPSOQ II-BR questionnaire.
// No back button. No analytics. No PII collected.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { CopsoqItemDTO } from "@/lib/types";
import { LIKERT_SCALE } from "@/lib/copsoq-data";
import { useView } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Screen = "welcome" | "questions" | "thanks" | "error";

const TOTAL_ITEMS = 40;
const ANSWERS_STORAGE_PREFIX = "nr1_worker_answers_";
const ADVANCE_DELAY_MS = 300;

const ERROR_MESSAGES: Record<string, string> = {
  TOKEN_INVALID: "Este link é inválido ou não existe.",
  TOKEN_ALREADY_USED:
    "Este link já foi utilizado. Cada link pode ser usado apenas uma vez.",
  TOKEN_ASSESSMENT_CLOSED: "Esta pesquisa está encerrada.",
};

// ─── localStorage helpers (offline-tolerant) ────────────────────────────────

function getStoredAnswers(token: string): Record<number, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ANSWERS_STORAGE_PREFIX + token);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const out: Record<number, number> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        const idx = Number(k);
        const val = Number(v);
        if (
          Number.isInteger(idx) &&
          idx >= 1 &&
          idx <= TOTAL_ITEMS &&
          Number.isInteger(val) &&
          val >= 1 &&
          val <= 5
        ) {
          out[idx] = val;
        }
      }
      return out;
    }
  } catch {
    // corrupted state — ignore
  }
  return {};
}

function saveStoredAnswers(
  token: string,
  answers: Record<number, number>
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ANSWERS_STORAGE_PREFIX + token,
      JSON.stringify(answers)
    );
  } catch {
    // storage unavailable / quota — fail silently (offline-tolerant)
  }
}

// Reconcile server-answered count with local answers. Server returns only a
// count (not which indices), so we treat items 1..answeredCount as server-truth
// and union with localStorage entries (in case of prior offline answers).
function firstUnansweredIndex(
  localAnswers: Record<number, number>,
  serverAnsweredCount: number
): number {
  for (let i = 1; i <= TOTAL_ITEMS; i++) {
    const serverAnswered = i <= serverAnsweredCount;
    const localAnswered = localAnswers[i] !== undefined;
    if (!serverAnswered && !localAnswered) return i;
  }
  return TOTAL_ITEMS + 1;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function WorkerPortal({ token }: { token: string }) {
  const closeWorker = useView((s) => s.closeWorker);

  const [screen, setScreen] = useState<Screen>("welcome");
  const [bootLoading, setBootLoading] = useState(true);
  const [items, setItems] = useState<CopsoqItemDTO[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(1); // 1-based
  const [submitting, setSubmitting] = useState(false);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [infoMsg, setInfoMsg] = useState<string>("");

  const complete = useCallback(async () => {
    try {
      await api.worker.complete(token);
      setScreen("thanks");
    } catch (e) {
      if (e instanceof ApiError && e.code === "TOKEN_ALREADY_USED") {
        setScreen("thanks");
        return;
      }
      if (
        e instanceof ApiError &&
        e.code === "VALIDATION_ERROR" &&
        e.message === "INCOMPLETE_ANSWERS"
      ) {
        // Server says some answers are missing — re-read fresh local answers
        // and resume at the first gap.
        const fresh = getStoredAnswers(token);
        const details = (e.details ?? {}) as {
          answeredCount?: number;
          totalItems?: number;
        };
        const serverAnsweredCount = details.answeredCount ?? 0;
        const startIdx = firstUnansweredIndex(fresh, serverAnsweredCount);
        setCurrentIndex(Math.min(Math.max(startIdx, 1), TOTAL_ITEMS));
        setInfoMsg(
          "Identificamos que nem todas as respostas foram registradas. " +
            "Por favor, continue a partir da questão atual."
        );
        setSelectedValue(null);
        setScreen("questions");
        return;
      }
      setErrorMsg(
        "Não foi possível finalizar a pesquisa. Tente novamente em instantes."
      );
      setScreen("error");
    }
  }, [token]);

  // Boot — validate token + status on mount, hydrate from localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await api.worker.tokenStatus(token);
        if (cancelled) return;

        const stored = getStoredAnswers(token);
        setAnswers(stored);

        if (!status.valid) {
          setErrorMsg(ERROR_MESSAGES.TOKEN_INVALID);
          setScreen("error");
          setBootLoading(false);
          return;
        }
        if (status.alreadyUsed) {
          setScreen("thanks");
          setBootLoading(false);
          return;
        }
        if (!status.assessmentOpen) {
          setErrorMsg(ERROR_MESSAGES.TOKEN_ASSESSMENT_CLOSED);
          setScreen("error");
          setBootLoading(false);
          return;
        }

        const { items: fetchedItems } = await api.worker.tokenItems(token);
        if (cancelled) return;
        setItems(fetchedItems);

        const startIdx = firstUnansweredIndex(stored, status.answeredCount);
        if (startIdx > TOTAL_ITEMS) {
          // All 40 answered locally but token not yet completed — finalize.
          setBootLoading(false);
          await complete();
          return;
        }
        setCurrentIndex(startIdx);
        setScreen("welcome");
        setBootLoading(false);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.code === "TOKEN_INVALID") {
            setErrorMsg(ERROR_MESSAGES.TOKEN_INVALID);
          } else if (e.code === "TOKEN_ALREADY_USED") {
            setScreen("thanks");
            setBootLoading(false);
            return;
          } else if (e.code === "TOKEN_ASSESSMENT_CLOSED") {
            setErrorMsg(ERROR_MESSAGES.TOKEN_ASSESSMENT_CLOSED);
          } else {
            setErrorMsg(e.message || "Não foi possível carregar a pesquisa.");
          }
        } else {
          setErrorMsg(
            "Não foi possível carregar a pesquisa. Verifique sua conexão e tente novamente."
          );
        }
        setScreen("error");
        setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, complete]);

  const handleStart = () => {
    setScreen("questions");
  };

  const handleLikertSelect = async (itemIndex: number, likertValue: number) => {
    if (submitting) return;
    setSelectedValue(likertValue);
    setSubmitting(true);
    setInfoMsg("");

    // 1) Save to local state + localStorage immediately (offline-tolerant)
    setAnswers((prev) => {
      const next = { ...prev, [itemIndex]: likertValue };
      saveStoredAnswers(token, next);
      return next;
    });

    try {
      // 2) POST answer
      await api.worker.answer(token, { itemIndex, likertValue });
      // 3) Advance after ~300ms (brief visual confirmation)
      window.setTimeout(() => {
        if (itemIndex >= TOTAL_ITEMS) {
          // Last question — call complete(), keep submitting locked until resolved.
          void complete().finally(() => setSubmitting(false));
        } else {
          setCurrentIndex(itemIndex + 1);
          setSelectedValue(null);
          setSubmitting(false);
        }
      }, ADVANCE_DELAY_MS);
    } catch (e) {
      // 4) TOKEN_ALREADY_USED → straight to thanks
      if (e instanceof ApiError && e.code === "TOKEN_ALREADY_USED") {
        setScreen("thanks");
        setSubmitting(false);
        return;
      }
      // Non-fatal: stay on current question, allow retry.
      setSelectedValue(null);
      setSubmitting(false);
      setInfoMsg(
        "Não foi possível registrar sua resposta. Toque novamente para tentar."
      );
    }
  };

  const currentItem = useMemo(
    () => items.find((i) => i.index === currentIndex) ?? null,
    [items, currentIndex]
  );

  const progressPct = Math.min(
    100,
    Math.round((currentIndex / TOTAL_ITEMS) * 100)
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top brand strip — minimal, no card chrome */}
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand)] text-[var(--accent-foreground)]"
              aria-hidden="true"
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-foreground truncate">
              Pesquisa de Condições de Trabalho
            </span>
          </div>
          <button
            type="button"
            onClick={closeWorker}
            aria-label="Sair da pesquisa"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Main content — centered on warm paper */}
      <main className="flex-1 flex flex-col w-full" aria-live="polite">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col">
          {bootLoading ? (
            <WorkerLoader label="Carregando pesquisa…" />
          ) : screen === "welcome" ? (
            <WorkerWelcome onStart={handleStart} />
          ) : screen === "questions" && currentItem ? (
            <WorkerQuestionItem
              item={currentItem}
              currentIndex={currentIndex}
              totalItems={TOTAL_ITEMS}
              progressPct={progressPct}
              selectedValue={selectedValue}
              submitting={submitting}
              infoMsg={infoMsg}
              onSelect={handleLikertSelect}
            />
          ) : screen === "questions" && !currentItem ? (
            <WorkerError
              message="Não foi possível carregar a questão. Tente recarregar a página."
              onClose={closeWorker}
            />
          ) : screen === "thanks" ? (
            <WorkerThanks />
          ) : (
            <WorkerError message={errorMsg} onClose={closeWorker} />
          )}
        </div>
      </main>

      {/* Discreet footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-center gap-2">
          <Lock
            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-muted-foreground text-center">
            Pesquisa confidencial — suas respostas são anônimas
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function WorkerLoader({ label }: { label: string }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-3 py-24"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="h-7 w-7 animate-spin text-[var(--brand)]"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function WorkerWelcome({ onStart }: { onStart: () => void }) {
  return (
    <section
      className="flex-1 flex flex-col justify-center gap-8 py-6 sm:py-10"
      aria-labelledby="welcome-title"
    >
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Questionário COPSOQ II-BR · 40 questões
        </p>
        <h1
          id="welcome-title"
          className="font-display text-3xl sm:text-4xl leading-tight text-foreground"
        >
          Pesquisa sobre Condições de Trabalho
        </h1>
        <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          <p>
            Esta pesquisa tem como objetivo conhecer as condições de trabalho
            no seu setor. Sua opinião é fundamental para identificar fatores
            que afetam a saúde e o bem-estar dos trabalhadores.
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span
                className="mt-2 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"
                aria-hidden="true"
              />
              <span>
                <strong className="text-foreground font-medium">
                  Participação voluntária
                </strong>{" "}
                — você pode interromper a qualquer momento.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"
                aria-hidden="true"
              />
              <span>
                <strong className="text-foreground font-medium">
                  Respostas anônimas
                </strong>{" "}
                — não coletamos nome, e-mail ou qualquer dado que identifique
                você.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"
                aria-hidden="true"
              />
              <span>
                <strong className="text-foreground font-medium">
                  Duração aproximada
                </strong>{" "}
                de 15 minutos, em 40 questões de múltipla escolha.
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="pt-2">
        <Button
          type="button"
          onClick={onStart}
          size="lg"
          className="w-full sm:w-auto min-h-12 px-8 text-base bg-[var(--brand)] text-[var(--accent-foreground)] hover:bg-[var(--brand-light)]"
        >
          Começar
        </Button>
      </div>
    </section>
  );
}

interface WorkerQuestionItemProps {
  item: CopsoqItemDTO;
  currentIndex: number;
  totalItems: number;
  progressPct: number;
  selectedValue: number | null;
  submitting: boolean;
  infoMsg: string;
  onSelect: (itemIndex: number, likertValue: number) => void;
}

function WorkerQuestionItem({
  item,
  currentIndex,
  totalItems,
  progressPct,
  selectedValue,
  submitting,
  infoMsg,
  onSelect,
}: WorkerQuestionItemProps) {
  return (
    <section
      className="flex-1 flex flex-col gap-6 sm:gap-8"
      aria-labelledby="question-title"
    >
      {/* Progress — pine */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono-numeric" aria-hidden="true">
            Questão {currentIndex} de {totalItems}
          </span>
          <span className="font-mono-numeric" aria-hidden="true">
            {progressPct}%
          </span>
        </div>
        <Progress
          value={progressPct}
          className="[&>div]:bg-[var(--brand)]"
          aria-label={`Progresso da pesquisa: questão ${currentIndex} de ${totalItems}`}
        />
        <span className="sr-only" aria-live="polite">
          Questão {currentIndex} de {totalItems}.
        </span>
      </div>

      {/* Question */}
      <div className="space-y-6">
        <h2
          id="question-title"
          className="font-display text-2xl sm:text-3xl leading-snug text-foreground"
        >
          {item.textPtBr}
        </h2>

        {infoMsg ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm border border-[var(--risk-medium)]/40 bg-[var(--surface)] px-3 py-2 text-foreground rounded-md"
          >
            {infoMsg}
          </p>
        ) : null}

        {/* Likert options — refined radio tiles */}
        <div
          role="group"
          aria-label="Opções de resposta"
          className="flex flex-col gap-2.5"
        >
          {LIKERT_SCALE.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={submitting}
                onClick={() => onSelect(item.index, opt.value)}
                aria-pressed={isSelected}
                aria-label={`Opção ${opt.value} de 5: ${opt.label}`}
                className={cn(
                  "group relative flex items-center gap-3 w-full min-h-14 px-4 sm:px-5 rounded-lg border text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:cursor-not-allowed",
                  isSelected
                    ? "bg-[var(--sidebar-accent)] border-[var(--brand)]"
                    : "border-border bg-[var(--card)] hover:bg-[var(--surface)]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold font-mono-numeric transition-colors",
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--accent-foreground)]"
                      : "border-border bg-[var(--surface)] text-muted-foreground group-hover:border-[var(--brand-light)] group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                >
                  {opt.value}
                </span>
                <span className="text-sm sm:text-base font-medium leading-snug text-foreground">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {submitting ? (
          <p
            className="flex items-center gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Registrando resposta…
          </p>
        ) : null}
      </div>
    </section>
  );
}

function WorkerThanks() {
  return (
    <section
      className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12"
      aria-labelledby="thanks-title"
    >
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sidebar-accent)] text-[var(--brand)]"
        aria-hidden="true"
      >
        <ShieldCheck className="h-7 w-7" />
      </span>
      <div className="space-y-3 max-w-md">
        <h1
          id="thanks-title"
          className="font-display text-3xl sm:text-4xl text-foreground"
        >
          Obrigado pela sua participação
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Suas respostas foram registradas. Agradecemos o tempo dedicado a
          contribuir com a melhoria das condições de trabalho.
        </p>
      </div>
    </section>
  );
}

function WorkerError({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <section
      className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12"
      role="alert"
      aria-live="assertive"
    >
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--risk-high)]/10 text-[var(--risk-high)]"
        aria-hidden="true"
      >
        <AlertTriangle className="h-7 w-7" />
      </span>
      <div className="space-y-2 max-w-md">
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">
          Não é possível continuar
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {message}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--brand)]"
      >
        Voltar ao início
      </Button>
    </section>
  );
}

"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BadgeInfo,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cookie,
  CopyPlus,
  Download,
  FileText,
  FlaskConical,
  History,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  MonitorSmartphone,
  RefreshCw,
  Rocket,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, api } from "@/lib/api";
import { PROFESSION_TYPE_LABELS, PROFESSION_TYPES } from "@/lib/errors";
import { FIELD_ERROR_CLASS, FieldError, maskPhone, validateRequired } from "@/lib/form-utils";
import { useAuth } from "@/lib/store";
import type { AuditLogEntry, Professional, ProfessionType } from "@/lib/types";

const APP_VERSION = "1.0.0-sandbox";

interface ProfileFormState {
  name: string;
  professionType: ProfessionType;
  credentialNumber: string;
  phone: string;
}

export function ConfiguracoesView() {
  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil, conta e preferências de segurança."
        border
        className="mb-2"
      />

      <div>
        <ProfileSection />
        <SecuritySection />
        <SessionSection />
        <AuditLogSection />
        <AboutSection />
      </div>
    </PageContainer>
  );
}

// ─── Section heading helper ─────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs uppercase tracking-[0.14em]">{title}</span>
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

// ─── Perfil ─────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { professional, set } = useAuth();
  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    professionType: "other",
    credentialNumber: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  // Per-field inline errors — same shared FieldError component + styling
  // for front-side onBlur validation AND backend error display.
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (professional) {
      setForm({
        name: professional.name ?? "",
        professionType: professional.professionType ?? "other",
        credentialNumber: professional.credentialNumber ?? "",
        phone: professional.phone ?? "",
      });
    }
    setNameError(null);
  }, [professional]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequired(form.name, 2)) {
      setNameError("Informe seu nome (mínimo 2 caracteres).");
      toast.error("Verifique os campos destacados.");
      return;
    }
    setSaving(true);
    try {
      const updated: Professional = await api.me.update({
        name: form.name.trim(),
        professionType: form.professionType,
        credentialNumber: form.credentialNumber.trim() || null,
        phone: form.phone.trim() || null,
      });
      set(updated);
      toast.success("Perfil atualizado.");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Falha ao atualizar o perfil.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="cfg-profile-title" className="border-b border-border py-8">
      <SectionHeading
        icon={User}
        title="Perfil profissional"
        description="Informações exibidas nos relatórios oficiais de conformidade NR-1."
      />
      <h2 id="cfg-profile-title" className="font-display text-xl mt-3 mb-6">
        Perfil profissional
      </h2>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="cfg-name">Nome completo</Label>
          <Input
            id="cfg-name"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setNameError(null);
            }}
            onBlur={() => {
              if (!validateRequired(form.name, 2)) {
                setNameError("Informe seu nome (mínimo 2 caracteres).");
              }
            }}
            disabled={saving}
            required
            autoComplete="name"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "cfg-name-err" : undefined}
            className={`bg-[var(--card)] ${nameError ? FIELD_ERROR_CLASS : ""}`}
          />
          {nameError ? <FieldError id="cfg-name-err" message={nameError} /> : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-profession">Categoria profissional</Label>
            <Select
              value={form.professionType}
              onValueChange={(v) => setForm({ ...form, professionType: v as ProfessionType })}
              disabled={saving}
            >
              <SelectTrigger id="cfg-profession" className="w-full bg-[var(--card)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFESSION_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROFESSION_TYPE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-credential">Registro (CRP / CREA / CRM)</Label>
            <Input
              id="cfg-credential"
              placeholder="CRP 06/123456"
              value={form.credentialNumber}
              onChange={(e) => setForm({ ...form, credentialNumber: e.target.value })}
              disabled={saving}
              className="bg-[var(--card)]"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cfg-phone">Telefone</Label>
          <Input
            id="cfg-phone"
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
            disabled={saving}
            className="bg-[var(--card)] font-mono-numeric"
          />
        </div>

        {/* Conta — e-mail (read-only identifier) */}
        <div className="space-y-1.5 pt-4 border-t border-border">
          <Label htmlFor="cfg-email">E-mail</Label>
          <Input
            id="cfg-email"
            type="email"
            value={professional?.email ?? ""}
            readOnly
            disabled
            className="bg-[var(--surface)] font-mono-numeric text-muted-foreground"
            aria-readonly
          />
          <p className="text-xs text-muted-foreground">
            O e-mail é o identificador da conta e não pode ser alterado.
          </p>
        </div>

        {/* Conta — senha (placeholder for upcoming) */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <div className="flex items-start gap-2.5">
            <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium">Senha</div>
              <p className="text-xs text-muted-foreground">
                Use uma senha forte com no mínimo 8 caracteres.
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-border text-muted-foreground"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Alterar senha
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Em breve</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[var(--brand)] text-[var(--accent-foreground)] hover:bg-[var(--brand-light)]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

// ─── Segurança & LGPD ───────────────────────────────────────────────────────

function SecuritySection() {
  const items: Array<{
    icon: React.ElementType;
    title: string;
    description: string;
  }> = [
    {
      icon: ShieldCheck,
      title: "Sessão com expiração automática",
      description: "Cookies httpOnly, SameSite=Strict, expiram em 7 dias por inatividade.",
    },
    {
      icon: Cookie,
      title: "Cookies seguros",
      description:
        "Apenas o cookie de sessão é gravado. Nenhum cookie de rastreamento ou terceiros.",
    },
    {
      icon: Lock,
      title: "Anonimato do trabalhador por design",
      description:
        "Respostas do trabalhador são associadas a tokens opacos (UUID), sem qualquer PII. Anonimato k≥5 por GHE.",
    },
    {
      icon: BadgeInfo,
      title: "Conformidade LGPD",
      description: "Dados do profissional e da empresa são tratados conforme a Lei 13.709/2018.",
    },
  ];

  return (
    <section aria-labelledby="cfg-security-title" className="border-b border-border py-8">
      <SectionHeading
        icon={ShieldCheck}
        title="Segurança & LGPD"
        description="Como a plataforma protege dados do profissional e do trabalhador."
      />
      <h2 id="cfg-security-title" className="font-display text-xl mt-3 mb-6">
        Segurança & LGPD
      </h2>

      <ul className="divide-y divide-border border-t border-b border-border">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.title} className="py-4 flex gap-3">
              <div className="h-8 w-8 rounded-md bg-[var(--sidebar-accent)] flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-[var(--brand)]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{it.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {it.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Sessões ativas ────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  tokenPreview: string;
  isCurrent: boolean;
}

function safeDate(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function SessionSection() {
  const [data, setData] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sessions.list();
      setData(res.data);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar as sessões ativas.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await api.sessions.revoke(sessionId);
      toast.success("Sessão encerrada.");
      await load();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Falha ao encerrar a sessão.");
      }
    } finally {
      setRevokingId(null);
    }
  };

  const onRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      const res = await api.sessions.revokeOthers();
      const n = res.revoked;
      toast.success(`${n} sessão${n === 1 ? "" : "ões"} encerrada${n === 1 ? "" : "s"}.`);
      setBulkOpen(false);
      await load();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Falha ao encerrar as sessões.");
      }
    } finally {
      setRevokingOthers(false);
    }
  };

  const othersCount = data.filter((s) => !s.isCurrent).length;
  const showBulkButton = data.length >= 2;

  return (
    <section
      id="sessoes"
      aria-labelledby="cfg-sessions-title"
      className="border-b border-border py-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SectionHeading
            icon={MonitorSmartphone}
            title="Sessões ativas"
            description="Gerencie os dispositivos conectados à sua conta. Você pode encerrar sessões individuais ou todas as outras."
          />
          <h2 id="cfg-sessions-title" className="font-display text-xl mt-3">
            Sessões ativas
          </h2>
        </div>
        {showBulkButton && (
          <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-[var(--risk-high)]/50 text-[var(--risk-high)] hover:bg-[var(--risk-high)]/10 hover:text-[var(--risk-high)]"
                disabled={revokingOthers || othersCount === 0}
                aria-label="Encerrar todas as outras sessões"
              >
                <ShieldOff className="h-3.5 w-3.5" />
                <span className="ml-1.5 hidden sm:inline">Encerrar todas as outras</span>
                <span className="ml-1.5 sm:hidden">Encerrar outras</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">
                  Encerrar todas as outras sessões?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza? Todas as outras sessões serão encerradas imediatamente. Esta ação não
                  pode ser desfeita. A sessão atual será mantida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={revokingOthers}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void onRevokeOthers();
                  }}
                  disabled={revokingOthers}
                  className="bg-[var(--risk-high)] text-[var(--accent-foreground)] hover:bg-[var(--risk-high)]/90"
                >
                  {revokingOthers ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Encerrando…
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-4 w-4" />
                      Encerrar {othersCount} sessão
                      {othersCount === 1 ? "" : "ões"}
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="mt-6">
        {error ? (
          <div className="py-10 flex flex-col items-center text-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--risk-high)]/10 flex items-center justify-center">
              <ShieldOff className="h-4 w-4 text-[var(--risk-high)]" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <SessionListSkeleton />
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma sessão ativa.
          </div>
        ) : (
          <ul
            className="border-t border-border max-h-96 overflow-y-auto scroll-area animate-in fade-in duration-300"
            aria-label="Lista de sessões ativas"
          >
            {data.map((s) => (
              <SessionRowItem
                key={s.id}
                session={s}
                revoking={revokingId === s.id}
                onRevoke={() => void onRevoke(s.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SessionRowItem({
  session,
  revoking,
  onRevoke,
}: {
  session: SessionRow;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const created = safeDate(session.createdAt);
  const expires = safeDate(session.expiresAt);
  return (
    <li className="border-b border-border py-4 px-1 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono-numeric text-sm font-medium text-foreground">
            {session.tokenPreview}
          </span>
          {session.isCurrent ? (
            <Badge className="bg-[var(--sidebar-accent)] text-[var(--brand)] border-transparent hover:bg-[var(--sidebar-accent)]">
              Sessão atual
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground font-normal border-border"
            >
              Outra sessão
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            <span className="font-medium text-foreground/80">Criada em</span>{" "}
            {format(created, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}{" "}
            <span className="text-muted-foreground/70">
              ({formatDistanceToNow(created, { addSuffix: true, locale: ptBR })})
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground/80">Expira em</span>{" "}
            {format(expires, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        {session.isCurrent ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  aria-label="Não é possível encerrar a sessão atual — use Sair"
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Encerrar
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Não é possível encerrar a sessão atual — use Sair</TooltipContent>
          </Tooltip>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={revoking}
                aria-label={`Encerrar sessão ${session.tokenPreview}`}
                className="text-[var(--risk-high)] hover:bg-[var(--risk-high)]/10 hover:text-[var(--risk-high)]"
              >
                {revoking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Encerrar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-xl">
                  Encerrar esta sessão?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  A sessão selecionada será encerrada imediatamente e o dispositivo correspondente
                  precisará autenticar-se novamente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={revoking}
                  onClick={(e) => {
                    e.preventDefault();
                    onRevoke();
                  }}
                  className="bg-[var(--risk-high)] text-[var(--accent-foreground)] hover:bg-[var(--risk-high)]/90"
                >
                  {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
                  Encerrar sessão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </li>
  );
}

function SessionListSkeleton() {
  return (
    <ul className="border-t border-border" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={`skel-${i}`}
          className="border-b border-border py-4 px-1 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* token preview + badge */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            {/* created / expires lines */}
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md shrink-0" />
        </li>
      ))}
    </ul>
  );
}

// ─── Auditoria ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  "company.create": "Empresa criada",
  "assessment.launch": "Avaliação lançada",
  "assessment.close": "Avaliação encerrada",
  "assessment.duplicate": "Avaliação duplicada",
  "assessment.simulate": "Respostas simuladas",
  "report.generate": "Relatório gerado",
  "auth.login": "Login realizado",
  "sessions.revoke_others": "Outras sessões encerradas",
  "sessions.revoke": "Sessão encerrada",
};

const ACTION_OPTIONS: Array<{ value: string; label: string; icon: React.ElementType }> = [
  { value: "company.create", label: "Empresa criada", icon: Building2 },
  { value: "assessment.launch", label: "Avaliação lançada", icon: Rocket },
  { value: "assessment.close", label: "Avaliação encerrada", icon: Lock },
  { value: "assessment.duplicate", label: "Avaliação duplicada", icon: CopyPlus },
  { value: "assessment.simulate", label: "Respostas simuladas", icon: FlaskConical },
  { value: "report.generate", label: "Relatório gerado", icon: FileText },
  { value: "auth.login", label: "Login realizado", icon: LogIn },
  { value: "sessions.revoke_others", label: "Outras sessões encerradas", icon: ShieldOff },
  { value: "sessions.revoke", label: "Sessão encerrada", icon: Trash2 },
];

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  company: "Empresa",
  assessment: "Avaliação",
  professional: "Profissional",
  report: "Relatório",
};

const RESOURCE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "company", label: "Empresa" },
  { value: "assessment", label: "Avaliação" },
  { value: "professional", label: "Profissional" },
  { value: "report", label: "Relatório" },
];

function actionIcon(action: string): React.ElementType {
  const found = ACTION_OPTIONS.find((o) => o.value === action);
  if (found) return found.icon;
  return History;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function resourceTypeLabel(resourceType: string): string {
  return RESOURCE_TYPE_LABELS[resourceType] ?? resourceType;
}

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

function summarizeMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";
  const entries = Object.entries(metadata);
  if (entries.length === 0) return "—";
  // Show up to 3 key=value pairs compactly.
  return entries
    .slice(0, 3)
    .map(([k, v]) => {
      const value =
        typeof v === "string"
          ? v
          : typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : Array.isArray(v)
              ? `[${v.length} itens]`
              : "{…}";
      return `${k}: ${value}`;
    })
    .join(" · ");
}

function AuditLogSection() {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    pages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auditLogs.list({
        page,
        limit: PAGE_SIZE,
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
      });
      setData(res.data);
      setMeta(res.meta);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar o registro de auditoria.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, resourceFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onClearFilters = () => {
    setActionFilter("");
    setResourceFilter("");
    setPage(1);
  };

  const onPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const onNextPage = () => setPage((p) => Math.min(meta?.pages ?? 1, p + 1));

  const hasFilters = actionFilter !== "" || resourceFilter !== "";

  const onExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const res = await api.auditLogs.exportCSV({
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado.");
    } catch {
      toast.error("Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  }, [actionFilter, resourceFilter]);

  return (
    <section
      id="auditoria"
      aria-labelledby="cfg-audit-title"
      className="border-b border-border py-8"
    >
      <SectionHeading
        icon={History}
        title="Registro de Auditoria"
        description="Trilha de ações realizadas na sua conta."
      />
      <h2 id="cfg-audit-title" className="font-display text-xl mt-3 mb-6">
        Registro de Auditoria
      </h2>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="space-y-1.5">
          <Label htmlFor="audit-filter-resource" className="text-xs text-muted-foreground">
            Recurso
          </Label>
          <Select
            value={resourceFilter || "__all__"}
            onValueChange={(v) => {
              setResourceFilter(v === "__all__" ? "" : v);
              setPage(1);
            }}
            disabled={loading}
          >
            <SelectTrigger
              id="audit-filter-resource"
              className="w-44 bg-[var(--card)]"
              aria-label="Filtrar por tipo de recurso"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {RESOURCE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audit-filter-action" className="text-xs text-muted-foreground">
            Ação
          </Label>
          <Select
            value={actionFilter || "__all__"}
            onValueChange={(v) => {
              setActionFilter(v === "__all__" ? "" : v);
              setPage(1);
            }}
            disabled={loading}
          >
            <SelectTrigger
              id="audit-filter-action"
              className="w-52 bg-[var(--card)]"
              aria-label="Filtrar por tipo de ação"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            disabled={loading}
            className="h-9 text-muted-foreground hover:text-foreground"
            aria-label="Limpar filtros"
          >
            Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onExportCSV()}
            disabled={exporting || loading}
            className="h-9 border-border"
            aria-label="Exportar registro de auditoria em CSV"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Exportar CSV</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Atualizar registro de auditoria"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Table or states */}
      {error ? (
        <div className="py-10 flex flex-col items-center text-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--risk-high)]/10 flex items-center justify-center">
            <Lock className="h-4 w-4 text-[var(--risk-high)]" />
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      ) : loading ? (
        <AuditLogSkeleton />
      ) : data.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma ação registrada.
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto scroll-area border-t border-border animate-in fade-in duration-300">
          <Table>
            <TableCaption className="sr-only">
              Registro de auditoria — {meta?.total ?? data.length} entrada(s)
              {hasFilters ? " com filtros aplicados" : ""}. Página {meta?.page ?? page} de{" "}
              {meta?.pages ?? 1}.
            </TableCaption>
            <TableHeader className="sticky top-0 bg-[var(--surface)] z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-40 text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium py-3">
                  Data/Hora
                </TableHead>
                <TableHead className="w-56 text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium py-3">
                  Ação
                </TableHead>
                <TableHead className="w-36 text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium py-3">
                  Recurso
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium py-3">
                  Detalhes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => {
                const Icon = actionIcon(entry.action);
                const details = summarizeMetadata(entry.metadata);
                const fullDetails =
                  entry.metadata != null ? JSON.stringify(entry.metadata, null, 2) : null;
                return (
                  <TableRow key={entry.id} className="border-b border-border">
                    <TableCell className="font-mono-numeric text-xs text-muted-foreground py-3">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-6 w-6 rounded-md bg-[var(--surface)] flex items-center justify-center shrink-0"
                          aria-hidden="true"
                        >
                          <Icon className="h-3.5 w-3.5 text-[var(--brand)]" />
                        </span>
                        <span className="text-sm text-foreground truncate">
                          {actionLabel(entry.action)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className="font-normal text-xs border-border bg-[var(--surface)] text-muted-foreground"
                      >
                        {resourceTypeLabel(entry.resourceType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3">
                      {fullDetails ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help truncate block max-w-xs">{details}</span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-sm whitespace-pre-wrap font-mono-numeric text-xs"
                          >
                            {fullDetails}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span>{details}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!error && !loading && data.length > 0 && meta && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-5">
          <span>
            Página {meta.page} de {meta.pages} · {meta.total} registro
            {meta.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevPage}
              disabled={meta.page <= 1}
              className="h-8 text-muted-foreground hover:text-foreground"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextPage}
              disabled={meta.page >= meta.pages}
              className="h-8 text-muted-foreground hover:text-foreground"
              aria-label="Próxima página"
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="border-t border-border" aria-hidden="true">
      <div className="space-y-1">
        {/* Header row — matches the 4-column audit table (Data/Hora · Ação · Recurso · Detalhes) */}
        <div className="flex items-center gap-3 border-b border-border bg-[var(--surface)] px-3 py-2.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 flex-1" />
        </div>
        {/* Body rows — icon block + action label, badge, details text */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`skel-${i}`}
            className="flex items-center gap-3 border-b border-border py-3 px-3"
          >
            <Skeleton className="h-3.5 w-32" />
            <div className="flex items-center gap-2 w-56">
              <Skeleton className="h-6 w-6 rounded-md shrink-0" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sobre ──────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section aria-labelledby="cfg-about-title" className="py-8">
      <SectionHeading
        icon={BookOpen}
        title="Sobre a plataforma"
        description="Versão, embasamento normativo e licença do instrumento."
      />
      <h2 id="cfg-about-title" className="font-display text-xl mt-3 mb-6">
        Sobre a plataforma
      </h2>

      <dl className="divide-y divide-border border-t border-b border-border">
        <div className="flex items-center justify-between gap-3 py-4">
          <dt className="text-sm text-muted-foreground">Versão</dt>
          <dd className="font-mono-numeric font-medium text-sm text-foreground">{APP_VERSION}</dd>
        </div>
        <div className="py-4 space-y-2">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Embasamento normativo
          </dt>
          <dd>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li>
                <span className="font-medium">NR-1</span> — Disposições gerais e gerenciamento de
                riscos ocupacionais.
              </li>
              <li>
                <span className="font-medium">Portaria MTE 1.419/2024</span> — Anexo III: Riscos
                Psicossociais.
              </li>
              <li>
                <span className="font-medium">Portaria MTE 765/2025</span> — Atualizações do FRPRT.
              </li>
            </ul>
          </dd>
        </div>
        <div className="py-4 space-y-2">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Instrumento</dt>
          <dd>
            <p className="text-sm leading-relaxed text-foreground">
              COPSOQ II-BR — versão brasileira do Copenhagen Psychosocial Questionnaire II. Adaptado
              e validado por <span className="font-medium">Gonçalves et al. (2021)</span>.
            </p>
          </dd>
        </div>
        <div className="py-4 space-y-2">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Licença</dt>
          <dd>
            <p className="text-sm text-foreground">
              O instrumento COPSOQ II-BR é distribuído sob licença{" "}
              <span className="font-medium">CC BY-NC-ND 4.0</span> (Atribuição · Não comercial · Sem
              derivados).
            </p>
          </dd>
        </div>
      </dl>
    </section>
  );
}

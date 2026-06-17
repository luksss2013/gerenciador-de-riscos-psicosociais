"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BadgeInfo,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Download,
  FileText,
  History,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  RefreshCw,
  Rocket,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import {
  PROFESSION_TYPES,
  PROFESSION_TYPE_LABELS,
} from "@/lib/errors";
import type {
  AuditLogEntry,
  ProfessionType,
  Professional,
} from "@/lib/types";

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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const APP_VERSION = "1.0.0-sandbox";

interface ProfileFormState {
  name: string;
  professionType: ProfessionType;
  credentialNumber: string;
  phone: string;
}

export function ConfiguracoesView() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil, conta e preferências de segurança.
        </p>
      </header>

      <div className="space-y-6">
        <ProfileSection />
        <AccountSection />
        <SecuritySection />
        <AboutSection />
        <AuditLogSection />
      </div>
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

  useEffect(() => {
    if (professional) {
      setForm({
        name: professional.name ?? "",
        professionType: professional.professionType ?? "other",
        credentialNumber: professional.credentialNumber ?? "",
        phone: professional.phone ?? "",
      });
    }
  }, [professional]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Informe seu nome.");
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Perfil profissional</CardTitle>
        </div>
        <CardDescription>
          Informações exibidas nos relatórios oficiais de conformidade NR-1.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-name">Nome completo</Label>
            <Input
              id="cfg-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={saving}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-profession">Categoria profissional</Label>
              <Select
                value={form.professionType}
                onValueChange={(v) =>
                  setForm({ ...form, professionType: v as ProfessionType })
                }
                disabled={saving}
              >
                <SelectTrigger id="cfg-profession" className="w-full">
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
                onChange={(e) =>
                  setForm({ ...form, credentialNumber: e.target.value })
                }
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-phone">Telefone</Label>
            <Input
              id="cfg-phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={saving}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
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
        </CardFooter>
      </form>
    </Card>
  );
}

// ─── Conta ──────────────────────────────────────────────────────────────────

function AccountSection() {
  const { professional } = useAuth();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Conta</CardTitle>
        </div>
        <CardDescription>
          Credenciais de acesso à plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cfg-email">E-mail</Label>
          <Input
            id="cfg-email"
            type="email"
            value={professional?.email ?? ""}
            readOnly
            disabled
            className="bg-muted/40 font-mono-numeric"
            aria-readonly
          />
          <p className="text-xs text-muted-foreground">
            O e-mail é o identificador da conta e não pode ser alterado.
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3">
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
              <span tabIndex={0} className="inline-flex">
                <Button variant="outline" size="sm" disabled>
                  <Lock className="h-3.5 w-3.5" />
                  Alterar senha
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Em breve</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
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
      description:
        "Cookies httpOnly, SameSite=Strict, expiram em 7 dias por inatividade.",
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
      description:
        "Dados do profissional e da empresa são tratados conforme a Lei 13.709/2018.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Segurança & LGPD</CardTitle>
        </div>
        <CardDescription>
          Como a plataforma protege dados do profissional e do trabalhador.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.title}
              className="rounded-lg border border-border bg-muted/30 p-4 flex gap-3"
            >
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{it.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {it.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Sobre ──────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Sobre a plataforma</CardTitle>
        </div>
        <CardDescription>
          Versão, embasamento normativo e licença do instrumento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Versão</span>
          <span className="font-mono-numeric font-medium">{APP_VERSION}</span>
        </div>
        <Separator />
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Embasamento normativo
          </div>
          <ul className="space-y-1.5 text-sm">
            <li>
              <span className="font-medium">NR-1</span> — Disposições gerais e
              gerenciamento de riscos ocupacionais.
            </li>
            <li>
              <span className="font-medium">Portaria MTE 1.419/2024</span> —
              Anexo III: Riscos Psicossociais.
            </li>
            <li>
              <span className="font-medium">Portaria MTE 765/2025</span> —
              Atualizações do FRPRT.
            </li>
          </ul>
        </div>
        <Separator />
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Instrumento
          </div>
          <p className="text-sm leading-relaxed">
            COPSOQ II-BR — versão brasileira do Copenhagen Psychosocial
            Questionnaire II. Adaptado e validado por{" "}
            <span className="font-medium">
              Gonçalves et al. (2021)
            </span>
            .
          </p>
        </div>
        <Separator />
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Licença
          </div>
          <p className="text-sm">
            O instrumento COPSOQ II-BR é distribuído sob licença{" "}
            <span className="font-medium">CC BY-NC-ND 4.0</span> (Atribuição ·
            Não comercial · Sem derivados).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Auditoria ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  "company.create": "Empresa criada",
  "assessment.launch": "Avaliação lançada",
  "assessment.close": "Avaliação encerrada",
  "report.generate": "Relatório gerado",
  "auth.login": "Login realizado",
};

const ACTION_OPTIONS: Array<{ value: string; label: string; icon: React.ElementType }> = [
  { value: "company.create", label: "Empresa criada", icon: Building2 },
  { value: "assessment.launch", label: "Avaliação lançada", icon: Rocket },
  { value: "assessment.close", label: "Avaliação encerrada", icon: Lock },
  { value: "report.generate", label: "Relatório gerado", icon: FileText },
  { value: "auth.login", label: "Login realizado", icon: LogIn },
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

function summarizeMetadata(
  metadata: Record<string, unknown> | null,
): string {
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
  const onNextPage = () =>
    setPage((p) => Math.min(meta?.pages ?? 1, p + 1));

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
    <Card id="auditoria">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Registro de Auditoria</CardTitle>
        </div>
        <CardDescription>
          Trilha de ações realizadas na sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-filter-resource"
              className="text-xs text-muted-foreground"
            >
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
                className="w-44"
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
            <Label
              htmlFor="audit-filter-action"
              className="text-xs text-muted-foreground"
            >
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
                className="w-52"
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
              className="h-9"
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
              className="h-9"
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
              variant="outline"
              size="icon"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Atualizar registro de auditoria"
              className="h-9 w-9"
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
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-destructive" />
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
          <div className="max-h-96 overflow-y-auto scroll-area rounded-md border border-border">
            <Table>
              <TableCaption className="sr-only">
                Registro de auditoria — {meta?.total ?? data.length} entrada(s)
                {hasFilters ? " com filtros aplicados" : ""}. Página{" "}
                {meta?.page ?? page} de {meta?.pages ?? 1}.
              </TableCaption>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-40">Data/Hora</TableHead>
                  <TableHead className="w-56">Ação</TableHead>
                  <TableHead className="w-36">Recurso</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => {
                  const Icon = actionIcon(entry.action);
                  const details = summarizeMetadata(entry.metadata);
                  const fullDetails =
                    entry.metadata != null
                      ? JSON.stringify(entry.metadata, null, 2)
                      : null;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono-numeric text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0"
                            aria-hidden="true"
                          >
                            <Icon className="h-3.5 w-3.5 text-foreground/70" />
                          </span>
                          <span className="text-sm truncate">
                            {actionLabel(entry.action)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-normal text-xs"
                        >
                          {resourceTypeLabel(entry.resourceType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fullDetails ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help truncate block max-w-xs">
                                {details}
                              </span>
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
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Página {meta.page} de {meta.pages} · {meta.total} registro
              {meta.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevPage}
                disabled={meta.page <= 1}
                className="h-8"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={meta.page >= meta.pages}
                className="h-8"
                aria-label="Próxima página"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="rounded-md border border-border">
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 flex-1 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

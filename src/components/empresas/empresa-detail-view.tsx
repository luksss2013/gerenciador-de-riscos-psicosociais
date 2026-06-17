"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ClipboardList,
  FileText,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useView } from "@/lib/store";
import type {
  Assessment,
  CompanySummary,
  Department,
} from "@/lib/types";
import { formatCnpj } from "@/lib/cnpj";
import {
  ASSESSMENT_STATUS_LABELS,
} from "@/lib/errors";
import { NrStatusBadge, type NrStatus } from "@/components/shell/nr-status-badge";
import { CompanyFormDialog } from "@/components/empresas/company-form-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;

function deriveStatus(c: CompanySummary): NrStatus {
  const { lastAssessmentStatus, lastAssessmentCompletedAt } = c.summary;
  if (!lastAssessmentStatus) return "no_assessment";
  if (lastAssessmentStatus === "collecting") return "collecting";
  if (lastAssessmentStatus === "processing") return "processing";
  if (lastAssessmentStatus === "draft") return "draft";
  if (lastAssessmentStatus === "archived") return "archived";
  if (lastAssessmentStatus === "completed") {
    if (lastAssessmentCompletedAt) {
      const age = Date.now() - new Date(lastAssessmentCompletedAt).getTime();
      if (age > TWO_YEARS_MS) return "review_recommended";
    }
    return "completed";
  }
  return "no_assessment";
}

function fmtDate(iso: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  try {
    const d = parseISO(iso);
    if (!isValidDate(d)) return fallback;
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

// ─── View ────────────────────────────────────────────────────────────────────

export function EmpresaDetailView() {
  const companyId = useView((s) => s.companyId);
  const go = useView((s) => s.go);

  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!companyId) {
      setError("Nenhuma empresa selecionada.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await api.companies.get(companyId);
      setCompany(c);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar a empresa.");
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);

  if (!companyId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto w-full">
        <section className="border border-dashed border-border rounded-lg py-12 flex flex-col items-center text-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-lg">Nenhuma empresa selecionada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Volte para a lista de empresas e escolha um cliente para
              visualizar seus detalhes.
            </p>
          </div>
          <Button onClick={() => go("empresas")}>
            Ver empresas
          </Button>
        </section>
      </div>
    );
  }

  if (loading) return <DetailSkeleton />;
  if (error || !company) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto w-full">
        <section
          role="alert"
          className="border border-dashed border-border rounded-lg py-10 flex flex-col items-center text-center gap-3"
        >
          <div className="h-11 w-11 rounded-full risk-high-bg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg">Falha ao carregar a empresa</p>
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
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full">
      {/* Back link */}
      <nav className="mb-4" aria-label="Navegação breadcrumb">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go("painel")}
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Voltar ao painel
        </Button>
      </nav>

      <CompanyDetailHeader
        company={company}
        onEdit={() => setEditOpen(true)}
        onRefresh={refresh}
      />

      <div className="mt-8">
        <CompanyTabs
          company={company}
          onRefresh={refresh}
          onAssessmentCreated={(a) =>
            go("avaliacao", { assessmentId: a.id, companyId: a.companyId })
          }
        />
      </div>

      {/* Edit dialog (reuses CompanyFormDialog) */}
      <CompanyFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={company}
        onCreated={() => setEditOpen(false)}
        onUpdated={(c) => {
          setEditOpen(false);
          setCompany(c);
          toast.success("Empresa atualizada.");
          refresh();
        }}
      />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function CompanyDetailHeader({
  company,
  onEdit,
  onRefresh,
}: {
  company: CompanySummary;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const status = deriveStatus(company);
  const location =
    company.city || company.state
      ? [company.city, company.state].filter(Boolean).join(" · ")
      : null;

  return (
    <header className="border-b border-border pb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>Empresa</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight">
            {company.name}
          </h1>
          <p className="font-mono-numeric text-sm text-muted-foreground mt-1.5">
            {formatCnpj(company.cnpj)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NrStatusBadge status={status} />
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only">Atualizar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Quick metadata strip */}
      {(location ||
        company.cnaePrimary ||
        company.employeeCount != null ||
        company.contactName ||
        company.contactEmail ||
        company.contactPhone) && (
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {location && (
            <DetailItem icon={MapPin} label="Localização">
              {location}
            </DetailItem>
          )}
          {company.cnaePrimary && (
            <DetailItem icon={ClipboardList} label="CNAE principal">
              <span className="font-mono-numeric">{company.cnaePrimary}</span>
            </DetailItem>
          )}
          {company.employeeCount != null && (
            <DetailItem icon={Users} label="Empregados">
              <span className="font-mono-numeric">
                {company.employeeCount.toLocaleString("pt-BR")}
              </span>
            </DetailItem>
          )}
          {company.contactName && (
            <DetailItem icon={User} label="Responsável">
              {company.contactName}
            </DetailItem>
          )}
          {company.contactEmail && (
            <DetailItem icon={Mail} label="E-mail">
              <a
                href={`mailto:${company.contactEmail}`}
                className="hover:underline"
              >
                {company.contactEmail}
              </a>
            </DetailItem>
          )}
          {company.contactPhone && (
            <DetailItem icon={Phone} label="Telefone">
              <span className="font-mono-numeric">{company.contactPhone}</span>
            </DetailItem>
          )}
        </dl>
      )}
    </header>
  );
}

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm font-medium truncate">{children}</dd>
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function CompanyTabs({
  company,
  onRefresh,
  onAssessmentCreated,
}: {
  company: CompanySummary;
  onRefresh: () => void;
  onAssessmentCreated: (a: Assessment) => void;
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="departments">Departamentos</TabsTrigger>
        <TabsTrigger value="assessments">Avaliações</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab company={company} onAssessmentCreated={onAssessmentCreated} />
      </TabsContent>

      <TabsContent value="departments" className="mt-6">
        <DepartmentsTab company={company} onChanged={onRefresh} />
      </TabsContent>

      <TabsContent value="assessments" className="mt-6">
        <AssessmentsTab
          company={company}
          onAssessmentCreated={onAssessmentCreated}
          onRefresh={onRefresh}
        />
      </TabsContent>
    </Tabs>
  );
}

// ─── Visão Geral tab ─────────────────────────────────────────────────────────

function OverviewTab({
  company,
  onAssessmentCreated,
}: {
  company: CompanySummary;
  onAssessmentCreated: (a: Assessment) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const summary = company.summary;
  const lastStatus = summary.lastAssessmentStatus
    ? ASSESSMENT_STATUS_LABELS[summary.lastAssessmentStatus] ?? summary.lastAssessmentStatus
    : null;
  const lastDate = fmtDate(summary.lastAssessmentCompletedAt);

  return (
    <div className="space-y-8">
      {/* Stat strip */}
      <section aria-label="Indicadores">
        <div className="bg-[var(--surface)] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="sm:pr-5 py-3 sm:py-0 first:pt-0 last:pb-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Departamentos
            </div>
            <div className="font-mono-numeric text-2xl mt-1">
              {summary.departmentsCount}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              GHEs cadastrados
            </div>
          </div>
          <div className="sm:px-5 py-3 sm:py-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Avaliações
            </div>
            <div className="font-mono-numeric text-2xl mt-1">
              {summary.assessmentsCount}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Ciclos registrados
            </div>
          </div>
          <div className="sm:pl-5 py-3 sm:py-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Última avaliação
            </div>
            <div className="font-mono-numeric text-2xl mt-1">
              {lastStatus ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lastDate !== "—" ? `Concluída em ${lastDate}` : "Sem conclusões"}
            </div>
          </div>
        </div>
      </section>

      {/* Metadata */}
      <section aria-label="Dados da empresa" className="border-b border-border pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-xl">Dados da empresa</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Informações cadastrais usadas nos relatórios NR-1.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Avaliação
          </Button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Meta label="CNPJ" value={<span className="font-mono-numeric">{formatCnpj(company.cnpj)}</span>} />
          <Meta label="CNAE principal" value={company.cnaePrimary ?? "—"} />
          <Meta
            label="Localização"
            value={
              company.city || company.state
                ? [company.city, company.state].filter(Boolean).join(" · ")
                : "—"
            }
          />
          <Meta
            label="Nº de empregados"
            value={
              company.employeeCount != null
                ? <span className="font-mono-numeric">{company.employeeCount.toLocaleString("pt-BR")}</span>
                : "—"
            }
          />
          <Meta label="Responsável" value={company.contactName ?? "—"} />
          <Meta label="E-mail" value={company.contactEmail ?? "—"} />
          <Meta label="Telefone" value={company.contactPhone ?? "—"} />
          <Meta label="Encarregado LGPD / DPO" value={company.dpoPoc ?? "—"} />
          <Meta label="Criada em" value={fmtDate(company.createdAt)} />
        </dl>
      </section>

      <CreateAssessmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={company.id}
        onCreated={onAssessmentCreated}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium mt-0.5 truncate">{value}</dd>
    </div>
  );
}

// ─── Departamentos tab ───────────────────────────────────────────────────────

function DepartmentsTab({
  company,
  onChanged,
}: {
  company: CompanySummary;
  onChanged: () => void;
}) {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.departments.list(company.id);
      setDepartments(res.data);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar os departamentos.");
      }
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setFormOpen(true);
  };

  const onSaved = () => {
    setFormOpen(false);
    void load();
    onChanged();
  };

  const onConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.departments.delete(company.id, confirmDelete.id);
      toast.success(`Departamento "${confirmDelete.name}" desativado.`);
      setConfirmDelete(null);
      void load();
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "DEPARTMENT_HAS_ACTIVE_ASSESSMENT") {
          toast.error(
            "Este departamento possui uma avaliação ativa e não pode ser desativado."
          );
        } else {
          toast.error(e.message);
        }
      } else {
        toast.error("Falha ao desativar departamento.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section aria-label="Departamentos" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Departamentos (GHEs)</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Grupos Homogêneos de Exposição nos quais a coleta de dados é
            estratificada.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Departamento
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center text-center gap-3 py-8">
          <AlertTriangle className="h-5 w-5 text-[var(--risk-high)]" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : !departments || departments.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 flex flex-col items-center text-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-lg">Nenhum departamento cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre um GHE para iniciar uma avaliação psicossocial.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Adicionar departamento
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto scroll-area">
          <Table>
            <caption className="sr-only">
              Lista de departamentos (GHEs) da empresa {company.name}
            </caption>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">Nome</TableHead>
                <TableHead className="w-32 text-right text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">Trabalhadores</TableHead>
                <TableHead className="w-28 text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">Status</TableHead>
                <TableHead className="w-32 text-right text-muted-foreground font-medium uppercase tracking-wider text-xs py-3">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id} className="border-b border-border">
                  <TableCell className="py-3">
                    <div className="font-medium">{d.name}</div>
                    {d.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {d.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono-numeric">
                    {d.workerCount.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="py-3">
                    {d.isActive ? (
                      <Badge className="risk-low-bg border-transparent">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-[var(--brand)]"
                        onClick={() => openEdit(d)}
                        aria-label={`Editar departamento ${d.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-[var(--risk-high)]"
                        onClick={() => setConfirmDelete(d)}
                        aria-label={`Desativar departamento ${d.name}`}
                        disabled={!d.isActive}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form dialog */}
      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companyId={company.id}
        editing={editing}
        onSaved={onSaved}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Desativar departamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar{" "}
              <span className="font-medium text-foreground">
                {confirmDelete?.name}
              </span>
              ? Esta ação é reversível apenas recriando o departamento.
              Departamentos com avaliação ativa não podem ser desativados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void onConfirmDelete();
              }}
              disabled={deleting}
              className="bg-[var(--risk-high)] text-[var(--accent-foreground)] hover:bg-[var(--risk-high)]/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desativando…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Desativar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

// ─── Department form dialog ──────────────────────────────────────────────────

interface DeptFormState {
  name: string;
  description: string;
  workerCount: string;
}

function DepartmentFormDialog({
  open,
  onOpenChange,
  companyId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  editing: Department | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<DeptFormState>({
    name: "",
    description: "",
    workerCount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        workerCount: String(editing.workerCount),
      });
    } else {
      setForm({ name: "", description: "", workerCount: "" });
    }
    setNameError(null);
  }, [open, editing]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Informe o nome do departamento.");
      return;
    }
    const wc = Number(form.workerCount);
    if (!form.workerCount || !Number.isFinite(wc) || wc < 1) {
      toast.error("Informe o número de trabalhadores (≥ 1).");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        workerCount: wc,
      };
      if (editing) {
        await api.departments.update(companyId, editing.id, body);
        toast.success("Departamento atualizado.");
      } else {
        await api.departments.create(companyId, {
          name: body.name,
          description: body.description ?? undefined,
          workerCount: body.workerCount,
        });
        toast.success("Departamento cadastrado.");
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "DEPARTMENT_NAME_DUPLICATE") {
          setNameError("Já existe um departamento com este nome.");
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("Falha ao salvar departamento.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? "Editar departamento" : "Novo departamento"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? "Atualize os dados do GHE."
              : "Cadastre um novo Grupo Homogêneo de Exposição."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset className="space-y-4" disabled={submitting}>
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">
                Nome <span className="text-[var(--risk-high)]">*</span>
              </Label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setNameError(null);
                }}
                autoFocus
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "dept-name-err" : undefined}
              />
              {nameError && (
                <p id="dept-name-err" className="text-xs text-[var(--risk-high)]">
                  {nameError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Descrição</Label>
              <Textarea
                id="dept-desc"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Setor, turno, características do grupo…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-wc">
                Nº de trabalhadores <span className="text-[var(--risk-high)]">*</span>
              </Label>
              <Input
                id="dept-wc"
                type="number"
                min={1}
                inputMode="numeric"
                value={form.workerCount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workerCount: e.target.value.replace(/[^\d]/g, ""),
                  })
                }
                className="font-mono-numeric"
                required
              />
            </div>
          </fieldset>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : editing ? (
                <>
                  <Check className="h-4 w-4" />
                  Salvar alterações
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Cadastrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Avaliações tab ──────────────────────────────────────────────────────────

function AssessmentsTab({
  company,
  onAssessmentCreated,
  onRefresh,
}: {
  company: CompanySummary;
  onAssessmentCreated: (a: Assessment) => void;
  onRefresh: () => void;
}) {
  const go = useView((s) => s.go);
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.assessments.listByCompany(company.id);
      setAssessments(res.data);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Não foi possível carregar as avaliações.");
      }
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section aria-label="Ciclos de avaliação" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Ciclos de avaliação</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Histórico de aplicações do COPSOQ II-BR na empresa.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Avaliação
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center text-center gap-3 py-8">
          <AlertTriangle className="h-5 w-5 text-[var(--risk-high)]" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : !assessments || assessments.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 flex flex-col items-center text-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--surface)] flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-lg">Nenhuma avaliação cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Inicie o primeiro ciclo de avaliação COPSOQ II-BR para esta
              empresa.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Avaliação
          </Button>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto scroll-area border-t border-border">
          <ul>
            {assessments.map((a) => (
              <AssessmentRow
                key={a.id}
                assessment={a}
                onOpen={() =>
                  go("avaliacao", {
                    assessmentId: a.id,
                    companyId: a.companyId,
                  })
                }
              />
            ))}
          </ul>
        </div>
      )}

      <CreateAssessmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={company.id}
        onCreated={(a) => {
          setCreateOpen(false);
          onRefresh();
          void load();
          onAssessmentCreated(a);
        }}
      />
    </section>
  );
}

function AssessmentRow({
  assessment,
  onOpen,
}: {
  assessment: Assessment;
  onOpen: () => void;
}) {
  const status = assessment.status;
  const label = ASSESSMENT_STATUS_LABELS[status] ?? status;
  const isCollecting = status === "collecting";

  // Adesão preview (only if collecting — full data on detail view).
  const [adesao, setAdesao] = useState<number | null>(null);
  useEffect(() => {
    if (!isCollecting) return;
    let cancelled = false;
    api.assessments
      .progress(assessment.id)
      .then((p) => {
        if (!cancelled) setAdesao(p.globalAdesao);
      })
      .catch(() => {
        if (!cancelled) setAdesao(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assessment.id, isCollecting]);

  const statusTone = useMemo(() => {
    switch (status) {
      case "collecting":
        return "bg-[var(--sidebar-accent)] text-[var(--brand)] border-transparent";
      case "processing":
        return "bg-[var(--sidebar-accent)] text-[var(--brand)] border-transparent";
      case "completed":
        return "risk-low-bg border-transparent";
      case "archived":
        return "bg-muted text-muted-foreground border-transparent";
      case "draft":
      default:
        return "bg-muted text-muted-foreground border-transparent";
    }
  }, [status]);

  return (
    <li className="surface-hover border-b border-border px-1 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpen}
              className="font-display font-medium text-base text-foreground text-left hover:text-[var(--brand-light)] transition-colors truncate"
              aria-label={`Acessar avaliação ${assessment.title}`}
            >
              {assessment.title}
            </button>
            <Badge className={statusTone}>{label}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="font-mono-numeric">{fmtPeriod(assessment.startDate, assessment.endDate)}</span>
            </span>
            {isCollecting && adesao != null && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                Adesão:{" "}
                <span className="font-mono-numeric">
                  {(adesao * 100).toFixed(1).replace(".", ",")}%
                </span>
              </span>
            )}
            {assessment.completedAt && (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" />
                Concluída em {fmtDate(assessment.completedAt)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          className="shrink-0 text-[var(--brand)] hover:text-[var(--brand-light)]"
        >
          Acessar
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

// ─── Create assessment dialog (simple step-free form) ────────────────────────

function CreateAssessmentDialog({
  open,
  onOpenChange,
  companyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  onCreated: (a: Assessment) => void;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptsError, setDeptsError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Load active departments when dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDepts(true);
    setDeptsError(null);
    api.departments
      .list(companyId)
      .then((res) => {
        if (cancelled) return;
        const active = res.data.filter((d) => d.isActive);
        setDepartments(active);
        // Pre-select all with default expected = workerCount.
        const init: Record<string, number> = {};
        for (const d of active) init[d.id] = d.workerCount;
        setSelected(init);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError) setDeptsError(e.message);
        else setDeptsError("Não foi possível carregar os departamentos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDepts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  // Reset form on close.
  useEffect(() => {
    if (open) return;
    setTitle("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
    setSelected({});
    setDateError(null);
  }, [open]);

  const toggleDept = (id: string, workerCount: number) => {
    setSelected((s) => {
      if (id in s) {
        const next = { ...s };
        delete next[id];
        return next;
      }
      return { ...s, [id]: workerCount };
    });
  };

  const setExpected = (id: string, value: string) => {
    const n = value.replace(/[^\d]/g, "");
    setSelected((s) => ({ ...s, [id]: n ? Math.max(0, Number(n)) : 0 }));
  };

  const selectedCount = Object.keys(selected).length;
  const dateValid =
    startDate && endDate && new Date(endDate) > new Date(startDate);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da avaliação.");
      return;
    }
    if (!startDate || !endDate) {
      setDateError("Informe as datas de início e fim.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setDateError("A data final deve ser posterior à data de início.");
      return;
    }
    const depts = Object.entries(selected)
      .filter(([, v]) => v >= 1)
      .map(([departmentId, expectedResponses]) => ({
        departmentId,
        expectedResponses,
      }));
    if (depts.length === 0) {
      toast.error("Selecione ao menos um departamento com 1+ respostas esperadas.");
      return;
    }

    setSubmitting(true);
    setDateError(null);
    try {
      const created = await api.assessments.create(companyId, {
        title: title.trim(),
        startDate: startDate || undefined,
        endDate,
        departments: depts,
      });
      toast.success(`Avaliação "${created.title}" criada.`);
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Falha ao criar avaliação.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nova avaliação</DialogTitle>
          <DialogDescription>
            Configure o ciclo COPSOQ II-BR e os departamentos participantes.
            O instrumento, datas e adesão por GHE poderão ser ajustados na
            próxima etapa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <fieldset className="space-y-4" disabled={submitting}>
            <div className="space-y-1.5">
              <Label htmlFor="asmt-title">
                Título <span className="text-[var(--risk-high)]">*</span>
              </Label>
              <Input
                id="asmt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Ciclo 2025 — 1º semestre"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asmt-start">Início</Label>
                <Input
                  id="asmt-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateError(null);
                  }}
                  className="font-mono-numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asmt-end">
                  Fim <span className="text-[var(--risk-high)]">*</span>
                </Label>
                <Input
                  id="asmt-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateError(null);
                  }}
                  className="font-mono-numeric"
                  aria-invalid={!!dateError}
                  aria-describedby={dateError ? "asmt-date-err" : undefined}
                />
              </div>
            </div>
            {dateError && (
              <p
                id="asmt-date-err"
                className="text-xs text-[var(--risk-high)] flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                {dateError}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Departamentos participantes</Label>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono-numeric">{selectedCount}</span>{" "}
                  selecionado{selectedCount !== 1 ? "s" : ""}
                </span>
              </div>
              {loadingDepts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando departamentos…
                </div>
              ) : deptsError ? (
                <p className="text-sm text-[var(--risk-high)] py-2">{deptsError}</p>
              ) : departments.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                  Nenhum departamento ativo. Cadastre GHEs na aba
                  &ldquo;Departamentos&rdquo; antes de iniciar uma avaliação.
                </div>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border max-h-72 overflow-y-auto scroll-area">
                  {departments.map((d) => {
                    const checked = d.id in selected;
                    return (
                      <label
                        key={d.id}
                        htmlFor={`asmt-dept-${d.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface)] cursor-pointer"
                      >
                        <Checkbox
                          id={`asmt-dept-${d.id}`}
                          checked={checked}
                          onCheckedChange={() =>
                            toggleDept(d.id, d.workerCount)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {d.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono-numeric">
                              {d.workerCount.toLocaleString("pt-BR")}
                            </span>{" "}
                            trabalhador{d.workerCount !== 1 ? "es" : ""}
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Label
                            htmlFor={`asmt-exp-${d.id}`}
                            className="sr-only"
                          >
                            Respostas esperadas para {d.name}
                          </Label>
                          <Input
                            id={`asmt-exp-${d.id}`}
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={selected[d.id] ?? 0}
                            onChange={(e) => setExpected(d.id, e.target.value)}
                            disabled={!checked || submitting}
                            className="h-8 w-20 font-mono-numeric text-right"
                            aria-label={`Respostas esperadas para ${d.name}`}
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                O número de respostas esperadas define a meta de adesão por GHE
                (mínimo 5 para elegibilidade).
              </p>
            </div>
          </fieldset>

          {/* Validation feedback — warm tokens (restyled to surface + risk-medium) */}
          {(!dateValid || selectedCount === 0) && !submitting && (
            <div
              className="rounded-md border border-[var(--risk-medium)]/40 bg-[var(--surface)] p-3.5 space-y-1.5"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-[var(--risk-medium)]" />
                Pendências para criar a avaliação:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-5 list-disc">
                {!title.trim() && (
                  <li>Informe o título da avaliação</li>
                )}
                {!endDate && (
                  <li>Selecione a data final da coleta</li>
                )}
                {endDate && startDate && new Date(endDate) <= new Date(startDate) && (
                  <li>A data final deve ser posterior à data de início</li>
                )}
                {selectedCount === 0 && (
                  <li>Selecione ao menos um departamento participante</li>
                )}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                loadingDepts ||
                !!deptsError ||
                !dateValid ||
                selectedCount === 0
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Criar avaliação
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full space-y-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-full sm:w-80" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

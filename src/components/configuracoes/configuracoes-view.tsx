"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  BadgeInfo,
  BookOpen,
  Building2,
  Cookie,
  KeyRound,
  Loader2,
  Lock,
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
import type { ProfessionType, Professional } from "@/lib/types";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

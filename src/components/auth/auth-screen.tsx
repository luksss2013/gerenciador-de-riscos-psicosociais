"use client";

import * as React from "react";
import { useState } from "react";
import {
  Brain,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import {
  PROFESSION_TYPES,
  PROFESSION_TYPE_LABELS,
} from "@/lib/errors";
import type { ProfessionType } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface LoginFields {
  email: string;
  password: string;
}

interface RegisterFields {
  name: string;
  email: string;
  password: string;
  professionType: ProfessionType | "";
  credentialNumber: string;
  phone: string;
  acceptedTerms: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MARKETING_BULLETS: Array<{
  icon: React.ElementType;
  title: string;
  description: string;
}> = [
  {
    icon: ClipboardCheck,
    title: "40 itens canônicos",
    description:
      "Instrumento COPSOQ II-BR completo, com 40 itens em 11 dimensões psicossociais.",
  },
  {
    icon: Brain,
    title: "11 dimensões psicossociais",
    description:
      "Exigências cognitivas, emocionais, dupla presença, reconhecimento e mais.",
  },
  {
    icon: ShieldCheck,
    title: "Conformidade NR-1 / FRPRT",
    description:
      "Atende à Portaria MTE 1.419/2024 e ao FRPRT para o PGR do empregador.",
  },
  {
    icon: Eye,
    title: "Anonimato k≥5 por GHE",
    description:
      "Respostas do trabalhador anonimizadas por design — nenhum dado pessoal é coletado.",
  },
];

export function AuthScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 grid lg:grid-cols-2">
        {/* Marketing panel — hidden on mobile */}
        <section
          aria-hidden="true"
          className="hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-[var(--brand)] text-[var(--accent-foreground)] relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <ShieldCheck
                className="h-6 w-6 text-[var(--accent)]"
                aria-hidden
              />
              <div className="font-display text-xl tracking-tight">
                NR-1 Copsoq
              </div>
            </div>

            <h1 className="font-display mt-12 text-3xl xl:text-4xl leading-tight tracking-tight">
              Gestão de Riscos
              <br />
              Psicossociais conforme NR-1
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-white/80">
              Plataforma SaaS multi-tenant para o profissional de SST gerir
              ciclos de avaliação, inventário de riscos e plano de ação —
              usando o instrumento COPSOQ II-BR.
            </p>

            <ul className="mt-10 space-y-6 max-w-md">
              {MARKETING_BULLETS.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.title} className="flex gap-3">
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                      aria-hidden
                    />
                    <div>
                      <div className="font-medium leading-snug">{b.title}</div>
                      <div className="text-sm text-white/70 leading-snug mt-0.5">
                        {b.description}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative z-10 mt-12 text-xs text-white/55 leading-relaxed">
            Plataforma SaaS para gestão de Riscos Psicossociais conforme NR-1
            (Portaria MTE 1.419/2024) usando instrumento COPSOQ II-BR
            (Gonçalves et al. 2021).
            <br />
            LGPD: dados do trabalhador anonimizados por design.
          </div>
        </section>

        {/* Auth form panel */}
        <section className="flex items-center justify-center p-6 sm:p-10 bg-background">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
              <div className="h-9 w-9 rounded-md bg-[var(--brand)] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-foreground)]" />
              </div>
              <span className="font-display text-lg tracking-tight">
                NR-1 Copsoq
              </span>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register" className="mt-6">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Login ──────────────────────────────────────────────────────────────────

function LoginForm() {
  const setProfessional = useAuth((s) => s.set);
  const [form, setForm] = useState<LoginFields>({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setSubmitting(true);
    try {
      const { professional } = await api.auth.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setProfessional(professional);
      toast.success(`Bem-vindo(a), ${professional.name.split(" ")[0]}!`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") {
        toast.error("Credenciais inválidas. Verifique e-mail e senha.");
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Falha ao entrar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pb-4 border-b border-border">
        <h2 className="font-display text-2xl tracking-tight">Entrar</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Acesse o painel de gestão de riscos psicossociais.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={submitting}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password">Senha</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={submitting}
              required
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground cursor-not-allowed"
                disabled
              >
                Esqueci minha senha
              </button>
            </TooltipTrigger>
            <TooltipContent>Em breve</TooltipContent>
          </Tooltip>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Register ───────────────────────────────────────────────────────────────

function RegisterForm() {
  const setProfessional = useAuth((s) => s.set);
  const [form, setForm] = useState<RegisterFields>({
    name: "",
    email: "",
    password: "",
    professionType: "",
    credentialNumber: "",
    phone: "",
    acceptedTerms: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof RegisterFields>(k: K, v: RegisterFields[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!EMAIL_RE.test(form.email)) {
      toast.error("E-mail inválido.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (!form.professionType) {
      toast.error("Selecione sua categoria profissional.");
      return;
    }
    if (!form.acceptedTerms) {
      toast.error("Você precisa aceitar os Termos e a Política de Privacidade.");
      return;
    }

    setSubmitting(true);
    try {
      const { professional } = await api.auth.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        professionType: form.professionType,
        credentialNumber: form.credentialNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
        acceptedTerms: form.acceptedTerms,
      });
      setProfessional(professional);
      toast.success("Conta criada! Bem-vindo(a) à plataforma.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_ALREADY_REGISTERED") {
        toast.error("E-mail já cadastrado. Faça login.");
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Falha ao criar conta. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pb-4 border-b border-border">
        <h2 className="font-display text-2xl tracking-tight">Criar conta</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Cadastre-se como profissional de SST para gerir seus clientes.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Nome completo</Label>
          <Input
            id="reg-name"
            autoComplete="name"
            placeholder="Dra. Ana Souza"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={submitting}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-email">E-mail</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            disabled={submitting}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Senha</Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              disabled={submitting}
              required
              minLength={8}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reg-profession">Categoria profissional</Label>
            <Select
              value={form.professionType}
              onValueChange={(v) => update("professionType", v as ProfessionType)}
              disabled={submitting}
            >
              <SelectTrigger id="reg-profession" className="w-full">
                <SelectValue placeholder="Selecione…" />
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
            <Label htmlFor="reg-credential">
              Registro<span className="text-muted-foreground"> (opcional)</span>
            </Label>
            <Input
              id="reg-credential"
              placeholder="CRP / CREA / CRM"
              value={form.credentialNumber}
              onChange={(e) => update("credentialNumber", e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-phone">
            Telefone<span className="text-muted-foreground"> (opcional)</span>
          </Label>
          <Input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="flex items-start gap-3 pt-1">
          <Checkbox
            id="reg-terms"
            checked={form.acceptedTerms}
            onCheckedChange={(v) => update("acceptedTerms", v === true)}
            disabled={submitting}
            className="mt-0.5"
          />
          <Label htmlFor="reg-terms" className="text-xs leading-relaxed font-normal">
            Li e aceito os{" "}
            <span className="text-primary font-medium">Termos de Uso</span> e a{" "}
            <span className="text-primary font-medium">
              Política de Privacidade (LGPD)
            </span>
            , incluindo o anonimato do trabalhador por design.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando conta…
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </div>
  );
}

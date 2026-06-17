"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { CompanySummary } from "@/lib/types";
import {
  formatCnpj,
  isValidCnpj,
  maskCnpj,
  sanitizeCnpj,
} from "@/lib/cnpj";
import { BRAZILIAN_UFS } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyFormState {
  name: string;
  cnpj: string;
  cnaePrimary: string;
  employeeCount: string;
  city: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  dpoPoc: string;
}

const EMPTY_FORM: CompanyFormState = {
  name: "",
  cnpj: "",
  cnaePrimary: "",
  employeeCount: "",
  city: "",
  state: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  dpoPoc: "",
};

/**
 * CompanyFormDialog — reused for create AND edit. CNPJ field is disabled on
 * edit (CNPJ is immutable per spec §3.5). Shows inline validation state on
 * the CNPJ field: green check when valid, red text otherwise. Server errors
 * `CNPJ_INVALID` / `CNPJ_ALREADY_REGISTERED` are surfaced inline.
 */
export function CompanyFormDialog({
  open,
  onOpenChange,
  editing,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CompanySummary | null;
  onCreated: (c: CompanySummary) => void;
  onUpdated: (c: CompanySummary) => void;
}) {
  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  // Sync form when modal opens / target changes.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name ?? "",
        cnpj: formatCnpj(editing.cnpj),
        cnaePrimary: editing.cnaePrimary ?? "",
        employeeCount:
          editing.employeeCount != null ? String(editing.employeeCount) : "",
        city: editing.city ?? "",
        state: editing.state ?? "",
        contactName: editing.contactName ?? "",
        contactEmail: editing.contactEmail ?? "",
        contactPhone: editing.contactPhone ?? "",
        dpoPoc: editing.dpoPoc ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setCnpjError(null);
  }, [open, editing]);

  const cnpjValid = form.cnpj.length > 0 && isValidCnpj(form.cnpj);
  const cnpjTouched = form.cnpj.length > 0;
  const showCnpjError = cnpjTouched && !cnpjValid;

  const set = <K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "cnpj") setCnpjError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    if (!isValidCnpj(form.cnpj)) {
      setCnpjError("CNPJ inválido.");
      toast.error("Informe um CNPJ válido.");
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      cnpj: sanitizeCnpj(form.cnpj),
      cnaePrimary: form.cnaePrimary.trim() || null,
      employeeCount: form.employeeCount ? Number(form.employeeCount) : null,
      city: form.city.trim() || null,
      state: form.state || null,
      contactName: form.contactName.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      dpoPoc: form.dpoPoc.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editing) {
        // On edit, cnpj is not editable — omit it from the PATCH body.
        const { cnpj: _omit, ...patch } = body;
        void _omit;
        const updated = await api.companies.update(editing.id, patch);
        onUpdated(updated);
      } else {
        const created = await api.companies.create(body);
        onCreated(created);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CNPJ_INVALID") {
          setCnpjError("CNPJ inválido.");
        } else if (err.code === "CNPJ_ALREADY_REGISTERED") {
          setCnpjError("Este CNPJ já está cadastrado.");
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("Falha ao salvar empresa.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar empresa" : "Nova empresa"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? "Atualize os dados cadastrais da empresa."
              : "Preencha os dados cadastrais do novo cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Identificação */}
          <fieldset className="space-y-4" disabled={submitting}>
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Identificação
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-cnpj">
                  CNPJ <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="emp-cnpj"
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
                    disabled={!!editing}
                    aria-invalid={showCnpjError || !!cnpjError}
                    aria-describedby="emp-cnpj-feedback"
                    className={`font-mono-numeric pr-9 ${
                      showCnpjError || cnpjError
                        ? "border-destructive focus-visible:ring-destructive/30"
                        : cnpjValid
                        ? "border-risk-low focus-visible:ring-risk-low/30"
                        : ""
                    }`}
                  />
                  {cnpjValid && (
                    <Check
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-risk-low"
                      aria-hidden
                    />
                  )}
                </div>
                {(showCnpjError || cnpjError) && (
                  <p
                    id="emp-cnpj-feedback"
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    {cnpjError ?? "CNPJ inválido"}
                  </p>
                )}
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    O CNPJ não pode ser alterado após o cadastro.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-cnae">CNAE principal</Label>
                <Input
                  id="emp-cnae"
                  placeholder="0000-0/00"
                  value={form.cnaePrimary}
                  onChange={(e) => set("cnaePrimary", e.target.value)}
                  className="font-mono-numeric"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-employees">Nº de empregados</Label>
                <Input
                  id="emp-employees"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.employeeCount}
                  onChange={(e) =>
                    set("employeeCount", e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="font-mono-numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-city">Cidade</Label>
                <Input
                  id="emp-city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-state">UF</Label>
                <Select
                  value={form.state}
                  onValueChange={(v) => set("state", v)}
                >
                  <SelectTrigger id="emp-state" className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* Contato */}
          <fieldset className="space-y-4" disabled={submitting}>
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Contato
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-contact-name">Responsável</Label>
                <Input
                  id="emp-contact-name"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-contact-email">E-mail</Label>
                <Input
                  id="emp-contact-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-contact-phone">Telefone</Label>
                <Input
                  id="emp-contact-phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-dpo">Encarregado LGPD / DPO</Label>
                <Input
                  id="emp-dpo"
                  value={form.dpoPoc}
                  onChange={(e) => set("dpoPoc", e.target.value)}
                />
              </div>
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
                  Cadastrar empresa
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

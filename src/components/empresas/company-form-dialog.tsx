"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { CompanySummary } from "@/lib/types";
import {
  formatCnpj,
  isValidCnpj,
  maskCnpj,
  sanitizeCnpj,
} from "@/lib/cnpj";
import {
  FIELD_ERROR_CLASS,
  FieldError,
  maskNumber,
  maskPhone,
  validateEmail,
  validateRequired,
} from "@/lib/form-utils";
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

type FieldKey =
  | "name"
  | "cnpj"
  | "contactEmail"
  | "employeeCount";

/**
 * CompanyFormDialog — reused for create AND edit. CNPJ field is disabled on
 * edit (CNPJ is immutable per spec §3.5). Front-side (onBlur) validation and
 * backend errors (CNPJ_INVALID / CNPJ_ALREADY_REGISTERED) render with the
 * SAME shared `FieldError` component + `FIELD_ERROR_CLASS` styling.
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
  // Per-field inline errors — used for BOTH front-side onBlur validation AND
  // backend error-mapping. Both render via the shared `FieldError` component.
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

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
    setErrors({});
  }, [open, editing]);

  const cnpjValid = form.cnpj.length > 0 && isValidCnpj(form.cnpj);
  const cnpjTouched = form.cnpj.length > 0;
  const showCnpjFmtError = cnpjTouched && !cnpjValid;

  const set = <K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear any inline error on the field the user is editing — both
    // front-side onBlur errors and backend-mapped errors.
    if (key === "name" || key === "cnpj" || key === "contactEmail") {
      const field = key as FieldKey;
      setErrors((prev) =>
        prev[field] ? { ...prev, [field]: undefined } : prev
      );
    }
  };

  // ─── Front-side validation (onBlur) ──────────────────────────────────────
  const validateField = (key: FieldKey): boolean => {
    let msg: string | undefined;
    if (key === "name") {
      if (!validateRequired(form.name, 2)) msg = "Informe o nome da empresa.";
    } else if (key === "cnpj") {
      if (!form.cnpj.trim()) msg = "Informe o CNPJ.";
      else if (!isValidCnpj(form.cnpj)) msg = "CNPJ inválido.";
    } else if (key === "contactEmail") {
      // Optional — only validate if user typed something.
      if (form.contactEmail.trim() && !validateEmail(form.contactEmail)) {
        msg = "E-mail inválido.";
      }
    }
    setErrors((prev) => ({ ...prev, [key]: msg }));
    return !msg;
  };

  const runAllValidations = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!validateRequired(form.name, 2)) {
      next.name = "Informe o nome da empresa.";
    }
    if (!editing) {
      if (!form.cnpj.trim()) next.cnpj = "Informe o CNPJ.";
      else if (!isValidCnpj(form.cnpj)) next.cnpj = "CNPJ inválido.";
    }
    if (form.contactEmail.trim() && !validateEmail(form.contactEmail)) {
      next.contactEmail = "E-mail inválido.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runAllValidations()) {
      toast.error("Verifique os campos destacados.");
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
        // Map backend errors onto the SAME field-error styling used by
        // front-side onBlur validation (identical visual treatment).
        if (err.code === "CNPJ_INVALID") {
          setErrors((p) => ({ ...p, cnpj: "CNPJ inválido." }));
        } else if (err.code === "CNPJ_ALREADY_REGISTERED") {
          setErrors((p) => ({
            ...p,
            cnpj: "Este CNPJ já está cadastrado.",
          }));
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
          <DialogTitle className="font-display text-xl">
            {editing ? "Editar empresa" : "Nova empresa"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? "Atualize os dados cadastrais da empresa."
              : "Preencha os dados cadastrais do novo cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Identificação */}
          <fieldset className="space-y-4" disabled={submitting}>
            <legend className="font-display text-sm font-medium text-foreground">
              Identificação
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">
                Nome <span className="text-[var(--risk-high)]">*</span>
              </Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => validateField("name")}
                required
                autoFocus
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "emp-name-err" : undefined}
                className={errors.name ? FIELD_ERROR_CLASS : ""}
              />
              {errors.name ? (
                <FieldError id="emp-name-err" message={errors.name} />
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-cnpj">
                  CNPJ <span className="text-[var(--risk-high)]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="emp-cnpj"
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
                    onBlur={() => validateField("cnpj")}
                    disabled={!!editing}
                    aria-invalid={
                      showCnpjFmtError || !!errors.cnpj
                    }
                    aria-describedby={
                      showCnpjFmtError || errors.cnpj
                        ? "emp-cnpj-feedback"
                        : undefined
                    }
                    className={`font-mono-numeric pr-9 ${
                      showCnpjFmtError || errors.cnpj
                        ? FIELD_ERROR_CLASS
                        : cnpjValid
                        ? "border-[var(--risk-low)] focus-visible:ring-[var(--risk-low)]/30"
                        : ""
                    }`}
                  />
                  {cnpjValid && (
                    <Check
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--risk-low)]"
                      aria-hidden
                    />
                  )}
                </div>
                {(showCnpjFmtError || errors.cnpj) && (
                  <FieldError
                    id="emp-cnpj-feedback"
                    message={errors.cnpj ?? "CNPJ inválido"}
                  />
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
                    set("employeeCount", maskNumber(e.target.value, { min: 0 }))
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
            <legend className="font-display text-sm font-medium text-foreground">
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
                  onBlur={() => validateField("contactEmail")}
                  aria-invalid={!!errors.contactEmail}
                  aria-describedby={
                    errors.contactEmail ? "emp-email-err" : undefined
                  }
                  className={errors.contactEmail ? FIELD_ERROR_CLASS : ""}
                />
                {errors.contactEmail ? (
                  <FieldError
                    id="emp-email-err"
                    message={errors.contactEmail}
                  />
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-contact-phone">Telefone</Label>
                <Input
                  id="emp-contact-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 98765-4321"
                  value={form.contactPhone}
                  onChange={(e) =>
                    set("contactPhone", maskPhone(e.target.value))
                  }
                  className="font-mono-numeric"
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

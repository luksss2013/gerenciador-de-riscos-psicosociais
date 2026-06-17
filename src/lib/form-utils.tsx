"use client";

// Shared form-helpers module — masks + validators + presentation-layer error
// styling. Used by all NR-1 Copsoq forms (company, department, action item,
// manual risk, profile, assessment) so that front-side (onBlur) validation
// errors and backend error-mapping render with identical visual style.
//
// Pure presentation — no business logic / API / data-flow changes.

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Shared error-state class — applied to an Input/Textarea/Select when its
 * value is invalid (front-side onBlur OR backend error). Used by every form
 * so the visual style is identical regardless of where the error originated.
 */
export const FIELD_ERROR_CLASS =
  "border-[var(--risk-high)] focus-visible:ring-[var(--risk-high)]/30 text-[var(--risk-high)]";

// ─── Masks ────────────────────────────────────────────────────────────────

/**
 * Brazilian phone mask: auto-detect 10 vs 11 digits.
 *  - 11 digits (mobile with 9th digit): `(11) 98765-4321`
 *  - 10 digits (landline):               `(11) 3456-7890`
 *  - < 10 digits: format progressively as user types.
 */
export function maskPhone(input: string): string {
  const s = input.replace(/\D/g, "").slice(0, 11);
  if (s.length === 0) return "";
  if (s.length <= 2) return `(${s}`;
  if (s.length <= 6) return `(${s.slice(0, 2)}) ${s.slice(2)}`;
  // 7..10 → landline-style, 11 → mobile-style (5-digit first group)
  if (s.length <= 10) {
    return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  }
  return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
}

/**
 * Strip non-digits and clamp to [min, max]. Returns a string so the calling
 * input's `value` prop stays a string (the controlled-input invariant).
 *
 * Empty input returns "" — callers decide whether "" is valid for their field.
 */
export function maskNumber(
  input: string,
  opts?: { min?: number; max?: number }
): string {
  const s = input.replace(/\D/g, "");
  if (s === "") return "";
  let n = Number(s);
  if (!Number.isFinite(n)) return "";
  if (opts?.min != null && n < opts.min) n = opts.min;
  if (opts?.max != null && n > opts.max) n = opts.max;
  return String(n);
}

/**
 * BRL currency input mask: `1.234,56` (pt-BR grouping).
 *
 * The user types digits; we accumulate them as cents (so typing "1" → "0,01",
 * then "2" → "0,12", etc., which is the standard currency-input behavior).
 */
export function maskCurrency(input: string): string {
  // Keep only digits — this also lets us re-mask on each keystroke.
  const digits = input.replace(/\D/g, "");
  if (digits === "") return "";
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return "0,00";
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a BRL-formatted currency string (`1.234,56`) back to a number. */
export function parseCurrencyBRL(input: string): number {
  const cleaned = input
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ─── Validators ───────────────────────────────────────────────────────────

/** RFC-simple email check: `local@domain.tld` with no whitespace inside. */
export function validateEmail(email: string): boolean {
  const v = email.trim();
  if (v.length === 0) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Required-field check; optionally enforce a minimum trimmed length. */
export function validateRequired(value: string, minLen?: number): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  if (minLen != null && v.length < minLen) return false;
  return true;
}

// ─── Shared presentation components ───────────────────────────────────────

/**
 * `FieldError` — shared inline error message rendered below a form field.
 * Used by BOTH front-side onBlur validation AND backend error-mapping so the
 * visual style is identical regardless of where the error originated.
 *
 * Includes `role="alert"` for screen readers and a small `AlertCircle` glyph.
 */
export function FieldError({
  id,
  message,
}: {
  id?: string;
  message: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="text-xs text-[var(--risk-high)] flex items-center gap-1 mt-1"
    >
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      {message}
    </p>
  );
}

// ─── DateRangeField ──────────────────────────────────────────────────────

/**
 * `DateRangeField` — a single labeled group with two `<input type="date">`
 * (start + end) rendered side-by-side. Shared label "Período da coleta" +
 * individual sublabels. Inline validation: endDate must be > startDate;
 * the error appears below both inputs (not just on the end input).
 *
 * Validation is computed from the current start/end pair on each change so
 * the error clears the moment the user fixes the range — matching the
 * existing dateError UX in `CreateAssessmentDialog`.
 */
export function DateRangeField({
  startId,
  endId,
  startLabel = "Início",
  endLabel = "Fim",
  groupLabel = "Período da coleta",
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onErrorChange,
  error,
  required = false,
  disabled = false,
}: {
  startId: string;
  endId: string;
  startLabel?: string;
  endLabel?: string;
  groupLabel?: string;
  startValue: string;
  endValue: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onErrorChange: (e: string | null) => void;
  error: string | null;
  required?: boolean;
  disabled?: boolean;
}) {
  const errorId = `${endId}-err`;

  const recompute = (nextStart: string, nextEnd: string) => {
    if (nextStart && nextEnd) {
      if (new Date(nextEnd) <= new Date(nextStart)) {
        onErrorChange("A data final deve ser posterior à data de início.");
        return;
      }
    }
    onErrorChange(null);
  };

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium leading-none">
        {groupLabel}
        {required ? (
          <span className="text-[var(--risk-high)]"> *</span>
        ) : null}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <Label
            htmlFor={startId}
            className="text-xs text-muted-foreground font-normal"
          >
            {startLabel}
          </Label>
          <Input
            id={startId}
            type="date"
            value={startValue}
            onChange={(e) => {
              onStartChange(e.target.value);
              recompute(e.target.value, endValue);
            }}
            disabled={disabled}
            className={`font-mono-numeric ${
              error ? FIELD_ERROR_CLASS : ""
            }`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={endId}
            className="text-xs text-muted-foreground font-normal"
          >
            {endLabel}
            {required ? (
              <span className="text-[var(--risk-high)]"> *</span>
            ) : null}
          </Label>
          <Input
            id={endId}
            type="date"
            value={endValue}
            onChange={(e) => {
              onEndChange(e.target.value);
              recompute(startValue, e.target.value);
            }}
            disabled={disabled}
            className={`font-mono-numeric ${
              error ? FIELD_ERROR_CLASS : ""
            }`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
      </div>
      {error ? <FieldError id={errorId} message={error} /> : null}
    </fieldset>
  );
}

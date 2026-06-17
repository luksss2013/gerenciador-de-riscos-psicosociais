# Task ID: UX-2 — Masks + validation across forms

Agent: full-stack-developer
Task: Apply shared input masks, field validation, and consistent error styling across all NR-1 Copsoq forms (company, department, action item 5W2H, manual risk, profile, assessment date range).

## What was done

### 1. Shared form-helpers module — `src/lib/form-utils.tsx` (NEW)

Pure presentation-layer module. Exports:

- `maskPhone(input)` — Brazilian phone mask, auto-detects 10 vs 11 digits → `(11) 98765-4321` / `(11) 3456-7890`.
- `maskCep(input)` — `12345-678`.
- `maskNumber(input, opts?)` — strips non-digits, clamps to `[min,max]`.
- `maskCurrency(input)` — BRL cents-as-digits accumulator → `1.234,56`.
- `parseCurrencyBRL(input)` — parse `1.234,56` → number (inverse of `maskCurrency`).
- `validateEmail(email)` — RFC-simple regex.
- `validateRequired(value, minLen?)` — trimmed length check.
- `FIELD_ERROR_CLASS` constant — `"border-[var(--risk-high)] focus-visible:ring-[var(--risk-high)]/30 text-[var(--risk-high)]"` — used by both front-side onBlur validation AND backend error-mapping so the visual treatment is identical regardless of where the error originated.
- `FieldError` React component — `<p role="alert" className="text-xs text-[var(--risk-high)] flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" aria-hidden />{message}</p>`.
- `DateRangeField` React component — single `<fieldset>` with shared legend "Período da coleta" + two side-by-side `<input type="date">`. Inline validation that `endDate > startDate` clears the moment the user fixes the range; the error appears below both inputs via the shared `FieldError`. Both inputs get `FIELD_ERROR_CLASS` and `aria-describedby` linking when an error is present.

### 2. Company form — `src/components/empresas/company-form-dialog.tsx`

- CNPJ: kept existing `maskCnpj` from `@/lib/cnpj` (unchanged).
- Phone (`contactPhone`): `maskPhone` on change.
- Email (`contactEmail`): `validateEmail` onBlur; if invalid → `FieldError` + `FIELD_ERROR_CLASS` on the input; clears on edit.
- Employee count (`employeeCount`): `maskNumber({ min: 0 })` on change.
- Required `name`: `validateRequired(form.name, 2)` onBlur + on submit.
- Backend `CNPJ_INVALID` / `CNPJ_ALREADY_REGISTERED`: mapped onto the CNPJ field via the SAME `FieldError` + `FIELD_ERROR_CLASS` (consistency with front-side onBlur errors).
- Per-field error state replaced the old ad-hoc `cnpjError` single string with a `Partial<Record<FieldKey, string>>` map so multiple fields can show errors simultaneously.
- Removed unused `X` import.
- Accessibility: `aria-invalid` + `aria-describedby` on every validated input; `FieldError` carries `role="alert"`.

### 3. Department form — `src/components/empresas/empresa-detail-view.tsx` → `DepartmentFormDialog`

- Worker count (`workerCount`): `maskNumber({ min: 1 })` on change (replaces the inline `e.target.value.replace(/[^\d]/g, "")` regex).
- Name: `validateRequired(form.name, 2)` onBlur + on submit.
- Backend `DEPARTMENT_NAME_DUPLICATE`: mapped to the name field via the same `FieldError` + `FIELD_ERROR_CLASS`.
- Added a new `wcError` state for the worker-count field, displayed via `FieldError`.
- Removed unused `X` import.

### 4. Action Item form (5W2H) — `src/components/plano/plano-view.tsx` → `ActionItemFormContents`

- Estimated cost (`estimatedCost`): `maskCurrency` on change. Initial value loaded from `initialItem.estimatedCost` (number) is now re-rendered as a BRL-formatted string via `maskCurrency(String(Math.round(value * 100)))` so editing an existing action shows the canonical `1.234,56` format. On submit, parsed back to a number via `parseCurrencyBRL`.
- When date (`whenDate`): kept `<input type="date">`. Added future-or-today validation onBlur (NR-1 action plan prazo must be hoje ou no futuro); uses `startOfDay` from `date-fns` to avoid TZ edge cases.
- Required `what`/`why`/`who`/`where`/`how`: `validateRequired(value, 2)` onBlur + on submit.
- Per-field `validateOnBlur(field)` helper — same shared `FieldError` styling as submit-time validation.
- Backend `VALIDATION_ERROR`: surfaced as a form-level banner above the field grid using the shared `FieldError` component (the backend doesn't tell us which specific field failed, so the banner is the most truthful representation; the front-side field-level errors are still triggered by the front-side onBlur checks).
- All error displays converted from inline `<p className="text-xs text-[var(--risk-high)]">{msg}</p>` to `<FieldError id="…" message={msg} />`. All validated inputs/textareas get `FIELD_ERROR_CLASS` when their field is in error.
- Accessibility: `aria-invalid` + `aria-describedby` on every validated field; `FieldError` carries `role="alert"`. Editing a field clears its error.

### 5. Manual Risk form — `src/components/inventario/inventario-view.tsx` → `ManualRiskFormContents`

- Probability/Severity: `maskNumber(v, { min: 1, max: 3 })` defensively on the Select's `onValueChange` (the Select options already constrain to {1,2,3}, but the mask guards against any future programmatic value).
- Required `hazardDescription` / `possibleHarms`: `validateRequired(value, 3)` onBlur + on submit.
- Required `mteFactorCode` / `probability` / `severity`: kept existing Select-based validation; added `FIELD_ERROR_CLASS` to the SelectTrigger and `FieldError` display below.
- Backend `VALIDATION_ERROR`: surfaced as a form-level banner via the shared `FieldError`.
- All error displays converted from inline `<p className="text-xs text-[var(--risk-high)]">{msg}</p>` to `<FieldError id="…" message={msg} />`.

### 6. Assessment date range — `src/components/empresas/empresa-detail-view.tsx` → `CreateAssessmentDialog`

- Replaced the two separate `<Input type="date">` (start + end) with a single `<DateRangeField />` instance. Shared legend "Período da coleta" with individual "Início" / "Fim" sublabels.
- Inline validation that `endDate > startDate` is now computed inside `DateRangeField.recompute()` on every change to either input, and the resulting error appears below both inputs via the shared `FieldError`.
- The existing validation feedback panel (the surface + risk-medium "Pendências" banner at the bottom of the dialog) is kept verbatim — it still derives `dateValid` from `startDate && endDate && new Date(endDate) > new Date(startDate)`. The new `DateRangeField` integrates with it because both share the same `dateError` state setter.
- `setDateError(null)` is still called by the dialog's own onChange handlers (which now live inside `DateRangeField`) so the panel and the inline error stay in sync.

### 7. Profile form — `src/components/configuracoes/configuracoes-view.tsx` → `ProfileSection`

- Name: `validateRequired(form.name, 2)` onBlur + on submit. Added `nameError` state and `FieldError` display + `FIELD_ERROR_CLASS` on the input.
- Phone: `maskPhone` on change. Added `font-mono-numeric` to the input className.
- Removed the old `if (!form.name.trim())` toast-only check; replaced with the inline `FieldError`.

## Constraints honored

- NO business logic / API / data-flow changes — only presentation-layer masks + validation added. All existing form submission logic preserved (the only behavioral change is that submit is now blocked when front-side validation fails, instead of relying on `toast.error` + early return).
- NO new npm packages.
- Front-side (onBlur) and backend errors use the IDENTICAL visual style — `FieldError` component + `FIELD_ERROR_CLASS` — across every form touched.
- Accessibility: error messages carry `role="alert"`; every validated input has `aria-invalid` reflecting the error state and `aria-describedby` linking to the error `<p>` id.

## Verification

- `bun run lint` → exit 0 (clean).
- Dev server recompiled successfully per `dev.log` (no compile errors observed after edits).
- Did NOT start/restart the dev server (per task constraint).

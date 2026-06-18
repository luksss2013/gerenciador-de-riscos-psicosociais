# DESIGN.md

> Design system reference for the **NR-1 Copsoq** platform.
>
> A clinical-institutional identity tuned for occupational health & safety
> professionals. The visual language aims for **calm, trust, and editorial
> gravitas** — never consumer-app, never cold-tech.

---

## 1. Design Philosophy

The product serves **psychologists, SST engineers, occupational physicians, and
technicians** who use the system to produce a legally-binding document (the
PGR). That audience expects:

*   **Clarity over flash.** No trendy animations, no neon accents, no playful
    illustrations.
*   **Editorial weight.** Headings should feel like a printed report.
*   **Warmth + seriousness.** Cold clinical blue would feel like a hospital;
    loud SaaS gradients would feel like a startup pitch. We split the
    difference: a deep pine primary + restrained terracotta accent on warm
    stone surfaces.
*   **Risk is visible, not alarmist.** The risk scale is muted (not Tailwind's
    default `red-500`) and uses text labels alongside color so it remains
    accessible.

**The single test for a new component:** *Does it look like something a
health-and-safety professional could show to a regulator without feeling
embarrassed?*

---

## 2. Color Tokens

All colors live as CSS variables in `src/app/globals.css` and are exposed to
Tailwind v4 via the `@theme inline` block. **Never hardcode hex values in
components** — use the token name.

### 2.1 Brand & Accent

| Token | Hex | Use |
| --- | --- | --- |
| `--brand` | `#2F4A43` | Primary actions, active nav, focus rings, display headings |
| `--brand-light` | `#3F6A5E` | Hover/active variants, link underline, secondary brand |
| `--accent` | `#B8623E` | Restrained terracotta — used sparingly for CTAs that must stand out |
| `--accent-foreground` | `#FAF8F4` | Text on `--accent` backgrounds |

### 2.2 Risk Scale

The risk scale is **muted but semantically clear**. It must be readable in
print (the PGR PDF) and accessible (WCAG AA against `--surface` and
`--text-primary`).

| Token | Hex | Tailwind | Meaning |
| --- | --- | --- | --- |
| `--risk-low` | `#5B8A6A` | `bg-risk-low` | Low / healthy |
| `--risk-medium` | `#C9952F` | `bg-risk-medium` | Medium / attention |
| `--risk-high` | `#C25647` | `bg-risk-high` | High / intervention |

Helper utility classes (see `globals.css`):
*   `.risk-low-bg`, `.risk-medium-bg`, `.risk-high-bg` — solid pill backgrounds.
*   `bg-risk-low/15`, `bg-risk-medium/15`, `bg-risk-high/15` — translucent
    tints for cards and rows. The 15% opacity is intentional.

### 2.3 Surfaces

| Token | Hex | Use |
| --- | --- | --- |
| `--background` | `#FAF8F4` | Page background (warm off-white) |
| `--surface` | `#F4F0E9` | Sidebar, alt rows, hover state |
| `--surface-card` | `#FFFFFF` | Cards and modals |
| `--border` | `#E4DDD2` | All borders — never `gray-200` |
| `--text-primary` | `#2A2620` | Default body text |
| `--text-muted` | `#6B6358` | Captions, secondary text |

### 2.4 Semantic

| Token | Hex | Use |
| --- | --- | --- |
| `--success` | `#5B8A6A` | Confirmation toasts, success states |
| `--warning` | `#C9952F` | Pending states, soft warnings |
| `--destructive` | `#C25647` | Destructive actions (delete account) |

### 2.5 Charts

For the radar chart, heatmap, and dimension bar charts:

```
--chart-1: #2F4A43   (pine — primary dimensions)
--chart-2: #5B8A6A   (low risk)
--chart-3: #B8623E   (accent)
--chart-4: #C9952F   (medium risk)
--chart-5: #C25647   (high risk)
```

These map 1:1 to the `recharts` `<ChartContainer config>` in
`src/components/ui/chart.tsx`.

---

## 3. Typography

Three font families, loaded via `next/font/google` in `src/app/layout.tsx`:

| Variable | Family | Use |
| --- | --- | --- |
| `--font-geist-sans` | **Inter** | Body text, buttons, table cells, forms |
| `--font-geist-mono` | **IBM Plex Mono** | CNPJ, scores, tokens, IDs, code-like numerics |
| `--font-source-serif` | **Source Serif 4** | Display headings, page titles, report cover |

### 3.1 Utility Classes

| Class | Effect |
| --- | --- |
| `.font-sans` (default) | Inter |
| `.font-mono` | IBM Plex Mono |
| `.font-display` | Source Serif 4 — `letter-spacing: -0.01em`, stylistic set `ss01` |
| `.font-mono-numeric` | IBM Plex Mono + `tabular-nums` + `letter-spacing: -0.01em` |

`.font-mono-numeric` is the **only** class to use for any number that gets
compared across rows (CNPJ, scores, counts, α values). Tabular nums prevent
digit-width jitter.

### 3.2 Scale

Tailwind's default scale is used. Editorial weight comes from the family, not
the size.

*   **Display (`h1`, page title)**: `font-display text-3xl md:text-4xl font-semibold`
*   **Section heading (`h2`)**: `font-display text-2xl font-semibold`
*   **Card title (`h3`)**: `font-sans text-lg font-semibold`
*   **Body**: `font-sans text-sm leading-relaxed`
*   **Caption / meta**: `font-sans text-xs text-muted-foreground`

---

## 4. Spacing & Radius

*   **Radius**: `--radius: 0.5rem`. Cards use `rounded-lg`, buttons use
    `rounded-md`, inputs match.
*   **Card padding**: `p-6` (24px). Never less for primary cards.
*   **Grid gaps**: `gap-4` for cards, `gap-6` for sections, `gap-2` inside
    form fields.

---

## 5. Components

### 5.1 Cards

Cards are **flat by default**. The hover effect is a background-color shift,
not a lift (no `transform`, no shadow growth).

```tsx
<Card className="surface-hover">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

The `.surface-hover` class swaps `bg-card` → `bg-surface` and shifts the
border toward `--brand-light`. This is deliberately quiet.

### 5.2 Buttons

*   `default` → `--brand` background, white text. Use for primary actions.
*   `secondary` → `--secondary` (`#EDE7DC`) background. Use for secondary
    actions on dense screens.
*   `outline` → bordered, transparent. Use for tertiary actions.
*   `destructive` → `--destructive` (`#C25647`) background. Use for delete
    confirmations only.
*   `ghost` → no border, hover background only. Use inside dense tables.
*   `accent` (custom) → `--accent` (`#B8623E`) background. Use sparingly for
    the PGR "Imprimir / Salvar PDF" CTA.

### 5.3 Forms

*   Inputs use the shadcn `<Input>` with a 1px `--border` and `focus-visible`
    ring in `--ring`.
*   **BR masks** are handled by `src/lib/form-utils.tsx` (`MaskedInput`,
    `validateCnpj`).
*   **Errors** appear inline below the field via `<FieldError>`. Never
    use `alert()` for form errors.

### 5.4 Toasts

Two systems coexist:
*   **shadcn `<Toaster>`** — UI-driven toasts (used by forms, dialog actions).
*   **Sonner** (`<SonnerToaster richColors position="top-right" />`) —
    background-task notifications (used by API mutations, copy-to-clipboard).

Use Sonner for anything that fires from an API call; use shadcn Toaster for
pure UI state.

### 5.5 Tables

`src/components/ui/table.tsx`. Tables are:
*   `text-sm` with `font-mono-numeric` for numeric cells.
*   Header row uses `text-xs uppercase tracking-wider text-muted-foreground`.
*   Alternating rows use `bg-surface` on the odd row (no stripes in print).

### 5.6 Badges

*   Risk levels use the `risk-{low,medium,high}-bg` utilities.
*   Status badges (e.g. `draft`, `collecting`, `processing`, `completed`) use
    semantic colors mapped in `src/components/shell/nr-status-badge.tsx`.

---

## 6. Charts & Data Visualization

### 6.1 Radar (Dimension profile)

`src/components/resultados/` renders an SVG radar. The polygon is filled
with `--brand` at 12% opacity; the stroke is `--brand` at 100%. Risk band
rings (LOW / MEDIUM / HIGH) use the risk scale tokens at 25% opacity.

### 6.2 Heatmap (Departments × Dimensions)

11 dimensions × N departments. Cell color blends `--risk-*` with opacity based
on raw score (0–100). Cells with `n < 5` are grayed out with a tooltip
explaining the k-anonymity rule.

### 6.3 Action plan timeline

Horizontal bars on a 12-week timeline. Bar color = `--risk-{level}-bg`.
Today marker is a vertical line in `--accent`.

---

## 7. Accessibility

*   **Color is never the only signal.** Every risk badge includes the text
    label (`ALTO`, `MÉDIO`, `BAIXO`).
*   **Focus rings** are always visible (`:focus-visible` in `globals.css`).
*   **Reduced motion** is honored (WCAG 2.3.3 — see `@media
    (prefers-reduced-motion)` in `globals.css`).
*   **Form labels** are always rendered. Placeholders are not labels.
*   **Print styles** disable the focus ring outline and remove shadows
    (see §9).

---

## 8. Empty / Loading / Error States

Every list view defines three states:

| State | Treatment |
| --- | --- |
| Loading | `.skeleton-shimmer` blocks in the layout's shape — never spinners on top-level content. |
| Empty | Editorial: an icon, a one-line headline, a single CTA. Never blank. |
| Error | Inline `<Alert variant="destructive">` with the error message + a "Tentar novamente" button. |

---

## 9. Print Styles (PGR Report)

The PGR is generated as an in-browser print of a `<div class="print-area">`.
The `@media print` rules in `globals.css` strip:

*   `.no-print` → `display: none !important`
*   box-shadows and borders on `.print-area`
*   any custom focus outlines

Page setup uses the default browser margins (A4). Each report section
declares a `print-area` container and uses `break-inside: avoid` on cards
that must not split across pages.

---

## 10. Iconography

`lucide-react` only. Stroke width 1.75. Color inherits from `currentColor`.
Icon-only buttons must have an `aria-label`.

---

## 11. Don'ts

*   ❌ Don't use `red-500`, `green-500`, etc. directly. Use the risk tokens.
*   ❌ Don't use `bg-white` or `bg-gray-*`. Use `--surface`/`--surface-card`
    via `bg-background` / `bg-card`.
*   ❌ Don't use drop-shadow on cards. Use borders + surface swap.
*   ❌ Don't introduce a second font family.
*   ❌ Don't use emoji in product UI. Reserve for empty/error states only.
*   ❌ Don't use `transition: all`. Specify properties to keep paint cheap.

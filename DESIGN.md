---
name: NR-1 Copsoq Design System
description: Sober, warm-paper design system for Brazilian occupational psychosocial risk management — a fusion of hand-drawn sketch warmth (design-system-2) and token-disciplined governance (Doodle), tuned for a B2B compliance instrument. "Manual técnico ilustrado."
version: 2.0
sources:
  - design-system-2/SKILL.md  # warm cream paper, pencil shadows, dashed borders, hand-drawn texture
  - doodle (typeui.sh)        # semantic token discipline, must/should rules, QA checklists, authoring workflow
inherits: previous "Clinical-institutional" DESIGN.md v1 (warm base preserved, enriched)
colors:
  # Warm paper + graphite canvas (from design-system-2, sobered)
  surface:        "#F4F0E9"   # warm paper page (was #F4F0E9 — kept)
  surface-card:   "#FFFAF5"   # cream card sitting on paper (design-system-2 neutral-primary-soft)
  surface-sunken: "#ECE3D0"   # deeper cream for insets/table heads (design-system-2 neutral-primary-strong)
  # Warm graphite ink
  ink:            "#2A2620"   # primary text / pencil ink (was #2A2620 — kept)
  ink-strong:     "#1F1B12"   # headings (design-system-2 heading)
  ink-soft:       "#6B6358"   # muted text (was #6B6358 — kept)
  # Brand — deep teal (sobered from design-system-2 #1DAD97 → deeper #2F4A43)
  brand:          "#2F4A43"   # primary actions, active nav (was #2F4A43 — kept)
  brand-light:    "#3F6A5E"   # hover (was #3F6A5E — kept)
  brand-soft:     "#E8F0ED"   # brand-tinted surfaces, active row wash (NEW — design-system-2 brand-softer, sobered)
  # Accent — terracotta (sober alternative to doodle sky-blue #49B6E5)
  accent:         "#B8623E"   # secondary CTAs, highlights (was #B8623E — kept)
  # Risk ramp — muted sage → ochre → clay (preserved from v1; matches design-system-2 warm axis)
  risk-low:       "#5B8A6A"   # favorável
  risk-medium:    "#C9952F"   # intermediário
  risk-high:      "#C25647"   # desfavorável
  # Status
  success:        "#5B8A6A"
  warning:        "#C9952F"
  danger:         "#C25647"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"   # sober serif for professional headers (kept from v1)
    fontWeight: 400
    letterSpacing: "-0.01em"
  hand:                                  # NEW — handwritten display, RESTRAINED use only
    fontFamily: "'Delicious Handrawn', 'Delius Swash Caps', cursive"
    use: "empty-state headlines, worker-portal welcome, illustrative spot headings — NEVER in dashboards/tables/reports"
  body:
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif"   # calm sans (kept)
    fontWeight: 400
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"  # from doodle's JetBrains Mono discipline
    fontVariantNumeric: "tabular-nums"
    use: "scores, CNPJs, dates, IDs, token previews"
  eyebrow:
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    textTransform: "uppercase"
    letterSpacing: "0.08em"
  scale: "12 / 13 / 14 / 16 / 18 / 20 / 24 / 32"   # merged: doodle 14/16/18/24/32/40 + v1 11/13/20
spacing:
  base: 4
  scale: "4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96"   # doodle scale extended with design-system-2 section rhythm
radius:
  sm: "8px"      # chips, small decorative blocks
  default: "16px"  # tooltips, accordion items, medium controls
  base: "24px"   # cards, modals, table wrappers, sections
  full: "999px"  # buttons, inputs, badges, pills, avatars, toggles (design-system-2 signature)
shadow:
  style: "pencil-drawn"   # offset solid blocks, warm graphite ink, NO blur (design-system-2)
  tokens:
    shadow-2xs: "1px 1px 0 0 rgba(42,38,32,0.55)"
    shadow-xs:  "2px 2px 0 0 #2A2620"
    shadow-sm:  "3px 3px 0 0 #2A2620, 4px 4px 0 0 rgba(42,38,32,0.55)"
    shadow-md:  "4px 4px 0 0 #2A2620, 6px 6px 0 0 rgba(42,38,32,0.55)"
    shadow-lg:  "5px 5px 0 0 #2A2620, 8px 8px 0 0 rgba(42,38,32,0.55)"
---

# NR-1 Copsoq Design System — "Manual Técnico Ilustrado"

> A **sober** fusion of two hand-drawn design systems:
> - **design-system-2** — warm cream paper, soft teal, graphite pencil, dashed outlines, offset pencil shadows, hand-drawn warmth.
> - **Doodle** — semantic-token discipline, must/should rule language, 4/8 spacing scale, component QA checklists, authoring workflow.
>
> The result is **not playful**. It is a warm, tactile, trustworthy instrument for a regulated
> psychosocial-risk compliance tool — a *printed technical manual with hand-drawn marginalia*.
> The hand-drawn character is a **restrained accent layer**, never the dominant register. The
> clinical sobriety required for NR-1 / COPSOQ data, reports, and audit trails always wins.

---

## 1. Design Philosophy

Three principles, merged from both sources and tuned for sobriety:

1. **Warmth without whimsy.** The canvas is warm cream paper, the ink is warm graphite, the brand
   is deep teal. This is the *friendliness of a well-loved technical manual*, not a sketchbook.
   Surfaces feel tactile (pencil shadows, paper grain) but never cartoonish. *From design-system-2,
   sobered.*

2. **Discipline enables character.** The hand-drawn texture only works at scale because the
   underlying system is rigid: a fixed 4/8 spacing scale, a fixed radius scale, semantic tokens
   with no raw hex in component code, and must/should rule language. *From Doodle.*

3. **Sobriety scales by context.** The same system serves a data-dense heat-map dashboard *and* an
   anonymous worker questionnaire. The hand-drawn register intensifies in human-facing moments
   (worker portal, empty states, illustrations, onboarding) and recedes in analytical moments
   (dashboards, tables, the PGR report). Accessibility (WCAG 2.2 AA, keyboard-first, visible focus)
   is non-negotiable in **both** registers. *Merged.*

> **Sobriety test (apply before merging any element):** *Would this appear in a printed NR-1
> compliance document submitted to a labor inspector?* If yes → clinical register. If it's a
> moment of human warmth (consent screen, empty state, celebration) → hand-drawn accent is allowed.

---

## 2. The Two Registers

The system explicitly separates **where** each character appears. This is the core of the sober merge.

| Register | Where it appears | Surface | Border | Shadow | Display font |
|---|---|---|---|---|---|
| **Clinical** (default) | Dashboards, heat-maps, tables, results, inventory, action plan, **PGR report**, audit log, settings | `surface-card` cream, solid | solid 1px `border` | `shadow-xs`/`shadow-sm` pencil, subtle | Source Serif 4 |
| **Hand-drawn accent** (restrained) | Worker portal welcome/thanks, empty states, onboarding, illustrations, dashed dividers, spot doodles | `surface` paper | **2px dashed** `ink` (decorative only) | `shadow-md`/`shadow-lg` pencil, visible | Delicious Handrawn (display only) |

**Rules:**
- The **PGR report** is *always* clinical. No dashed borders, no handwritten fonts, no doodles. It
  is a legal artifact. (The print-area already enforces this — keep it that way.)
- **Dashboards and tables** are clinical. Data must read precisely. Pencil shadows are allowed but
  kept to `shadow-xs`/`shadow-sm` so they don't compete with numbers.
- The **worker portal** leans into the hand-drawn register — this is where Doodle's playful DNA
  lives, because the worker is a human being answering a 15-minute questionnaire, not an auditor.
- **Empty states** may use one hand-drawn spot illustration + a handwritten headline. This is the
  "marginalia" that gives the system its warmth without compromising the working surface.

---

## 3. Color Tokens

### 3.1 Canvas & ink (warm paper + graphite) — from design-system-2, sobered

| Token | Value | Use |
|---|---|---|
| `--surface` | `#F4F0E9` | Page background (warm paper) |
| `--surface-card` | `#FFFAF5` | Cards, popovers, modals sitting on paper |
| `--surface-sunken` | `#ECE3D0` | Inset regions, table head bands, code blocks |
| `--ink` | `#2A2620` | Primary text, pencil-shadow ink |
| `--ink-strong` | `#1F1B12` | Headings |
| `--ink-soft` | `#6B6358` | Muted labels, captions, secondary text |

**Prohibited:** no pure white (`#FFFFFF`) or pure black (`#000000`) on surfaces or text — always
the warm cream / warm graphite tokens. No cool grays anywhere; the entire palette stays on the
warm cream→teal→graphite axis. *(From design-system-2, retained.)*

### 3.2 Brand & accent

| Token | Value | Use |
|---|---|---|
| `--brand` | `#2F4A43` | Primary actions, active nav, primary buttons |
| `--brand-light` | `#3F6A5E` | Hover states |
| `--brand-soft` | `#E8F0ED` | Active row wash, selected chip, brand-tinted surface |
| `--accent` | `#B8623E` | Secondary CTAs, highlights, terracotta accent |

> **Sobering note:** design-system-2's brand was the brighter teal `#1DAD97`; Doodle's primary was
> sky-blue `#49B6E5`. Both were too bright/playful for a compliance instrument. The merged system
> uses the app's existing deeper teal `#2F4A43` as brand and relegates terracotta `#B8623E` (a
> sobered cousin of Doodle's orange) to the accent role. The bright teals/blues survive only as
> `--brand-soft` tints and chart palettes, never as primary fills.

### 3.3 Risk ramp (domain-specific, preserved from v1)

| Token | Value | Classificação | Semáforo |
|---|---|---|---|
| `--risk-low` | `#5B8A6A` | Favorável (0–33) | Verde (muted sage) |
| `--risk-medium` | `#C9952F` | Intermediário (34–66) | Amarelo (muted ochre) |
| `--risk-high` | `#C25647` | Desfavorável (67–100) | Vermelho (muted clay) |

This muted sage→ochre→clay ramp is **the** signature data color of the app. It is already
interpolated in the heat-map (`hsl(120°→45°→10°, 45%, 48%)`) and must stay muted — never
saturated. Risk color is always paired with a text label (`● ALTO / MÉDIO / BAIXO`); color alone
never carries meaning. *(Spec §4.3, retained.)*

### 3.4 Status

| Token | Value |
|---|---|
| `--success` | `#5B8A6A` |
| `--warning` | `#C9952F` |
| `--danger` | `#C25647` |

### 3.5 Semantic usage rules *(from Doodle's token-discipline + design-system-2's semantic rules)*

- **Page/section backgrounds:** `--surface` (warm paper). Alternating sections may use
  `--surface-card` for a slightly lifted paper layer.
- **Cards, popovers, modals:** `--surface-card` so they read as a separate paper sheet on the page.
- **Inset regions (table heads, code blocks, sunken inputs):** `--surface-sunken`.
- **Primary buttons:** `--brand` background, `--surface-card` text.
- **Headings:** `--ink-strong`. **Body:** `--ink`. **Muted/captions:** `--ink-soft`.
- **CTA links:** `--brand` text with underline on hover.
- **Default borders:** 1px solid `--border` (`#E4DDD2`). **2px dashed `--ink`** only on decorative
  containers in the hand-drawn register.
- **Disabled:** `--surface-sunken` background + `--ink-soft` text, `not-allowed` cursor.
- **No raw hex/rgb in component code.** Always reference a token. *(Doodle rule, retained.)*

---

## 4. Typography

A **three-voice** system — sober serif for authority, calm sans for body, handwritten for human
moments, mono for data.

| Voice | Font | Role | Register |
|---|---|---|---|
| **Display** | Source Serif 4 | `h1`–`h3`, page titles, company/dimension names in headers | Clinical (default) |
| **Hand** | Delicious Handrawn | Empty-state headlines, worker-portal welcome, spot illustrations | Hand-drawn accent only |
| **Body / UI** | Geist Sans | Paragraphs, labels, buttons, nav, all working interface | Both |
| **Mono** | Geist Mono | Scores, CNPJs, dates, IDs, token previews, code | Both |

### Type scale (merged)

| Token | Size | Use |
|---|---|---|
| `text-micro` | 11px | Micro labels, eyebrow caps |
| `text-caption` | 13px | Captions, table secondary |
| `text-sm` | 14px | Body small, table cells, labels |
| `text-base` | 16px | Body, inputs |
| `text-lg` | 18px | Lead paragraph, modal body emphasis |
| `text-h4` | 20px | Card titles, section subheads |
| `text-h3` | 24px | Page section heads |
| `text-h2` | 32px | Page title (display) |

### Rules *(merged from both)*
- **Headings use Source Serif 4**, never the handwritten font, in any clinical surface. The
  handwritten font is reserved for the hand-drawn register (see §2).
- **Body never uses serif or handwritten.** Geist Sans only.
- **All numeric data uses Geist Mono with `tabular-nums`** — scores, CNPJs, dates, percentages,
  token previews. This is Doodle's `JetBrains Mono` discipline applied with the app's existing
  Geist Mono. *(Improves table alignment — directly relevant to the heat-map.)*
- Line-height: 1.7 for body paragraphs (hand-drawn headings need breathing room — design-system-2),
  1.2 for display headings.
- Links: `--brand` text, underline on hover. Never brand color for long-form paragraphs.
- **Dark mode** is automatic via CSS custom properties; never manually swap colors. *(design-system-2)*

---

## 5. Spacing & Layout

### Spacing scale *(Doodle's scale, extended with design-system-2's section rhythm)*

Base unit **4px**. Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`.

| Context | Value |
|---|---|
| Inline icon↔text gap | 4px / 8px |
| Form field vertical gap | 16px |
| Flex/grid row gap | 16px |
| Card internal padding | 24px |
| Card grid gap | 32px |
| Section header → content | 48px |
| Section vertical padding | 64px (app) / 96px (landing) |
| Column layout gap | 48px |

### Container
- App shell: fluid, 24px horizontal padding, max content width 1280px.
- Landing/portal: max-width 1200px centered, 24px horizontal padding.

### Motion *(from design-system-2, sobered)*
- Prefer CSS-native `transition` / `@keyframes`. Use Motion library only when CSS can't.
- **One signature idiom across the system:** "press into the paper" — on hover, translate
  `-1px/-1px` and shrink the pencil-shadow offset by 1px; on press, collapse shadow to `shadow-2xs`
  and translate `+2px/+2px`. This is the *only* hover micro-motion most components need.
- Prioritize a few well-sequenced moments (page-load stagger) over scattered micro-interactions.
- **No glossy gradients, neon glows, glassmorphism, or blur.** They fight the pencil language.

---

## 6. Radius *(design-system-2, retained — a signature)*

| Token | Value | Default usage |
|---|---|---|
| `--radius-sm` | 8px | Small chips, tiny decorative blocks |
| `--radius-default` | 16px | Tooltips, accordion items, dropdown items, medium controls |
| `--radius-base` | 24px | Cards, modals, popovers, sections, table wrappers, alerts |
| `--radius-full` | 999px | **Buttons, inputs, selects, badges, pills, avatars, toggles, pagination** |

**Rules:**
- 24px is the default for any "big" surface (cards, modals, table wrappers).
- **999px (full pill) is the default for every interactive control.** This is the design-system-2
  signature carried into the merge — pill buttons, pill inputs, pill badges.
- Avatars and toggle thumbs are always fully rounded.
- Never mix pill controls with sharp-corner controls in the same group.
- The existing Tailwind `--radius: 0.5rem` (8px) base is retained for shadcn primitives; the merged
  scale layers `--radius-base: 24px` and `--radius-full: 999px` on top for surfaces and controls.

---

## 7. Shadows — "pencil-drawn" *(design-system-2 signature, retained)*

All shadows are **offset solid blocks** in warm graphite ink, **no blur** (or only a hint). They
look like a hand drew the element's outline and the shadow is the second pencil pass. **No soft
blurred drop-shadows anywhere** — they break the aesthetic.

| Token | CSS value | Use |
|---|---|---|
| `shadow-2xs` | `1px 1px 0 0 rgba(42,38,32,0.55)` | Subtle separators, tiny details |
| `shadow-xs` | `2px 2px 0 0 #2A2620` | Inputs, badges, small controls, **table rows** |
| `shadow-sm` | `3px 3px 0 0 #2A2620, 4px 4px 0 0 rgba(42,38,32,0.55)` | Buttons, lightweight cards, popovers |
| `shadow-md` | `4px 4px 0 0 #2A2620, 6px 6px 0 0 rgba(42,38,32,0.55)` | Standard cards, dropdowns |
| `shadow-lg` | `5px 5px 0 0 #2A2620, 8px 8px 0 0 rgba(42,38,32,0.55)` | Prominent cards, sticky surfaces, **hand-drawn accent cards** |
| `shadow-xl` | `6px 6px 0 0 #2A2620, 10px 10px 0 0 rgba(42,38,32,0.55)` | Modals, high-priority overlays |

**Rules:**
- Use only these tokens — no custom `box-shadow` values.
- All shadows offset bottom-right (positive X/Y), never centered or above.
- Shadow color is always the warm `--ink` graphite, never pure black.
- **Hover/focus on interactive elevated elements:** shrink offset ~1px + translate element
  `-1px/-1px` ("press into the page"). Do **not** jump up a full level.
- **Active/pressed:** collapse to `shadow-2xs` or 0, translate `+2px/+2px` to meet the shadow.
- Never stack multiple shadow tokens on one element.
- Never use `shadow-xl`/`shadow-2xl` for dense list items or body containers.
- **Sobering:** in dense clinical surfaces (heat-map, tables), default to `shadow-xs`/`shadow-sm`
  so shadows don't muddy data. Reserve `shadow-lg`+ for the hand-drawn accent register.

---

## 8. Borders *(merged)*

| Context | Width | Style | Color |
|---|---|---|---|
| Default surface separator | 1px | solid | `--border` `#E4DDD2` |
| Input/button outline | 1px | solid | `--border` / `--ink` on focus |
| Decorative container (hand-drawn register) | **2px** | **dashed** | `--ink` `#2A2620` |
| Divider accent | 1px | dashed | `--border` |
| Risk/status border | 1px | solid | matching `--risk-*` / `--status` token |

- **2px dashed borders are a hand-drawn-register accent**, not a default. Use on: the worker portal
  welcome card, empty-state frames, illustrative callouts. **Never** on data tables, form inputs in
  the clinical register, or the PGR report.
- The "dashed card outline" from design-system-2 survives as an *optional* variant for
  hand-drawn-accent cards, not the default card treatment.

---

## 9. Component foundations *(discipline from Doodle, spec from design-system-2)*

Every component family **must** define: anatomy, variants, states (default, hover, focus-visible,
active, disabled, loading, error as relevant), interaction behavior (keyboard/pointer/touch),
explicit token usage, responsive behavior, and edge cases (long labels, empty, overflow). *(Doodle
"Component Rule Expectations".)*

### Signature components for this app

| Component | Register | Key specs |
|---|---|---|
| **Button** | Clinical | 999px pill, `--brand` fill (primary) / `--surface-card` outline (secondary) / transparent (ghost, no shadow), `shadow-sm`, "press into paper" hover. Sizes: sm/md/lg. Never ghost+shadow. |
| **Card** | Clinical default | `--surface-card`, 24px radius, `shadow-md`, 1px solid `--border`. Hand-drawn variant: 2px dashed `--ink`, `shadow-lg` — for empty states / accent moments only. |
| **Input / Select** | Clinical | 999px pill, `--surface-card` bg, 1px `--border`, focus → 2px `--brand` ring + `shadow-xs`. Error → `--danger` border + `--danger` text. |
| **Badge / RiskBadge** | Clinical | 999px pill, solid fill by level (`risk-*` / `brand` / `muted`), **always with text label** (`● ALTO`). Variants sm/md/lg. *(Spec §4.3)* |
| **ScoreCell (heat-map)** | Clinical | `<td>` with interpolated sage→ochre→clay bg by `riskScore`, white text >50, `shadow-xs`, hover tooltip = bruto/risco/N. α<0.5 → ⚠ icon. *(Spec §4.3 + existing implementation)* |
| **Table** | Clinical | `--surface-card` wrapper, `--surface-sunken` head band, 1px `--border` row dividers, `text-sm` cells, mono for numerics. No dashed borders, no shadows on rows. |
| **Modal** | Clinical | `--surface-card`, 24px radius, `shadow-xl`, dark `--ink` 50% veil (never pure black). |
| **Empty state** | **Hand-drawn accent** | One spot doodle + handwritten headline (Delicious Handrawn) + Geist Sans body + one CTA button. Dashed frame optional. |
| **Worker portal** | **Hand-drawn accent** | Full hand-drawn register: dashed welcome card, handwritten welcome headline, pencil-shadow question cards, discreet anonymity footer. *(This is where Doodle's playful DNA lives.)* |
| **PGR report (`print-area`)** | **Clinical, absolute** | Solid borders, Source Serif 4 + Geist Sans only, no shadows on data, no doodles. `@media print` compliant. Legal artifact. |

### Component authoring workflow *(from Doodle, mandatory for any new component)*
1. Restate the design intent in one sentence before proposing rules.
2. Define token usage (color, spacing, radius, shadow, type) before anatomy.
3. Specify anatomy, variants, states, interaction behavior.
4. Include accessibility acceptance criteria (testable).
5. Add anti-patterns / prohibited implementations.
6. End with a QA checklist executable in code review.

---

## 10. Accessibility *(from both — non-negotiable)*

- **WCAG 2.2 AA** baseline. A warm/playful aesthetic never compromises usability.
- **Keyboard-first** interactions; visible focus states on every interactive element (2px `--brand`
  ring, never obscured by decorative borders).
- **Color never carries meaning alone** — every risk level, status, and category has a text label.
- Sufficient contrast on the warm cream/teal/graphite axis (verified per token).
- Semantic HTML: proper `h1`→`h6` hierarchy, `<button>` for actions, `<a>` for navigation, ARIA
  where needed.
- When the hand-drawn aesthetic conflicts with accessibility (e.g. a decorative dashed border would
  obscure a focus ring), **accessibility wins.** *(Doodle rule, retained.)*

---

## 11. Prohibited *(merged from both)*

- No raw hex/rgb in component code — always tokens.
- No pure white `#FFFFFF` or pure black `#000000` on surfaces/text.
- No cool grays — palette stays warm cream/teal/graphite.
- No blurred soft shadows (`0 4px 6px rgba(0,0,0,.1)` etc.) — they break the pencil aesthetic.
- No glossy gradients, neon glows, glassmorphism, or blur filters.
- No handwritten font in dashboards, tables, reports, or form labels.
- No 2px dashed borders in the clinical register or the PGR report.
- No brand/accent backgrounds for large layout surfaces (pages, sections) except hero/campaign.
- No accent text tokens for body copy or navigation.
- No skipping states: every interactive element needs hover, focus, disabled.

---

## 12. Application & Migration Plan

> The app has **already migrated** to the warm sober base (v1 "clinical-institutional": `--surface
> #F4F0E9`, `--brand #2F4A43`, `--ink #2A2620`, Source Serif 4 + Geist Sans, muted risk ramp).
> This merged system **enriches** that base; it does not replace it. Adoption is incremental.

### 12.1 Token migration (low-risk, `globals.css` only)

Add the merged tokens to `:root` in `src/app/globals.css` without removing existing ones:

```css
:root {
  /* ... existing tokens preserved ... */

  /* Merged system additions (DESIGN.md v2) */
  --surface-sunken: #ECE3D0;     /* table heads, insets */
  --ink: #2A2620;                 /* alias of --text-primary, for pencil shadows */
  --ink-strong: #1F1B12;
  --brand-soft: #E8F0ED;          /* active row wash */

  /* Pencil-drawn shadow scale (replaces soft shadows on accent surfaces) */
  --shadow-2xs: 1px 1px 0 0 rgba(42,38,32,0.55);
  --shadow-xs:  2px 2px 0 0 #2A2620;
  --shadow-sm:  3px 3px 0 0 #2A2620, 4px 4px 0 0 rgba(42,38,32,0.55);
  --shadow-md:  4px 4px 0 0 #2A2620, 6px 6px 0 0 rgba(42,38,32,0.55);
  --shadow-lg:  5px 5px 0 0 #2A2620, 8px 8px 0 0 rgba(42,38,32,0.55);

  /* Radius scale (layers on existing --radius) */
  --radius-base: 24px;
  --radius-default: 16px;
  --radius-full: 999px;
}
```

Load the handwritten font once (next/font) for the hand-drawn register only:
```ts
// src/app/layout.tsx — add alongside existing fonts
import { Delicious_Handrawn } from "next/font/google";
const hand = Delicious_Handrawn({ weight: "400", subsets: ["latin"], variable: "--font-hand" });
// add `hand.variable` to <html> className
```

### 12.2 Adoption order (foundations → signature components → views)

1. **Foundations** (1 session): add tokens + handwritten font var. No visual change yet.
2. **Signature components** (2–3 sessions):
   - Convert primary buttons to 999px pill + `shadow-sm` + "press into paper" hover.
   - Convert cards to 24px radius + `shadow-md` (pencil) — *clinical register*.
   - Add `shadow-xs` pencil shadow to table rows / ScoreCells (replaces any soft shadow).
3. **Hand-drawn accent register** (1 session):
   - Empty states: handwritten headline + spot doodle + dashed frame.
   - Worker portal welcome/thanks: dashed card, handwritten headline, pencil-shadow question cards.
4. **Register discipline pass** (1 session): audit that dashboards/tables/report stay clinical —
   remove any stray dashed borders or handwritten fonts from clinical surfaces.

### 12.3 What NOT to change

- **The PGR report `print-area`** stays fully clinical — no pencil shadows on data, no dashed
  borders, no handwritten fonts. It is a legal artifact. *(Aligns with PRODUCT_ALIGNMENT_REVIEW
  Module 11.)*
- **The risk ramp** (`#5B8A6A / #C9952F / #C25647`) and the heat-map interpolation stay muted —
  do not saturate toward design-system-2's brighter teals or Doodle's sky-blue.
- **The existing risk-threshold text in the report preview must read 0–33 / 34–66 / 67–100**
  (not 0–39 / 40–69 / 70–100) — a correctness fix flagged in PRODUCT_ALIGNMENT_REVIEW, unrelated to
  aesthetics but enforce it during the register discipline pass.

### 12.4 Verification

After each step, run the verification gate from `AGENTS.md`:
- `npx tsc --noEmit` — 0 errors.
- `bun run lint` — no new warnings.
- Visual check with the Playwright MCP (per `AGENTS.md` workflow) at `http://localhost:3000`:
  confirm the two registers are visually distinct and the PGR report preview remains clinical.

---

## 13. Source attribution

| Element | Source | Sobering adjustment |
|---|---|---|
| Warm cream canvas, graphite ink, pencil shadows, 2px dashed accents, 999px pills, 24px card radius, "press into paper" hover, dark-mode-auto | design-system-2 | Dashed borders demoted from default to hand-drawn accent only; brighter teal #1DAD97 → deeper #2F4A43 |
| Semantic-token discipline, must/should language, 4/8 spacing scale, type scale, component authoring workflow, QA checklists, "accessibility wins" rule | Doodle | Sky-blue #49B6E5 and Delius Swash Caps demoted — blue replaced by deep teal; handwritten font restricted to accent register |
| Risk ramp, RiskBadge/ScoreCell/AdesaoRing specs, report clinical absolutism, non-clinical language | Spec §4 + v1 DESIGN.md | Preserved unchanged |
| Source Serif 4 display, Geist Sans body, Geist Mono data | v1 DESIGN.md | Preserved; Geist Mono adopts Doodle's JetBrains Mono discipline (tabular-nums on all data) |

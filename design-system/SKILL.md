---
name: nr1-copsoq-design-system
description: Design system skill for the NR-1 Copsoq platform. Load BEFORE any UI work (component, page, view, or styling) to follow the merged "Manual Técnico Ilustrado" system — a sober fusion of warm hand-drawn texture and token-disciplined governance. Defines the two registers (clinical vs hand-drawn accent), token usage, component authoring workflow, and QA gates.
---

# NR-1 Copsoq Design System — Agent Instructions

> **Load this skill before writing or modifying any UI code** in the NR-1 Copsoq project.
> The full token reference is `DESIGN.md` (project root). This file is the *operating manual*:
> how to work within the system, in what order, and what to check.

---

## 0. The one-sentence intent

> A warm, tactile, **sober** compliance instrument — a *printed technical manual with hand-drawn
> marginalia* — where clinical precision serves NR-1 data/reports and hand-drawn warmth serves
> human moments (the worker portal, empty states, illustrations).

If a decision is ambiguous, apply the **sobriety test**: *would this appear in a printed NR-1
compliance document submitted to a labor inspector?* Yes → clinical. Human-warmth moment →
hand-drawn accent allowed.

---

## 1. Before writing any code

1. **Read `DESIGN.md` sections that apply** to the task. Minimum for any UI work: §2 (registers),
   §3 (color), §4 (type), §5 (spacing), §6 (radius), §7 (shadows), §9 (components).
2. **Identify the register.** Is the surface you're touching *clinical* (dashboard, table, results,
   inventory, action plan, **report**, audit log, settings) or *hand-drawn accent* (worker portal,
   empty state, onboarding, illustration)? This single decision governs borders, shadows, and fonts.
3. **Never use raw hex/rgb.** Reference tokens (`--brand`, `--ink`, `--risk-high`, etc.). If a token
   doesn't exist for what you need, add it to `globals.css` `:root` first, then use it.
4. **Every interactive element needs hover, focus, disabled states** — defined, not implied.
5. **Use semantic HTML** (`h1`→`h6` order, `<button>` for actions, `<a>` for nav, ARIA where needed).

*(Merged from design-system-2 "Before Writing Any Code" + Doodle "Expected Behavior".)*

---

## 2. The two registers (most important rule)

| | Clinical (default) | Hand-drawn accent (restrained) |
|---|---|---|
| **Where** | Dashboards, heat-maps, tables, results, inventory, action plan, **PGR report**, audit log, settings | Worker portal, empty states, onboarding, illustrations, spot doodles |
| **Surface** | `--surface-card` cream, solid | `--surface` paper |
| **Border** | 1px solid `--border` | **2px dashed `--ink`** (decorative) |
| **Shadow** | `shadow-xs` / `shadow-sm` pencil (subtle) | `shadow-md` / `shadow-lg` pencil (visible) |
| **Display font** | Source Serif 4 | Delicious Handrawn (display only) |
| **Body font** | Geist Sans | Geist Sans |
| **Data font** | Geist Mono, `tabular-nums` | Geist Mono, `tabular-nums` |

**Absolute rules:**
- The **PGR report** (`print-area`) is *always clinical*. No dashed borders, no handwritten fonts,
  no doodles, no shadows on data. Legal artifact.
- **Dashboards and tables** are clinical. Pencil shadows stay at `shadow-xs`/`shadow-sm` so they
  don't compete with numbers.
- The **worker portal** is the one place Doodle's playful DNA lives fully.
- **Empty states** may use one hand-drawn spot illustration + a handwritten headline.

---

## 3. Token quick-reference

```
CANVAS     --surface #F4F0E9 (paper) · --surface-card #FFFAF5 (card) · --surface-sunken #ECE3D0 (inset)
INK        --ink #2A2620 · --ink-strong #1F1B12 (heads) · --ink-soft #6B6358 (muted)
BRAND      --brand #2F4A43 · --brand-light #3F6A5E (hover) · --brand-soft #E8F0ED (active wash)
ACCENT     --accent #B8623E (terracotta, secondary CTA)
RISK       --risk-low #5B8A6A · --risk-medium #C9952F · --risk-high #C25647  (muted, always + text label)
STATUS     --success #5B8A6A · --warning #C9952F · --danger #C25647
RADIUS     sm 8 · default 16 · base 24 (cards/modals) · full 999 (buttons/inputs/badges/pills)
SHADOW     pencil-drawn, NO blur: 2xs/xs/sm/md/lg (see DESIGN.md §7)
SPACING    4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
TYPE       display=Source Serif 4 · hand=Delicious Handrawn (accent only) · body=Geist Sans · mono=Geist Mono (tabular-nums)
```

**Prohibited:** pure white/black, cool grays, blurred shadows, glossy gradients, glassmorphism,
raw hex in components, handwritten font in clinical surfaces, dashed borders in clinical surfaces.

---

## 4. Component authoring workflow *(mandatory for any new/changed component)*

From Doodle — follow in order:

1. **Restate the design intent** in one sentence before proposing rules.
2. **Define token usage** (color, spacing, radius, shadow, type) before anatomy.
3. **Specify** anatomy, variants, states, interaction behavior (keyboard/pointer/touch).
4. **Accessibility** acceptance criteria — testable, not adjectives.
5. **Anti-patterns** — what this component must never do.
6. **QA checklist** — executable in code review.

**Required states** (as relevant): default, hover, focus-visible, active, disabled, loading, error.
**Required behavior:** keyboard, pointer, touch. **Required explicit:** spacing, type, color-token.
**Required edge cases:** long labels, empty, overflow, responsive.

---

## 5. Rule language *(from Doodle)*

- Use **"must"** for non-negotiable rules, **"should"** for recommendations.
- Pair every do-rule with at least one concrete don't-example.
- No rule depends on ambiguous adjectives alone — anchor each to a token, threshold, or example.
- Every accessibility statement must be testable in implementation.
- When aesthetics conflict with accessibility, **accessibility wins**.

---

## 6. Signature idiom: "press into the paper"

The **only** hover micro-motion most components need (from design-system-2, sobered):

- **Hover:** translate `-1px / -1px`, shrink pencil-shadow offset by ~1px. Do NOT jump up a level.
- **Active/press:** collapse shadow to `shadow-2xs` or 0, translate `+2px / +2px` to meet the shadow.
- Apply to: buttons, clickable cards, pill controls.

Do not invent additional hover animations. Prioritize one well-sequenced page-load stagger over
scattered micro-interactions.

---

## 7. Domain-specific components (already in the app — preserve these specs)

| Component | Spec source | Notes |
|---|---|---|
| `RiskBadge` | Spec §4.3 | 999px pill, solid fill by level, **always with text label** (`● ALTO`). Variants sm/md/lg. |
| `ScoreCell` (heat-map) | Spec §4.3 + existing | Interpolated sage→ochre→clay bg by `riskScore`, white text >50, `shadow-xs`, hover tooltip = bruto/risco/N. α<0.5 → ⚠. |
| `DimensionRadar` | Spec §4.3 | 11-axis radar, 0–100, brand fill opacity 0.3, vertex dots colored by risk. |
| `AdesaoRing` | Spec §4.3 | SVG ring, gray<30% → ochre 30–69% → sage ≥70%. |
| `WorkerQuestionItem` | Spec §4.3 | Full-screen, 56px-min touch targets, no back button, discreet anonymity footer. Hand-drawn register. |
| `print-area` (PGR report) | Spec §4.4 + AGENTS.md | **Clinical absolute.** No doodles, no handwritten, no shadows on data. `@media print` compliant. |

**Correctness flag (non-aesthetic):** the report preview's risk-threshold text must read
**0–33 / 34–66 / 67–100** (per `scoring.ts`), not 0–39/40–69/70–100. Fix during any report work.

---

## 8. QA checklist (run before declaring UI work done)

- [ ] Register identified and respected (clinical vs hand-drawn accent)?
- [ ] No raw hex/rgb in component code — all tokens?
- [ ] No pure white/black, no cool grays, no blurred shadows, no glassmorphism?
- [ ] Every interactive element has hover + focus-visible + disabled?
- [ ] Focus states visible and not obscured by decorative borders?
- [ ] Color never carries meaning alone — text label present on every risk/status?
- [ ] Numeric data uses Geist Mono + `tabular-nums`?
- [ ] Handwritten font only in hand-drawn accent surfaces (never dashboards/tables/report)?
- [ ] Dashed borders only in hand-drawn accent surfaces (never clinical/report)?
- [ ] PGR report `print-area` is fully clinical?
- [ ] Hover uses "press into the paper" idiom, not a level jump?
- [ ] `npx tsc --noEmit` = 0 errors; `bun run lint` = no new warnings?
- [ ] Visual check via Playwright MCP at `http://localhost:3000` confirms the two registers are distinct?

---

## 9. Source lineage

This skill merges:
- **design-system-2/SKILL.md** — module-reading workflow, critical rules (tokens are agnostic,
  cross-reference modules, dark-mode-auto), warm-paper/pencil-shadow/dashed-border/999px-pill
  aesthetic, "press into paper" motion.
- **doodle (typeui.sh)** — authoring workflow, must/should language, 4/8 spacing, type scale,
  component rule expectations, quality gates, QA checklist pattern, "accessibility wins" rule.

Sobering adjustments are documented in `DESIGN.md` §13. The app's v1 "clinical-institutional"
warm base is preserved and enriched, not replaced.

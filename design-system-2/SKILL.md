# Design System — Agent Instructions

This skill describes the visual design language for all UI output. Every component, layout, and page should follow the design specs in the module files below. These describe *what the design looks like* — you choose how to implement the styles.

## Style
A friendly, hand-drawn sketch interface inspired by pencil illustrations on warm cream paper. Soft teal brand accents, hand-written display headings, rounded pill controls, dashed card outlines, and chunky offset "pencil-drawn" shadows give every surface a tactile, illustrated feel. Decorative elements should lean on simple pencil-drawn line art and doodles rather than photographic or glossy treatments.


## Before Writing Any Code

1. **Read every module that applies.** For a landing page, read at minimum: `layout.md`, `typography.md`, `colors.md`, `buttons.md`, `cards.md`, `shadows.md`, `radius.md`, `borders.md`. Do NOT write JSX until you have loaded all relevant modules.

## Critical Rules

- **Tokens are AGNOSTIC, framework-independent names:** The tokens defined in the `.md` files (like `neutral-primary-soft`, `heading`, `border-default`) are agnostic design system tokens, NOT literal class names from any CSS framework. Do not blindly use them as utility classes — you must explicitly map them in your styling layer (CSS variables, theme config, design tokens, etc.) before referencing them. You must implement the mapping yourself.

- **Cross-reference modules.** A card containing buttons must satisfy both `cards.md` AND `buttons.md`.
- **Dark mode is automatic.** The CSS custom properties resolve differently in light/dark via `@media (prefers-color-scheme: dark)`. Never manually swap colors.
- **Every interactive element needs hover, focus, and disabled states** — defined in the relevant module.
- **Use semantic HTML:** proper heading hierarchy (`h1`→`h6`), `<button>` for actions, `<a>` for navigation, ARIA attributes where needed.

## Module Index

### Foundation (read first for any UI work)
- [colors.md](colors.md) — all background, text, and border color tokens
- [typography.md](typography.md) — heading scale, paragraphs, labels, links
- [layout.md](layout.md) — spacing rhythm, containers, animation, visual depth
- [radius.md](radius.md) — border-radius scale
- [shadows.md](shadows.md) — elevation tokens
- [borders.md](borders.md) — border widths and styles

### Components
- [buttons.md](buttons.md) — button variants, sizes, states, glint effect
- [button-group.md](button-group.md) — grouped button structure
- [cards.md](cards.md) — card structure, background, interactivity
- [inputs.md](inputs.md) — form controls, labels, states
- [alerts.md](alerts.md) — alert variants
- [badges.md](badges.md) — badge variants, sizes, dismissible chips
- [lists.md](lists.md) — list components
- [avatars.md](avatars.md) — avatar variants, sizes, indicators
- [icon-shapes.md](icon-shapes.md) — icon containers

### Complex Components
- [accordion.md](accordion.md) — accordion variants
- [dropdown.md](dropdown.md) — dropdown menus
- [modals.md](modals.md) — modal dialogs
- [tabs.md](tabs.md) — tab navigation
- [tables.md](tables.md) — table structure
- [pagination.md](pagination.md) — pagination components
- [sidebars.md](sidebars.md) — sidebar navigation
- [radios-checkboxes-toggle.md](radios-checkboxes-toggle.md) — selection controls
- [tooltips-popovers.md](tooltips-popovers.md) — tooltips and popovers
- [content.md](content.md) — grid system, responsiveness

---

## Source file: `accordion.md`

# Accordion

> Dependencies: `colors.md`, `radius.md`, `borders.md`, `shadows.md`

## Core Specs

- **Wrapper:** full width, 2px **dashed** border (border-default color), 24px radius — clips first/last item corners
- **Background:** neutral-primary-medium (warm cream paper)
- **Item separator:** 2px dashed bottom border (border-default) on every item except last

## Trigger (Button)

- **Layout:** flex, space-between, full width
- **Padding:** 24px horizontal, 18px vertical
- **Font:** "Elms Sans", 16px, medium weight
- **Text color:** heading
- **Background:** transparent (the wrapper provides the warm cream surface)
- **Hover:** neutral-tertiary background
- **Focus:** outline none, 4px brand-soft ring inset
- **Transition:** colors, 150ms
- **Open state:** neutral-tertiary background

## Panel (Content)

- **Padding:** 24px horizontal, 18px vertical
- **Background:** neutral-primary-soft
- **Top border:** 2px dashed, border-default color
- **Font:** "Elms Sans", 16px, body color, 1.7 line-height

## Chevron Icon

- Size: 18x18px
- Color: body text color
- Style: hand-drawn / sketched stroke when possible
- Closed: 0deg rotation
- Open: 180deg rotation
- Transition: transform, 150ms

## Variants

### Default (Collapse)
One panel open at a time. Items stacked inside a single shared dashed wrapper with 24px radius.

### Separated Cards
Each item is independent — has its own 2px dashed border, 24px radius, and shadow-md (pencil shadow). 12px bottom margin between items. No shared outer border.

### Always Open
Multiple panels can expand simultaneously. Same styling as Default.

### Flush
No outer border. Trigger and panel have transparent backgrounds. Only 2px dashed bottom border dividers between items. Use inside containers that already provide a background.

## States

| State | Trigger appearance |
|---|---|
| Closed | heading text, transparent background |
| Open | heading text, neutral-tertiary background |
| Hover | neutral-tertiary background |
| Focus | 4px brand-soft inset ring, no outline |
| Disabled | fg-disabled text, not-allowed cursor, no hover/focus |

---

## Source file: `alerts.md`

# Alerts

> Dependencies: `colors.md`, `radius.md`, `borders.md`, `shadows.md`

## Core Specs

- **Padding:** 20px
- **Radius:** 24px (base)
- **Border:** 2px **dashed**
- **Shadow:** shadow-sm (pencil offset)
- **Heading:** "Elms Sans", 16px, medium weight
- **Body:** "Elms Sans", 14px, normal weight, 1.65 line-height

## Variants

### Brand
- **Background:** brand-softer
- **Border:** 2px dashed border-brand-subtle
- **Text:** fg-brand-strong

### Success
- **Background:** success-soft
- **Border:** 2px dashed border-success-subtle
- **Text:** fg-success-strong

### Danger
- **Background:** danger-soft
- **Border:** 2px dashed border-danger-subtle
- **Text:** fg-danger-strong

### Warning
- **Background:** warning-soft
- **Border:** 2px dashed border-warning-subtle
- **Text:** fg-warning

---

## Source file: `avatars.md`

# Avatars

> Dependencies: `colors.md`, `radius.md`, `borders.md`

## Core Specs

- **Circular shape:** fully rounded (999px)
- **Rounded square shape:** 24px radius
- **Border:** 2px solid border-dark on every avatar so it reads as a hand-drawn outlined portrait
- **Default size:** 40x40px
- **Image fit:** cover

## Sizes

| Size | Dimensions | Radius |
|---|---|---|
| Extra Small | 20x20px | 999px |
| Small | 28x28px | 999px |
| Base | 36x36px | 999px |
| Large | 48x48px | 24px (square variant) or 999px |
| XL | 60x60px | 24px (square variant) or 999px |
| 2XL | 72x72px | 24px (square variant) or 999px |

## Bordered Avatar

- 4px padding, fully rounded, 2px solid outline in border-dark color
- Alternative: 2px box-shadow ring in border-dark color paired with shadow-xs (pencil offset) for a sketched feel

## Stacked Avatars

- Displayed in a row (flex)
- Each avatar: 40x40px, fully rounded, 2px solid border in border-buffer color (so the cream paper shows through between portraits)
- Overlap: -16px negative margin on all except first

### Stacked Counter
- Same size as avatars (40x40px), fully rounded
- Background: dark, text: white, 12px font, "Elms Sans" medium weight
- 2px solid border in border-buffer color
- Same overlap margin as other avatars

## Avatar with Text

- Flex row, 12px gap between avatar and text
- Avatar: 40x40px, fully rounded, cover fit
- Name: "Elms Sans", heading color, medium weight
- Subtitle: "Elms Sans", 14px, body color

---

## Source file: `badges.md`

# Badges

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Core Specs

- **Border:** 2px solid
- **Default radius:** 999px (full pill — every badge is a pill in this system)
- **Pill radius:** 999px (alias of default)
- **Shadow:** shadow-xs (subtle pencil offset) — optional, omit on dense inline contexts like table cells
- **Font:** "Elms Sans", medium weight

## Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Default (small) | 12px | 10px | 3px |
| Large | 14px | 14px | 5px |

## Variants

### Brand
- **Background:** brand-softer
- **Border:** 2px solid border-brand-subtle
- **Text:** fg-brand-strong

### Alternative (Neutral Soft)
- **Background:** neutral-primary-soft
- **Border:** 2px solid border-default
- **Text:** heading

### Gray (Neutral Medium)
- **Background:** neutral-secondary-medium
- **Border:** 2px solid border-default
- **Text:** heading

### Danger
- **Background:** danger-soft
- **Border:** 2px solid border-danger-subtle
- **Text:** fg-danger-strong

### Success
- **Background:** success-soft
- **Border:** 2px solid border-success-subtle
- **Text:** fg-success-strong

### Warning
- **Background:** warning-soft
- **Border:** 2px solid border-warning-subtle
- **Text:** fg-warning

### Dark
- **Background:** dark
- **Border:** 2px solid border-dark
- **Text:** white

## Pill Badges

The default badge is already a pill (999px radius). There is no non-pill badge variant in this system.

## Badges with Icons

- Icon size (default): 12x12px
- Icon size (large): 14x14px
- Icon spacing: 6px margin next to label

## Icon-only Badge

Square shape — equalize dimensions to 28x28px, no horizontal text padding, keep the 999px radius so it reads as a circular tag.

## Dismissible Badges

Badge content + a close button. Close button hover backgrounds per variant:

| Variant | Close button hover background |
|---|---|
| Brand | brand-soft |
| Alternative | neutral-tertiary |
| Gray | neutral-quaternary |
| Danger | danger-medium |
| Success | success-medium |
| Warning | warning-medium |

## Dot / Notification Badge

- Positioned absolutely: -4px top, -4px right
- Size: 12x12px, fully rounded (999px)
- 2px border in border-buffer color
- Background: danger

---

## Source file: `borders.md`

# Borders

## Width Scale

| Context | Width |
|---|---|
| Default (inputs, buttons, badges, small controls) | 2px |
| Cards, modals, popovers, big surfaces | 2px (dashed) |
| Emphasis / focus | 2px |

## Style

| Context | Style |
|---|---|
| Cards, modals, alerts, popovers, big decorative surfaces | dashed |
| Inputs, buttons, badges, table cells, dividers | solid |

## Rules

- Every visible border is at least 2px so it reads as a confident hand-drawn line
- Cards and other "paper" surfaces use **2px dashed** borders to evoke a sketched outline
- Inputs, buttons, badges and grouped controls use **2px solid** borders so the pill silhouette stays crisp
- Components in the same family must use matching border widths and styles
- Never mix 1px and 2px borders within a single component
- Never mix dashed and solid borders within the same component

## Usage

| Context | Width | Style |
|---|---|---|
| Inputs / selects / textareas | 2px default; 2px on focus or error | solid |
| Buttons | 2px solid for outlined / secondary variants | solid |
| Cards / containers | 2px dashed in border-default color | dashed |
| Modals / popovers | 2px dashed | dashed |
| Alerts | 2px dashed | dashed |
| Tables | 2px solid wrapper, 2px solid row dividers | solid |
| Dropdown menus | 2px dashed wrapper | dashed |

---

## Source file: `button-group.md`

# Button Groups

> Dependencies: `buttons.md`, `colors.md`, `radius.md`, `shadows.md`

## Core Specs

- **Wrapper:** inline-flex with 8px gap between children, no shared background
- **Children spacing:** 8px gap (no -1px overlap — every button stays as its own pill)
- **Each button keeps its own pill silhouette and pencil shadow** from `buttons.md`. The wrapper does not collapse them into a single bar.

## Anatomy

### Wrapper
- Display: inline-flex
- Gap: 8px between children
- Radius: not applicable (no shared bounding shape)
- Shadow: not applicable (each button carries its own pencil shadow)

### Every Button in the Group
- Radius: 999px (full pill) — no special start/end radius treatment
- Border: 2px solid per the variant in `buttons.md`
- Shadow: shadow-sm (pencil offset) per `buttons.md`
- Hover / active behavior follows `buttons.md` translate + shrink-shadow pattern

### Vertical Group
- Same rules, but `flex-direction: column` and 8px vertical gap

## Rules

- Buttons inside groups follow ALL styles from `buttons.md` (background, border, focus rings, pill radius, pencil shadow) without exception
- Never merge buttons into a single connected bar — the hand-drawn aesthetic favors a row of independent pill capsules
- Icon-only buttons: 16x16px icon, match height of text buttons, keep the 999px radius (circular)

---

## Source file: `buttons.md`

# Buttons

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Core Specs (every button except ghost and disabled)

Every button — regardless of stack (HTML/CSS, React, Vue, Svelte, Angular, Tailwind, Sass, plain CSS, etc.) — must compose to the following base style. Use design tokens or framework utilities; the visual result must match the rules below.

### Property Reference

| Property | Value |
|---|---|
| `outline` | `none` |
| `color` | brand color |
| `padding` | `16px` (top/bottom) |
| `padding-left` | `32px` |
| `padding-right` | `32px` |
| `border` | `2px dashed #2B2418` |
| `border-radius` | `999px` (full pill) |
| `background-color` | brand color |
| `box-shadow` | `0 0 0 4px <brand-color>, 2px 2px 4px 2px rgba(0, 0, 0, 0.5)` |
| `transition` | `.1s ease-in-out, .4s color` |

### Rules (apply in any stack)

- **Outline:** never visible — always `outline: none`. Use the `box-shadow` ring for focus/state, never the native outline.
- **Color (text):** use the brand color token (`var(--color-brand)` / `theme.colors.brand` / `$brand` — whatever the stack exposes). Never hard-code a hex for text.
- **Padding:** vertical `16px`, horizontal `32px`. Do not shrink horizontal padding — pill buttons read as confident, hand-drawn capsules only when generously padded.
- **Border:** always **2px dashed** with the warm graphite ink color `#2B2418` (matches `--pencil-ink` from `colors.md`). The dashed stroke is what makes the button look hand-drawn — never use solid borders for this button.
- **Border radius:** always `999px` so the pill silhouette is fully rounded regardless of width/height.
- **Background:** brand color token. Never raw hex.
- **Box-shadow:** dual-layer:
  1. `0 0 0 4px <brand-color>` — a 4px solid ring in the brand color flush against the border (acts as a soft halo / focus ring baked in).
  2. `2px 2px 4px 2px rgba(0, 0, 0, 0.5)` — a graphite drop shadow offset to the bottom-right, consistent with the pencil aesthetic in `shadows.md`.
- **Transition:** `0.1s ease-in-out` for transforms / shadows, `0.4s` for color changes. Keep it snappy on press, smoother on color shifts.
- **Box sizing:** always `border-box` so the dashed border + glow ring don't push the layout.
- **Font:** `"Elms Sans"`, weight `500`.

### Hover / Active

- **Hover:** translate `-1px / -1px` and slightly shrink the drop-shadow offset (`2px 2px 4px 2px` → `1px 1px 4px 2px`) so the button feels pressed into the paper.
- **Active / pressed:** translate `+2px / +2px` and collapse the drop-shadow to `0 0 0 4px <brand-color>` only — the button visually meets its own shadow.
- **Focus-visible:** the `0 0 0 4px <brand-color>` ring is already part of the base shadow; do not add a second ring on focus.

### Stack-agnostic notes

- **Tailwind:** prefer arbitrary values matching the spec — `rounded-full border-2 border-dashed border-[#2B2418] py-4 px-8 outline-none transition-[0.1s_ease-in-out,0.4s_color]` and apply the brand color via `bg-brand text-brand` plus a custom shadow utility.
- **CSS-in-JS / styled-components / Emotion:** export the base style block above as a named style and compose variants on top.
- **Vue / Svelte / Angular:** apply the rules via component-scoped styles or a global `.button` class — the rules are CSS-only and have no framework dependency.
- **Plain HTML/CSS:** drop the base CSS block into a stylesheet and add `class="button"` to any `<button>` or `<a>` tag.

## Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Extra small | 12px | 16px | 6px |
| Small | 14px | 18px | 8px |
| Base (default) | 16px | 32px | 16px |
| Large | 16px | 36px | 18px |
| Extra large | 18px | 40px | 20px |

The base size matches the canonical CSS rule above (`padding: 16px 32px`). Other sizes scale around it but keep the dashed border, full radius, and dual-layer shadow intact.

## Variants

Each variant swaps `color`, `background-color`, and the first ring of the box-shadow to its own token. Border stays `2px dashed #2B2418`, radius stays `999px`, transition stays the same.

### Brand
- **Background:** brand token
- **Text:** white (use white text on brand fill — overrides the default brand-on-brand pattern when the button needs maximum contrast)
- **Hover:** brand-strong background
- **Focus ring:** baked into the 4px brand-medium ring
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Secondary
- **Background:** neutral-primary-medium (warm cream paper)
- **Text:** heading color
- **Border:** 2px dashed #2B2418
- **Hover:** neutral-tertiary-medium background
- **Focus ring:** 4px, brand-soft color
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Tertiary
- **Background:** neutral-primary-soft
- **Border:** 2px dashed #2B2418
- **Text:** body color
- **Hover:** neutral-secondary-medium background, heading text color
- **Focus ring:** 4px, neutral-tertiary-soft color
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Success
- **Background:** success token
- **Text:** white
- **Hover:** success-strong background
- **Focus ring:** 4px, success-medium color
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Danger
- **Background:** danger token
- **Text:** white
- **Hover:** danger-strong background
- **Focus ring:** 4px, danger-medium color
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Warning
- **Background:** warning token
- **Text:** dark
- **Hover:** warning-strong background
- **Focus ring:** 4px, warning-medium color
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Dark
- **Background:** dark token
- **Text:** white
- **Hover:** dark-strong background
- **Focus ring:** 4px, neutral-tertiary color
- **Pencil glint:** yes
- **Pencil shadow:** yes

### Ghost (NO shadow, NO glint)
- **Background:** transparent
- **Border:** transparent
- **Text:** heading color
- **Hover:** neutral-secondary-medium background
- **Focus ring:** 4px, brand-soft color (added on focus only since base ring is removed)
- **No shadow, no pencil glint, no translate on hover**

### Disabled (NO shadow, NO glint)
- **Background:** disabled token
- **Border:** 2px dashed border-default
- **Text:** fg-disabled color
- **Cursor:** not-allowed
- **No hover, no focus, no shadow, no pencil glint, no translate**

## Icons in Buttons

- Icon size: 16x16px
- Spacing: 8px gap between icon and label
- Layout: inline-flex, vertically centered
- Icon stroke should look hand-drawn whenever possible (consistent with the pencil aesthetic). Avoid heavily filled, photo-real icons.

## Prohibited

- No solid borders on this button — the dashed stroke is the visual signature.
- No raw hex values in component code apart from the dashed border ink (`#2B2418`), which is intentionally pinned to keep the hand-drawn outline identical across themes. Everywhere else, use design tokens.
- No native `outline` on focus — always rely on the box-shadow ring.
- No removing the dual-layer `box-shadow` — both the brand ring and the graphite drop are required for the depth effect.

---

## Source file: `cards.md`

# Cards

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `typography.md`, `borders.md`, `buttons.md`

## Core Specs

Every card — regardless of stack (HTML/CSS, React, Vue, Svelte, Angular, Tailwind, Sass, plain CSS, etc.) — must compose to the following base style. Use design tokens or framework utilities; the visual result must match the rules below.

### Base CSS (stack-agnostic, copy-paste ready)

```css
.card {
  outline: none;
  color: var(--color-body);
  padding: 24px;
  border: 2px dashed #2B2418;
  border-radius: 24px;
  background-color: var(--color-neutral-primary-medium);
  box-shadow:
    0 0 0 4px var(--color-neutral-primary-medium),
    2px 2px 4px 2px rgba(0, 0, 0, 0.5);
  transition: 0.15s ease-in-out, 0.4s color;
}
```

### Property Reference

| Property | Value |
|---|---|
| `outline` | `none` |
| `color` | body color |
| `padding` | `24px` (use `32px` on large feature cards) |
| `border` | `2px dashed #2B2418` |
| `border-radius` | `24px` |
| `background-color` | neutral-primary-medium |
| `box-shadow` | `0 0 0 4px <same-as-background>, 2px 2px 4px 2px rgba(0, 0, 0, 0.5)` |
| `transition` | `.15s ease-in-out, .4s color` |

### Shadow Rules

Cards use a **dual-layer shadow** structurally identical to buttons (per `buttons.md`), but the inner ring color is **always the same as the card's background-color**, not the brand color. This way the ring reads as a soft "thickening" of the card itself — extending the paper outward — instead of competing with the graphite drop shadow.

1. `0 0 0 4px var(<same-token-as-background-color>)` — a 4px solid ring in **the exact same color as the card background**. The ring blends with the card and visually grows the dashed paper outward by 4px before the drop shadow takes over.
2. `2px 2px 4px 2px rgba(0, 0, 0, 0.5)` — a graphite drop shadow offset to the bottom-right, consistent with the pencil aesthetic in `shadows.md`.

This replaces the previous `shadow-md` token for cards. The shadow now visually unifies cards and buttons (same dual-layer structure) while keeping cards subtle — the ring is invisible against the background but still creates a clean buffer between the dashed border and the drop shadow.

### Background ↔ Ring Pairing (mandatory)

The ring color **must always match the background color** of the card. Pick the pair that fits the section:

- **Default cards (background: `neutral-primary-medium`):** `0 0 0 4px var(--color-neutral-primary-medium)`
- **Quiet cards (background: `neutral-primary-soft`):** `0 0 0 4px var(--color-neutral-primary-soft)`
- **Brand-soft cards (background: `brand-softer`):** `0 0 0 4px var(--color-brand-softer)`

Never use a ring color that differs from the card background. The graphite drop layer (`2px 2px 4px 2px rgba(0, 0, 0, 0.5)`) is constant in every variant.

## Card Heading

- Desktop: 26px, "Delicious Handrawn", regular weight, heading color
- Mobile: 22px, "Delicious Handrawn", regular weight, heading color
- Body inside the card uses "Elms Sans" per `typography.md`
- Never skip heading levels — the page hierarchy must logically arrive at the card heading level.

## States

### Static Card (no interactivity)
- Background: neutral-primary-medium
- Border: 2px dashed `#2B2418`
- Radius: 24px
- Shadow: `0 0 0 4px var(--color-neutral-primary-medium), 2px 2px 4px 2px rgba(0, 0, 0, 0.5)` (ring matches background)
- No hover styles. Non-interactive cards must NOT have hover background changes.

### Interactive Card (clickable)
- Same base styles as static card
- **Hover:** translate `-2px / -2px` and shrink the graphite drop offset to `1px 1px 4px 2px rgba(0, 0, 0, 0.5)` so the card feels lifted off the page. Background may also deepen to neutral-tertiary — if it does, swap the ring color to match the new background so the ring stays invisible.
- **Active / pressed:** translate `+2px / +2px` and collapse the graphite drop to 0; only the background-matching ring remains, so the card visually meets its own shadow.
- Transition: `transform 150ms, box-shadow 150ms, background-color 150ms`
- Cursor: pointer
- Focus-visible: add a 4px `brand-soft` outline offset by 2px (do not use the inner ring for focus, since it matches the background and is invisible).

## Stack-agnostic notes

- **Tailwind:** apply `border-2 border-dashed border-[#2B2418] rounded-[24px] p-6 bg-neutral-primary-medium` plus a custom shadow utility `shadow-[0_0_0_4px_var(--color-neutral-primary-medium),_2px_2px_4px_2px_rgba(0,0,0,0.5)]`. The ring token must always equal the bg token.
- **CSS-in-JS / styled-components / Emotion:** export the base style block above as a named style and compose interactive variants on top.
- **Vue / Svelte / Angular:** apply the rules via component-scoped styles or a global `.card` class — the rules are CSS-only and have no framework dependency.
- **Plain HTML/CSS:** drop the base CSS block into a stylesheet and add `class="card"` to any container.

## Rules

- Background: neutral-primary-medium (warm cream, deeper than the page background)
- Border: 2px **dashed** `#2B2418` — never solid for a standard card
- Radius: 24px
- Shadow: dual-layer — first ring **always matches the card background**, second layer is the graphite drop. Never a soft blurred shadow.
- Interactive hover: translate + reduced graphite drop offset, never just a background swap
- Non-interactive: no hover styles
- Cards must never appear flat — the dashed border + dual-layer shadow combination is what gives them their illustrated identity

## Prohibited

- No solid borders on the card outline — the dashed stroke is the visual signature.
- No raw hex values apart from the dashed border ink (`#2B2418`), which is intentionally pinned to keep the hand-drawn outline identical across themes.
- No mismatched ring + background — the inner ring **must** be the same color token as the background. Brand-colored or accent-colored rings are reserved for buttons, not cards.
- No removing the dual-layer `box-shadow` — both the matching ring and the graphite drop are required.
- No mixing soft/blurred drop-shadows with this style; the entire card system must stay visually unified with the buttons.

---

## Source file: `colors.md`

# Color Tokens

## Background Tokens

### Neutral
| Token | Light | Dark |
|---|---|---|
| neutral-primary-soft | #FFFAF5 | #1A1611 |
| neutral-primary | #FFFAF5 | #14110C |
| neutral-primary-medium | #F4EDDF | #221D15 |
| neutral-primary-strong | #ECE3D0 | #2D261B |
| neutral-secondary-soft | #FFFAF5 | #1A1611 |
| neutral-secondary | #F4EDDF | #14110C |
| neutral-secondary-medium | #F4EDDF | #221D15 |
| neutral-secondary-strong | #ECE3D0 | #2D261B |
| neutral-tertiary-soft | #F4EDDF | #1A1611 |
| neutral-tertiary | #ECE3D0 | #221D15 |
| neutral-tertiary-medium | #E5D7BF | #2D261B |
| neutral-quaternary | #D9C9AE | #3A2F22 |
| quaternary-medium | #C9B795 | #4A3D2C |
| gray | #B0997B | #5A4B36 |

### Brand
| Token | Light | Dark |
|---|---|---|
| brand-softer | #E8F9F4 | #0E574E |
| brand-soft | #B9EFE2 | #168478 |
| brand | #1DAD97 | #3EC3AD |
| brand-medium | #82DEC8 | #168478 |
| brand-strong | #168478 | #1DAD97 |

### Status
| Token | Light | Dark |
|---|---|---|
| success-soft | #ECFDF5 | #002C22 |
| success | #1DAD97 | #3EC3AD |
| success-medium | #B9EFE2 | #0E574E |
| success-strong | #168478 | #1DAD97 |
| danger-soft | #FDECEC | #4D1A1A |
| danger | #C0392B | #E74C3C |
| danger-medium | #F5CFCB | #7A2C24 |
| danger-strong | #8B2A20 | #E74C3C |
| warning-soft | #FDF3E1 | #6B4A12 |
| warning | #E69A1A | #F5B341 |
| warning-medium | #F8E1B7 | #8A5F18 |
| warning-strong | #B57612 | #E69A1A |

### Button Glint (CSS custom properties, used for the soft inset highlight on filled controls)
| Variable | Light | Dark |
|---|---|---|
| `--color-1-400` | rgba(255,250,245,0.30) | rgba(255,250,245,0.10) |
| `--color-1-700` | rgba(31,27,18,0.18) | rgba(0,0,0,0.30) |

### Pencil Shadow (CSS custom properties, used for the hand-drawn offset shadow)
| Variable | Light | Dark |
|---|---|---|
| `--pencil-ink` | #2B2418 | #0A0805 |
| `--pencil-ink-soft` | rgba(43,36,24,0.55) | rgba(0,0,0,0.55) |

### Utility
| Token | Light | Dark |
|---|---|---|
| dark | #2B2418 | #2B2418 |
| dark-strong | #1F1B12 | #3A2F22 |
| disabled | #ECE3D0 | #2D261B |

### Accent
| Token | Value (same both modes) |
|---|---|
| purple | #8E7CC3 |
| sky | #6FB8D1 |
| teal | #1DAD97 |
| pink | #D87BA1 |
| cyan | #5BB4B0 |
| fuchsia | #B569A8 |
| indigo | #5E6FB4 |
| orange | #E29F5C |

## Text Color Tokens

### Base
| Token | Light | Dark |
|---|---|---|
| white | #FFFAF5 | #FFFAF5 |
| black | #1F1B12 | #1F1B12 |
| heading | #1F1B12 | #FFFAF5 |
| body | #4A3F2E | #C9B795 |
| body-subtle | #6F6151 | #A89878 |

### Brand
| Token | Light | Dark |
|---|---|---|
| fg-brand-subtle | #B9EFE2 | #168478 |
| fg-brand | #168478 | #3EC3AD |
| fg-brand-strong | #0E574E | #B9EFE2 |

### Status
| Token | Light | Dark |
|---|---|---|
| fg-success | #168478 | #1DAD97 |
| fg-success-strong | #0E574E | #3EC3AD |
| fg-danger | #8B2A20 | #E74C3C |
| fg-danger-strong | #6B1F18 | #F08070 |
| fg-warning-subtle | #B57612 | #F5B341 |
| fg-warning | #6B4A12 | #FACC7A |
| fg-disabled | #A89878 | #6F6151 |

### Informational / Accent
| Token | Light | Dark |
|---|---|---|
| fg-yellow | #C99216 | #F5C846 |
| fg-info | #3D4980 | #9CB1E0 |
| fg-purple | #6E5CA3 | #B5A3D9 |
| fg-purple-strong | #574786 | #D6CAEB |
| fg-cyan | #3D8E8A | #7FCDC8 |
| fg-indigo | #4458A0 | #8095CD |
| fg-pink | #B85C82 | #E8A7C0 |
| fg-lime | #6B8E23 | #B5CC6B |

## Border Color Tokens

| Token | Light | Dark |
|---|---|---|
| border-dark | #2B2418 | #C9B795 |
| border-buffer | #FFFAF5 | #14110C |
| border-buffer-medium | #FFFAF5 | #221D15 |
| border-buffer-strong | #FFFAF5 | #2D261B |
| border-muted | #F4EDDF | #1A1611 |
| border-light-subtle | #ECE3D0 | #1A1611 |
| border-light | #ECE3D0 | #221D15 |
| border-light-medium | #E5D7BF | #2D261B |
| border-default-subtle | #D9C9AE | #2D261B |
| border-default | #C9B795 | #3A2F22 |
| border-default-medium | #B0997B | #4A3D2C |
| border-default-strong | #8E7A5F | #5A4B36 |
| border-success-subtle | #B9EFE2 | #0E574E |
| border-success | #168478 | #1DAD97 |
| border-danger-subtle | #F5CFCB | #7A2C24 |
| border-danger | #8B2A20 | #C0392B |
| border-warning-subtle | #F8E1B7 | #6B4A12 |
| border-warning | #B57612 | #E69A1A |
| border-brand-subtle | #B9EFE2 | #168478 |
| border-brand-light | #3EC3AD | #82DEC8 |
| border-brand | #1DAD97 | #3EC3AD |
| border-dark-subtle | #2B2418 | #3A2F22 |
| border-purple | #8E7CC3 | #B5A3D9 |
| border-orange | #E29F5C | #E29F5C |

## Semantic Usage Rules

- Page/section backgrounds: neutral-primary-soft (default cream paper), alternate sections may use neutral-secondary for slightly deeper warmth
- Cards, popovers and any element layered over the page: neutral-primary-medium (#F4EDDF) so they read as a separate "paper card" sitting on the main paper background
- Primary buttons: brand background
- Headings: heading text color (warm graphite)
- Body text: body text color (warm pencil tone)
- CTA links: fg-brand text color
- Default borders: border-default (warm taupe), drawn dashed on cards and decorative containers
- Status borders match intent: success → border-success, danger → border-danger, warning → border-warning
- Disabled: disabled background + fg-disabled text

## Prohibited

- No raw hex/rgb values in component code — always use design tokens
- No pure white (#FFFFFF) or pure black (#000000) — always favor the warm cream / warm graphite tokens
- No cool grays for surfaces or text — the entire palette must stay on the warm cream/teal axis
- No brand text color for long-form paragraphs
- No accent text tokens (fg-purple, etc.) for body copy or navigation
- No brand/accent backgrounds for large layout surfaces (pages, sections) unless it's a hero/campaign area
- No manual light/dark value swapping — let the CSS custom properties handle it

---

## Source file: `content.md`

# Content & Grid System

> Dependencies: `layout.md`, `typography.md`

## Containers

| Type | Max width | Horizontal padding |
|---|---|---|
| Standard | 1200px | 24px |
| Internal (reading) | 720px | — (45–75 char line length) |

## Vertical Padding

| Breakpoint | Vertical padding |
|---|---|
| Mobile | 48px |
| Tablet (≥768px) | 64px |
| Desktop (≥1024px) | 96px or 120px for hero/feature sections |

## Grid System

Mobile-first with flexible desktop configurations.

| Context | Gap |
|---|---|
| Standard content/cards | 32px |
| Compact widgets/metadata | 16px |

### Responsive Columns

| Breakpoint | Columns |
|---|---|
| Mobile (default) | 1–2 |
| Small/Tablet (≥640px) | 2–4 |
| Desktop (≥1024px) | 3–12 |

Full support for 6, 7, 8, 9+ column grids where needed.

## Breakpoints

| Name | Width |
|---|---|
| Small | 640px |
| Medium | 768px |
| Large | 1024px |
| Extra large | 1280px |
| 2x Extra large | 1536px |

## Rules

- Always design mobile-first
- Use layout shifts (column → row) to accommodate horizontal space
- Lists: 24px indentation, 16px vertical gap between items
- Body copy: "Elms Sans", 16px, 1.7 line-height
- All interactive links follow brand underline/hover protocol
- Page canvas always uses warm cream **neutral-primary-soft (#FFFAF5)**; layered surfaces use **neutral-primary-medium (#F4EDDF)** — see `colors.md`

---

## Source file: `dropdown.md`

# Dropdown

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `borders.md`, `inputs.md`

## Core Specs

### Chevron Icon
- Size: 16x16px
- Spacing: 8px left margin, -2px right margin
- Color: inherits from trigger button
- Style: hand-drawn / sketched stroke when possible

### Menu Container
- Background: neutral-primary-medium (warm cream paper)
- Border: 2px **dashed**, border-default
- Radius: 24px (base)
- Shadow: shadow-md (pencil offset)
- Z-index: elevated above content

### Menu List
- Padding: 12px
- Font: "Elms Sans", 14px, body color, medium weight

### Menu Item
- Layout: inline-flex, vertically centered, full width
- Padding: 12px horizontal, 10px vertical
- Radius: 999px (pill — items match the brand's rounded silhouette)
- Hover: neutral-tertiary background, heading text
- Transition: colors, 150ms

## Trigger Sizes

Triggers reuse the button sizing from `buttons.md` (always pill 999px). The sizes below are convenience aliases.

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Small | 14px | 18px | 8px |
| Base | 14px | 22px | 10px |
| Large | 16px | 26px | 12px |

## Icon-only Trigger

- Padding: 10px
- Min size: 44x44px
- Radius: 999px (full circle)
- Icon: 20x20px

## Variants

### Default
- Menu width: 200px, items have 999px radius

### With Divider
- 2px dashed top border (border-default) between child groups, skip first group

### With Header
- Header padding: 18px horizontal, 14px vertical
- 2px dashed bottom border: border-default
- Name: "Delicious Handrawn", 18px, heading color
- Email: "Elms Sans", body-subtle color, 14px, truncated

### With Icons
- Icon before label: 16x16px, 10px right margin, body color
- On hover, icon color changes to heading

### With Checkbox / Radio
- Inputs: 18x18px, 6px radius (checkbox) or 999px (radio), focus ring in brand-soft
- Helper text: 12px, body-subtle color, 4px top margin

### With Search
- Search input at top of menu following `inputs.md` specs (pill, 999px radius)
- Left icon: 18px left padding, input 44px left padding

### Scrollable
- Max height: 240px, vertical scroll overflow

## States

| State | Appearance |
|---|---|
| Focused trigger | no outline, 4px brand-soft ring |
| Hover item | neutral-tertiary background, heading text |
| Active/open item | brand-softer background, fg-brand-strong text |
| Disabled item | fg-disabled text, not-allowed cursor, no pointer events |

---

## Source file: `icon-shapes.md`

# Icon Shapes

> Dependencies: `colors.md`, `radius.md`, `borders.md`

## Core Specs

- Box sizing: border-box
- Icon must be perfectly centered (inline-flex, centered both axes)
- Border: 2px solid border-dark on every shape so it reads as a hand-drawn outlined badge (omit only on transparent / ghost variants)
- Circle: fully rounded (999px)
- Rounded square: 24px radius (MD/LG/XL), 16px radius (XS/SM)
- Icons themselves should use a hand-drawn / sketched stroke style whenever possible to stay on-brand

## Sizes

| Size | Container | Icon |
|---|---|---|
| XS | 28x28px | 14x14px |
| SM | 36x36px | 18x18px |
| MD | 44x44px | 22x22px |
| LG | 52x52px | 26x26px |
| XL | 60x60px | 30x30px |

## Color Variants

### Brand
- Shape: circle
- Background: brand-softer
- Icon color: fg-brand-strong

### Gray
- Shape: circle
- Background: neutral-secondary-medium
- Icon color: body

### Danger
- Shape: circle
- Background: danger-soft
- Icon color: fg-danger-strong

### Success
- Shape: circle
- Background: success-soft
- Icon color: fg-success-strong

### Warning
- Shape: circle
- Background: warning-soft
- Icon color: fg-warning

---

## Source file: `inputs.md`

# Inputs

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Core Specs

- **Display:** block, full width
- **Radius:** 999px (full pill)
- **Border:** 2px solid, border-default-medium (warm taupe)
- **Background:** neutral-primary-soft (warm cream paper)
- **Shadow:** shadow-xs — pencil-drawn offset shadow from `shadows.md`
- **Font:** "Elms Sans", 16px, heading color
- **Padding:** 20px horizontal, 12px vertical (extra horizontal padding so text breathes inside the pill)
- **Placeholder:** body-subtle color
- **Transition:** border-color 150ms, box-shadow 150ms, background-color 150ms

Multi-line inputs (textarea) keep the same styling but use a 24px radius instead of a full pill so they remain readable on multiple lines.

## Label

- Display: block
- Font: "Elms Sans", 14px, medium weight, heading color
- Margin bottom: 8px
- Margin left: 16px (so the label visually aligns with the pill content area, not the rounded edge)
- Label `htmlFor` must match the input `id`

## States

### Default
- Border: 2px solid border-default-medium
- Background: neutral-primary-soft
- Shadow: shadow-xs

### Hover
- Border: 2px solid border-default-strong

### Focus
- No outline
- Border: 2px solid border-brand
- Ring: 4px, brand-soft

### Success
- Border: 2px solid border-success
- Focus ring: 4px, success-medium

### Error / Danger
- Border: 2px solid border-danger
- Focus ring: 4px, danger-medium

### Disabled
- Background: disabled
- Text: fg-disabled
- Border: 2px solid border-default
- Shadow: none
- Cursor: not-allowed

## Input with Icons

- Icon size: 16x16px (use hand-drawn-style icons to match the aesthetic)
- Icon color: body
- Container: relative positioned wrapper
- Start icon: absolutely positioned left, 18px left padding — input gets 44px left padding
- End icon: absolutely positioned right, 18px right padding — input gets 44px right padding
- Icons vertically centered within the wrapper

## Rules

- Every input must have a unique `id`
- Every label must have a matching `htmlFor`
- Padding: 20px horizontal, 12px vertical unless overridden for icon variants
- Always use the pill (999px) radius for single-line inputs; only textareas drop down to 24px
- No arbitrary hex or hardcoded colors
- The pencil shadow must always be present on enabled inputs — it is part of the visual identity

---

## Source file: `layout.md`

# Layout & Spacing

## Spacing Rhythm

Base unit: **8px**. All spacing values should be multiples of 8px.

| Context | Value |
|---|---|
| Section vertical padding | 96px |
| Section header → content | 48px or 64px |
| Heading → paragraph | 24px (hand-drawn headings need slightly more breathing room) |
| Container horizontal padding | 24px |
| Flex/grid row gap | 16px |
| Card grid gap | 32px |
| Wide component grid gap | 40px |
| Column layout gap | 48px |

## Container

Standard section container: max-width 1200px, centered, 24px horizontal padding.

Every major section wraps content in this container.

## Content Composition Order

Inside each section, follow this order:
1. Heading (`h1`–`h3`) — set in "Delicious Handrawn" per `typography.md`
2. Leading paragraph — "Elms Sans"
3. Normal paragraph(s) — "Elms Sans"
4. Lists, CTA links, or component grids

## Section Pattern

Each section has:
- 96px vertical padding
- A background color from the warm cream palette in `colors.md`. The page baseline is **neutral-primary-soft (#FFFAF5)**. Alternating sections may use **neutral-secondary** for a slightly deeper warmth, but the base canvas is always cream — never cool gray or pure white.
- A centered container (max-width 1200px, 24px horizontal padding)
- A section header area with 48px bottom margin
- Section content below
- Optional decorative pencil-drawn illustrations (small spot doodles, dashed dividers, hand-drawn arrows) to reinforce the sketch identity — these must support, never compete with, the content.

## Motion & Animation

- Prefer CSS-native: `transition`, `animation`, `@keyframes`. Use Motion library only when CSS cannot achieve the behavior.
- Prioritize high-impact orchestrated moments over scattered micro-interactions. A single well-sequenced page-load animation using staggered `animation-delay` delivers more perceived quality than many isolated effects.
- Reserve scroll-triggered and hover transitions for moments that reinforce hierarchy or reward attention.
- Hover micro-motion across the system follows the same "press into the paper" idiom: translate -1px / -1px and shrink the pencil-shadow offset by 1px on hover; reverse on press.

## Backgrounds & Visual Depth

- The entire app sits on the warm cream **neutral-primary-soft (#FFFAF5)** canvas. Layered elements (cards, popovers, modals, dropdown menus, sidebars CTAs) sit on **neutral-primary-medium (#F4EDDF)** so the cream-on-cream contrast creates depth without leaving the warm palette.
- Apply contextual treatments — pencil-drawn doodles, dashed underlines, hand-drawn arrows, sketched dividers, soft paper-grain overlays — that align with the hand-drawn brand aesthetic.
- Avoid glossy gradients, neon glows, glassmorphism blurs, or photographic textures — they fight the pencil illustration language.
- Every decorative element must serve a compositional purpose (depth, separation, or emphasis). No purely ornamental effects competing with content.

## Must

- All sections: consistent 96px vertical padding
- All containers: max-width 1200px, centered, 24px horizontal padding
- Section headers: 48px or 64px bottom margin
- Consistent vertical rhythm, no crowded sections
- Layouts readable and properly spaced on both desktop and mobile
- Page background is always the warm cream neutral-primary-soft — never pure white, never cool gray

---

## Source file: `lists.md`

# Lists

> Dependencies: `colors.md`, `typography.md`

## Core Specs

- Item spacing: 16px vertical gap between list items
- Font: "Elms Sans"
- Text: body color

## List Icons

- Size: 20x20px (hand-drawn / sketched stroke style preferred — checkmarks, arrows, dots that look pencil-drawn)
- Prevent squishing: no shrink
- Spacing: 10px right margin between icon and text
- Active/featured icon: fg-brand color
- Neutral icon: body color

## Inactive / Disabled Items

Strikethrough text with body-subtle color decoration on the list item. The strikethrough itself should feel like a hand-drawn pencil cross-out where possible.

## Pattern

Vertical flex list with 16px gap. Each item is a flex row with centered alignment — hand-drawn icon (20x20, no-shrink, 10px right margin) followed by a span of body-colored text in "Elms Sans".

---

## Source file: `modals.md`

# Modals

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `borders.md`, `buttons.md`, `inputs.md`

## Core Specs

### Overlay (Backdrop)
- Fixed, covers full screen
- Z-index: 40
- Background: dark token at 50% opacity (warm graphite veil, never pure black)
- Backdrop blur: small amount

### Content Container
- Background: neutral-primary-medium (warm cream paper card sitting on the page)
- Border: 2px **dashed**, border-default
- Radius: 24px (base)
- Shadow: shadow-xl (pencil offset)
- Padding: 24px

## Anatomy

### Header
- 2px dashed bottom border: border-default
- Top corners rounded (24px)
- Title: "Delicious Handrawn", 28px, regular weight, heading color
- Close button: Ghost variant from `buttons.md` (still pill, 999px), 8px padding

### Body
- Vertical padding: 24px
- Vertical spacing between elements: 24px
- Text: "Elms Sans", 16px, 1.7 line-height, body color

### Footer
- 2px dashed top border: border-default
- Bottom corners rounded (24px)
- Action buttons stay pill-shaped per `buttons.md`

## Variants

### Default (Information)
Standard header + body + footer with primary/secondary action buttons.

### Pop-up (Confirmation)
Centered text, prominent icon, reduced padding:
- Body: 24px padding, text centered
- Icon: centered, 16px bottom margin, 56x56px, brand color or status color depending on intent (uses an Icon Shape from `icon-shapes.md`)

### Form Modal
Body contains inputs following `inputs.md` (pill, 999px). Vertical spacing between form elements: 20px.

## Rules

- Backdrop covers full screen with fixed positioning
- Content: neutral-primary-medium background, 24px radius, 2px dashed border, shadow-xl
- Header/Footer separated by 2px dashed border-default borders
- Close button must be present and functional, follows pill button rules from `buttons.md`
- Accessibility: `role="dialog"`, implement focus trap in code
- Dark mode automatic via token system

---

## Source file: `pagination.md`

# Pagination

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `borders.md`

## Container

Font: "Elms Sans", 14px. Items displayed as flex with 8px gap (no overlap — every item is its own pill).

## Pagination Item

- Layout: flex, centered both axes
- Size: 40x40px
- Text: body color, medium weight
- Background: neutral-primary-medium (warm cream)
- Border: 2px solid, border-default
- Radius: 999px (full pill / circle)
- Shadow: shadow-xs (pencil offset)
- Hover: neutral-tertiary background, heading text, translate -1px / -1px
- Focus: no outline, 4px brand-soft ring
- Active (pressed): translate +1px / +1px, shadow collapses

## Previous / Next Buttons

- Horizontal padding: 18px, height: 40px
- Radius: 999px (full pill — same as numbered items, no special start/end radius)
- May include a hand-drawn arrow icon (16x16px) with 8px gap from label

## Active Page Item

- Text: white
- Background: brand
- Border: 2px solid border-dark
- Hover background: brand-strong (text stays white)

## Rules

- Display as flex with 8px gap between items — no -1px overlap, every pill is independent
- Items: pill-shaped (999px), 2px solid border-default, neutral-primary-medium background, body text
- Active: brand background, white text, 2px border-dark outline
- Pencil shadow is part of the visual identity — keep shadow-xs on every item
- All items need hover and focus states

---

## Source file: `radios-checkboxes-toggle.md`

# Radios, Checkboxes & Toggles

> Dependencies: `colors.md`, `radius.md`, `borders.md`, `shadows.md`

## Checkbox

- Size: 20x20px
- Radius: 6px (small rounded square — keeps it readable as a checkbox even in the pill-heavy system)
- Border: 2px solid, border-default-medium
- Background: neutral-primary-soft
- Shadow: shadow-2xs (subtle pencil offset)
- Focus ring: 4px, brand-soft
- Checked: brand background, white check (use a hand-drawn check stroke when possible)

### Disabled
- Border: 2px solid border-light
- Background: disabled
- Text: fg-disabled
- No shadow

## Radio

- Size: 20x20px
- Radius: 999px (fully rounded)
- Border: 2px solid, border-default-medium
- Background: neutral-primary-soft
- Shadow: shadow-2xs (subtle pencil offset)
- Focus ring: 4px, brand-soft
- Checked: 2px solid border-brand, inner dot (10x10px) in brand color

### Disabled
- Border: 2px solid border-light-medium
- Background: disabled
- Text: fg-disabled
- No shadow

Group all radio items under the same `name` attribute.

## Toggle

### Track
- Width: 44px, height: 26px
- Radius: 999px (fully rounded)
- Background: neutral-quaternary
- Border: 2px solid border-default
- Shadow: shadow-2xs (subtle pencil offset)
- Focus-within ring: 4px, brand-soft
- Checked track: brand background, border stays border-dark
- Disabled track: neutral-tertiary background, no shadow

### Thumb
- Size: 18x18px
- Radius: 999px (fully rounded)
- Background: neutral-primary-soft
- Border: 2px solid border-dark
- Translates from left to right when checked

### Disabled
- Track: neutral-tertiary background
- Label: fg-disabled text
- No shadow, no hover

## Rules

- All selection inputs must have `id` matching label `htmlFor`
- Focus states use the appropriate brand-soft ring for each control type
- Disabled states: no hover/focus interaction
- The pencil shadow is part of the visual identity for the enabled states — never drop it on default/checked

---

## Source file: `radius.md`

# Border Radius

| Token | Value | Default usage |
|---|---|---|
| base | 24px | Cards, modals, popovers, sections, dropdown menus, alerts, tables, large containers |
| default | 16px | Tooltips, accordion items, dropdown items, medium controls |
| sm | 8px | Small chips, tiny decorative blocks |
| full | 999px | Buttons, badges, inputs, selects, pills, avatars, toggles, dot indicators, pagination items |

## Rules

- 24px is the default radius for any "big" surface (cards, modals, sections, table wrappers)
- 999px (full) is the default radius for every interactive control: buttons, inputs, selects, badges, pagination items
- Avatars and toggle thumbs are always fully rounded
- Never use arbitrary radius values outside this scale
- Radius must be consistent within each component family
- Never mix pill controls (999px) with sharp-corner controls in the same group

---

## Source file: `shadows.md`

# Shadows

All shadows in this system are **pencil-drawn shadows**: chunky, slightly offset solid blocks (no blur, or only a hint of blur) using the warm `--pencil-ink` ink color from `colors.md`. They are meant to look as if a hand drew the outline of the element with a soft graphite pencil and the shadow is the second pass of the stroke. Avoid soft, modern, blurred drop-shadows.

| Token | CSS value |
|---|---|
| shadow-2xs | `1px 1px 0 0 var(--pencil-ink-soft)` |
| shadow-xs | `2px 2px 0 0 var(--pencil-ink)` |
| shadow-sm | `3px 3px 0 0 var(--pencil-ink), 4px 4px 0 0 var(--pencil-ink-soft)` |
| shadow-md | `4px 4px 0 0 var(--pencil-ink), 6px 6px 0 0 var(--pencil-ink-soft)` |
| shadow-lg | `5px 5px 0 0 var(--pencil-ink), 8px 8px 0 0 var(--pencil-ink-soft)` |
| shadow-xl | `6px 6px 0 0 var(--pencil-ink), 10px 10px 0 0 var(--pencil-ink-soft)` |
| shadow-2xl | `8px 8px 0 0 var(--pencil-ink), 14px 14px 0 0 var(--pencil-ink-soft)` |

## Component Mapping

| Component type | Token |
|---|---|
| Subtle separators, tiny UI details | shadow-2xs |
| Inputs, badges, small controls | shadow-xs |
| Buttons, lightweight cards, popovers | shadow-sm |
| Standard cards, dropdowns | shadow-md |
| Prominent cards, sticky surfaces | shadow-lg |
| Modals, high-priority overlays | shadow-xl |
| Hero overlays, top-level emphasis (sparingly) | shadow-2xl |

## Rules

- Use only these tokens — no custom box-shadow values
- All shadows are offset to the bottom-right (positive X and Y), never centered or above the element
- Always use the `--pencil-ink` / `--pencil-ink-soft` custom properties so the shadow color stays consistent with the warm graphite palette
- Never use blurred soft shadows (e.g. `0 4px 6px rgba(0,0,0,.1)`) — they break the hand-drawn aesthetic
- Keep elevation steps intentional; avoid jumping multiple levels
- Components in the same family share the same baseline elevation
- Hover/focus on interactive elevated elements: shrink the offset by ~1px and translate the element by the same amount on each axis to give a "press into the page" feeling. Do not jump up by a full level.
- Active / pressed: collapse the shadow to `shadow-2xs` or 0 and translate the element 2px right and 2px down so it visually meets the original shadow position
- Never stack multiple shadow tokens on one element
- Never use shadow-xl/shadow-2xl for dense list items or body containers

---

## Source file: `sidebars.md`

# Sidebars

> Dependencies: `colors.md`, `radius.md`, `borders.md`, `typography.md`, `badges.md`, `alerts.md`

## Core Specs

- Background: neutral-primary-soft (cream paper, same as page)
- Right border: 2px dashed, border-default (for left-sidebar); left border for right-sidebar
- Width: 272px

## Anatomy

### Outer Container
Hidden on mobile, visible at small breakpoint. Needs a toggle/trigger for mobile.

### Inner Wrapper
- Full height, vertical scroll overflow
- Padding: 16px horizontal, 20px vertical

### Navigation List
- Vertical spacing: 8px between items
- Font: "Elms Sans", medium weight

### Navigation Item
- Layout: flex, vertically centered
- Padding: 12px horizontal, 10px vertical
- Text: heading color
- Radius: 999px (full pill — matches the rest of the system)
- Hover: neutral-tertiary background
- Transition: colors, 150ms
- Icon: 20x20px, body color, hover → heading color, 75ms transition (hand-drawn stroke style)
- Label: 12px left margin from icon

### Active Item
- Background: brand-softer
- Border: 2px solid border-brand-subtle
- Text: fg-brand-strong

### Separator
- 16px top padding, 16px top margin
- 2px dashed top border: border-default
- 8px vertical spacing below

### Bottom CTA / Card
- Padding: 20px
- Top margin: 24px
- Radius: 24px (base)
- Border: 2px dashed border-default
- Background: brand-softer
- Shadow: shadow-sm (pencil offset)
- Can also use any alert variant from `alerts.md`

## Rules

- Responsive: hidden on mobile with a trigger mechanism
- Icons: 20x20px hand-drawn stroke style, body color (hover: heading color)
- Multi-level menus: indent with 44px left padding
- Spacing follows 8px grid
- Only neutral, brand, or status tokens — no arbitrary colors
- Navigation items always use the pill 999px radius — never sharp rectangular tabs

---

## Source file: `tables.md`

# Tables

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `borders.md`

## Wrapper

- Horizontal scroll overflow
- Background: neutral-primary-medium (warm cream paper)
- Radius: 24px (base)
- Border: 2px **dashed**, border-default
- Shadow: shadow-md (pencil offset)
- Overflow-clip so the dashed corners stay clean

## Table Element

- Full width, left-aligned text (right-aligned for RTL)
- Font: "Elms Sans", 14px, body color

## Table Head

- Font: "Elms Sans", 14px, body color, medium weight
- Background: neutral-tertiary (slightly deeper warm cream so the header band stands out)
- 2px solid bottom border: border-default
- Cell padding: 24px horizontal, 14px vertical

## Table Body

- Row background: transparent (lets the wrapper's neutral-primary-medium show through)
- Row bottom border: 2px solid border-default-subtle (omit on last row to avoid doubling with wrapper border)
- Row hover: neutral-tertiary background (optional)
- Row header: medium weight, heading color, no-wrap
- Cell padding: 24px horizontal, 18px vertical

## Rules

- Wrapper must have horizontal scroll overflow for responsive scrolling
- Wrapper border is 2px **dashed** — the table is a "paper card" that happens to contain rows
- Row dividers are 2px solid (not dashed) so individual rows remain easy to scan
- Last row: omit bottom border to avoid doubling with wrapper border
- Row headers: always `scope="row"` for semantic structure
- Hover on rows is optional
- No arbitrary hex codes — use token colors only

---

## Source file: `tabs.md`

# Tabs

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `borders.md`

## Core Specs

- Typography: "Elms Sans", 14px, medium weight, body color
- Transitions: all properties, 200ms

## Variants

### 1. Underline (Default)

**Wrapper:** 2px solid bottom border, border-default

**Tab Item:**
- Padding: 18px horizontal, 14px vertical
- Bottom border: 3px solid transparent (so the active sketch underline reads as a hand-drawn pencil mark)
- Top corners: 16px radius
- Transition: colors, 150ms

| State | Appearance |
|---|---|
| Active | fg-brand text, 3px border-brand bottom border |
| Inactive | transparent bottom border; hover → heading text, 3px border-default-strong bottom border |
| Disabled | fg-disabled text, not-allowed cursor |

### 2. Pills (Recommended for the sketch system)

**Tab Item:**
- Padding: 18px horizontal, 10px vertical
- Radius: 999px (full pill)
- Border: 2px solid transparent (becomes border-dark when active)
- Font weight: medium
- Transition: all, 200ms

| State | Appearance |
|---|---|
| Active | brand background, white text, 2px solid border-dark, shadow-xs (pencil offset) |
| Inactive | body text; hover → neutral-tertiary background, heading text |
| Disabled | fg-disabled text, not-allowed cursor |

### 3. Full Width

Children sit side-by-side with 8px gap (no -1px overlap — every tab is its own pill).

**Tab Item:**
- Full width, centered text
- Padding: 18px horizontal, 14px vertical
- Background: neutral-primary-medium
- Border: 2px solid border-default
- Radius: 999px (full pill)
- Shadow: shadow-xs (pencil offset)
- Transition: colors, 150ms
- Hover: neutral-tertiary background, heading text

| State | Appearance |
|---|---|
| Active | brand background, white text, 2px solid border-dark |
| First / Last item | same 999px radius — no special start/end treatment |

## Tabs with Icons

- Icon size: 16x16px or 20x20px (hand-drawn stroke style)
- Spacing: 8px right margin
- Layout: inline-flex, centered
- Icons inherit the text color of the tab state

---

## Source file: `tooltips-popovers.md`

# Tooltips & Popovers

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `borders.md`

## Tooltips

### Core Specs
- Padding: 14px horizontal, 8px vertical
- Font: "Elms Sans", 14px, medium weight
- Radius: 999px (full pill — short tooltips look like little hand-drawn captions)
- Shadow: shadow-xs (pencil offset)
- Transition: opacity, 300ms

### Dark (Default)
- Background: dark
- Text: white
- Border: 2px solid border-dark

### Light
- Background: neutral-primary-medium
- Text: heading color
- Border: 2px solid border-default

## Popovers

### Core Specs
- Background: neutral-primary-medium (warm cream paper)
- Radius: 24px (base)
- Shadow: shadow-md (pencil offset)
- Border: 2px **dashed**, border-default
- Transition: opacity, 300ms

### Header / Title
- Padding: 16px horizontal, 12px vertical
- Background: neutral-tertiary
- 2px dashed bottom border: border-default
- Font: "Delicious Handrawn", 18px, regular weight, heading color

### Body / Content
- Standard: 16px horizontal, 12px vertical padding; "Elms Sans", 14px, body color
- Rich: 20px padding; "Elms Sans", 14px, body color, 1.65 line-height

## Arrows

- Size: 10x10px rotated 45deg
- Color must match the background of the tooltip/popover variant
- For popovers, the arrow stays solid (the dashed border is decorative on the body, not the pointer)

## Rules

- Tooltips: 999px (full pill) radius
- Popovers: 24px radius with 2px dashed border
- Dark tooltips: dark background, white text, 2px solid border-dark outline
- Light tooltips/popovers: semantic neutral background + border tokens
- Pencil shadow is part of the visual identity — never drop the offset shadow on tooltips or popovers
- Arrows match parent background color

---

## Source file: `typography.md`

# Typography

> Dependencies: `colors.md`

## Core Rules

- **Heading font:** "Delicious Handrawn", cursive — hand-drawn display face used for every `h1`–`h6`. Load from Google Fonts (https://fonts.google.com/specimen/Delicious+Handrawn). Configure at the app level, never override.
- **Body / UI font:** "Elms Sans", sans-serif — calm, expressive sans used for paragraphs, labels, buttons, inputs, badges and every other UI element. Load from Google Fonts (https://fonts.google.com/specimen/Elms+Sans). Configure at the app level, never override.
- **Headings:** regular weight (400) — the hand-drawn face already carries visual weight, never apply bold or semibold to it
- **Body copy:** body text color, never use brand color for paragraphs longer than one sentence
- **Semantic HTML:** Use `h1`–`h6` in order, never skip levels

## Heading Scale

### Desktop

| Element | Size | Line-height | Letter-spacing | Margin-bottom |
|---|---|---|---|---|
| `h1` | 72px | 1.05 | -0.5px | 24px |
| `h2` | 52px | 1.1 | -0.3px | — |
| `h3` | 40px | 1.15 | — | — |
| `h4` | 32px | 1.2 | — | — |
| `h5` | 26px | 1.3 | — | — |
| `h6` | 22px | 1.35 | — | — |

### Responsive

| Element | Tablet (≥768px) | Mobile (default) |
|---|---|---|
| `h1` | 48px | 36px |
| `h2` | 40px | 30px |
| `h3` | 32px | 26px |
| `h4` | 28px | 22px |
| `h5` | 24px | 20px |
| `h6` | 20px | 18px |

Mobile-first: start with mobile sizes, scale up at tablet and desktop breakpoints.

Never reduce line-height below 1.05 for any heading. Hand-drawn faces need a touch more breathing room than geometric sans, so do not crowd them.

## Paragraphs

### Leading Paragraph
- Font: "Elms Sans"
- Size: 20px
- Weight: normal (400)
- Color: body
- Line-height: 1.7
- Max width: ~70 characters

### Normal Paragraph
- Font: "Elms Sans"
- Size: 16px
- Weight: normal (400)
- Color: body
- Line-height: 1.7
- Max width: ~65 characters

### Small Supporting Copy
- Font: "Elms Sans"
- Size: 14px
- Weight: normal (400)
- Color: body
- Line-height: 1.6
- Use only for helper text, legal text, captions, metadata.

## UI Labels

| Context | Size | Weight |
|---|---|---|
| Button labels | 16px | 500 (medium) |
| Input labels | 14px or 16px | 500 (medium) |
| Captions / meta / badges | 12px or 14px | 500 (medium) |

All UI labels use "Elms Sans". Do not apply paragraph line-height (1.7) to control labels.

## Links

- **Inline links:** Same size as surrounding text, fg-brand color, underline, hover → no underline
- **CTA links:** fg-brand color, medium weight, underline, hover → no underline

## Emphasis

- `<strong>` for high-priority emphasis in body text
- `<em>` for tone emphasis only, not visual hierarchy
- All-caps only for short labels: uppercase, 0.4px letter-spacing, 12px or 14px, "Elms Sans"
- Decorative one-off display moments (taglines, hero accent words) may also use "Delicious Handrawn" inline — keep them short, never inside paragraphs

## Dark Mode

Hierarchy stays identical. Only color tokens change (automatic via CSS custom properties). Font families, sizes, weights, and spacing remain constant.
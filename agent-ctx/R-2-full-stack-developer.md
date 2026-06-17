# Task R-2 — auth-screen.tsx redesign

**Agent:** full-stack-developer
**File touched:** `/home/z/my-project/src/components/auth/auth-screen.tsx`
**Sibling worklog:** `/home/z/my-project/worklog.md` (Task R-2 section appended)

## What changed (pure presentation)

### Left marketing panel
- Solid pine `bg-[var(--brand)]` panel (was `linear-gradient(135deg, brand→brand-light→#2D6A4F)`).
- Removed both `radial-gradient` decorative blobs.
- Brand mark: dropped `bg-white/15` chip — `ShieldCheck` icon now bare in terracotta `text-[var(--accent)]` + `.font-display` serif wordmark.
- `<h1>` rewritten with `.font-display` serif (was bold sans), `text-3xl xl:text-4xl tracking-tight`.
- Body copy: `text-white/80`; footer microcopy: `text-white/55`.
- `MARKETING_BULLETS` array + content preserved verbatim; rendering changed — removed `bg-white/15` icon chips, icons are bare `h-5 w-5` terracotta glyphs inline with the text. List spacing `space-y-6`.

### Right form panel
- Removed `Card`/`CardHeader`/`CardContent`/`CardFooter`/`CardTitle`/`CardDescription` wrappers and their imports.
- Forms render directly on warm paper (`bg-background` section).
- Each form opens with: `.font-display text-2xl tracking-tight` `<h2>` + `text-sm text-muted-foreground` subtitle, sealed by `border-b border-border` (`pb-4`) divider.
- All fields/Labels/Select/Checkbox/Tooltip preserved verbatim with pine focus rings via `--ring`.
- Submit `Button` kept `w-full` with `Loader2` spinner.
- `Tabs`/`TabsList`/`TabsTrigger` clean shadcn chrome, no extra card chrome around.
- Mobile brand header chip: `bg-[var(--brand)]` + `text-[var(--accent-foreground)]` icon + serif wordmark.

### Responsive + a11y
- `lg:grid-cols-2` split retained. Left panel `hidden lg:flex` on mobile, right form panel full-width with `lg:hidden` compact brand header above the Tabs.
- `<h1>` (desktop marketing) and `<h2>` (form section) preserved at correct levels. ARIA labels, `aria-hidden` decorative icons, `Tooltip` semantics, keyboard order, password-toggle `aria-label` all intact.

## Removed imports (now unused)
`Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`.

## Kept imports (still in use)
`Button`, `Input`, `Label`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Checkbox`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `Brain`, `ClipboardCheck`, `Eye`, `EyeOff`, `Loader2`, `ShieldCheck`, `toast`, `api`, `ApiError`, `useAuth`, `PROFESSION_TYPES`, `PROFESSION_TYPE_LABELS`, `ProfessionType` type.

## Verification
- `bun run lint` → exit 0.
- Dev server NOT started/restarted per instructions.
- No business logic, API, state shape, validation, or routing touched.

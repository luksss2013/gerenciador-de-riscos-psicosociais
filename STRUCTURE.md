# Codebase Structure

> Companion to `ARCHITECTURE.md`. This file documents **where things live on
> disk** and **where to add new code**. The architecture doc covers *why* the
> boundaries exist; this file covers *what* goes in each directory.

---

## Directory Layout

```
[project-root]/
├── AGENTS.md                 # Operating manual (read before touching code)
├── ARCHITECTURE.md           # System architecture: layers, flows, boundaries
├── STRUCTURE.md              # This file
├── DESIGN.md                 # UI/UX design system rules
├── Caddyfile                 # Reverse-proxy config (Host header → standalone server)
├── biome.json                # Linter + formatter config
├── next.config.ts            # Next.js config + security headers
├── tsconfig.json             # TypeScript strict; path alias `@/*` → `src/*`
├── tailwind.config.ts        # Tailwind v4 + shadcn/ui tokens
├── postcss.config.mjs        # PostCSS pipeline
├── components.json           # shadcn/ui generator config
├── package.json              # Bun-managed dependencies + scripts
├── bun.lock                  # Locked dependency tree
├── next-env.d.ts             # Next.js ambient types
├── prisma/
│   ├── schema.prisma         # PostgreSQL schema — source of truth for data model
│   └── seed.ts               # Idempotent COPSOQ seed (40 items × 11 dimensions)
├── scripts/
│   └── maintenance.sh        # Cron maintenance job (curl + login cookie)
├── public/                   # Static assets served as-is
│   ├── logo.svg              # Brand logo
│   ├── logo.png              # Brand logo (raster fallback)
│   ├── apple-touch-icon.svg
│   └── robots.txt
├── src/                      # All application code
│   ├── app/                  # Next.js App Router (routes + layouts)
│   ├── components/           # React UI components (feature-grouped)
│   ├── hooks/                # Reusable client-side hooks
│   └── lib/                  # Server + client libraries (single source of truth)
└── db/                       # Legacy SQLite artifact (do not edit — dead code)
```

---

## `src/` Layout

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (HTML shell, fonts, providers)
│   ├── page.tsx                      # The ONLY top-level page (SPA router)
│   ├── not-found.tsx                 # 404 fallback
│   ├── globals.css                   # Tailwind v4 + shadcn CSS variables
│   └── api/v1/                       # All API routes (REST-shaped, /api/v1 prefix)
├── components/                       # UI components, one folder per feature view
│   ├── auth/                         # AuthScreen (login + register)
│   ├── shell/                        # AppShell, TopBar, Sidebar, Logo, GlobalSearch
│   ├── painel/                       # Início dashboard
│   ├── consolidado/                  # Análise consolidada (cross-company)
│   ├── empresas/                     # Companies list + detail + create/edit dialog
│   ├── avaliacoes/                   # Assessment detail + tabs (resultados/inventario/plano)
│   ├── resultados/                   # Per-assessment results view
│   ├── inventario/                   # Risk inventory view (AEP manual)
│   ├── plano/                        # 5W2H action plan view
│   ├── relatorio/                    # PGR report (HTML → print → PDF)
│   ├── configuracoes/                # Account settings
│   ├── worker/                       # Anonymous worker portal (full-screen)
│   ├── layout/                       # Shared layout primitives
│   └── ui/                           # Vendored shadcn primitives — do not edit
├── hooks/                            # Reusable React hooks
│   ├── use-mobile.ts                 # Media-query viewport hook
│   ├── use-unsaved-changes-warning.ts # beforeunload guard
│   └── use-toast.ts                  # Sonner wrapper
└── lib/                              # Server + shared libraries
    ├── api.ts                        # Typed fetch client (BASE = /api/v1)
    ├── cnpj.ts                       # CNPJ validation + formatting
    ├── copsoq-data.ts                # Immutable COPSOQ II-BR seed (40 items, 11 dims)
    ├── db.ts                         # Prisma client singleton
    ├── errors.ts                     # ERROR_CODES + HTTP_STATUS + ApiError
    ├── form-utils.tsx                # react-hook-form + zod helpers
    ├── scoring.ts                    # COPSOQ formula (pure functions)
    ├── scoring-service.ts            # Scoring orchestration + persistence
    ├── session.ts                    # Session/cookie/PBKDF2 + tenant guards
    ├── store.ts                      # Zustand stores (useView + useAuth)
    ├── types.ts                      # DTOs shared between client and server
    └── utils.ts                      # cn() + misc helpers
```

---

## `src/app/api/v1/` Layout

```
src/app/api/v1/
├── auth/
│   ├── login/route.ts                # POST   — exchange credentials for cookie
│   ├── register/route.ts             # POST   — create Professional account
│   └── logout/route.ts               # POST   — clear session cookie + DB row
├── professionals/me/
│   ├── route.ts                      # GET    — current Professional
│   ├── dashboard/route.ts            # GET    — cross-company dashboard
│   └── companies-breakdown/route.ts  # GET    — companies × risk roll-up
├── companies/
│   ├── route.ts                      # GET/POST — list, create
│   └── [id]/
│       ├── route.ts                  # GET/PATCH/DELETE
│       ├── assessments/route.ts      # GET    — assessments for a company
│       ├── departments/
│       │   ├── route.ts              # GET/POST — list, create
│       │   └── [deptId]/route.ts     # GET/PATCH/DELETE
│       └── trend/route.ts            # GET    — historical cycle trend
├── assessments/[id]/
│   ├── route.ts                      # GET/PATCH/DELETE
│   ├── launch/route.ts               # POST   — draft → collecting, issue tokens
│   ├── close/route.ts                # POST   — collecting → processing
│   ├── duplicate/route.ts            # POST   — copy from another assessment
│   ├── simulate/route.ts             # POST   — dev seed (inject fake answers)
│   ├── progress/route.ts             # GET    — response counts per dept
│   ├── score/
│   │   ├── route.ts                  # POST   — trigger runScoring()
│   │   └── status/route.ts           # GET    — last scoring run metadata
│   ├── dashboard/route.ts            # GET    — per-assessment dashboard
│   ├── reports/
│   │   ├── route.ts                  # GET/POST — list, create Report row
│   │   └── generate/route.ts         # POST   — finalize generation
│   ├── risk-inventory/
│   │   ├── route.ts                  # GET    — auto + manual inventory
│   │   └── manual/route.ts           # POST   — AEP manual entry
│   ├── action-plan/route.ts          # GET/PUT — 5W2H plan
│   └── action-items/route.ts         # GET/POST — action item CRUD
├── action-items/[itemId]/route.ts    # PATCH/DELETE — direct on single item
├── risk-inventory-items/[itemId]/route.ts  # PATCH/DELETE — direct on single item
├── reports/[reportId]/
│   ├── status/route.ts               # GET    — report status
│   └── download/route.ts             # GET    — download artifact
├── respond/                          # Anonymous, no auth, no PII
│   ├── token/[token]/
│   │   ├── status/route.ts           # GET    — token validity check
│   │   ├── items/route.ts            # GET    — 40-item questionnaire
│   │   ├── answer/route.ts           # POST   — save one answer
│   │   └── complete/route.ts         # POST   — mark token isUsed=true
│   └── dept/[assessmentDeptId]/route.ts  # POST — dev seed (issue fake tokens)
├── sessions/
│   ├── route.ts                      # GET    — list active sessions
│   ├── [sessionId]/route.ts          # DELETE — revoke a session
│   └── others/route.ts               # DELETE — revoke all other sessions
├── audit-logs/
│   ├── route.ts                      # GET    — paginated audit list
│   └── export/route.ts               # GET    — CSV/JSON export
├── search/route.ts                   # GET    — global search
└── system/                           # On-demand, idempotent maintenance
    ├── seed-copsoq/route.ts          # POST   — re-seed COPSOQ instrument
    ├── run-pending-scoring/route.ts  # POST   — RB-06 convergence
    ├── close-expired/route.ts        # POST   — RB-07 auto-close
    └── cleanup/route.ts              # POST   — purge stale rows
```

---

## Directory Purposes

**`src/app/api/v1/`** — every server route. Each `route.ts` exports `GET`,
`POST`, `PATCH`, or `DELETE`. Every authenticated route starts with
`requireProfessional()` + `requireTenantOwnership(...)`.

**`src/components/<feature>/`** — one folder per top-level view, named to
match the `ViewName` enum in `src/lib/store.ts`. The folder holds the main
view file (`<feature>-view.tsx`) plus any feature-local dialogs, tabs, or
helpers. Views are lazy-loaded by `AppShell`.

**`src/components/ui/`** — vendored shadcn/ui primitives (Button, Card,
Dialog, etc.). Do not edit unless the task is specifically to modify a
primitive.

**`src/components/shell/`** — the persistent chrome: top bar, sidebar,
breadcrumb, logo, global search. Mounted once by `AppShell`.

**`src/components/worker/`** — the anonymous worker portal. Self-contained
full-screen surface; does not share the AppShell.

**`src/lib/`** — server + shared logic. Has no React dependencies except
`form-utils.tsx` and `store.ts`. Treat every file here as production-grade
and multi-tenant-safe.

**`src/hooks/`** — client-side React hooks. Add a new file per hook, named
`use-<thing>.ts` (kebab-case).

**`prisma/`** — schema is the source of truth for the data model. Migrations
live next to the schema after `prisma migrate dev`.

**`scripts/`** — shell automation. `maintenance.sh` is the only one;
invoked by cron and calls the three system routes in order.

**`public/`** — static assets served at the URL root. Logos, icons,
`robots.txt`. No build-time processing.

**`db/`** — dead SQLite-era artifact. **Do not edit.** New code uses
`prisma/schema.prisma` against PostgreSQL.

---

## Key File Locations

**Entry points:**
- `src/app/layout.tsx` — root HTML + providers
- `src/app/page.tsx` — SPA router (auth → shell OR worker portal)
- `src/app/api/v1/**/route.ts` — every API route

**Configuration:**
- `next.config.ts` — standalone output + security headers
- `biome.json` — linter/formatter
- `tsconfig.json` — strict TS + `@/*` path alias
- `tailwind.config.ts` — Tailwind v4 + shadcn tokens
- `prisma/schema.prisma` — PostgreSQL schema
- `.env` — runtime secrets (never read or quote in docs)

**Core logic:**
- `src/lib/scoring.ts` — pure COPSOQ II-BR formula
- `src/lib/scoring-service.ts` — scoring orchestration (idempotent)
- `src/lib/copsoq-data.ts` — immutable scientific seed (RB-05)
- `src/lib/session.ts` — auth, cookie, PBKDF2, tenant guards
- `src/lib/errors.ts` — error catalog + HTTP status map
- `src/lib/store.ts` — Zustand `useView` + `useAuth`

**Tests:** none. The repo has no test suite — do not invent one. (Documented
in `AGENTS.md`.)

---

## Naming Conventions

**Files (TypeScript):**
- `kebab-case.ts` for plain modules — `use-mobile.ts`, `cnpj.ts`,
  `error-utils.ts`.
- `PascalCase.tsx` for React components — `AppShell.tsx`,
  `WorkerPortal.tsx`, `Button.tsx` (matches shadcn convention).
- View files end in `-view.tsx` and live in their feature folder —
  `painel/painel-view.tsx`, `empresas/empresas-view.tsx`.
- Tab files end in `-tab.tsx` — `avaliacoes/tabs/resultados-tab.tsx`.
- Route files are always `route.ts` (Next.js App Router convention).

**Directories:**
- `kebab-case/` for component groups — `auth/`, `shell/`, `worker/`,
  `relatorio/`.
- Sub-features use plural — `tabs/`, `departments/` (when nested).

**API routes:** `/api/v1/<resource>/<id>/<verb>` — verb as a path segment
(`launch`, `close`, `score`, `simulate`), not as an HTTP verb alone, when
the verb changes state.

**Database models:** `PascalCase` in `prisma/schema.prisma`. Foreign keys
are `<Model>Id` strings. Junction tables are `<A><B>` in alphabetical
order (`AssessmentDepartment`, `ResponseToken`).

**Zustand stores:** `useXxx` (camelCase) — `useView`, `useAuth`.

**Error codes:** `SCREAMING_SNAKE_CASE` — `ASSESSMENT_NOT_DRAFT`,
`TOKEN_ALREADY_USED`, `GHE_BELOW_MINIMUM_RESPONSES`.

**Domain constants:** `SCREAMING_SNAKE_CASE` — `K_ANONYMITY_THRESHOLD`,
`SESSION_COOKIE`, `SESSION_TTL_MS`, `ITER` (PBKDF2).

---

## Where to Add New Code

**New view (top-level screen):**
1. Create `src/components/<feature>/<feature>-view.tsx` exporting
   `<FeatureView />`.
2. Add the view name to the `ViewName` union in `src/lib/store.ts`.
3. Register the lazy import + dispatch case in
   `src/components/shell/app-shell.tsx` (inside `lazyView` and
   `renderView`).
4. Add a nav entry in `NAV_GROUPS` in `app-shell.tsx` if it deserves a
   sidebar slot.

**New API route:**
1. Create `src/app/api/v1/<resource>/<id>/<verb>/route.ts` (or
   `route.ts` for a plain resource).
2. Use `RouteCtx = { params: Promise<{ id: string }> }` and `await params`
   before reading.
3. Start with `requireProfessional()` and `requireTenantOwnership(...)`
   for authenticated routes; use `workerJsonResponse` /
   `workerErrorJson` for `/api/v1/respond/*`.
4. Throw via `ApiError(code, ...)` — never raw `Error`.
5. Wrap mutations in `logAudit({ ... })` (fire-and-forget).
6. Add the response DTO to `src/lib/types.ts` and the typed call to
   `src/lib/api.ts`.

**New Prisma model:**
1. Add the model to `prisma/schema.prisma`. Add the relation to any
   reverse-side models.
2. Run `bun run db:push` (dev) or `bun run db:migrate` (interactive
   migration).
3. Add the corresponding DTO to `src/lib/types.ts`.
4. If the model is tenant-scoped, ensure every read filters by
   `professionalId` via `requireTenantOwnership`.

**New scoring dimension or rule:**
1. Edit `src/lib/copsoq-data.ts` only if the dimension is canonical
   COPSOQ II-BR (the seed is immutable per RB-05).
2. Add pure functions to `src/lib/scoring.ts`. Keep `scoring.ts` free of
   Prisma calls.
3. Wire the orchestration in `src/lib/scoring-service.ts` using
   `prisma.$transaction([...])` for multi-step writes.
4. Re-run scoring via `POST /api/v1/assessments/[id]/score` — it is
   idempotent.

**New hook:**
- `src/hooks/use-<thing>.ts` — kebab-case, single export, named
  `use<Thing>`.

**New shared utility:**
- `src/lib/<thing>.ts` — add to the existing `src/lib/` flat layout; do
  not create nested folders.

**New system route (cron-driven, idempotent):**
- `src/app/api/v1/system/<verb>/route.ts` exporting `POST`. The endpoint
  must be safe to call repeatedly (idempotent convergence). Wire to
  `scripts/maintenance.sh` if it belongs to the maintenance batch.

**New shadcn primitive:**
- `src/components/ui/<thing>.tsx` — generate via the shadcn CLI rather
  than hand-rolling; keep the file in the same style as the rest of
  `ui/`.

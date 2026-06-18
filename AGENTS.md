# AGENTS.md

> Operating manual for the **NR-1 Copsoq** platform — a multi-tenant SaaS for
> Occupational Psychosocial Risk Management (NR-1 / COPSOQ II-BR).
>
> Read this before touching code. It encodes the rules that aren't obvious
> from filenames.

---

## 1. Project Snapshot

| Item | Value |
| --- | --- |
| Framework | **Next.js 16** (App Router, standalone output) |
| Language | **TypeScript 5**, strict, `noImplicitAny: true`, `ignoreBuildErrors: false` |
| UI | **React 19**, **Tailwind CSS v4**, **shadcn/ui** (Radix, "new-york" style) |
| Database | **PostgreSQL 18** via **Prisma 6** |
| Client state | **Zustand** only (view + auth) |
| Package manager | **Bun** (lockfile: `bun.lock`) |
| Linter + Formatter | **Biome 2.x** (`biome.json`) |
| Spec | `upload/spec_nr1_copsoq_saas_v3.md` |
| Architecture | `ARCHITECTURE.md` |
| Design tokens | `DESIGN.md` |

The product is a **single-route SPA**: `src/app/page.tsx` is the only top-level
page. Navigation is driven by a Zustand store (`src/lib/store.ts`), not the
file system. The worker questionnaire reuses the same route via
`?worker=<token>` query routing.

---

## 2. Key References (read once, keep in mind)

*   `upload/spec_nr1_copsoq_saas_v3.md` — regulatory + product spec (NR-1 / COPSOQ II-BR).
*   `ARCHITECTURE.md` — request lifecycle, multi-tenancy rules, API surface map.
*   `DESIGN.md` — design tokens (CSS variable names to use, never hardcode colors).
*   `src/lib/errors.ts` — `ERROR_CODES` + `HTTP_STATUS` map. **Always** throw via `ApiError(code, …)`; never return raw `Error.message`.
*   `src/lib/session.ts` — `requireSession`, `requireCompanyAccess`, `requireAssessmentAccess`. **Every** authenticated DB read goes through one of these.
*   `src/lib/scoring.ts` + `src/lib/scoring-service.ts` — COPSOQ II-BR formula + orchestration. Scoring is idempotent: re-running overwrites prior `DimensionResult` rows (RB-06).
*   `src/lib/copsoq-data.ts` — 40 items × 11 dimensions. Treat as immutable scientific seed (RB-05).
*   `next.config.ts` — security headers, worker portal `no-store` cache.

---

## 3. Ground Rules

Non-negotiable. Violations break correctness, security, or compliance.

1.  **Never commit secrets.** No API keys, tokens, or real PII. `.env*` is git-ignored.
2.  **No silent catches.** Every `catch` must `console.error(...)` **and** either re-throw, return a typed `Result`/error response, or trigger a UI failure path.
3.  **No comments unless necessary.** Add a comment only when the *why* is non-obvious (a regulation reference, a numeric threshold, a Postgres-vs-SQLite quirk). The system prompt rule applies.
4.  **Strict TypeScript.** `npx tsc --noEmit` must exit 0. No `any` leaks to public APIs — use `unknown` + narrowing.
5.  **Tenant isolation is sacred.** Every authenticated read/write goes through `src/lib/session.ts` helpers. Never query by raw `id` without a tenant check. There is no DB-level RLS; the application tier is the only line of defense.
6.  **LGPD / privacy first.** The worker portal collects **zero PII** — only an opaque token, a `departmentId`, and 40 Likert answers. Never log token values, IPs tied to a single response, or worker answer payloads.
7.  **Print-safe code.** The PGR report is HTML → `window.print()` → PDF. Any new view that should appear in reports must declare a `print-area` container and respect the `@media print` rules in `src/app/globals.css`.
8.  **Do not commit without explicit user instruction.** Finish the task, report, wait. `git commit` only fires when the user says so.
9.  **Conventional commits in English.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. Atomic — one logical change per commit.
10. **Communicate in the user's language.** PT-BR or EN — match the input.

---

## 4. Repository Layout

```
.
├── prisma/
│   ├── schema.prisma          # source of truth for the database
│   └── seed.ts                # COPSOQ II-BR scientific seed (registered as prisma.seed)
├── src/
│   ├── app/
│   │   ├── page.tsx           # SPA entry — boots auth, view, worker portal
│   │   ├── layout.tsx         # fonts, toasters, html lang=pt-BR
│   │   ├── globals.css        # design tokens + @media print rules
│   │   └── api/v1/            # REST surface (see ARCHITECTURE.md §3.3)
│   ├── components/
│   │   ├── auth/              # login / register
│   │   ├── shell/             # sidebar, top bar, breadcrumbs, global search
│   │   ├── ui/                # shadcn primitives — vendored, do not edit casually
│   │   ├── painel/            # dashboard
│   │   ├── empresas/          # companies + departments CRUD
│   │   ├── avaliacoes/        # assessment lifecycle
│   │   ├── resultados/        # radar + dimension analysis
│   │   ├── inventario/        # risk inventory (auto + manual AEP)
│   │   ├── plano/             # 5W2H action plan
│   │   ├── relatorio/         # PGR print/PDF report
│   │   ├── consolidado/       # cross-company trends
│   │   ├── configuracoes/     # professional settings
│   │   └── worker/            # anonymous worker portal
│   ├── hooks/                 # use-toast, use-mobile
│   └── lib/
│       ├── api.ts             # typed client wrapping /api/v1
│       ├── db.ts              # PrismaClient singleton
│       ├── session.ts         # auth, sessions, tenant checks
│       ├── scoring.ts         # COPSOQ II-BR formula (raw, alpha, inversions)
│       ├── scoring-service.ts # orchestration (transaction, idempotency)
│       ├── copsoq-data.ts     # 40 items × 11 dimensions (immutable seed)
│       ├── form-utils.tsx     # BR masks (phone, BRL), validation
│       ├── cnpj.ts            # CNPJ check-digit + formatting
│       ├── errors.ts          # ERROR_CODES + HTTP_STATUS
│       ├── store.ts           # Zustand: view + auth state
│       ├── types.ts           # DTOs shared client/server
│       └── utils.ts           # cn() className helper
├── scripts/maintenance.sh     # cron-driven: close-expired, run-pending-scoring, cleanup
├── upload/spec_nr1_copsoq_saas_v3.md
├── ARCHITECTURE.md            # system architecture
├── DESIGN.md                  # design tokens
├── Caddyfile                  # production reverse proxy
├── next.config.ts             # standalone output, security headers
├── tsconfig.json              # strict mode, path alias @/* → ./src/*
├── biome.json                # linter + formatter + import sort
├── components.json            # shadcn config (aliases, lucide icons)
└── package.json               # scripts, deps, prisma.seed registry
```

Top-level `db/` (contains a stale `custom.db` SQLite file) and `mini-services/`
(empty) are **legacy artifacts from the pre-PostgreSQL build** — don't put new
code there. `upload/` holds the spec + scratch paste buffer; don't import from
it at runtime.

---

## 5. Local Environment

### 5.1 Prerequisites

*   **Bun** ≥ 1.3 (lockfile is `bun.lock`).
*   **PostgreSQL 18** reachable at `localhost:5432` under the current OS user.
*   A `.env` file in the repo root with:
    ```env
    DATABASE_URL=postgresql://<user>@localhost:5432/gerenciamento_riscos
    ```

### 5.2 First-time setup

```bash
bun install
bun run db:push               # sync schema → db (dev)
bunx prisma db seed           # COPSOQ items + dimensions (registered via prisma.seed)
bun run dev                   # http://localhost:3000  (logs to dev.log)
```

### 5.3 Daily commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Local dev server, hot reload, logs to `dev.log` |
| `bun run build` | Production build (also copies `.next/static` + `public/` into `standalone/`) |
| `bun run start` | Run the standalone build (`server.js`), logs to `server.log` |
| `bun run lint` | Biome check (linter + formatter + import sort) |
| `npx tsc --noEmit` | Type-check without emit |
| `bun run db:push` | Sync schema after a `schema.prisma` change |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Create + apply a migration |
| `bun run db:reset` | Drop + recreate the dev DB |
| `bun prisma/seed.ts` | Idempotent COPSOQ seed (also `bunx prisma db seed`) |
| `bun run scripts/maintenance.sh` | Manual run of the cron maintenance job |

> **There is no test suite in this repo.** Do not invent one without checking
> with the user first. The verification gate for a change is:
> `bun run lint && npx tsc --noEmit && bun run build` (the last only when the
> change touches build, routing, or Prisma schema).

---

## 6. Coding Standards

### 6.1 TypeScript

*   Strict mode. `noImplicitAny` is **on**. Don't suppress with `// @ts-ignore`.
*   Prefer `interface` for DTOs, `type` for unions/aliases.
*   API inputs are Zod-validated *or* runtime-guarded inside `lib/session.ts` helpers. Never trust the wire.
*   Discriminated unions for state (`{ status: "loading" } | { status: "ready", data: T } | { status: "error", error: E }`).

### 6.2 React

*   **Functional components only.** No classes.
*   Hooks at the top, never conditional. Custom hooks start with `use`.
*   `useEffect` is for side effects only (boot, subscriptions). For derived data use `useMemo`/inline.
*   Server Components by default; opt into `"use client"` only when you need state, effects, or browser APIs.
*   Lists: stable `key` prop, never array index when the list is reorderable.

### 6.3 Styling

*   Tailwind v4 utility classes. No inline `style=` unless dynamic CSS vars.
*   Tokens live as CSS variables in `globals.css` (see `DESIGN.md`). Never hardcode colors — use the `bg-risk-high`, `text-muted-foreground` style names.
*   Use the `cn()` helper (`src/lib/utils.ts`) for conditional class merging.

### 6.4 Forms

*   `react-hook-form` + `@hookform/resolvers` + Zod (when applicable).
*   For BR-specific input (CNPJ, phone, BRL) use helpers in `src/lib/form-utils.tsx` (`MaskedInput`, `validateCnpj`, …).
*   Server errors come back as `{ error: { code, message } }`; map via `src/lib/errors.ts`.

### 6.5 API routes

*   File path mirrors the URL: `app/api/v1/<resource>/<action>/route.ts`.
*   Always start with `await requireSession(req)` (or `requireAnonymous` for the worker portal).
*   Return shape: `jsonResponse(payload, status)` or `errorJson(code, message)`.
*   Mutating routes call `auditLog.write(...)` with actor, resource, and **sanitized** metadata. Never include tokens, passwords, or full response payloads.

### 6.6 Database

*   Prisma is the only ORM. Don't add Drizzle, Knex, raw SQL builders, etc.
*   Dev uses `bun run db:push`. Document destructive changes in the commit message.
*   Multi-step writes: wrap in `prisma.$transaction([...])`. Scoring is idempotent — re-running overwrites prior `DimensionResult` rows (RB-06).

---

## 7. Domain Glossary (NR-1 / COPSOQ II-BR)

If you don't know these, you will write the wrong code.

| Term | Meaning |
| --- | --- |
| **NR-1** | Brazilian regulatory norm 1 — general occupational risk management. |
| **COPSOQ II-BR** | Copenhagen Psychosocial Questionnaire — Brazilian short version, 40 items × 11 dimensions. |
| **PGR** | Programa de Gerenciamento de Riscos — the risk-management program the report generates. |
| **MTE** | Ministério do Trabalho e Emprego — 13 psychosocial factors (F1..F13) mapped to dimensions. |
| **k ≥ 5** | Minimum responses per department for a dimension result to be statistically eligible. |
| **AEP** | Avaliação de Exposições Psicossociais — manual entry by the professional. |
| **5W2H** | Action-plan methodology: What, Why, Who, Where, When, How, plus cost. |
| **Cronbach's α** | Internal-consistency reliability index; surfaced in scoring output. |
| **Token** | Opaque, single-use URL slug used by workers to answer anonymously. |

---

## 8. Workflow for the Agent

A typical task:

1.  **Read the request.** If ambiguous, ask one focused question.
2.  **Locate.** Use `grep` / file search to find the relevant module. Read adjacent files to learn the convention before editing.
3.  **Plan.** For anything > 1 file, sketch the change (or a TODO list) before touching code. Identify tenant-isolation points.
4.  **Edit.** Minimal diff. Keep public API stable unless the task is to change it.
5.  **Self-check.**
    *   `npx tsc --noEmit` → 0 errors.
    *   `bun run lint` → 0 warnings.
    *   `bun run build` (only if the change touches build, routing, or `schema.prisma`).
6.  **Report.** Tell the user exactly what changed, in which files, and the commands to verify. Don't commit unless explicitly asked.

---

## 9. Anti-patterns (Things You Should Not Do)

*   Adding a new npm dependency without checking `package.json` first (or asking).
*   Introducing a second state-management library alongside Zustand.
*   Fetching Prisma records without a `professionalId` (or `token`) check.
*   Returning raw `Error.message` to the client. Use the `ERROR_CODES` catalog.
*   Adding `@ts-ignore` / `@ts-expect-error` to silence a type problem. Fix the type or refactor.
*   Writing comments that restate the code (`// increment i`).
*   Auto-running `git commit` or `git push` without permission.
*   Touching `src/components/ui/*` shadcn primitives unless the change is the actual task; these are vendored.
*   Hardcoding environment-specific paths in scripts (`/home/<user>/...`). Resolve from `process.cwd()` or relative globs.
*   Editing `db/custom.db` or adding anything to `mini-services/` — both are dead legacy dirs from the SQLite era.

---

## 10. When in Doubt

*   Re-read the spec: `upload/spec_nr1_copsoq_saas_v3.md`.
*   Check `ARCHITECTURE.md` for the data-flow question (multi-tenancy, scoring, state machine).
*   Look at the closest neighbour component — copy the pattern, don't invent.
*   Search for the type/error message in the repo first; the answer is usually already in `lib/errors.ts` or `lib/types.ts`.
*   If something feels over-engineered, it probably is. Keep it boring.

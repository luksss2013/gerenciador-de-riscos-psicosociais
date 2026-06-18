# ARCHITECTURE.md

> System architecture for the **NR-1 Copsoq** platform.
>
> A multi-tenant SaaS for Occupational Psychosocial Risk Management built on
> Next.js 16 (App Router) + PostgreSQL 18 + Prisma 6. This document maps the
> code: where things live, how data flows, and the boundaries that must not
> be crossed.

---

## 1. High-Level View

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (PT-BR)                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Auth Screen │  │  App Shell   │  │ Worker Portal│                  │
│  │ (unauth)    │  │  (Zustand)   │  │  (?worker=)  │                  │
│  └─────────────┘  └──────────────┘  └──────────────┘                  │
└────────┬─────────────────────┬─────────────────┬──────────────────────┘
         │ /api/v1/auth/*     │ /api/v1/*        │ /api/v1/respond/*
         ▼                     ▼                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js 16 API Routes (src/app/api/v1)                              │
│  ─ session guards (requireSession / requireAnonymous)                │
│  ─ tenant checks (requireCompanyAccess / requireAssessmentAccess)    │
│  ─ zod validation, ERROR_CODES → HTTP status                         │
└────────┬─────────────────────────────────────────────────────────────┘
         │ Prisma 6 client
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PostgreSQL 18 (single instance, multi-tenant via professionalId)   │
│  ─ Professional / Session / Company / Department                    │
│  ─ Assessment / AssessmentDepartment / ResponseToken / ResponseAnswer│
│  ─ DimensionResult / RiskInventoryItem / ActionPlan / ActionItem    │
│  ─ Report / AuditLog                                                 │
│  ─ CopsoqItem / CopsoqDimension (immutable seed)                    │
└──────────────────────────────────────────────────────────────────────┘
```

The system is **a single Next.js process** with one PostgreSQL database.
There is no separate API service, no Redis, no message queue. The product is
shipped as a Next.js standalone build (`bun run build` → `server.js`).

---

## 2. Request Lifecycle

Every API request follows the same path. This is enforced by convention and
spot-checked during code review.

```
incoming Request
  │
  ▼
requireSession(req)        ← reads nr1_session cookie, loads Session + Professional
  │
  ▼
requireCompanyAccess(pro, id)     ← tenant isolation: pro.id must own the resource
  │           (or)
  ▼
requireAssessmentAccess(pro, id)  ← traverse Assessment → Company → pro check
  │
  ▼
Zod parse of body / query / params
  │
  ▼
Domain logic (Prisma queries)
  │
  ▼
auditLog.write({ actor, action, resource, metadata })   ← for mutations
  │
  ▼
jsonResponse(payload, status)   ← never throw raw Error.message to client
```

The error envelope is always:

```json
{ "error": { "code": "ASSESSMENT_NOT_DRAFT", "message": "...", "details": { } } }
```

`ApiError` (`src/lib/errors.ts`) is the only way to short-circuit. The
`HTTP_STATUS` map translates `ErrorCode` → HTTP code; never hardcode a status.

---

## 3. Routing Model

### 3.1 Single-route SPA

`src/app/page.tsx` is the **only top-level page**. It renders one of three
things based on global state:

1.  **Loading spinner** — `useAuth().loading === true`.
2.  **`<AuthScreen />`** — `useAuth().professional === null`.
3.  **`<AppShell />`** — authenticated.
    *   Plus a side door: if `useView().view === "worker"`, the
        `<WorkerPortal />` is rendered full-screen instead.

The view is driven by the Zustand store `useView` (`src/lib/store.ts`):

```ts
type ViewName =
  | "painel" | "consolidado" | "empresas" | "empresa"
  | "avaliacao" | "resultados" | "inventario" | "plano"
  | "relatorio" | "configuracoes" | "worker";
```

Context IDs (`companyId`, `assessmentId`, `workerToken`) are passed alongside
the view name when the user navigates. No URL routing — the URL stays at `/`
except for the worker portal's `?worker=<token>`.

### 3.2 Worker portal routing

When a professional generates response tokens, each token is a URL like
`https://app.example.com/?worker=<token>`. The page boots, sees the query
param, and switches to `<WorkerPortal />`. The portal:

*   Loads items via `GET /api/v1/respond/token/<token>/items`.
*   Posts answers to `POST /api/v1/respond/token/<token>/answer`.
*   On final question, posts `POST .../complete` which marks the token
    `isUsed = true`.
*   Sets `Cache-Control: no-store` so a shared device doesn't leak state.
*   Collects **zero PII** — no name, no email, no IP-based tracking.

### 3.3 API surface

```
src/app/api/v1/
├── auth/                       login, register, logout
├── professionals/me/           me, dashboard, companies-breakdown
├── companies/                  list, create, [id] (GET/PATCH/DELETE),
│   └── [id]/                   assessments, departments, trend
├── departments/                (under companies/[id]/departments)
├── assessments/[id]/           GET/PATCH/DELETE,
│   ├── launch/                 transition: draft → collecting (issue tokens)
│   ├── close/                  transition: collecting → processing
│   ├── duplicate/              copy from another assessment
│   ├── simulate/               dev-only: inject fake answers
│   ├── progress/               response counts per dept
│   ├── score/                  trigger scoring + status
│   ├── dashboard/              per-assessment dashboard data
│   ├── reports/                list + generate
│   ├── risk-inventory/         auto + manual inventory
│   ├── action-plan/            5W2H plan
│   └── action-items/           per-item CRUD
├── action-items/[itemId]/      direct PATCH/DELETE on a single item
├── risk-inventory-items/[itemId]/
├── reports/[reportId]/         status, download
├── respond/
│   ├── token/[token]/          items, answer, complete, status (anonymous)
│   └── dept/[assessmentDeptId]/ dev seed
├── sessions/                   list, [id], others
├── audit-logs/                 list, export
├── search/                     global search
└── system/                     cleanup, close-expired, run-pending-scoring,
                                seed-copsoq
```

---

## 4. Multi-Tenancy

**PostgreSQL has no RLS policies** in this build. Tenancy is enforced
entirely in the application tier.

The rules:

1.  `Professional.id` is the tenant root.
2.  `Company.professionalId` must match the session's `professional.id`.
3.  `Assessment.professionalId` must match.
4.  `Department` is reached through `Company`.
5.  `ResponseToken` is reached through `AssessmentDepartment → Assessment`.

The helpers in `src/lib/session.ts` are the **only** way to enter this
graph:

```ts
await requireCompanyAccess(professional, companyId);
await requireAssessmentAccess(professional, assessmentId);
```

A safe Prisma query always starts with `where: { id, professionalId: pro.id }`
*or* a `requireXxxAccess` call before the query. **There is no
`db.company.findUnique({ where: { id } })` in the codebase.** This is enforced
by code review and a strict project rule.

---

## 5. The Assessment Lifecycle

```
┌────────┐  launch  ┌────────────┐  close  ┌─────────────┐  score  ┌────────────┐
│ draft  │ ───────▶ │ collecting │ ──────▶ │ processing  │ ──────▶ │ completed  │
└────────┘          └────────────┘         └─────────────┘         └────────────┘
   │                       │                       │                       │
   │                       │                       │                       ▼
   │                       │                       │                  ┌──────────┐
   │                       │                       │                  │ archived │
   │                       │                       │                  └──────────┘
   │                       ▼                       ▼
   │                  workers hit          runScoring() writes
   │                  ?worker= URLs        DimensionResult rows
   │
   └── (delete only)
```

State transitions are explicit. Each transition is its own route:

*   `POST /api/v1/assessments/[id]/launch` — issues tokens, transitions to
    `collecting`. Idempotent: re-issuing a token is a no-op if the assessment
    is already in `collecting`.
*   `POST /api/v1/assessments/[id]/close` — flips to `processing`, freezes
    token acceptance.
*   `POST /api/v1/assessments/[id]/score` — calls `runScoring()`, flips to
    `completed`.
*   `PATCH /api/v1/assessments/[id]` with `{ status: "archived" }` — moves
    completed assessments out of the dashboard.

The state machine is the only place where transitions can happen. A direct
`db.assessment.update` with a status change in any other route is a bug.

---

## 6. Scoring Pipeline

The COPSOQ II-BR scoring formula is defined in `src/lib/scoring.ts`. The
orchestration is in `src/lib/scoring-service.ts`.

### 6.1 Per-department (GHE) score

For each `AssessmentDepartment`:

1.  Load used `ResponseToken` rows with their `ResponseAnswer`s.
2.  Build `answersByToken: { itemIndex, likertValue }[][]` — one array per
    respondent.
3.  Call `scoreDepartment(answersByToken)`:
    *   If `nResponses < 5` → return `null` (RB-10: k-anonymity).
    *   Else, for each of the 11 dimensions:
        *   Compute `s_item(r) = (r - 1) / 4 * 100`.
        *   Average over items × respondents → `s_bruto`.
        *   Apply direction: `s_risco = direction == INVERTED ? 100 - s_bruto : s_bruto`.
        *   Classify `s_risco` → `LOW` (≤33), `MEDIUM` (≤66), `HIGH` (>66).
        *   Compute Cronbach's α over the item-scores matrix (null if k<2).
4.  **Idempotency**: delete any existing `DimensionResult` rows for this
    `AssessmentDepartment` and insert the new ones. Re-running scoring
    always converges to the same result (RB-06).
5.  Mark `isEligible = true` or `false` on the `AssessmentDepartment`.

### 6.2 Company-level aggregate

`companyWeightedAverage()` in `src/lib/scoring.ts` weights each eligible
department's `riskScore` by its `nResponses` and averages. The result is the
company-wide risk profile used in the `consolidado` view.

### 6.3 Risk inventory auto-items

For every `AssessmentDepartment × Dimension` where the dimension is `HIGH`,
the system creates a `RiskInventoryItem` with default `P=3, S=3`. Lower
levels use `P=S=1` or `2/2`. Professionals can override (AEP manual) via
`/api/v1/assessments/[id]/risk-inventory/manual`.

---

## 7. Data Model Highlights

The Prisma schema (`prisma/schema.prisma`) is the source of truth. The
essentials:

*   **Professional** — email + PBKDF2 password hash. The tenant root.
*   **Session** — DB-backed (no in-memory map). Token is a 64-char hex
    string. TTL is 7 days.
*   **Company** — CNPJ is unique, but per professional (a CNPJ can exist
    twice if owned by different professionals, though typically not).
*   **Department** — unique `(companyId, name)`. Has `workerCount` for k
    thresholding.
*   **Assessment** — has a status string and FKs to `companyId` +
    `professionalId` (defense in depth on tenant isolation).
*   **AssessmentDepartment** — junction: assessment × department, with
    `expectedResponses`, `responseCount`, `isEligible`. Token count is
    derived from `responseTokens.length`.
*   **ResponseToken** — opaque, single-use URL slug. The worker's only
    identifier.
*   **ResponseAnswer** — `@@unique([tokenId, itemIndex])`. 40 rows per
    completed response.
*   **DimensionResult** — `@@unique([assessmentDepartmentId, dimensionCode])`.
    Idempotently rewritten by scoring.
*   **RiskInventoryItem** — NR-1 inventory (P × S matrix). Either auto
    (from scoring) or manual (AEP).
*   **ActionPlan** + **ActionItem** — 5W2H plan. `actionPlan` is 1:1 with
    `assessment`; `actionItem` is 1:N.
*   **Report** — generated file pointer. `type ∈ {pdf, docx, html}`,
    `status ∈ {processing, ready, error}`. The actual rendering happens in
    the browser (HTML → print to PDF), so the `Report` row mostly records
    metadata + generation timestamp.
*   **AuditLog** — append-only. One row per mutation. Sanitized metadata
    only (no tokens, no PII).
*   **CopsoqItem** + **CopsoqDimension** — seeded once via `prisma/seed.ts`
    and never mutated at runtime (RB-05: scientific immutability).

---

## 8. The Print/PDF Report

The PGR report does **not** use a server-side PDF generator. The flow:

1.  Professional opens the `relatorio` view for a completed assessment.
2.  The view renders the report as semantic HTML inside
    `<div class="print-area">`.
3.  The "Imprimir / Salvar PDF" button calls `window.print()`.
4.  CSS in `globals.css` under `@media print` removes shadows, borders, and
    `.no-print` elements.
5.  The browser's built-in print-to-PDF produces the final artifact.

This is intentional:

*   No additional binary dependency (no `puppeteer`, no `wkhtmltopdf`).
*   The HTML is the source of truth — same code renders to screen and PDF.
*   The standalone build can produce the report on any device with a browser.

If/when server-side PDF is needed, the rendering layer is the only thing
that changes — the data flow stays.

---

## 9. State Management

We use **Zustand** for two stores only (`src/lib/store.ts`):

*   `useView` — `{ view, companyId, assessmentId, workerToken, ... }`. The
    SPA's current "page" and context. Setters: `go()`, `openWorker()`,
    `closeWorker()`, `setActionItemPrefill()`, `setInventoryPrefill()`.
*   `useAuth` — `{ professional, loading, set, setLoading }`. The
    authenticated user.

That is the **entire** client state. Everything else is server data fetched
on demand via the typed `api` client (`src/lib/api.ts`) and cached per-route
in component-local state.

**Do not add another store** unless you can articulate why React Query/SWR
+ per-component state doesn't solve the problem.

---

## 10. Error Handling

| Layer | Strategy |
| --- | --- |
| API route | `try { ... } catch (ApiError e) { errorJson(e.code, e.message) } catch (e) { console.error(...); errorJson(INTERNAL_ERROR) }` |
| Scoring | Returns `null` on ineligible departments — caller decides. Never throws. |
| Validation | Zod schema → `ApiError(VALIDATION_ERROR, "...")` with `details`. |
| UI | Sonner toast on API errors. Inline `<FieldError>` for form errors. |

There is **no global error boundary** for the SPA. Unhandled errors bubble
to the browser console and trigger a hard refresh. This is acceptable for a
data-entry product; an error boundary would mask real bugs.

---

## 11. Background & System Jobs

The platform has no long-running worker. Three "system" routes exist for
explicit, on-demand operations:

*   `POST /api/v1/system/seed-copsoq` — idempotent; auto-called on first
    client load as a safety net.
*   `POST /api/v1/system/run-pending-scoring` — re-runs scoring for any
    assessment whose status is `processing` or `completed` (idempotent
    convergence).
*   `POST /api/v1/system/close-expired` — flips assessments whose
    `endDate` is in the past and status is `collecting` to `processing`.
*   `POST /api/v1/system/cleanup` — purges `Draft` assessments older than
    30 days.

In production these are intended to be wired to a cron trigger (Vercel
Cron, GitHub Actions, k8s CronJob). The routes are idempotent so a
mis-fired cron is harmless.

---

## 12. Security Model

*   **Passwords**: PBKDF2 via Web Crypto (`src/lib/session.ts`). 100k
    iterations, 16-byte salt, 32-byte derived key. No external bcrypt dep.
*   **Sessions**: 64-char hex token in an `HttpOnly`, `SameSite=Lax`,
    `Secure` cookie named `nr1_session`. The token is the only thing in
    the cookie — the lookup happens in the `Session` table.
*   **CSRF**: SameSite=Lax + the fact that all mutating routes are POST/PATCH/DELETE
    with no GET side effects is the primary defense. There is no separate
    CSRF token.
*   **Tenant isolation**: Application-layer (see §4). Every read goes
    through `requireXxxAccess`.
*   **Worker portal**: No cookies, no auth, no PII. Token in the URL is the
    entire trust model — leaking a token is the same as submitting a
    response.
*   **Headers**: `next.config.ts` sets `X-Frame-Options: DENY`,
    `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    and a restrictive CSP. The worker portal route also sets
    `Cache-Control: no-store` to prevent shared-device leaks.

---

## 13. Build & Deployment

*   **Build**: `bun run build` → `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`. The standalone output runs via `bun run start` (`bun .next/standalone/server.js`).
*   **DB**: `bunx prisma db push` for dev, `bunx prisma migrate deploy` for prod.
*   **Seed**: `bun prisma/seed.ts` (idempotent).
*   **Lint + typecheck gate**: `bun run lint && npx tsc --noEmit`.

The project is environment-agnostic. The previous build depended on a
proprietary SDK and a hardcoded `/home/z/my-project` path; both have been
purged. There are no environment-specific assumptions outside `.env`.

---

## 14. What This Document Is Not

*   Not a tutorial. For "how do I add a feature", see `AGENTS.md` and the
    existing neighbour component.
*   Not exhaustive. It documents the boundaries and the *why*. Inline
    code-level comments are intentionally scarce (per project rules).

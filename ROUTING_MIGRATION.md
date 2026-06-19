# Routing Migration — Single-Route SPA → Next.js App Router

> Plan for migrating the NR-1 Copsoq professional app from a Zustand-driven
> single-route SPA to Next.js App Router nested routes, restoring browser
> back/forward, deep links, and shareable URLs. This document is the input
> for the `to-prd` and `to-issues` skills.
>
> Status: PROPOSED — awaiting approval before any code changes.

---

## 1. Problem Statement

The professional app is a single-route SPA (`src/app/page.tsx` is the only
top-level page). All navigation is driven by a Zustand store (`useView.go(view,
{companyId, assessmentId})`), which **never pushes browser history entries**.
Consequences a professional user (or developer/QA) hits daily:

- **No browser back/forward.** Hitting back leaves the app entirely. There is no
  way to undo a nav within the app.
- **No deep links.** A user (or an email notification, or a developer) cannot
  bookmark or share `https://app/empresas/<id>/avaliacoes/<aid>/resultados`.
  Every entry point lands on the Painel and requires clicking through.
- **No URL reflects state.** Refreshing the page loses the current view/context
  (companyId/assessmentId live only in memory). DevTools and analytics can't
  see "which page."
- **Worker portal isolation is improvised.** The portal reuses the same route
  via `?worker=<token>`. It works, but it doesn't enforce the spec's §3.2
  "separate, cookie-less context" — it's a query param on the professional app,
  not a distinct route.

The worker portal's `?worker=<token>` *is* already shareable, so "send links"
is solved for workers; the gap is the **professional app**.

## 2. Goals & Non-Goals

### Goals
- Browser back/forward works for all professional-app navigation.
- Every professional view is deep-linkable and refresh-stable
  (`/empresas/[id]/avaliacoes/[aid]/resultados`).
- Worker portal moves to a dedicated, cookie-less, no-auth route
  (`/portal/[token]`) — cleaner isolation, matches spec §3.2.
- Minimal blast radius: keep Zustand for what it's good at (auth, transient
  cross-module prefill); only the *router* role moves to App Router.
- Preserve every existing user flow and cross-module shortcut (Module 8 → 9 → 10
  prefill, breadcrumb, collection links).

### Non-Goals
- No stack change (still Next.js 16 + Prisma + Zustand). The spec's Vite +
  TanStack Router is explicitly out of scope per the Product Alignment directive.
- No new state library. Zustand stays for auth + prefill.
- No server components conversion of views (they stay `"use client"`; routing is
  the only structural change).
- No redesign — visual stays per `DESIGN.md`. (Routing first, then design.)
- Not touching the API (`/api/v1/**`) at all.

## 3. Proposed Route Map

Mirrors the spec §1.3 sidebar hierarchy. All professional routes require a
session cookie (`nr1_session`); a root layout guard redirects unauthenticated
users to the auth screen.

```
Professional app (session required):
  /                                   → redirect to /painel (or /auth if no session)
  /painel                             → Painel (Module 12)
  /empresas                           → Empresas list (Module 4)
  /empresas/[companyId]               → Empresa detail (tabs: overview/depts/avaliações)
  /empresas/[companyId]/avaliacoes/[assessmentId]
                                      → Avaliação detail hub (Module 5)
  /empresas/[companyId]/avaliacoes/[assessmentId]/resultados   → Module 8
  /empresas/[companyId]/avaliacoes/[assessmentId]/inventario   → Module 9
  /empresas/[companyId]/avaliacoes/[assessmentId]/plano-de-acao→ Module 10
  /empresas/[companyId]/avaliacoes/[assessmentId]/relatorio     → Module 11
  /configuracoes                      → Settings/profile (Module 3)
  /consolidado                        → Análise consolidada (enhancement, keep)

Auth (no session):
  /auth                               → login + register tabs (current AuthScreen)

Worker portal (NO session, cookie-less, isolated layout):
  /portal/[token]                     → Worker questionnaire (Module 6)
```

### Route → current view mapping

| New route | Current `useView` view | Component (keep) |
|---|---|---|
| `/painel` | `painel` | `PainelView` |
| `/empresas` | `empresas` | `EmpresasView` |
| `/empresas/[companyId]` | `empresa` | `EmpresaDetailView` |
| `/empresas/[companyId]/avaliacoes/[assessmentId]` | `avaliacao` | `AvaliacaoDetailView` |
| `…/resultados` | `resultados` | `ResultadosView` |
| `…/inventario` | `inventario` | `InventarioView` |
| `…/plano-de-acao` | `plano` | `PlanoView` |
| `…/relatorio` | `relatorio` | `RelatorioView` |
| `/configuracoes` | `configuracoes` | `ConfiguracoesView` |
| `/consolidado` | `consolidado` | `ConsolidadoView` |
| `/auth` | (rendered when `!professional`) | `AuthScreen` |
| `/portal/[token]` | `worker` (via `?worker=`) | `WorkerPortal` |

## 4. Architectural Decisions

### 4.1 Router: Next.js App Router (nested `page.tsx`)
Real nested routes per the map above. `params`/`searchParams` are async in
Next 16 (await them — already a documented gotcha).

### 4.2 Zustand keeps auth + prefill; loses nav
- `useAuth` — **unchanged** (professional, loading, set, setLoading).
- `useView` — **gutted to non-nav state only**:
  - REMOVE: `view`, `companyId`, `assessmentId`, `workerToken`, `go()`, `openWorker()`, `closeWorker()`.
  - KEEP: `actionItemPrefill`, `setActionItemPrefill`, `inventoryPrefill`, `setInventoryPrefill`.
  - These are transient cross-module handoffs (Module 8 "→ Ação" pre-fills the
    Module 10 create modal). They don't belong in the URL (not shareable state)
    and survive naturally as in-memory Zustand. Alternatively they could become
    `?prefill=dim:D8` query params — **decision needed** (see Open Questions).
- `go(view, opts)` calls across all view components → replaced by
  `useRouter().push('/...')` or `<Link href>`.
- Worker open/close → replaced by `router.push('/portal/[token]')` / back.

### 4.3 Auth guard: root layout
A professional-app root `layout.tsx` server-component reads the session cookie
(via `cookies()` — async in Next 16) and redirects to `/auth` if absent. The
`/portal/[token]` route has its OWN layout with NO auth guard (spec §3.2 —
cookie-less, no session). The `/auth` route also has no guard.

### 4.4 Worker portal isolation
`/portal/[token]/page.tsx` + its own `layout.tsx` (no shared professional chrome,
no session check, no sidebar/footer). This enforces spec §3.2 at the route
level rather than via a query param. The portal still calls the public
`/api/v1/respond/token/[token]/*` endpoints — unchanged.

### 4.5 Breadcrumb
`BreadcrumbBar` currently derives crumbs from `useView.view`. It will derive
from `usePathname()` + route params instead. Depth semantics preserved:
`Empresas › [Nome] › Avaliações › [Ciclo] › Resultados`.

### 4.6 AGENTS.md invariants updated
- "Single-route SPA" gotcha → **retired**, replaced with a "Route map" section.
- "No second state lib" → **kept** (Zustand stays).
- New gotcha: "Nav is router-driven now; `useView` is auth + prefill only."

## 5. File-by-File Change List (indicative)

> `to-issues` will turn this into vertical slices; exact paths may shift.

**New (routes):**
- `src/app/(professional)/layout.tsx` — auth guard, renders `AppShell` chrome.
- `src/app/(professional)/painel/page.tsx`
- `src/app/(professional)/empresas/page.tsx`
- `src/app/(professional)/empresas/[companyId]/page.tsx`
- `src/app/(professional)/empresas/[companyId]/avaliacoes/[assessmentId]/page.tsx`
- `…/resultados/page.tsx`, `…/inventario/page.tsx`, `…/plano-de-acao/page.tsx`, `…/relatorio/page.tsx`
- `src/app/(professional)/configuracoes/page.tsx`
- `src/app/(professional)/consolidado/page.tsx`
- `src/app/auth/page.tsx` (+ layout, no guard)
- `src/app/portal/[token]/page.tsx` (+ layout, no guard, isolated)
- `src/app/page.tsx` — becomes a redirect to `/painel` (or `/auth`).

**Modified:**
- `src/lib/store.ts` — gut `useView` to prefill-only (per 4.2).
- `src/components/shell/app-shell.tsx` — drop `renderView(view)` switch; shell
  now wraps `children` (the matched route page). Sidebar `go()` → `<Link>`.
- `src/components/shell/breadcrumb-bar.tsx` — derive from `usePathname()`.
- All view components (`painel-view`, `empresas/*`, `avaliacoes/*`,
  `resultados-view`, `inventario-view`, `plano-view`, `relatorio-view`,
  `configuracoes-view`, `consolidado-view`) — replace `useView().go()` with
  `useRouter().push()` / `<Link>`; read `companyId`/`assessmentId` from route
  `params` instead of the store.
- `src/components/worker/worker-portal.tsx` — drop `closeWorker()`; use
  `router.back()` / it's a standalone route now.
- `AGENTS.md` — update invariants (4.6).

**Deleted:**
- The `view`/`go`/`openWorker`/`closeWorker` machinery in `store.ts`.
- The `?worker=<token>` handling in the old `page.tsx` (replaced by `/portal/[token]`).

## 6. Testing Strategy

- **No test suite exists** in this repo (per AGENTS.md). Verification is manual
  + the existing verification gate (`tsc --noEmit`, `biome check`, `bun run build`).
- **Playwright MCP** (now configured) becomes the primary regression tool:
  - Deep-link test: navigate directly to each route URL → correct view renders.
  - Back/forward test: click through Painel → Empresa → Avaliação → Resultados,
    then browser back 3× → lands on Painel.
  - Refresh test: on `…/resultados`, refresh → same view, same context.
  - Worker isolation test: `/portal/[token]` has no professional chrome, no
    session cookie sent.
  - Auth guard test: unauthenticated → `/painel` redirects to `/auth`.
- **Acceptance** = all of the above pass + `tsc --noEmit` 0 + `bun run build` OK.

## 7. Sequencing vs DESIGN.md

**Routing first, design second.** Doing visual work on soon-to-be-replaced view
files is wasted effort. Once routes exist, the DESIGN.md application (§12 of
DESIGN.md) targets the new route pages directly.

## 8. Open Questions (need user decision before PRD)

1. **Prefill in URL or Zustand?** Cross-module prefill (Module 8 → "→ Ação"
   opens Module 10 modal pre-filled with dimensionCode/riskLevel). Keep as
   in-memory Zustand (simple, not shareable) OR move to query params
   (`?prefill=dim:D8,rl:HIGH` — shareable, verbose). **Lean: Zustand** — it's
   transient modal state, not a shareable view.
2. **Route group naming** — `(professional)` route group keeps the session-guarded
   routes organized without adding URL segments. OK, or prefer flat `/painel`,
   `/empresas/...` without a group? **Lean: route group** (cleaner layout file).
3. **`/consolidado`** — keep as a top-level route (enhancement, not in spec)?
   **Lean: keep.**
4. **Old `?worker=<token>` URLs** — redirect to `/portal/[token]` for backward
   compat, or just drop (internal tool, no external links yet)?
   **Lean: redirect** (cheap, safe).

## 9. Out of Scope

- Email/SMS deep-link notifications (separate feature; routes enable it but
  don't deliver it).
- Server components / RSC conversion of views.
- Any API changes.
- The DESIGN.md visual application (follows this migration).
- Fixing the broken worker token-minting endpoint (PRODUCT_ALIGNMENT_REVIEW
  Module 6) — separate issue, but this migration makes it easier to test once
  fixed because `/portal/[token]` is a real route.

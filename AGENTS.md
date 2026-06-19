# AGENTS.md

> Operating manual for the **NR-1 Copsoq** platform — multi-tenant SaaS for
> Occupational Psychosocial Risk Management (NR-1 / COPSOQ II-BR).
> Read this before touching code. Full architecture: `ARCHITECTURE.md`.

---

## Stack at a glance

| Item | Value |
| --- | --- |
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript 5 strict |
| UI | React 19, Tailwind v4, shadcn/ui (new-york) |
| Database | PostgreSQL 18 via Prisma 6 |
| Client state | Zustand only (`useView` + `useAuth`) |
| Package manager | Bun |
| Linter + Formatter | Biome 2.x |

Multi-route App Router (Next.js nested routes). Navigation is router-driven
(`useRouter().push` / `<Link>`); see the route map under Critical gotchas.
Zustand holds only auth + transient cross-module prefill. Worker portal is
isolated at `/portal/[token]` (cookie-less, no professional chrome).

---

## MCP servers (Playwright)

The Playwright MCP server is configured in `~/.config/opencode/opencode.jsonc`
under `mcp.playwright` (command `npx -y @playwright/mcp@latest`). Chromium
headless shell is pre-installed at
`~/.cache/ms-playwright/chromium_headless_shell-1228` (installed via
`npx playwright install chromium` — no `--with-deps` because the sandbox
user has no sudo for apt).

**What it's for.** Visual feedback from the running frontend at
`http://localhost:3000` — the primary way to confirm UI changes match
`DESIGN.md` (e.g. that the clinical vs hand-drawn-accent registers are
visually distinct, that the PGR report `print-area` stays clinical), catch
visual regressions, run E2E smoke tests, and inspect rendered HTML when JSON
APIs are not enough. Typical tools: `browser_navigate`, `browser_click`,
`browser_type`, `browser_snapshot` (accessibility tree — prefer over raw
HTML), `browser_take_screenshot`, `browser_evaluate`, `browser_console_messages`,
`browser_network_log`, `browser_close`.

**When NOT to use it.** When `tsc --noEmit` + `biome check` + `bun run build`
already cover the change. When the user says "no browser" or "do not run
the app". For login flows, mint a session cookie via
`POST /api/v1/auth/login` first and inject it into the browser context.

**Operational notes.**

- The dev server is **not** started by Playwright. Run `bun run dev`
  (or have it running) before navigating. The server logs to `dev.log`.
- PostgreSQL lives at `~/pg_data` and is started via
  `~/pg_local/usr/lib/postgresql/18/bin/pg_ctl -D ~/pg_data -l ~/pg_log/logfile start`.
  Port 5432 must be listening. **The `pg_local` portable install bundles its
  own libs** (`liburing.so.2`, `libpq.so.5`, …) which are NOT on the linker
  path by default — without it `postgres` fails with
  `error while loading shared libraries: liburing.so.2` and `pg_isready`/other
  binutils fail on `libpq.so.5`. Export this before any pg command:
  `export LD_LIBRARY_PATH=~/pg_local/usr/lib/x86_64-linux-gnu:~/pg_local/usr/lib/postgresql/18/lib`
  (The dev server itself is unaffected — Prisma bundles its own libpq.)
- Default mode is headed; on a headless TTY the MCP auto-falls back to
  headless. Firefox and webkit need a separate `npx playwright install`.
- `--isolated` is the default — the browser profile is in-memory and does
  not persist cookies across restarts.
- Full flag list: `npx -y @playwright/mcp@latest --help`.

**Privacy (RB-03).** Worker portal flows must not capture token values,
IPs, or answer payloads in screenshots, snapshots, or logs. The report
preview's `print-area` HTML may contain PII (CNPJ, responsible name,
credential number) — treat screenshots as confidential and sanitize
before saving into memory or commits.

**Suggested workflow.**

1. `curl -sI http://localhost:3000` to confirm the dev server is up.
2. `browser_navigate` to the route under test.
3. `browser_snapshot` for a stable, accessibility-tree view.
4. Drive the interaction (`browser_click`, `browser_type`, …).
5. `browser_evaluate` to assert on resulting state (DOM, Zustand
   store, `localStorage`).
6. `browser_take_screenshot` only when a visual diff is required.
7. `browser_close` when done.

Other MCPs (context7, exa, gh-grep, oracle-vm, filesystem) are documented
in `~/.config/opencode/AGENTS.md` (Global Agent Instructions).

---

## Agent tooling

These tools/extensions are available — reach for them so you don't burn
context or do things the hard way. (Installed as pi packages in
`~/.pi/agent/settings.json`; the `mcp` gateway exposes MCP-server tools.)

| Tool | Reach for it when… |
| --- | --- |
| `ctx_execute` / `ctx_execute_file` / `ctx_batch_execute` (context-mode) | Deriving an answer FROM data (counts, filters, parses, aggregations) or analyzing a large file/log. Bytes stay in the sandbox; only what you `console.log` enters context. Prefer over `read` for files >~50KB or when you only need a summary. |
| `ctx_search` / `ctx_index` / `ctx_fetch_and_index` (context-mode) | Recalling previously indexed docs/specs or session memory; indexing a doc for later focused retrieval instead of re-reading it raw. |
| `web_search` / `fetch_content` / `code_search` (pi-web-access) | Web research, fetching URL/GitHub/YouTube content, finding API/library examples. |
| `todo` (rpiv-todo) | Multi-step work (3+ steps) — persists across `/reload` and compaction. |
| `mcp` gateway → `browser_*` (Playwright) | Visual feedback from the frontend: screenshots, accessibility-tree snapshots, driving interactions, asserting on DOM/Zustand/localStorage. See the Playwright section above. |

**Don't** `cat`/`head` large logs or read big generated files verbatim — pipe
through `ctx_execute` and print a summary. Don't manually `grep` when
`ctx_search` over indexed content will do.

---

## Non-negotiable rules

Violations break correctness, security, or compliance.

1. **Tenant isolation is sacred.** Every authenticated read/write goes
   through `requireSession` / `requireCompanyAccess` / `requireAssessmentAccess`
   in `src/lib/session.ts`. **No DB-level RLS** — the application tier is
   the only line of defense. Never `findUnique` by raw `id` without a
   tenant check.
2. **No silent catches.** `console.error(...)` **and** re-throw, return a
   typed error response, or trigger a UI failure path.
3. **No comments unless the *why* is non-obvious** (regulation reference,
   numeric threshold, Postgres quirk). Don't restate code.
4. **Strict TypeScript.** `npx tsc --noEmit` must stay 0. No `@ts-ignore`.
5. **LGPD / privacy first.** Worker portal collects zero PII — opaque
   token, `departmentId`, 40 Likert answers only. Never log token values,
   IPs, or worker answer payloads.
6. **Never commit secrets.** `.env*` is git-ignored.
7. **Do not auto-commit.** Wait for explicit user instruction. Conventional
   commits in English (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
8. **Throw via `ApiError(code, …)`** from `src/lib/errors.ts`. Never return
   raw `Error.message` to the client.

---

## Critical gotchas

Things an agent will get wrong without warning.

- **Navigation is router-driven, not Zustand-driven.** The app uses Next.js
  App Router nested routes — `browser_navigate` to `/empresas/<id>/avaliacoes/<aid>/resultados`
  lands directly on that view, deep-links work, and browser back/forward
  traverses real history. `useView` no longer navigates; it holds only auth
  (`useAuth`) and transient cross-module prefill (`actionItemPrefill`,
  `inventoryPrefill`). To drive nav in a browser use `browser_navigate` /
  `<Link>` / `useRouter().push`. Route map:
  `/painel` · `/consolidado` · `/empresas` · `/empresas/[companyId]` ·
  `/empresas/[companyId]/avaliacoes/[assessmentId]` (hub) +
  `…/{resultados,inventario,plano-de-acao,relatorio}` · `/configuracoes` ·
  `/auth` (no guard) · `/portal/[token]` (no guard, no chrome — worker portal).
  The professional app gates on a session cookie — mint one via
  `POST /api/v1/auth/login` and inject it into the browser context before
  driving protected routes; the `(professional)` route-group layout redirects
  unauthenticated users to `/auth`. Legacy `?worker=<token>` redirects to
  `/portal/[token]`. Note: the real worker-distribution flow is currently
  broken (see `PRODUCT_ALIGNMENT_REVIEW` Module 6) — only the `simulate`
  demo path produces tokens/responses.
- **Next.js 16 made `params`, `cookies()`, `headers()`, and `searchParams`
  async.** Every route handler is
  `{ params }: { params: Promise<{ id: string }> }` — must `await params`
  before reading. Same for `cookies()` in Server Components / route
  handlers. See `src/lib/session.ts` and `src/app/api/v1/**/route.ts`.
  Forgetting the `await` compiles but yields `undefined` at runtime.
- **Biome ignores `.gitignore`.** `vcs.enabled: false` + `useIgnoreFile: false`
  in `biome.json` mean filtering is done by the explicit `files.includes`
  allow/deny list. New generated dirs must be added there.
- **`scripts/maintenance.sh` requires a real user.** It logs in with
  `MAINTENANCE_EMAIL` / `MAINTENANCE_PASSWORD` (defaults in the script),
  then calls the three system routes. If login fails it logs and exits
  0 — it does **not** create the user. Register the maintenance user
  once via `POST /api/v1/auth/register`.
- **`@tanstack/react-query` is in `package.json` but has zero imports in
  `src/`.** Don't reach for it; the project uses fetch-on-demand with
  per-component state. Ask first if you think you need it.
- **PGR report is HTML → `window.print()` → PDF.** No server-side PDF.
  New views that should appear in reports must declare a `print-area`
  container and respect `@media print` in `src/app/globals.css`.
- **Scoring is idempotent.** Re-running overwrites prior `DimensionResult`
  rows (RB-06). Wrap multi-step writes in `prisma.$transaction([...])`.
- **No second state lib, no second ORM.** Zustand + Prisma only.

---

## Pointers (read these before editing)

| File | What it owns |
| --- | --- |
| `src/lib/errors.ts` | `ERROR_CODES` + `HTTP_STATUS`. Throw via `ApiError(code, …)`. |
| `src/lib/session.ts` | `requireSession`, `requireCompanyAccess`, `requireAssessmentAccess`, PBKDF2 password hashing, session cookie (`nr1_session`). |
| `src/lib/nav.ts` | Router navigation helpers: `useGo()`, `useCompanyIdParam()`, `useAssessmentIdParam()`, `urlFor()`. Drop-in for the old `useView.go()`. |
| `src/lib/scoring.ts` + `scoring-service.ts` | COPSOQ II-BR formula + orchestration. Idempotent. |
| `src/lib/copsoq-data.ts` | 40 items × 11 dimensions. Treat as immutable scientific seed (RB-05). |
| `src/lib/store.ts` | Zustand `useAuth` (session/professional) + `useView` (transient cross-module prefill only). Nav is router-driven — see `src/lib/nav.ts`. |
| `src/components/ui/*` | Vendored shadcn primitives — do not edit unless the change is the task. |

---

## Commands

```bash
# First-time setup
bun install
bun run db:push
bunx prisma db seed
bun run dev                       # http://localhost:3000  (logs to dev.log)

# Daily
bun run dev                       # dev server, hot reload
bun run build                     # standalone build (also copies .next/static + public/)
bun run start                     # run standalone build
bun run lint                      # biome check
bun run lint:fix                  # biome auto-fix safe issues
bun run format                    # biome format only
npx tsc --noEmit                  # typecheck
bun run db:push                   # sync schema → db
bun run db:generate               # regenerate Prisma client
bun run db:migrate                # prisma migrate dev (interactive, prompts for name)
bun run db:reset                  # drop + recreate dev DB
bun prisma/seed.ts                # idempotent COPSOQ seed
bun run scripts/maintenance.sh    # manual run of cron maintenance job
```

Prod uses `bunx prisma migrate deploy` directly (no script). There is **no
test suite** in this repo — don't invent one.

---

## Verification gate

Run after any non-trivial change:

- `npx tsc --noEmit` — must stay 0 errors.
- `bun run lint` — must not introduce **new** errors or warnings. The repo
  carries pre-existing lint debt from the Biome migration — focus on
  regressions, not absolute zero. Note the baseline count first.
- `bun run build` — only when the change touches build config, routing, or
  `prisma/schema.prisma`.

---

## Domain terms (the ones you'd get wrong)

- **k ≥ 5** — minimum responses per department for a dimension result to be
  statistically eligible. Below this, scoring returns `null` (RB-10).
- **Token** — opaque, single-use URL slug for worker access. Leaking it is
  the same as submitting a response.
- **AEP** — manual psychosocial exposure assessment (vs. auto from scoring).
- **5W2H** — action-plan methodology: What, Why, Who, Where, When, How + cost.
- **MTE F1..F13** — the 13 psychosocial factors mapped to COPSOQ dimensions.

---

## Anti-patterns

- Don't add a dependency without checking `package.json` first (or asking).
- Don't touch `src/components/ui/*` unless the change is the task.
- Don't return raw `Error.message` — use the `ERROR_CODES` catalog.
- Don't hardcode `/home/<user>/...` in scripts.
- Don't edit `db/custom.db` — dead SQLite-era artifact. New code uses
  Prisma + Postgres.
- Don't suppress type errors with `@ts-ignore`.
- Don't auto-commit / push.

---

## Product Alignment & Review Guidelines

- `spec_nr1_copsoq_saas.md` is the primary reference for product vision, page structure, user flows, and business rules.
- Technical implementation (architecture, libraries, DB schema, state management, etc.) does NOT need to match the spec. If the current approach achieves the spec's functional goals efficiently, preserve it.
- When evaluating or modifying features, prioritize functional alignment and UX over technical conformity.
- Before creating or altering pages, UI flows, or core business rules, cross-reference the spec to ensure the product vision is maintained.
- If the current code conflicts with the spec, analyze both approaches, propose the most pragmatic path forward, and wait for approval before refactoring.

---

## Agent skills

Configured by `/setup-matt-pocock-skills`. The mattpocock engineering skills (`/to-prd`, `/to-issues`, `/triage`, `/tdd`, `/diagnosing-bugs`, `/improve-codebase-architecture`, etc.) read these files to know how to operate in this repo.

### Issue tracker

Issues and PRDs live as GitHub issues in `luksss2013/gerenciador-de-riscos-psicosociais` (via `gh` CLI). PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles map 1:1 to GitHub labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. No `CONTEXT.md` yet — `AGENTS.md` → "Domain terms" is the interim glossary. ADRs live under `docs/adr/` (to be created lazily). See `docs/agents/domain.md`.

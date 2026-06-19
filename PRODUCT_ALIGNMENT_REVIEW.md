# Product Alignment & Gap Analysis

> Product alignment review for the **NR-1 Copsoq** platform.
> Primary reference: `spec_nr1_copsoq_saas.md` (strategic product vision, not a rigid technical blueprint).
> Generated: 2026-06-18.

---

## Methodology

Compared the actual Next.js 16 / Prisma / Zustand single-route-SPA implementation against
`spec_nr1_copsoq_saas.md`'s *functional* goals, user flows, and business rules. Per the
`AGENTS.md` "Product Alignment & Review Guidelines", technical divergence (stack, architecture,
DB, state management) is treated as **acceptable** when functional goals are met; only UX/logic
gaps and broken/missing functionality are flagged for action.

**Status legend:**

- ✅ Aligned — implementation meets the spec's functional goal as written.
- 🔁 Functionally Equivalent — different technique, same outcome; acceptable.
- ⚠️ Drifted — diverges from spec intent; UX/logic issue to address.
- ❌ Missing — spec-required functionality is absent.
- ➕ Enhancement — present in code but beyond the spec (not drift).

---

## Gap Analysis Matrix

| Spec Feature / Rule | Current Implementation State | Alignment Status | Recommended Action | Reasoning / Notes |
|---|---|---|---|---|
| **Core vision:** multi-tenant SaaS, one professional → many client companies, full cycle (config → collect → score → dashboard → PGR docs) | Single Next.js app; Professional → Company → Department/Assessment → Tokens/Results/Inventory/Plan/Report. Full cycle present. | ✅ Aligned | Keep | Vision intact. |
| **Tech stack** (spec: Vite+Elysia monorepo, Drizzle, Better Auth, TanStack, react-pdf/R2) vs actual (Next.js 16, Prisma, custom PBKDF2 sessions, Zustand, HTML→print) | Entirely different stack, single-route SPA, worker via `?worker=<token>`. | 🔁 Functionally Equivalent | Keep | Functional goals met more simply; AGENTS.md sanctions this. No DB-RLS (app-tier isolation) — acceptable per project rules. |
| **MÓDULO 2 — Auth: login + register** | `auth-screen.tsx` + `/auth/login`, `/auth/register`. LGPD terms checkbox, profession type, credential. | ✅ Aligned | Keep | Matches §2.2 core. |
| **MÓDULO 2 — Password recovery / email verification** (`/auth/esqueci-senha`, `/auth/redefinir-senha/:token`, `/auth/verificar-email`, `requireEmailVerification`) | "Esqueci minha senha" disabled ("Em breve"); no reset/verify endpoints; no email verification. | ❌ Missing | Implement (or explicitly descope) | Spec §2.2–2.3 lists these as required. Email-verified badge in Configurações also missing. |
| **MÓDULO 3 — Profile editing + credential** | `configuracoes-view.tsx`: name, professionType, credential, phone; email readonly. | ✅ Aligned | Keep | Matches §3.1. |
| **MÓDULO 3 — "Alterar Senha" modal** | Button disabled ("Em breve"); no `/professionals/me/change-password`. | ❌ Missing | Implement | Spec §3.1/§3.2 required. |
| **MÓDULO 3 — Sessions / Audit log / About** | Active-session revocation, paginated+CSV audit log, LGPD info. | ➕ Enhancement | Keep | Valuable beyond spec; not drift. |
| **MÓDULO 4 — Company CRUD + CNPJ validation (client+server)** | `empresas-view`, `empresa-detail-view`, `company-form-dialog`; `isValidCnpj` + `CNPJ_INVALID`; unique dept name; soft-delete. | ✅ Aligned | Keep | Matches §4.1–4.3 (list cards→rows is an equivalent layout). |
| **MÓDULO 4 — Department (GHE) CRUD** | Tabs (Visão Geral / Departamentos / Avaliações); dept create/edit/deactivate. | ✅ Aligned | Keep | Matches §4.1. |
| **MÓDULO 5 — Assessment creation: 3-step wizard** (Configurar Ciclo → Selecionar Departamentos → Revisão e Lançamento) | Single "step-free" dialog capturing title, dates, depts + expectedResponses. | ⚠️ Drifted | Refactor for UX-Logic (optional) | Same data captured (functional goal met), but spec's guided 3-step UX with the "<5 responses" inline warning and review screen is lost. Low priority. |
| **MÓDULO 5 — Launch token pool (N = 1.5× expected/GHE), status→collecting** | `launch/route.ts` generates `ceil(expected*1.5)` tokens, sets collecting, auto-fills startDate. | ✅ Aligned | Keep | Matches §5.4/§5.5 exactly. |
| **MÓDULO 5 — Detail: progress, adesão ring, GHE eligibility, participation field, close** | `avaliacao-detail-view.tsx`: AdesaoRing, GHE rows w/ eligibility, auto-save participation (RB-04), close→scoring, duplicate, simulate. | ✅ Aligned | Keep | Matches §5.1; duplicate/simulate are useful extras. |
| **MÓDULO 5/6 — Collection links per GHE + WhatsApp template** | `CollectionLinks` calls `api.worker.enterDept` expecting `{token, redirectUrl}`, builds `?worker=<token>`. | ⚠️ Drifted | Refactor for UX-Logic (HIGH priority) | **Broken contract:** `respond/dept/[id]` GET returns `{departmentId, expectedResponses, tokenCount}` (auth-required, no minting). So `enterDept` yields no token → all links render "Indisponível". |
| **MÓDULO 6 — Public on-demand tokenization** (`GET /respond/dept/:id` → mint/claim unused token → redirect `/q/:token`; rate-limit 10/min/IP) | Not implemented. `respond/dept/[id]` is a stats endpoint requiring professional auth; no endpoint claims an unused token from the pool. | ❌ Missing | Implement (HIGH priority) | **Real worker flow non-functional end-to-end.** Only `simulate` (creates its own tokens+answers) works. This is the core anonymous-collection mechanism (spec §5.2, §6.3, §7.2). |
| **MÓDULO 6 — Worker portal UX** (welcome, one-question-per-screen, 300ms advance, no back, incremental save, thanks, error states, anonymity footer) | `worker-portal.tsx` faithful; plus offline-tolerant localStorage. | ✅ Aligned | Keep | Meets/exceeds §6.2. Minor: "Sair" returns to painel (fine for in-app sim; harmless via real `?worker=` since unauth→login). |
| **MÓDULO 7 — Scoring engine** (item score, direction inversion, 0-33/34-66/67-100, Cronbach α, idempotent upsert) | `scoring.ts` + `scoring-service.ts` exact; delete-then-insert idempotency; α null for k<2. | ✅ Aligned | Keep | Matches §2.4/§7.1; RB-06. |
| **MÓDULO 8 — Heat map (GHE×Dim), KPIs, company-avg bars, critical dims + shortcuts, radar, cycle comparison** | `resultados-view.tsx` has all: ScoreCell w/ α<0.5 ⚠, eligibility locks, 33/66 refs, →Inventário/→Ação prefill, radar (company-level), ≥2-cycle line chart. | ✅ Aligned | Keep | Matches §8.1. Minor: radar is company-level, not per-GHE multi-overlay (§8.1 Comp.2). |
| **MÓDULO 9 — Auto-gen inventory (MEDIUM/HIGH), inline edit, AEP manual, P×S level, templates** | `inventario-view.tsx`: inline editable cells, auto/manual badges, non-deletable auto items, uncovered-MTE (F3/F9/F10/F11/F13) section, "Criar Ação" shortcut, `INVENTORY_TEMPLATES`. | ✅ Aligned | Keep | Matches §9.1–9.4. |
| **MÓDULO 10 — 5W2H plan: filters, inline status, overdue badge, KPIs, shortcuts** | `plano-view.tsx`: 5W2H fields, status/dept/dim/responsável filters, "Vencido" badge, %HIGH-completed KPI, prefill from Modules 8/9. | ✅ Aligned | Keep | Matches §10.1–10.3. |
| **MÓDULO 11 — Prerequisites checklist (RB-04), low-adesão warning (RB-09), metadata, outline, history, print preview (6 sections)** | `relatorio-view.tsx` + `reports/generate` (RB-04 checks). HTML `print-area` → `window.print()`. | ✅ Aligned (PDF path) | Keep PDF path | Matches §11.1–11.2 structure. |
| **MÓDULO 11 — DOCX generation** (real `.docx` via `docx` npm, editable in Word) | "Gerar DOCX" only creates a DB row with placeholder `storageKey`; no file produced. | ⚠️ Drifted | Implement OR descope button | Spec §11.3/§11.4 deliverable. Either generate real DOCX or remove/hide the button to avoid misleading professionals. |
| **MÓDULO 11 — R2 storage + presigned download URLs (TTL 1h)** | `storageKey` is a fake path; `reports/[reportId]/download` not producing real files; preview is client-side only. | ⚠️ Drifted | Refactor for UX-Logic (decide) | AGENTS.md says no server-side storage. Functionally the professional gets a PDF via print. Decide: keep client-side print (acceptable) and drop the fake "download history" semantics, or wire real storage. |
| **MÓDULO 11 — Risk threshold text in report** | Report preview §4 states "Favorável (0–39), Intermediário (40–69), Desfavorável (70–100)". | ⚠️ Drifted | Fix (HIGH priority, trivial) | **Factual error in an official document.** Actual classification is 0–33 / 34–66 / 67–100 (`scoring.ts`). Must correct to avoid regulatory misstatement. |
| **MÓDULO 12 — Painel: KPIs + company grid w/ NR status + recent activity** | `painel-view.tsx`: KPI strip, company rows w/ `NrStatusBadge` (incl. review_recommended >2yr), recent assessments sidebar. | 🔁 Functionally Equivalent | Keep (with enhancements below) | Company rows use list-rows not cards; recent sidebar shows assessments not events. Acceptable but incomplete vs §12.1. |
| **MÓDULO 12 — Alerts banner** (no assessment; adesão<60% closed; overdue actions; review >2yr) | `dashboard` route computes `compliance` counters but **no `alerts` array**; painel renders no alerts banner. | ❌ Missing | Implement | Spec §12.1 Section 1 is a signature element. Counters exist backend; need to surface as actionable alerts. |
| **MÓDULO 12 — Activity feed (last 10 events: closure, report generated, overdue action)** | `recentAssessments` list (by updatedAt) instead of an event feed. | ⚠️ Drifted | Refactor for UX-Logic | AuditLog already captures these events — feed could derive from it. |
| **MÓDULO 12 — Per-company card: last cycle adesão + high-risk GHE count** | Company row shows GHE/assessment counts only; no adesão/high-risk per company. | ⚠️ Drifted | Refactor for UX-Logic | Spec §12.1 wants these on each card. Data partially available. |
| **"Análise Consolidada" (Consolidado) view** | Cross-company heatmap, risk distribution, company detail rows. Not in spec. | ➕ Enhancement | Keep (reconsider naming/overlap) | Valuable analytical view; overlaps Painel. Consider whether it should *be* the enhanced Painel or stay distinct. |
| **Global search, audit log, session management, duplicate assessment, simulate responses** | All implemented beyond spec. | ➕ Enhancement | Keep | Useful; `simulate` clearly labeled demo-only. |
| **RB-01 Response immutability** | Answers upsert only pre-`complete`; token `isUsed` locks; no edit endpoint. | ✅ Aligned | Keep | |
| **RB-02 Tenant isolation** | `requireSession`/`requireCompanyAccess`/`requireAssessmentAccess` on all routes; no raw-id lookups. | ✅ Aligned | Keep | App-tier only (no RLS) per project rules. |
| **RB-03 Anonymity (no individual answers returned)** | `/respond/token/:token/items` returns items only; results only via aggregated scoring; portal collects token+dept+40 Likerts. | ✅ Aligned | Keep | |
| **RB-04 Report prerequisites** | `reports/generate` checks completed + participationRegistration + ≥1 eligible dept → `REPORT_PREREQUISITES_UNMET`. | ✅ Aligned | Keep | |
| **RB-05 COPSOQ 40 items immutable** | `copsoq-data.ts` + `CopsoqItem`/`CopsoqDimension` tables; no edit routes; seed idempotent. | ✅ Aligned | Keep | Verify exact Gonçalves et al. 2021 PT-BR wording against publication (scientific fidelity). |
| **RB-06 Scoring idempotent** | `runScoring` delete-then-insert; transactional. | ✅ Aligned | Keep | |
| **RB-07 Auto-close cron (hourly)** | `system/close-expired` + `maintenance.sh` (login→3 routes). Reverts on error. | ✅ Aligned | Keep | Sandbox reuses session auth for cron (documented). |
| **RB-08 Soft-delete protection** | `DEPARTMENT_HAS_ACTIVE_ASSESSMENT` code present; delete routes guard active assessments. | ✅ Aligned | Keep | |
| **RB-09 Low-adesão (<60%) limitation note in report** | `LowAdesionWarning` shown in UI; verify the note actually renders inside the `print-area`. | ⚠️ Drifted (verify) | Refactor for UX-Logic | Ensure the limitation text is in the printed document, not just the screen. |
| **RB-10 GHE eligibility (N≥5)** | `K_ANONYMITY_THRESHOLD=5`; ineligible GHEs excluded from company avg; heat map shows locked rows. | ✅ Aligned | Keep | |
| **Design system** (tokens, RiskBadge, ScoreCell, DimensionRadar, AdesaoRing, non-clinical language, anonymity-visible, dualidade bruto/risco, empty-state CTAs, NR-1 status badge) | All present; tooltips show bruto+risco; non-clinical phrasing; empty CTAs throughout. | ✅ Aligned | Keep | Dualidade mostly in tooltips — could surface bruto/risco labels more explicitly per §4.4. |

---

## Summary of Priorities

### High priority (functional correctness / compliance)

1. **Implement public on-demand token minting** (`GET /respond/dept/:id`) so real worker
   distribution works end-to-end — currently broken (Modules 5/6). The professional-facing
   `CollectionLinks` and the entire anonymous-collection loop depend on it; today only the
   `simulate` demo path works.
2. **Fix the risk-threshold text in the report preview** (0–33 / 34–66 / 67–100, **not**
   0–39 / 40–69 / 70–100) — regulatory correctness (Module 11). Trivial change, high impact:
   the report is an official PGR artifact.
3. **Implement Painel alerts banner + activity feed** (Module 12). Counters already exist in
   the `dashboard` route; surface them as actionable alerts and an event feed (derivable from
   `AuditLog`).

### Medium priority (stated deliverables / UX completeness)

4. Password recovery + email verification + change-password (Modules 2/3).
5. DOCX: either generate a real `.docx` or remove the button (Module 11).
6. Reconcile report "download history / R2" semantics with the client-side print reality
   (Module 11).
7. Verify RB-09 limitation note renders inside the printed PDF, not only on-screen (Module 11).

### Low priority (UX polish, optional)

8. 3-step assessment wizard (Module 5) — currently a single dialog.
9. Per-GHE radar selector / multi-overlay (Module 8).
10. Per-company adesão + high-risk GHE count on Painel cards (Module 12).
11. Decide Consolidado vs enhanced Painel overlap.
12. Verify exact canonical COPSOQ PT-BR item wording (RB-05 scientific fidelity).

---

## Status: HALTED — Awaiting Approval

Steps 1–4 of the alignment review are complete:

1. ✅ Ingested `spec_nr1_copsoq_saas.md` (vision, modules, flows, RB-01…RB-10).
2. ✅ Appended the **"Product Alignment & Review Guidelines"** section to `AGENTS.md` with the
   five exact directives, and read it back to internalize them.
3. ✅ Explored the codebase (routing, entry points, Prisma schema, store, scoring, all module
   views, key API routes, cron, maintenance) and compared against the spec.
4. ✅ Produced this Product Alignment & Gap Analysis report.

**No application code was written or modified** during this review — the only file changed is
`AGENTS.md` (documentation), plus this report file, per instructions.

**Awaiting your review and explicit approval** before starting any refactoring, page creation,
or rule-enforcement work. On approval, please indicate which priority items to tackle and in
what order.

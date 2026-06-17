# Task 8-a — full-stack-developer — Dashboard stats + Audit log API endpoints

## Scope
Two new read-only API endpoints + audit-log writes on five existing mutation routes.

## Files created
- `src/app/api/v1/professionals/me/dashboard/route.ts` — `GET` consolidated cross-company dashboard stats for the current professional.
- `src/app/api/v1/audit-logs/route.ts` — `GET` paginated audit log entries for the current professional, with optional `?action=` and `?resourceType=` filters.

## Files modified (audit-log fire-and-forget writes added)
- `src/app/api/v1/companies/route.ts` — POST writes `company.create` after the new company is committed.
- `src/app/api/v1/assessments/[id]/launch/route.ts` — POST writes `assessment.launch` after status→collecting.
- `src/app/api/v1/assessments/[id]/close/route.ts` — POST writes `assessment.close` after status→completed.
- `src/app/api/v1/assessments/[id]/reports/generate/route.ts` — POST writes `report.generate` after the Report row is created.
- `src/app/api/v1/auth/login/route.ts` — POST writes `auth.login` after credential verification succeeds (uses `professional.id`).

## Dashboard route — implementation notes
- `requireProfessional()` from `@/lib/session`; single `db.company.findMany` with `where: { professionalId, isActive: true }` and `include: { departments: { where: { isActive: true } }, assessments: { include: { departments: { include: { dimensionResults: true } } } } }`.
- KPIs iterated in-memory:
  - `totalCompanies` = companies.length; `totalDepartments` = Σ company.departments.length; `totalAssessments` = Σ company.assessments.length.
  - `activeAssessments` = status IN (draft, collecting, processing); `completedAssessments` = status == completed.
  - `totalRespondents` = Σ ad.responseCount across ALL AssessmentDepartments of ALL assessments (regardless of eligibility or status).
  - `atRiskGhes` = eligible AssessmentDepartments with ≥1 DimensionResult riskLevel=HIGH.
  - `mediumRiskGhes` = eligible AssessmentDepartments with ≥1 MEDIUM but no HIGH.
- Compliance: independent (overlapping) counters per spec text. For each company:
  - `noAssessment` if zero assessments.
  - `inProgress` if any assessment in draft/collecting/processing.
  - Tracks `lastCompletedAt` = max(completedAt) among completed assessments. If non-null: `compliant` if age < 2y, else `pendingReview`.
- `recentAssessments`: flattened across companies, sorted by `updatedAt` DESC, sliced to 5. `completedAt` ISO-string or null, `updatedAt` ISO-string.
- `dimensionHeatmap`: aggregates DimensionResults across ALL eligible AssessmentDepartments of ALL completed assessments. For each eligible dept of each completed assessment, builds a `DimensionScoreResult[]` (defaults to 0/LOW if a dimension is missing) and pushes `{ nResponses: ad.responseCount, results }` into `perDeptForAvg`. Passes the whole array to `companyWeightedAverage(perDeptForAvg)` and maps results to `{ code, name (pt-BR from COPSOQ_DIMENSIONS), weightedAvgRiskScore, riskLevel }`. Empty input → 0/LOW for every dimension (safe fallback).
- `trend`: last 6 months including current. Built by walking back from `now` month-by-month. Each bucket: `month` = `YYYY-MM`, `label` = `Mmm YYYY` using pt-BR month abbreviations array (`Jan..Dez`). Counts assessments whose `createdAt` falls in that month (only counts buckets inside the 6-month window; older assessments are ignored).
- Wrapped in try/catch; `UNAUTHORIZED` → 401; everything else → `errorJson(INTERNAL_ERROR, "Internal error")`.

## Audit-logs route — implementation notes
- `requireProfessional()`; uses `parsePagination(req)` for `page`/`limit`.
- Optional query filters: `?action=...` and `?resourceType=...` mapped directly into the Prisma `where` clause.
- DB-level pagination via `Promise.all([count, findMany({ skip, take })])` (matches the `companies/route.ts` pattern, more efficient than in-memory `paginate`).
- `metadataJson` parsed with a defensive helper: `try { JSON.parse } catch { return null }`. Non-object / array results also return null to honour the `Record<string, unknown> | null` contract.
- Response shape: `{ data: [...], meta: { total, page, limit, pages } }`.
- `pages` = `max(1, ceil(total / limit))` so an empty result still reports `pages: 1`.

## Audit-log writes — implementation notes
- All five writes use the fire-and-forget pattern: `db.auditLog.create({...}).catch(() => {})` (no `await`) so a DB write error never fails the user-facing response.
- Each write uses `professionalId: professional.id` from the route's already-loaded `requireProfessional()` (or, for `auth/login`, the professional loaded during credential verification).
- Writes are placed AFTER the main mutation succeeds and BEFORE the `return jsonResponse(...)` (or, for `auth/login`, before the `return new Response(...)` that sets the Set-Cookie header).
- `metadataJson` always stringified with `JSON.stringify(...)` carrying the relevant context: `{ name, cnpj }` for company.create, `{ totalTokens }` for assessment.launch, `{ eligibleDepts, totalDimensions }` for assessment.close, `{ type, reportId }` for report.generate, `{ email }` for auth.login.

## Verification
- `cd /home/z/my-project && bun run lint` → exit 0, 0 errors, 0 warnings on first pass.
- Inspected `dev.log` — no errors related to the new `dashboard` or `audit-logs` routes. (Pre-existing CSS build error in `globals.css` is unrelated to this task — it's a Tailwind v4 content-scanner issue inherited from Task 6 and only affects the page render, not the API responses.)
- Did NOT restart the dev server (orchestrator manages it).

## Constraints honoured
- No test files written.
- No new npm packages installed.
- Existing code style preserved (try/catch, `errorJson`/`jsonResponse`, `requireProfessional`).
- Changes are minimal and additive — only new files + a single fire-and-forget `db.auditLog.create(...).catch(()=>{})` block inserted before each `return jsonResponse(...)` in the five existing routes; no logic refactors.

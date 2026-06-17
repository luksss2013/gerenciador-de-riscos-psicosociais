# Next.js App Redesign — Skill-Driven Execution Prompt

> **Mission:** Execute a complete redesign overhaul of an existing Next.js codebase provided by the user. Do not omit any part of the app. Use the agent's installed `Skill` system as the primary source of truth; consult the external GitHub references listed in §5 only as supplementary material when the built-in skill lacks coverage for a specific decision.

---

## 1. Operating Contract

1. **Skills are loaded, not assumed.** Before producing any deliverable whose type matches a registered skill (PPT / Word / PDF / Excel / chart / fullstack web app), invoke the matching `Skill(command="...")` and read every file it references, top to bottom. Skipping a referenced file is a critical defect.
2. **One layout engine, one script per artifact.** Persist any non-trivial generation script to `/home/z/my-project/scripts/<name>.py` (or `.js`/`.sh`) before executing; on failure, `Edit` the file in place — do not regenerate from scratch.
3. **All deliverables under `/home/z/my-project/download/`.** Never write outside `/home/z/my-project/`.
4. **Shared worklog is append-only.** Read `/home/z/my-project/worklog.md` before starting; append a new `---`-separated section with `Task ID`, `Agent`, `Task`, `Work Log`, `Stage Summary` after finishing each Task ID.
5. **Language consistency.** Match the user's input language for every artifact (response, document, chart labels, code comments when user-facing).
6. **Strict verification stance.** Loop until the app is 100% clean: TypeScript build passes, ESLint passes, Next.js lint passes, every skill's mandated post-checks pass, and the Definition of Done (§6) is fully satisfied. Do not declare completion early.

---

## 2. Skill Router — Task Type → Skill

Classify every subtask into one of four types. The router decides which skill owns the work.

| Task Type | Trigger signals | Primary skill to invoke | Subagent to delegate to (if any) |
|---|---|---|---|
| **Type 1 — Document** | report, PRD, script, spec, analysis doc, deck, spreadsheet as the final deliverable | `docx` / `pdf` / `xlsx` / `pptx` | none — main agent must produce the file |
| **Type 2 — Chart / Diagram** | bar/line/pie, flowchart, mind map, architecture diagram, Mermaid, dashboard visualization | `charts` | `frontend-styling-expert` only for embedded chart styling inside a web app |
| **Type 3 — Interactive Web** | Next.js pages, dashboards, components, API routes, Prisma, websocket | `fullstack-dev` | `full-stack-developer` for feature-complete modules; `frontend-styling-expert` for CSS/animation polish |
| **Type 4 — Data Processing** | ETL, CSV/JSON transforms, calculations, file processing | none (write Python script) | `general-purpose` for multi-step research; `Explore` for codebase questions |

**Ambiguous cases — ask the user.** "Dashboard" alone could be a web app or a report with charts; "chart adjustment" could be code or a static image. Always disambiguate before building.

**Default when unclear:** prefer Type 1 (document) over Type 3 (web app).

---

## 3. Per-Skill Decision Rules

When a skill is invoked, it may demand a choice. Use these defaults.

### `fullstack-dev` (Next.js redesign — primary skill for this task)
- **Stack:** Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma ORM.
- **Frontend-first:** build UI components before wiring backend; use z-ai-web-dev-sdk for AI features (chat/image/web search) and Socket.io for realtime.
- **Always call `Complete(project_type="web_dev", summary="...")` once the runnable Next.js project is ready.** Forgetting this is the #1 failure mode.
- **Reuse assets:** before generating new images, check `/home/z/my-project/download/` for existing ones.

### `charts` (Type 2)
- **Data charts** (bar/line/scatter/heatmap) → matplotlib or seaborn.
- **Structural diagrams** (flowchart/mind map/org chart/architecture) → Playwright + CSS, never matplotlib.
- **Mermaid** only for Markdown-embedded diagrams.
- **Interactive web charts** → ECharts or D3.js.
- **Chinese glyphs:** register Noto Sans SC + DejaVu Sans for per-glyph fallback; pass `constrained_layout=True` and never combine with `tight_layout()` / `bbox_inches='tight'`.

### `pdf` (Type 1, PDF deliverables)
- Route by document type: **Report** (ReportLab) for reports/proposals/contracts; **Creative** (JSON Blueprint → Playwright) for posters/infographics; **Academic** (LaTeX/Tectonic) for papers/theses; **Process** for manipulating existing PDFs.
- Forbidden in PDFs: unicode escape sequences for superscripts/subscripts/emoji/math operators. Use ReportLab `<super>` / `<sub>` / `<b>` tags inside `Paragraph()` only.

### `docx` (Type 1, Word deliverables)
- Page breaks ONLY between cover↔TOC and TOC↔body. No page breaks within body.
- Lists: left-aligned, never justified; one item per line.

### `xlsx` (Type 1, spreadsheets)
- Use for any tabular deliverable: data tables, reports with embedded charts, CSV/JSON → XLSX conversion, pivots.

### `pptx` (Type 1, decks)
- For .pptx files only. For Beamer/academic PDF decks, use the `pdf` skill's academic route.

### Content depth (all Type 1 / Type 4 writing)
- Paragraphs ≥ 3–5 sentences. No single-sentence paragraphs.
- Each section ≥ 150–200 words of body content. Merge if a section cannot meet this.
- No artificial ending markers ("---End of Report---").

---

## 4. Subagent Orchestration

Delegate to subagents for parallel, well-scoped subtasks. **Never delegate skill-driven file production or work that depends on conversation context** — subagents only see the prompt you pass them.

| Subagent | Use for |
|---|---|
| `Plan` | Designing the redesign implementation strategy before any code is written |
| `Explore` | Finding files by pattern, searching code, answering codebase questions |
| `frontend-styling-expert` | CSS, responsive design, animations, layout systems, visual polish |
| `full-stack-developer` | Feature-complete Next.js modules combining UI + API + Prisma |
| `general-purpose` | Open-ended multi-step research or search |
| `ppt-expert` | Slide deck production (only after parent loads `pptx` skill) |

**Parallel launch:** send a single message with multiple `Task` tool calls. Pass each subagent:
- Their **Task ID** (e.g. `2-a`, `2-b` for parallel tasks at step 2).
- Instruction to read `/home/z/my-project/worklog.md` first.
- Instruction to append their work record using the §1.4 template.
- A self-contained prompt — they cannot see your context.

---

## 5. External Skill References (Supplementary)

The following GitHub skills are **not installed**; consult them via web fetch only when a built-in skill lacks coverage for a specific decision. Built-in skills always take precedence on conflict.

| External skill | Consult when... |
|---|---|
| `vercel-labs/next-skills/next-best-practices` | You need Next.js 16 conventions beyond what `fullstack-dev` inlines |
| `addyosmani/agent-skills/frontend-ui-engineering` | You need a UI-engineering checklist for component review |
| `vercel-labs/web-interface-guidelines` | You need a comprehensive UI/UX guideline catalog |
| `addyosmani/web-quality-skills` | You need a deeper web-quality audit checklist |

The four embedded skill specs from the original prompt (Emil's design engineering, UX writing, data visualization, design critique) are folded into the `frontend-styling-expert` subagent's domain and the `charts` skill. Surface their key rules at runtime by delegating to `frontend-styling-expert` with explicit instructions (e.g. "Apply Emil's animation decision framework: never animate keyboard-initiated actions; use `ease-out` for entries; keep UI animations under 300ms; add `transform: scale(0.97)` on `:active`").

---

## 6. Execution Loop

```
1. PLAN       — invoke `Plan` subagent to produce a concise redesign plan covering
                every part of the app. Confirm with user if scope is ambiguous.
2. PARALLEL   — split plan into independent Task IDs (2-a, 2-b, 2-c...).
                Launch subagents in parallel. Each appends to worklog.md.
3. VERIFY     — for every Task ID returned, run:
                  a. `npm run build`            (TypeScript + Next.js build)
                  b. `npm run lint`             (ESLint)
                  c. `npx next lint`            (Next.js lint rules)
                  d. Skill-mandated post-checks (e.g. charts: open the PNG and
                     verify no overflow; pdf: open and verify no font fallback)
                  e. Definition of Done checklist (below)
4. LOOP       — if any check fails, `Edit` the offending file in place and re-run.
                Do NOT regenerate from scratch. Loop until all checks pass.
5. REPORT     — append final summary to worklog.md and call `Complete` if a
                runnable Next.js project was produced.
```

### Definition of Done

- [ ] Every part of the original app has been redesigned — no omissions
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm run lint` exits 0 with no warnings (warnings are treated as errors)
- [ ] `npx next lint` exits 0
- [ ] Every skill invoked has its post-checks satisfied (re-read its SKILL.md if unsure)
- [ ] All deliverables live under `/home/z/my-project/download/`
- [ ] All generation scripts persisted under `/home/z/my-project/scripts/`
- [ ] `/home/z/my-project/worklog.md` contains one section per Task ID
- [ ] If a runnable Next.js project was produced, `Complete(project_type="web_dev", ...)` was called
- [ ] Language of every artifact matches the user's input language

---

## 7. Anti-Patterns (Forbidden)

- Skipping `Skill(command="...")` before producing a doc/pdf/xlsx/pptx/chart/web app.
- Running long scripts inline (`python -c "..."`, heredoc-piped). Always persist first.
- Writing files outside `/home/z/my-project/`.
- Declaring completion before the Definition of Done checklist is fully green.
- Forgetting to call `Complete` after producing a runnable Next.js project.
- Delegating skill-driven file production to a subagent (subagents lack skill context).
- Adding page breaks mid-body in docx/pdf.
- Using unicode escapes for superscripts/subscripts/emoji/math operators in PDFs.
- Single-sentence paragraphs or sub-150-word sections in any written deliverable.

---

**Begin now:** invoke `Skill(command="fullstack-dev")` to initialize the project environment, then immediately call the `Plan` subagent to produce the redesign plan before writing any code.

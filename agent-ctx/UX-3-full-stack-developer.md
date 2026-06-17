# Task UX-3 — Loading states, toast feedback, confirmation modals

**Agent:** full-stack-developer
**Sibling worklog:** `/home/z/my-project/worklog.md` (Task UX-3 section appended)

## Files touched

### Skeleton shimmer system
- `src/app/globals.css` — added `@keyframes skeleton-shimmer` + `.skeleton-shimmer` class (warm-stone gradient sweep, respects `prefers-reduced-motion`).
- `src/components/ui/skeleton.tsx` — `<div className="skeleton-shimmer rounded-md" />` (was `bg-accent animate-pulse`).

### Component-shaped skeletons (each mimics actual layout)
- `src/components/painel/painel-view.tsx` — `PainelSkeleton` rewritten (alerts strip + stat strip + compliance + companies list + heatmap/trend). Loaded content wrapped in `animate-in fade-in duration-300`.
- `src/components/empresas/empresas-view.tsx` — `EmpresasSkeleton` rewritten (6 list rows with dot + name + CNPJ + meta + counts + buttons). Fade-in wrapper added.
- `src/components/consolidado/consolidado-view.tsx` — `LoadingState` rewritten (stat strip + heatmap table + chart + 3 detail cards). Fade-in wrapper added.
- `src/components/avaliacoes/avaliacao-detail-view.tsx` — `DetailSkeleton` rewritten (top nav + header + status actions + GHE progress rows + participation field). Main return wrapped in `animate-in fade-in duration-300`.
- `src/components/resultados/resultados-view.tsx` — `ResultadosSkeleton` rewritten (KPI strip + heatmap table + critical dimensions table + dimension detail cards). Fade-in wrapper added.
- `src/components/inventario/inventario-view.tsx` — `InventarioSkeleton` rewritten (filter chips + 9-col table header + 6 body rows + uncovered factors card). Fade-in wrapper added.
- `src/components/plano/plano-view.tsx` — `PlanoSkeleton` rewritten (KPI strip + filters + action items table). Fade-in wrapper added.
- `src/components/configuracoes/configuracoes-view.tsx` — `SessionListSkeleton` + `AuditLogSkeleton` improved to match real shapes. Fade-in wrappers added to loaded session list + audit table.

### Toast audit
- `src/components/inventario/inventario-view.tsx` — removed redundant `toast.success("Alteração salva.")` from `handlePatch` (inline `savedCell` indicator already confirms the save). Error path kept.
- All other 61 toast call sites audited: no aggressive custom durations, no missing toasts for API mutations, palette consistent (Sonner `richColors` already handles success/error tones).

### Confirmation modals (AlertDialog)
- `src/components/avaliacoes/avaliacao-detail-view.tsx` — launch-assessment button wrapped in AlertDialog (title "Lançar avaliação", `.font-display`, Cancel=Cancelar, Confirm=Lançar with spinner+disabled while `launching`).
- `src/components/shell/app-shell.tsx` — logout DropdownMenuItem now `onSelect preventDefault` + opens AlertDialog (title "Encerrar sessão?", spinner+disabled while `signingOut`). AlertDialog imports added.
- `src/components/configuracoes/configuracoes-view.tsx` — single-session revoke button wrapped in AlertDialog (title "Encerrar esta sessão?", spinner+disabled while `revoking`).
- `src/components/inventario/inventario-view.tsx` — added `deletingId` local state + `handleDelete` wrapper to `InventoryTable`; AlertDialogAction now spinner+disabled while deleting.
- `src/components/plano/plano-view.tsx` — added `deletingId` local state + `handleDelete` wrapper to `ActionItemsTable`; AlertDialogAction now spinner+disabled while deleting.
- Verified existing AlertDialogs (delete-department, close-assessment, revoke-all-others) for `.font-display` titles, AlertDialogDescription presence, spinner+disabled confirm buttons.

## Constraints honored
- NO business logic changes — only confirmation layers + spinner/disabled states tied to existing executing flags.
- NO new npm packages — only existing shadcn AlertDialog primitives + tw-animate-css utilities already in the project.
- All confirmation dialogs use `.font-display` serif titles.
- All confirm buttons show `Loader2` spinner + are disabled while the request executes.
- All `AlertDialogAction` clicks use `e.preventDefault()` so Radix doesn't auto-dismiss before the async resolves (preserves focus trap + Escape-to-cancel for the cancel path).
- All AlertDialogs have `AlertDialogDescription` (Radix a11y requirement).

## Verification
- `bun run lint` → exit 0 (clean).
- Dev server NOT started/restarted per instructions.
- Dev log shows successful recompiles after each edit batch.

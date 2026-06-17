// Client-side view state (single-route SPA navigation).
import { create } from "zustand";

export type ViewName =
  | "painel"
  | "empresas"
  | "empresa"
  | "avaliacao"
  | "resultados"
  | "inventario"
  | "plano"
  | "relatorio"
  | "configuracoes"
  | "worker";

interface ViewState {
  view: ViewName;
  // Context IDs
  companyId: string | null;
  assessmentId: string | null;
  // Worker portal (simulated in-app)
  workerToken: string | null;
  // Action item prefill (from cross-module shortcuts)
  actionItemPrefill: {
    dimensionCode?: string;
    riskLevelTrigger?: string;
    departmentId?: string;
    what?: string;
  } | null;
  // Inventory prefill
  inventoryPrefill: { mteFactorCode?: string } | null;
  // Setters
  go: (view: ViewName, opts?: {
    companyId?: string | null;
    assessmentId?: string | null;
    workerToken?: string | null;
  }) => void;
  setActionItemPrefill: (p: ViewState["actionItemPrefill"]) => void;
  setInventoryPrefill: (p: ViewState["inventoryPrefill"]) => void;
  openWorker: (token: string) => void;
  closeWorker: () => void;
}

export const useView = create<ViewState>((set) => ({
  view: "painel",
  companyId: null,
  assessmentId: null,
  workerToken: null,
  actionItemPrefill: null,
  inventoryPrefill: null,
  go: (view, opts = {}) =>
    set((s) => ({
      view,
      companyId: opts.companyId !== undefined ? opts.companyId : s.companyId,
      assessmentId:
        opts.assessmentId !== undefined ? opts.assessmentId : s.assessmentId,
      workerToken: opts.workerToken !== undefined ? opts.workerToken : s.workerToken,
    })),
  setActionItemPrefill: (p) => set({ actionItemPrefill: p }),
  setInventoryPrefill: (p) => set({ inventoryPrefill: p }),
  openWorker: (token) => set({ workerToken: token, view: "worker" }),
  closeWorker: () => set({ workerToken: null, view: "painel" }),
}));

// ─── Auth state ──────────────────────────────────────────────────────────────

interface AuthState {
  professional: import("./types").Professional | null;
  loading: boolean;
  set: (p: import("./types").Professional | null) => void;
  setLoading: (b: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  professional: null,
  loading: true,
  set: (professional) => set({ professional, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

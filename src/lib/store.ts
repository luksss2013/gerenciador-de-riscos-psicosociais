// Client-side state: auth + transient cross-module prefill.
// Navigation is router-driven (see `src/lib/nav.ts`). Zustand holds only auth
// state and the ephemeral prefill handoffs between modules (Resultados → Ação,
// Inventário → Ação). Identifiers (companyId, assessmentId) live in the URL.
import { create } from "zustand";

export type ViewName =
  | "painel"
  | "consolidado"
  | "empresas"
  | "empresa"
  | "avaliacao"
  | "resultados"
  | "inventario"
  | "plano"
  | "relatorio"
  | "configuracoes"
  | "worker";

interface PrefillState {
  // Action item prefill (from cross-module shortcuts)
  actionItemPrefill: {
    dimensionCode?: string;
    riskLevelTrigger?: string;
    departmentId?: string;
    what?: string;
  } | null;
  // Inventory prefill
  inventoryPrefill: { mteFactorCode?: string } | null;
  setActionItemPrefill: (p: PrefillState["actionItemPrefill"]) => void;
  setInventoryPrefill: (p: PrefillState["inventoryPrefill"]) => void;
}

export const useView = create<PrefillState>((set) => ({
  actionItemPrefill: null,
  inventoryPrefill: null,
  setActionItemPrefill: (p) => set({ actionItemPrefill: p }),
  setInventoryPrefill: (p) => set({ inventoryPrefill: p }),
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

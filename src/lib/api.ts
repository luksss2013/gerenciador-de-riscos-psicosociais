// Typed API client for /api/v1 — uses fetch with credentials: 'include'.
import type {
  ActionItem,
  ActionPlan,
  Assessment,
  AssessmentProgress,
  AuditLogEntry,
  CompanyBreakdown,
  CompanySummary,
  DashboardData,
  Department,
  CycleTrend,
  Professional,
  ProfessionalDashboard,
  Report,
  RiskInventoryGroup,
  RiskInventoryItem,
  SearchResults,
  WorkerTokenStatus,
  CopsoqItemDTO,
} from "./types";

const BASE = "/api/v1";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function req<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
  };
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers,
    credentials: "include",
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const err = (data as { error?: { code: string; message: string; details?: unknown } } | null)?.error;
    if (err) {
      throw new ApiError(err.code, err.message, res.status, err.details);
    }
    throw new ApiError("INTERNAL_ERROR", `HTTP ${res.status}`, res.status);
  }
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (body: {
      name: string; email: string; password: string;
      professionType: string; credentialNumber?: string;
      phone?: string; acceptedTerms: boolean;
    }) => req<{ professional: Professional }>("/auth/register", {
      method: "POST", json: body,
    }),
    login: (body: { email: string; password: string }) =>
      req<{ professional: Professional }>("/auth/login", { method: "POST", json: body }),
    logout: () => req<{ ok: true }>("/auth/logout", { method: "POST" }),
  },

  me: {
    get: async (): Promise<Professional> => {
      const res = await req<{ professional: Professional }>("/professionals/me");
      return res.professional;
    },
    update: async (body: Partial<Professional>): Promise<Professional> => {
      const res = await req<{ professional: Professional }>("/professionals/me", {
        method: "PATCH", json: body,
      });
      return res.professional;
    },
    dashboard: () => req<ProfessionalDashboard>("/professionals/me/dashboard"),
    companiesBreakdown: () =>
      req<{ data: CompanyBreakdown[] }>("/professionals/me/companies-breakdown"),
  },

  auditLogs: {
    list: (params: { page?: number; limit?: number; action?: string; resourceType?: string } = {}) => {
      const q = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 50),
      });
      if (params.action) q.set("action", params.action);
      if (params.resourceType) q.set("resourceType", params.resourceType);
      return req<{ data: AuditLogEntry[]; meta: { total: number; page: number; limit: number; pages: number } }>(
        `/audit-logs?${q}`
      );
    },
    exportCSV: (params: { action?: string; resourceType?: string } = {}): Promise<Response> => {
      const q = new URLSearchParams();
      if (params.action) q.set("action", params.action);
      if (params.resourceType) q.set("resourceType", params.resourceType);
      // Return the raw Response so the caller can trigger a download.
      return fetch(`${BASE}/audit-logs/export?${q}`, { credentials: "include" });
    },
  },

  sessions: {
    list: () =>
      req<{
        data: Array<{
          id: string;
          createdAt: string;
          expiresAt: string;
          tokenPreview: string;
          isCurrent: boolean;
        }>;
      }>("/sessions"),
    revokeOthers: () => req<{ revoked: number }>("/sessions/others", { method: "DELETE" }),
    revoke: (sessionId: string) =>
      req<{ ok: true }>(`/sessions/${sessionId}`, { method: "DELETE" }),
  },

  companies: {
    list: (params: { page?: number; limit?: number; q?: string } = {}) => {
      const q = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 50),
        q: params.q ?? "",
      });
      return req<{ data: CompanySummary[]; meta: { total: number; page: number; limit: number; pages: number } }>(
        `/companies?${q}`
      );
    },
    get: (id: string) => req<CompanySummary>(`/companies/${id}`),
    create: (body: Record<string, unknown>) =>
      req<CompanySummary>("/companies", { method: "POST", json: body }),
    update: (id: string, body: Record<string, unknown>) =>
      req<CompanySummary>(`/companies/${id}`, { method: "PATCH", json: body }),
    delete: (id: string) => req<{ ok: true }>(`/companies/${id}`, { method: "DELETE" }),
  },

  departments: {
    list: (companyId: string) =>
      req<{ data: Department[] }>(`/companies/${companyId}/departments`),
    create: (companyId: string, body: { name: string; description?: string; workerCount: number }) =>
      req<Department>(`/companies/${companyId}/departments`, { method: "POST", json: body }),
    update: (companyId: string, deptId: string, body: Partial<Department>) =>
      req<Department>(`/companies/${companyId}/departments/${deptId}`, { method: "PATCH", json: body }),
    delete: (companyId: string, deptId: string) =>
      req<{ ok: true }>(`/companies/${companyId}/departments/${deptId}`, { method: "DELETE" }),
  },

  assessments: {
    listByCompany: (companyId: string) =>
      req<{ data: Assessment[] }>(`/companies/${companyId}/assessments`),
    get: (id: string) => req<Assessment>(`/assessments/${id}`),
    create: (companyId: string, body: {
      title: string; startDate?: string; endDate: string;
      departments: Array<{ departmentId: string; expectedResponses: number }>;
    }) => req<Assessment>(`/companies/${companyId}/assessments`, { method: "POST", json: body }),
    update: (id: string, body: Partial<Assessment>) =>
      req<Assessment>(`/assessments/${id}`, { method: "PATCH", json: body }),
    duplicate: (id: string, body?: { title?: string }) =>
      req<Assessment>(`/assessments/${id}/duplicate`, { method: "POST", json: body ?? {} }),
    launch: (id: string) =>
      req<{ status: string; totalTokens: number }>(`/assessments/${id}/launch`, { method: "POST" }),
    close: (id: string) =>
      req<{ status: string; eligibleDepts: number; totalDimensions: number }>(
        `/assessments/${id}/close`, { method: "POST" }
      ),
    simulate: (id: string, body: {
      count?: number;
      assessmentDeptId?: string;
      bias?: "low" | "medium" | "high";
    }) =>
      req<{
        simulated: number;
        byDept: Array<{
          id: string;
          name: string;
          responseCount: number;
          isEligible: boolean;
        }>;
      }>(`/assessments/${id}/simulate`, { method: "POST", json: body }),
    score: (id: string) =>
      req<{ status: string; eligibleDepts: number; totalDimensions: number }>(
        `/assessments/${id}/score`, { method: "POST" }
      ),
    progress: (id: string) => req<AssessmentProgress>(`/assessments/${id}/progress`),
    dashboard: (id: string) => req<DashboardData>(`/assessments/${id}/dashboard`),
    trend: (companyId: string) => req<CycleTrend[]>(`/companies/${companyId}/trend`),
  },

  inventory: {
    list: (assessmentId: string) =>
      req<RiskInventoryGroup>(`/assessments/${assessmentId}/risk-inventory`),
    addManual: (assessmentId: string, body: Record<string, unknown>) =>
      req<RiskInventoryItem>(`/assessments/${assessmentId}/risk-inventory/manual`, {
        method: "POST", json: body,
      }),
    update: (itemId: string, body: Record<string, unknown>) =>
      req<RiskInventoryItem>(`/risk-inventory-items/${itemId}`, { method: "PATCH", json: body }),
    delete: (itemId: string) =>
      req<{ ok: true }>(`/risk-inventory-items/${itemId}`, { method: "DELETE" }),
  },

  actionPlan: {
    get: (assessmentId: string) =>
      req<ActionPlan>(`/assessments/${assessmentId}/action-plan`),
    addItem: (assessmentId: string, body: Record<string, unknown>) =>
      req<ActionItem>(`/assessments/${assessmentId}/action-items`, { method: "POST", json: body }),
    updateItem: (itemId: string, body: Record<string, unknown>) =>
      req<ActionItem>(`/action-items/${itemId}`, { method: "PATCH", json: body }),
    deleteItem: (itemId: string) =>
      req<{ ok: true }>(`/action-items/${itemId}`, { method: "DELETE" }),
  },

  reports: {
    list: (assessmentId: string) =>
      req<{ data: Report[] }>(`/assessments/${assessmentId}/reports`),
    generate: (assessmentId: string, body: {
      type: "pdf" | "docx" | "html";
      metadata: { responsibleName: string; credentialNumber: string; reportDate: string; notes?: string };
    }) => req<{ reportId: string; status: string }>(
      `/assessments/${assessmentId}/reports/generate`, { method: "POST", json: body }
    ),
    status: (reportId: string) =>
      req<{ status: string; downloadUrl?: string }>(`/reports/${reportId}/status`),
  },

  worker: {
    enterDept: (assessmentDeptId: string) =>
      req<{ token: string; redirectUrl: string }>(`/respond/dept/${assessmentDeptId}`),
    tokenStatus: (token: string) =>
      req<WorkerTokenStatus>(`/respond/token/${token}/status`),
    tokenItems: (token: string) =>
      req<{ items: CopsoqItemDTO[]; scale: Array<{ value: number; label: string }> }>(
        `/respond/token/${token}/items`
      ),
    answer: (token: string, body: { itemIndex: number; likertValue: number }) =>
      req<{ ok: true; answeredCount: number; totalItems: number }>(
        `/respond/token/${token}/answer`, { method: "POST", json: body }
      ),
    complete: (token: string) =>
      req<{ message: string }>(`/respond/token/${token}/complete`, { method: "POST" }),
  },

  system: {
    seedCopsoq: () =>
      req<{ items: number; dimensions: number; seeded: boolean }>("/system/seed-copsoq", { method: "POST" }),
  },

  search: (q: string) =>
    req<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

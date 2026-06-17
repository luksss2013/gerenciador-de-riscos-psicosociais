// Shared frontend types (DTOs) — mirror of API responses.

export type DimensionCode =
  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6"
  | "D7" | "D8" | "D9" | "D10" | "D11";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type AssessmentStatus =
  | "draft" | "collecting" | "processing" | "completed" | "archived";

export type ActionStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type ProfessionType =
  | "psychologist" | "sst_engineer" | "sst_technician"
  | "occupational_physician" | "other";

export interface Professional {
  id: string;
  email: string;
  name: string;
  professionType: ProfessionType;
  credentialNumber: string | null;
  phone: string | null;
  createdAt: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  cnpj: string;
  cnaePrimary: string | null;
  employeeCount: number | null;
  city: string | null;
  state: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  dpoPoc: string | null;
  isActive: boolean;
  createdAt: string;
  summary: {
    departmentsCount: number;
    assessmentsCount: number;
    lastAssessmentId: string | null;
    lastAssessmentStatus: AssessmentStatus | null;
    lastAssessmentCompletedAt: string | null;
  };
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  workerCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AssessmentDepartment {
  id: string;
  departmentId: string;
  name: string;
  expected: number;
  responded: number;
  tokenCount: number;
  isEligible: boolean;
}

export interface Assessment {
  id: string;
  companyId: string;
  professionalId: string;
  instrument: string;
  title: string;
  status: AssessmentStatus;
  startDate: string | null;
  endDate: string | null;
  participationRegistration: string | null;
  workerCommunicationSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  departments?: AssessmentDepartment[];
}

export interface AssessmentProgress {
  globalAdesao: number;
  byDept: Array<{
    id: string;
    name: string;
    expected: number;
    responded: number;
    pct: number;
    isEligible: boolean;
  }>;
}

export interface DimensionResultDTO {
  code: DimensionCode;
  rawScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  cronbachAlpha: number | null;
  nResponses: number;
}

export interface DashboardData {
  kpis: {
    globalAdesao: number;
    ghesHighRisk: number;
    ghesMediumRisk: number;
    ghesIneligible: number;
    totalRespondents: number;
  };
  heatmap: Array<{
    deptId: string;
    deptName: string;
    nResponses: number;
    isEligible: boolean;
    dimensions: DimensionResultDTO[] | null;
  }>;
  companyAvg: Array<{
    code: DimensionCode;
    weightedAvgRiskScore: number;
    riskLevel: RiskLevel;
  }>;
  criticalDimensions: Array<{
    code: DimensionCode;
    name: string;
    avgRiskScore: number;
    affectedDepts: string[];
  }>;
}

export interface RiskInventoryItem {
  id: string;
  assessmentId: string;
  assessmentDepartmentId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  dimensionCode: DimensionCode | null;
  mteFactorCode: string | null;
  isManual: boolean;
  hazardDescription: string;
  possibleHarms: string;
  probability: number;
  severity: number;
  existingControls: string | null;
  proposedMeasures: string | null;
}

export interface RiskInventoryGroup {
  autoItems: RiskInventoryItem[];
  manualItems: RiskInventoryItem[];
}

export interface ActionItem {
  id: string;
  actionPlanId: string;
  departmentId: string | null;
  departmentName: string | null;
  dimensionCode: DimensionCode | null;
  riskLevelTrigger: RiskLevel | null;
  what: string;
  why: string;
  who: string;
  where: string;
  whenDate: string;
  how: string;
  estimatedCost: number | null;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActionPlan {
  id: string;
  actionItems: ActionItem[];
}

export interface Report {
  id: string;
  assessmentId: string;
  type: "pdf" | "docx" | "html";
  storageKey: string;
  fileSizeBytes: number | null;
  generatedAt: string;
  status: "processing" | "ready" | "error";
  errorMessage: string | null;
  metadata: {
    responsibleName: string;
    credentialNumber: string;
    reportDate: string;
    notes?: string;
  } | null;
}

export interface WorkerTokenStatus {
  valid: boolean;
  alreadyUsed: boolean;
  assessmentOpen: boolean;
  answeredCount: number;
  totalItems: number;
}

export interface CopsoqItemDTO {
  index: number;
  dimensionCode: DimensionCode;
  textPtBr: string;
  responseType: string;
}

export interface CycleTrend {
  assessmentId: string;
  title: string;
  completedAt: string;
  dimensions: Array<{ code: DimensionCode; avgRiskScore: number }>;
}

export interface ProfessionalDashboard {
  kpis: {
    totalCompanies: number;
    totalDepartments: number;
    totalAssessments: number;
    activeAssessments: number;
    completedAssessments: number;
    totalRespondents: number;
    atRiskGhes: number;
    mediumRiskGhes: number;
  };
  compliance: {
    compliant: number;
    pendingReview: number;
    noAssessment: number;
    inProgress: number;
  };
  recentAssessments: Array<{
    id: string;
    title: string;
    status: AssessmentStatus;
    companyId: string;
    companyName: string;
    completedAt: string | null;
    updatedAt: string;
  }>;
  dimensionHeatmap: Array<{
    code: DimensionCode;
    name: string;
    weightedAvgRiskScore: number;
    riskLevel: RiskLevel;
  }>;
  trend: Array<{
    month: string;
    label: string;
    count: number;
  }>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

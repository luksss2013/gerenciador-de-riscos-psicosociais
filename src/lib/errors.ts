// API error taxonomy (spec §3.1).
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHORIZED_TENANT_ACCESS: "UNAUTHORIZED_TENANT_ACCESS",
  CNPJ_INVALID: "CNPJ_INVALID",
  CNPJ_ALREADY_REGISTERED: "CNPJ_ALREADY_REGISTERED",
  COMPANY_NOT_FOUND: "COMPANY_NOT_FOUND",
  DEPARTMENT_HAS_ACTIVE_ASSESSMENT: "DEPARTMENT_HAS_ACTIVE_ASSESSMENT",
  DEPARTMENT_NAME_DUPLICATE: "DEPARTMENT_NAME_DUPLICATE",
  ASSESSMENT_NOT_DRAFT: "ASSESSMENT_NOT_DRAFT",
  ASSESSMENT_NOT_COLLECTING: "ASSESSMENT_NOT_COLLECTING",
  ASSESSMENT_NOT_PROCESSING: "ASSESSMENT_NOT_PROCESSING",
  ASSESSMENT_NOT_COMPLETED: "ASSESSMENT_NOT_COMPLETED",
  ASSESSMENT_DEPT_NOT_FOUND: "ASSESSMENT_DEPT_NOT_FOUND",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_ALREADY_USED: "TOKEN_ALREADY_USED",
  TOKEN_ASSESSMENT_CLOSED: "TOKEN_ASSESSMENT_CLOSED",
  GHE_BELOW_MINIMUM_RESPONSES: "GHE_BELOW_MINIMUM_RESPONSES",
  REPORT_PREREQUISITES_UNMET: "REPORT_PREREQUISITES_UNMET",
  PARTICIPATION_NOT_REGISTERED: "PARTICIPATION_NOT_REGISTERED",
  PROFESSIONAL_NOT_FOUND: "PROFESSIONAL_NOT_FOUND",
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  ITEM_NOT_MANUAL: "ITEM_NOT_MANUAL",
  NOT_FOUND: "NOT_FOUND",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  UNAUTHORIZED_TENANT_ACCESS: 403,
  CNPJ_INVALID: 422,
  CNPJ_ALREADY_REGISTERED: 409,
  COMPANY_NOT_FOUND: 404,
  DEPARTMENT_HAS_ACTIVE_ASSESSMENT: 409,
  DEPARTMENT_NAME_DUPLICATE: 409,
  ASSESSMENT_NOT_DRAFT: 409,
  ASSESSMENT_NOT_COLLECTING: 409,
  ASSESSMENT_NOT_PROCESSING: 409,
  ASSESSMENT_NOT_COMPLETED: 409,
  ASSESSMENT_DEPT_NOT_FOUND: 404,
  TOKEN_INVALID: 404,
  TOKEN_ALREADY_USED: 403,
  TOKEN_ASSESSMENT_CLOSED: 409,
  GHE_BELOW_MINIMUM_RESPONSES: 422,
  REPORT_PREREQUISITES_UNMET: 422,
  PARTICIPATION_NOT_REGISTERED: 422,
  PROFESSIONAL_NOT_FOUND: 404,
  EMAIL_ALREADY_REGISTERED: 409,
  INVALID_CREDENTIALS: 401,
  VALIDATION_ERROR: 422,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  ITEM_NOT_MANUAL: 409,
  NOT_FOUND: 404,
};

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: Record<string, unknown>;
  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.code = code;
    this.status = HTTP_STATUS[code];
    this.details = details;
  }
}

export function errorResponse(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
  return {
    error: {
      code,
      message: message ?? code,
      ...(details ? { details } : {}),
    },
  };
}

export const PROFESSION_TYPES = [
  "psychologist",
  "sst_engineer",
  "sst_technician",
  "occupational_physician",
  "other",
] as const;
export type ProfessionType = (typeof PROFESSION_TYPES)[number];

export const PROFESSION_TYPE_LABELS: Record<ProfessionType, string> = {
  psychologist: "Psicólogo(a)",
  sst_engineer: "Eng. de Segurança do Trabalho",
  sst_technician: "Téc. de Segurança do Trabalho",
  occupational_physician: "Médico(a) do Trabalho",
  other: "Outro profissional SST",
};

export const BRAZILIAN_UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  collecting: "Coletando respostas",
  processing: "Processando",
  completed: "Concluída",
  archived: "Arquivada",
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: "Favorável",
  MEDIUM: "Intermediário",
  HIGH: "Desfavorável",
};

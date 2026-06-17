import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  parsePagination,
  requireProfessional,
} from "@/lib/session";

interface AuditLogRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadataJson: string | null;
  createdAt: Date;
}

function parseMetadata(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const professional = await requireProfessional();
    const { page, limit } = parsePagination(request);

    const url = new URL(request.url);
    const actionFilter = url.searchParams.get("action");
    const resourceTypeFilter = url.searchParams.get("resourceType");

    const where = {
      professionalId: professional.id,
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(resourceTypeFilter ? { resourceType: resourceTypeFilter } : {}),
    };

    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));
    const data = (rows as AuditLogRow[]).map((row) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      metadata: parseMetadata(row.metadataJson),
      createdAt: row.createdAt.toISOString(),
    }));

    return jsonResponse({ data, meta: { total, page, limit, pages } });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[audit-logs GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

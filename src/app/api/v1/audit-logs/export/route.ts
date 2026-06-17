import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, requireProfessional } from "@/lib/session";

interface AuditLogRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadataJson: string | null;
  createdAt: Date;
}

// Escape a single CSV field per RFC 4180: wrap in double quotes if it contains
// a comma, double-quote, newline, or carriage return; escape internal quotes
// by doubling them.
function csvEscape(value: string): string {
  if (value === "") return "";
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const professional = await requireProfessional();

    const url = new URL(request.url);
    const actionFilter = url.searchParams.get("action");
    const resourceTypeFilter = url.searchParams.get("resourceType");

    const where = {
      professionalId: professional.id,
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(resourceTypeFilter ? { resourceType: resourceTypeFilter } : {}),
    };

    const rows = (await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10_000,
    })) as AuditLogRow[];

    const header = "Data/Hora,Ação,Recurso,ID do Recurso,Detalhes";
    const body = rows
      .map((row) => {
        const fields = [
          row.createdAt.toISOString(),
          row.action,
          row.resourceType,
          row.resourceId ?? "",
          row.metadataJson ?? "",
        ];
        return fields.map(csvEscape).join(",");
      })
      .join("\n");

    // UTF-8 BOM so Excel opens the file with the correct encoding.
    const csv = `\uFEFF${header}\n${body}\n`;
    const today = new Date().toISOString().slice(0, 10);
    const filename = `audit-log-${today}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[audit-logs/export GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

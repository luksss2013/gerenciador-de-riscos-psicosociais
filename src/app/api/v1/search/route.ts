import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
} from "@/lib/session";

/**
 * GET /api/v1/search?q=<query>
 * Global search across the professional's tenant-scoped data.
 * Returns grouped results (companies, assessments, departments, action items,
 * risk inventory items) matching the query string.
 *
 * Min query length: 2 chars. Max results per group: 5.
 */
export async function GET(request: Request) {
  try {
    const professional = await requireProfessional();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    if (q.length < 2) {
      return jsonResponse({ companies: [], assessments: [], departments: [], actionItems: [], inventoryItems: [] });
    }

    const pid = professional.id;

    // Companies: name or CNPJ (formatted or raw)
    const companiesRaw = await db.company.findMany({
      where: {
        professionalId: pid,
        isActive: true,
        OR: [
          { name: { contains: q } },
          { cnpj: { contains: q } },
          { cnaePrimary: { contains: q } },
          { city: { contains: q } },
          { state: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
      select: { id: true, name: true, cnpj: true, city: true, state: true },
    });

    // Departments: name (scoped to professional's companies)
    const departmentsRaw = await db.department.findMany({
      where: {
        isActive: true,
        company: { professionalId: pid, isActive: true },
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        workerCount: true,
        company: { select: { id: true, name: true } },
      },
    });

    // Assessments: title
    const assessmentsRaw = await db.assessment.findMany({
      where: {
        professionalId: pid,
        title: { contains: q },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        company: { select: { id: true, name: true } },
      },
    });

    // Action items: what / who
    const actionItemsRaw = await db.actionItem.findMany({
      where: {
        actionPlan: { assessment: { professionalId: pid } },
        OR: [
          { what: { contains: q } },
          { who: { contains: q } },
          { why: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        what: true,
        status: true,
        whenDate: true,
        actionPlan: {
          select: {
            assessment: {
              select: {
                id: true,
                title: true,
                company: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Risk inventory items: hazardDescription / possibleHarms
    const inventoryItemsRaw = await db.riskInventoryItem.findMany({
      where: {
        assessment: { professionalId: pid },
        OR: [
          { hazardDescription: { contains: q } },
          { possibleHarms: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        hazardDescription: true,
        mteFactorCode: true,
        dimensionCode: true,
        assessment: {
          select: {
            id: true,
            title: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });

    return jsonResponse({
      companies: companiesRaw.map((c) => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        city: c.city,
        state: c.state,
      })),
      departments: departmentsRaw.map((d) => ({
        id: d.id,
        name: d.name,
        workerCount: d.workerCount,
        companyId: d.company.id,
        companyName: d.company.name,
      })),
      assessments: assessmentsRaw.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        companyId: a.company.id,
        companyName: a.company.name,
      })),
      actionItems: actionItemsRaw.map((ai) => ({
        id: ai.id,
        what: ai.what,
        status: ai.status,
        whenDate: ai.whenDate,
        assessmentId: ai.actionPlan.assessment.id,
        assessmentTitle: ai.actionPlan.assessment.title,
        companyId: ai.actionPlan.assessment.company.id,
        companyName: ai.actionPlan.assessment.company.name,
      })),
      inventoryItems: inventoryItemsRaw.map((inv) => ({
        id: inv.id,
        hazardDescription: inv.hazardDescription,
        mteFactorCode: inv.mteFactorCode,
        dimensionCode: inv.dimensionCode,
        assessmentId: inv.assessment.id,
        assessmentTitle: inv.assessment.title,
        companyId: inv.assessment.company.id,
        companyName: inv.assessment.company.name,
      })),
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[search GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

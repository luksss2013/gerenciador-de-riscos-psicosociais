import { COPSOQ_DIMENSIONS } from "@/lib/copsoq-data";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { companyWeightedAverage, type DimensionScoreResult } from "@/lib/scoring";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

/**
 * GET /api/v1/reports/:reportId/download
 * Spec §3.11 — returns the report content for download.
 *
 * Sandbox adaptation: the spec calls for R2 presigned URLs (TTL 1h) for PDF/DOCX.
 * The sandbox has no R2 — so:
 * - For HTML reports: returns the HTML content inline (Content-Type: text/html).
 * - For PDF/DOCX: returns a JSON error explaining binary generation is not
 *   available in the sandbox (the in-app HTML preview + browser print-to-PDF
 *   covers the PDF use case).
 *
 * In production, this endpoint would redirect (302) to a presigned R2 URL.
 */
interface RouteCtx {
  params: Promise<{ reportId: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { reportId } = await params;

    const report = await db.report.findUnique({
      where: { id: reportId },
      include: {
        assessment: {
          include: {
            company: true,
            departments: {
              include: {
                department: true,
                dimensionResults: true,
              },
            },
          },
        },
      },
    });
    if (!report) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Report not found");
    }
    await requireTenantOwnership(report.assessment.professionalId, professional.id);

    if (report.status !== "ready") {
      return errorJson(ERROR_CODES.NOT_FOUND, "Report is not ready for download");
    }

    // Parse metadata
    const metadata = report.metadataJson
      ? (() => {
          try {
            return JSON.parse(report.metadataJson);
          } catch {
            return null;
          }
        })()
      : null;

    if (report.type === "html") {
      // Generate + return the HTML document inline
      const html = buildReportHtml(report, metadata);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-${report.id}.html"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // PDF / DOCX — sandbox cannot generate binaries.
    // Return a JSON response explaining the limitation and pointing to the
    // in-app HTML preview (which supports browser print-to-PDF).
    return jsonResponse(
      {
        error: {
          code: "BINARY_NOT_SUPPORTED",
          message:
            "Geração de arquivo binário (PDF/DOCX) não disponível no ambiente. Use a pré-visualização HTML e a função 'Imprimir / Salvar PDF' do navegador.",
          reportId: report.id,
          type: report.type,
          previewUrl: `/?report=${report.id}`,
        },
      },
      501,
    );
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[reports/download GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

// ─── HTML report builder ────────────────────────────────────────────────────

function buildReportHtml(
  report: {
    id: string;
    type: string;
    generatedAt: Date;
    assessment: {
      title: string;
      status: string;
      startDate: Date | null;
      endDate: Date | null;
      completedAt: Date | null;
      participationRegistration: string | null;
      company: {
        name: string;
        cnpj: string;
        cnaePrimary: string | null;
        city: string | null;
        state: string | null;
        employeeCount: number | null;
      };
      departments: Array<{
        id: string;
        isEligible: boolean;
        responseCount: number;
        expectedResponses: number;
        department: { name: string; workerCount: number };
        dimensionResults: Array<{
          dimensionCode: string;
          rawScore: number;
          riskScore: number;
          riskLevel: string;
          cronbachAlpha: number | null;
          nResponses: number;
        }>;
      }>;
    };
  },
  metadata: {
    responsibleName?: string;
    credentialNumber?: string;
    reportDate?: string;
    notes?: string;
  } | null,
): string {
  const a = report.assessment;
  const c = a.company;
  const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");

  // Company-level weighted averages
  const perDeptForAvg: { nResponses: number; results: DimensionScoreResult[] }[] = [];
  for (const ad of a.departments) {
    if (!ad.isEligible) continue;
    const results: DimensionScoreResult[] = COPSOQ_DIMENSIONS.map((dim) => {
      const r = ad.dimensionResults.find((x) => x.dimensionCode === dim.code);
      return {
        dimensionCode: dim.code,
        rawScore: r?.rawScore ?? 0,
        riskScore: r?.riskScore ?? 0,
        riskLevel: (r?.riskLevel ?? "LOW") as "LOW" | "MEDIUM" | "HIGH",
        cronbachAlpha: r?.cronbachAlpha ?? null,
        nResponses: r?.nResponses ?? ad.responseCount,
        direction: dim.direction,
      };
    });
    perDeptForAvg.push({ nResponses: ad.responseCount, results });
  }
  const companyAvg = companyWeightedAverage(perDeptForAvg);

  const responsibleName = metadata?.responsibleName || "—";
  const credentialNumber = metadata?.credentialNumber || "—";
  const reportDate = metadata?.reportDate
    ? new Date(metadata.reportDate).toLocaleDateString("pt-BR")
    : fmtDate(report.generatedAt);
  const notes = metadata?.notes || "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório PGR — ${escapeHtml(a.title)}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; color: #2A2620; line-height: 1.6; }
  h1, h2, h3 { color: #2F4A43; }
  h1 { font-size: 1.5rem; border-bottom: 2px solid #2F4A43; padding-bottom: .5rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: .85rem; }
  th, td { border: 1px solid #E4DDD2; padding: .4rem .6rem; text-align: left; }
  th { background: #F4F0E9; }
  .risk-LOW { background: #5B8A6A; color: #fff; }
  .risk-MEDIUM { background: #C9952F; color: #2A2620; }
  .risk-HIGH { background: #C25647; color: #fff; }
  .meta { color: #6B6358; font-size: .85rem; margin-bottom: 1rem; }
  .footer { margin-top: 3rem; border-top: 1px solid #E4DDD2; padding-top: .5rem; font-size: .75rem; color: #6B6358; }
</style>
</head>
<body>
<h1>Relatório PGR — Riscos Psicossociais</h1>
<div class="meta">
  <strong>Empresa:</strong> ${escapeHtml(c.name)} · CNPJ: ${formatCnpj(c.cnpj)}<br>
  <strong>Avaliação:</strong> ${escapeHtml(a.title)} · Período: ${fmtDate(a.startDate)} a ${fmtDate(a.endDate)}<br>
  <strong>Concluída em:</strong> ${fmtDate(a.completedAt)}<br>
  <strong>Responsável:</strong> ${escapeHtml(responsibleName)} · ${escapeHtml(credentialNumber)}<br>
  <strong>Data do relatório:</strong> ${reportDate}
</div>

<h2>1. Identificação</h2>
<p>Este relatório documenta a avaliação de riscos psicossociais realizada conforme a NR-1 (Portaria MTE 1.419/2024), utilizando o instrumento COPSOQ II-BR (versão curta, 40 itens, 11 dimensões).</p>

<h2>2. Metodologia</h2>
<p>O instrumento COPSOQ II-BR foi aplicado anonimamente aos trabalhadores dos GHEs elegíveis. As respostas foram convertidas para escores de 0 a 100 (escala Likert 5 pontos). Dimensões INVERTIDAS têm o escore de risco calculado como 100 − escore bruto. A classificação de risco é: LOW (0–33), MEDIUM (34–66), HIGH (67–100).</p>

<h2>3. Identificação de Perigos</h2>
<p>A avaliação identificou fatores de risco psicossocial mapeados aos 13 fatores FRPRT do MTE, com cobertura via COPSOQ II-BR para as dimensões D1–D11.</p>

<h2>4. Avaliação de Riscos — Média da Empresa por Dimensão</h2>
<table>
<tr><th>Dim</th><th>Dimensão</th><th>Escore</th><th>Nível</th></tr>
${companyAvg
  .map(
    (d) =>
      `<tr><td>${d.code}</td><td>${escapeHtml(COPSOQ_DIMENSIONS.find((x) => x.code === d.code)?.namePtBr ?? d.code)}</td><td>${d.weightedAvg.toFixed(0)}</td><td class="risk-${d.riskLevel}">${d.riskLevel}</td></tr>`,
  )
  .join("")}
</table>

<h2>5. Resultados por GHE</h2>
${a.departments
  .map(
    (ad) => `
<h3>${escapeHtml(ad.department.name)} (N=${ad.responseCount}${ad.isEligible ? "" : " — inelegível"})</h3>
${
  ad.isEligible
    ? `<table>
<tr><th>Dim</th><th>Bruto</th><th>Risco</th><th>Nível</th><th>α</th></tr>
${ad.dimensionResults
  .map(
    (r) =>
      `<tr><td>${r.dimensionCode}</td><td>${r.rawScore.toFixed(0)}</td><td>${r.riskScore.toFixed(0)}</td><td class="risk-${r.riskLevel}">${r.riskLevel}</td><td>${r.cronbachAlpha !== null ? r.cronbachAlpha.toFixed(2) : "—"}</td></tr>`,
  )
  .join("")}
</table>`
    : `<p style="color:#6B6358;font-size:.85rem">GHE inelegível (menos de 5 respostas) — dados protegidos por anonimato (RB-03).</p>`
}`,
  )
  .join("")}

${notes ? `<h2>6. Observações</h2><p>${escapeHtml(notes)}</p>` : ""}

<div class="footer">
  Relatório gerado em ${report.generatedAt.toLocaleString("pt-BR")} pelo sistema NR-1 Copsoq · Conforme NR-1 / Portaria MTE 1.419/2024 · Instrumento COPSOQ II-BR (CC BY-NC-ND 4.0)
</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCnpj(cnpj: string): string {
  const s = cnpj.replace(/\D/g, "");
  if (s.length !== 14) return cnpj;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`;
}

"use client";

// Router-driven navigation helpers (replaces the Zustand `useView.go` primitive).
// `useGo` is a drop-in for the old `go(view, opts)` call signature: it builds
// the App Router URL for the target view and pushes it. When `opts` omits
// `companyId`/`assessmentId` (intra-assessment nav), the current route params
// are used as the fallback — mirroring the old store's sticky-context behavior.

import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import type { ViewName } from "@/lib/store";

export interface NavOpts {
  companyId?: string | null;
  assessmentId?: string | null;
}

type RouteParams = { companyId?: string | string[]; assessmentId?: string | string[] };

function pick(p: string | string[] | undefined): string | undefined {
  return Array.isArray(p) ? p[0] : p;
}

export function urlFor(view: ViewName, opts: NavOpts = {}, ctx: NavOpts = {}): string {
  const cid = opts.companyId ?? ctx.companyId;
  const aid = opts.assessmentId ?? ctx.assessmentId;
  switch (view) {
    case "painel":
      return "/painel";
    case "consolidado":
      return "/consolidado";
    case "empresas":
      return "/empresas";
    case "configuracoes":
      return "/configuracoes";
    case "empresa":
      return `/empresas/${cid}`;
    case "avaliacao":
      return `/empresas/${cid}/avaliacoes/${aid}`;
    case "resultados":
      return `/empresas/${cid}/avaliacoes/${aid}/resultados`;
    case "inventario":
      return `/empresas/${cid}/avaliacoes/${aid}/inventario`;
    case "plano":
      return `/empresas/${cid}/avaliacoes/${aid}/plano-de-acao`;
    case "relatorio":
      return `/empresas/${cid}/avaliacoes/${aid}/relatorio`;
    case "worker":
      // Worker portal is a dedicated /portal/[token] route, not reachable via go().
      return "/painel";
    default:
      return "/painel";
  }
}

export function useGo() {
  const router = useRouter();
  const params = useParams() as RouteParams;
  const companyId = pick(params?.companyId);
  const assessmentId = pick(params?.assessmentId);
  return useCallback(
    (view: ViewName, opts: NavOpts = {}) => {
      router.push(urlFor(view, opts, { companyId, assessmentId }));
    },
    [router, companyId, assessmentId],
  );
}

export function useCompanyIdParam(): string {
  const params = useParams() as RouteParams;
  return pick(params?.companyId) ?? "";
}

export function useAssessmentIdParam(): string {
  const params = useParams() as RouteParams;
  return pick(params?.assessmentId) ?? "";
}

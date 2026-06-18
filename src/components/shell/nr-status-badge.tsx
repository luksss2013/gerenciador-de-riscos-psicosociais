"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type NrStatus =
  | "no_assessment"
  | "collecting"
  | "completed"
  | "review_recommended"
  | "processing"
  | "draft"
  | "archived";

interface NrStatusBadgeProps {
  status: NrStatus;
  className?: string;
}

const NR_STATUS_CONFIG: Record<NrStatus, { label: string; className: string }> = {
  no_assessment: {
    label: "Sem avaliação",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  draft: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  collecting: {
    label: "Coletando",
    className: "bg-[var(--sidebar-accent)] text-[var(--brand)] border-transparent",
  },
  processing: {
    label: "Processando",
    className: "bg-[var(--sidebar-accent)] text-[var(--brand)] border-transparent",
  },
  completed: {
    label: "Concluída",
    className: "risk-low-bg border-transparent",
  },
  review_recommended: {
    label: "Revisão recomendada",
    className: "risk-medium-bg border-transparent",
  },
  archived: {
    label: "Arquivada",
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function NrStatusBadge({ status, className }: NrStatusBadgeProps) {
  const config = NR_STATUS_CONFIG[status] ?? NR_STATUS_CONFIG.no_assessment;
  return (
    <Badge className={cn(config.className, className)} aria-label={`Status: ${config.label}`}>
      {config.label}
    </Badge>
  );
}

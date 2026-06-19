"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon?: ElementType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: "default" | "compact";
  id?: string;
  className?: string;
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {Icon ? (
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          ) : null}
          <h2
            id={id}
            className={cn(
              "font-display tracking-tight text-foreground",
              size === "compact" ? "text-base font-medium" : "text-lg sm:text-xl",
            )}
          >
            {title}
          </h2>
        </div>
        {description ? (
          <div
            className={cn(
              "text-sm text-muted-foreground leading-relaxed max-w-2xl",
              size === "compact" ? "mt-0.5" : "mt-1",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

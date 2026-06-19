"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderEyebrow {
  label: string;
  icon?: ElementType;
  trailing?: ReactNode;
}

interface PageHeaderProps {
  eyebrow?: PageHeaderEyebrow;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  size?: "default" | "compact";
  border?: boolean;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  size = "default",
  border = true,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={cn("pb-6", border && "border-b border-border", className)}>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              {eyebrow.icon ? <eyebrow.icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              <span>{eyebrow.label}</span>
              {eyebrow.trailing}
            </div>
          ) : null}
          <h1
            className={cn(
              "font-display tracking-tight text-foreground",
              size === "compact" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
            )}
          >
            {title}
          </h1>
          {description ? (
            <div className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
              {description}
            </div>
          ) : null}
          {children}
        </div>
        {actions || meta ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {meta}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

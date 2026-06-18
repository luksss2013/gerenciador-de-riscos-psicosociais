"use client";

import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number;
  /** Show the wordmark next to the mark. */
  withWordmark?: boolean;
  /** Wordmark variant — "full" shows tagline, "compact" shows only the name. */
  variant?: "full" | "compact";
}

/**
 * NR-1 Copsoq brand logo.
 */
export function Logo({ className, size = 32, withWordmark = false, variant = "full" }: LogoProps) {
  const aspectRatio = 1246 / 927;
  const width = Math.round(size * aspectRatio);

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        width={width}
        height={size}
        alt="NR-1 Copsoq"
        className="shrink-0 object-contain"
        priority
      />
      {withWordmark && (
        <span className="leading-tight">
          <span className="font-display font-semibold text-[15px] text-foreground block">
            NR-1 Copsoq
          </span>
          {variant === "full" && (
            <span className="text-[11px] text-muted-foreground block">Riscos psicossociais</span>
          )}
        </span>
      )}
    </span>
  );
}

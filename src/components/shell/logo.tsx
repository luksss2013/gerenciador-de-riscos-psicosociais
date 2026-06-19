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
 *
 * The mark (icon only) is a native SVG at /logo.svg — small, crisp, cacheable.
 * The full lockup (mark + wordmark + tagline) is a PNG at /logo.png — raster
 * because the original lockup artwork is not available as vector source.
 */
export function Logo({ className, size = 32, withWordmark = false, variant = "full" }: LogoProps) {
  if (!withWordmark) {
    return (
      <span className={`inline-flex shrink-0 ${className ?? ""}`}>
        <Image
          src="/logo.svg"
          width={size}
          height={size}
          alt="NR-1 Copsoq"
          className="shrink-0"
          priority
        />
      </span>
    );
  }

  // Lockup: mark + wordmark, using the raster PNG for the full artwork.
  // Aspect ratio of the original 1246×927 lockup.
  const aspectRatio = 1246 / 927;
  const width = Math.round(size * aspectRatio);

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Image
        src="/logo.png"
        width={width}
        height={size}
        alt="NR-1 Copsoq"
        className="shrink-0"
        priority
      />
      <span className="leading-tight">
        <span className="font-display font-semibold text-[15px] text-foreground block">
          NR-1 Copsoq
        </span>
        {variant === "full" && (
          <span className="text-[11px] text-muted-foreground block">Riscos psicossociais</span>
        )}
      </span>
    </span>
  );
}

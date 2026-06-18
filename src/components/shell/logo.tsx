"use client";

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
 * Mark: a stylized person inside a protective arc (shield/bowl metaphor) with a
 * small sprout above the head symbolizing well-being/growth. Pine + terracotta +
 * sage palette per the clinical-institutional design system.
 */
export function Logo({ className, size = 32, withWordmark = false, variant = "full" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="NR-1 Copsoq"
        className="shrink-0"
      >
        {/* Outer protective arc — pine */}
        <path
          d="M20 3.5C10.9 3.5 3.6 10.8 3.6 19.9c0 4.2 1.6 8.1 4.3 11l1.2-1.6C6.8 26.9 5.5 23.6 5.5 19.9 5.5 11.8 12 5.4 20 5.4s14.5 6.4 14.5 14.5c0 3.7-1.3 7-3.6 9.4l1.2 1.6c2.7-2.9 4.3-6.8 4.3-11C36.4 10.8 29.1 3.5 20 3.5z"
          fill="var(--brand, #2F4A43)"
        />
        {/* Head — terracotta accent */}
        <circle cx="20" cy="15.5" r="3.4" fill="var(--accent, #B8623E)" />
        {/* Shoulders/body — pine */}
        <path
          d="M13.2 26.2c0-3.8 3-6.8 6.8-6.8s6.8 3 6.8 6.8v.4l1.8 2.4c-2.4 1.4-5.4 2.2-8.6 2.2s-6.2-.8-8.6-2.2l1.8-2.4v-.4z"
          fill="var(--brand, #2F4A43)"
        />
        {/* Sprout — well-being */}
        <path
          d="M20 7.8c0-1.6 1.1-2.9 2.6-3.2-.1 1.5-1.1 2.7-2.6 3.2zM20 7.8c0-1.6-1.1-2.9-2.6-3.2.1 1.5 1.1 2.7 2.6 3.2z"
          fill="var(--risk-low, #5B8A6A)"
        />
        <path
          d="M20 8.2v2.4"
          stroke="var(--risk-low, #5B8A6A)"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
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

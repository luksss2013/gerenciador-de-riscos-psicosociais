"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Light/dark theme toggle.
 *
 * Renders a placeholder button until mounted to avoid SSR/CSR hydration
 * mismatch — `useTheme` only resolves the active theme after mount.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Active theme = explicit theme if set, otherwise the system-resolved theme.
  const active = mounted
    ? (theme === "system" ? resolvedTheme : theme) ?? "light"
    : "light";
  const isDark = active === "dark";

  const label = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )
      ) : (
        // Placeholder keeps layout stable before hydration completes.
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}

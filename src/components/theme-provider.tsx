"use client";

import * as React from "react";

/**
 * Lightweight theme provider + toggle. Defaults to dark for the editorial
 * casting look, with a manual override that persists to localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const stored = localStorage.getItem("spotlight-theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);
  return <>{children}</>;
}

export function useTheme() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");
  React.useEffect(() => {
    const stored = localStorage.getItem("spotlight-theme") as
      | "light"
      | "dark"
      | null;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const t = stored ?? (prefersDark ? "dark" : "light");
    setTheme(t);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("spotlight-theme", next);
      return next;
    });
  }, []);

  return { theme, toggle };
}

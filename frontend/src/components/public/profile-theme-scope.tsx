"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ProfileThemeScope({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevBodyBg = body.style.backgroundColor;
    const prevBodyColor = body.style.color;

    html.classList.remove("dark", "light");
    body.style.backgroundColor = "transparent";
    body.style.color = "";

    return () => {
      body.style.backgroundColor = prevBodyBg;
      body.style.color = prevBodyColor;
      if (resolvedTheme === "dark") html.classList.add("dark");
      else html.classList.remove("dark");
    };
  }, [resolvedTheme]);

  return <>{children}</>;
}

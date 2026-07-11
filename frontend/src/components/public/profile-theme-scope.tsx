"use client";

import { useEffect } from "react";

export function ProfileThemeScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    const hadLight = html.classList.contains("light");

    html.classList.remove("dark", "light");
    document.body.style.backgroundColor = "transparent";

    return () => {
      document.body.style.backgroundColor = "";
      html.classList.remove("dark", "light");
      if (hadDark) html.classList.add("dark");
      else if (hadLight) html.classList.add("light");
    };
  }, []);

  return <>{children}</>;
}

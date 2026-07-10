"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart2, LayoutDashboard, Link2, LogOut, Palette, Settings, User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types/database";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { name: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Links", icon: Link2, path: "/dashboard/links" },
  { name: "Appearance", icon: Palette, path: "/dashboard/appearance" },
  { name: "Analytics", icon: BarChart2, path: "/dashboard/analytics" },
  { name: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    apiFetch<Profile>("/api/profile").then(setProfile).catch(() => setProfile(null));
  }, []);

  const isActive = (path: string) =>
    path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white md:flex dark:bg-card">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">L</span>
          <span className="font-display font-bold">LinkBio</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600" />
                )}
                <item.icon className={cn("h-5 w-5", active && "text-emerald-600 dark:text-emerald-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">@{profile?.username || "user"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-xl md:px-8 dark:bg-card/80">
          <h1 className="font-display text-lg font-semibold capitalize md:hidden">
            {nav.find((n) => isActive(n.path))?.name || "Dashboard"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={logout}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 md:hidden"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <div className="mx-auto max-w-4xl animate-fade-in">{children}</div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-white/95 backdrop-blur-xl md:hidden dark:bg-card/95">
          {nav.slice(0, 4).map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  active ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

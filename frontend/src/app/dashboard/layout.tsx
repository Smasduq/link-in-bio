"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types/database";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import {
  dashboardNav,
  getDashboardPageTitle,
  isDashboardNavActive,
} from "@/components/dashboard/dashboard-nav";
import "@/styles/dashboard-overview.css";

function NavLink({
  item,
  active,
  variant,
}: {
  item: (typeof dashboardNav)[number];
  active: boolean;
  variant: "sidebar" | "tab";
}) {
  if (variant === "sidebar") {
    return (
      <Link
        href={item.path}
        aria-label={item.name}
        className={cn(
          "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
          "md:justify-center md:px-2 md:py-2.5",
          "xl:gap-3 xl:justify-start xl:px-3",
          active
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
        )}
        <item.icon className={cn("h-5 w-5 shrink-0", active && "text-emerald-600 dark:text-emerald-400")} />
        <span className="hidden xl:inline">{item.name}</span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:block xl:hidden"
        >
          {item.name}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.path}
      className={cn(
        "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors",
        active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", active && "text-emerald-600 dark:text-emerald-400")} />
      <span className="max-w-full truncate">{item.shortName ?? item.name}</span>
    </Link>
  );
}

function AvatarMenu({
  profile,
  email,
  onLogout,
}: {
  profile: Profile | null;
  email?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-emerald-50 ring-emerald-600/20 transition hover:ring-2 dark:bg-emerald-950/50"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">@{profile?.username || "user"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </Link>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    apiFetch<Profile>("/api/profile").then(setProfile).catch(() => setProfile(null));
  }, []);

  const pageTitle = getDashboardPageTitle(pathname);
  const publicUrl = profile?.username ? `/${profile.username}` : null;
  const isRootDashboard = pathname === "/dashboard";

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Desktop / tablet sidebar — icon-only md→lg, full labels at xl+ */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col overflow-visible border-r border-border bg-card md:flex xl:w-60">
        <nav className="flex-1 space-y-1 overflow-y-auto p-2 pt-5 xl:p-3" aria-label="Dashboard">
          {dashboardNav.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              active={isDashboardNavActive(pathname, item.path)}
              variant="sidebar"
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-[72px] xl:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-xl md:h-16 md:px-6">
          {/* Mobile left */}
          <div className="flex w-10 shrink-0 items-center md:hidden">
            {isRootDashboard ? (
              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Back to home"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Mobile title / Desktop logo */}
          <div className="min-w-0 flex-1 md:flex md:items-center">
            <h1 className="truncate text-center font-display text-base font-semibold md:hidden">
              {pageTitle}
            </h1>
            <div className="hidden md:block">
              <Logo href="/" height={28} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View my page"
                className={cn(
                  "hidden items-center justify-center rounded-xl text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300",
                  "md:inline-flex md:h-10 md:w-10 md:border md:border-border md:bg-card md:shadow-sm md:hover:border-emerald-400/50",
                  "xl:h-auto xl:w-auto xl:gap-1.5 xl:px-3 xl:py-2 xl:text-sm xl:font-medium"
                )}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline">View my page</span>
              </a>
            )}

            <div className="hidden md:flex md:items-center md:gap-2">
              <AvatarMenu profile={profile} email={user?.email} onLogout={logout} />
            </div>

            {/* Mobile single action */}
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 md:hidden"
                aria-label="View my page"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            ) : (
              <div className="h-10 w-10 md:hidden" aria-hidden />
            )}
          </div>
        </header>

        {/* Main */}
        <main
          className={cn(
            "flex-1 overflow-x-hidden overflow-y-auto px-4 py-5",
            "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:px-6 md:py-8 md:pb-8",
            pathname === "/dashboard" && "bg-[#F5F7FA] dark:bg-[#0f1419]"
          )}
        >
          <div className="mx-auto w-full animate-fade-in xl:max-w-[1100px]">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        aria-label="Dashboard navigation"
      >
        <div className="flex">
          {dashboardNav.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              active={isDashboardNavActive(pathname, item.path)}
              variant="tab"
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

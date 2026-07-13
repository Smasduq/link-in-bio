"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Shield, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Shield className="h-5 w-5 text-emerald-600" />
            <span className="font-display text-sm font-bold tracking-tight">LinkBio Admin</span>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-l-[3px] border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
            <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-6">
            <div className="md:hidden flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="font-display text-sm font-bold">Admin</span>
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3 md:hidden">
              <Link href="/admin" className="text-sm font-medium">
                Overview
              </Link>
              <Link href="/admin/users" className="text-sm font-medium">
                Users
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 animate-fade-in px-4 py-6 md:px-6 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

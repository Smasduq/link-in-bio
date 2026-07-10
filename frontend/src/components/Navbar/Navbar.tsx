"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function Navbar({ heroMode = false }: { heroMode?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "z-50 transition-all duration-300",
          heroMode ? "fixed left-0 right-0 top-0" : "sticky top-0",
          scrolled
            ? "border-b border-black/[0.06] bg-white/85 shadow-sm backdrop-blur-xl"
            : heroMode
              ? "border-b border-transparent bg-transparent"
              : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 font-display text-lg font-bold",
              heroMode && !scrolled ? "text-[#111827]" : "text-foreground"
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm">
              L
            </span>
            LinkBio
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      <div
        className={cn(
          "fixed inset-0 z-[60] md:hidden transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(320px,85vw)] flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-card",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <span className="font-display font-bold">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-col gap-3 p-5">
            {user ? (
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                <Button className="h-12 w-full text-base">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  <Button variant="secondary" className="h-12 w-full text-base">Sign In</Button>
                </Link>
                <Link href="/sign-up" onClick={() => setOpen(false)}>
                  <Button className="h-12 w-full text-base">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

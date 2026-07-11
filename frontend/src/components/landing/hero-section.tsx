"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Clock, Link2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroBackground } from "@/components/landing/hero-background";
import { HeroPreviewCard } from "@/components/landing/hero-preview-card";

const stats = [
  { icon: Clock, value: "<60s", label: "Setup" },
  { icon: Link2, value: "Unlimited", label: "Links" },
  { icon: BarChart3, value: "Built-in", label: "Analytics" },
];

export function HeroSection() {
  return (
    <section
      className="hero-story relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-3 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8"
      aria-labelledby="hero-heading"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <div className="hero-enter hero-enter-1 relative">
          <Badge className="mb-8 gap-1.5 border-border bg-card/90 px-4 py-1.5 text-foreground shadow-soft backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            Your link-in-bio, elevated
          </Badge>
        </div>

        <div className="hero-enter hero-enter-2 relative px-1 sm:px-0">
          <h1
            id="hero-heading"
            className="font-display text-[2.375rem] font-black leading-[1.06] tracking-[-0.04em] text-foreground sm:text-[3.75rem] md:text-[5rem] lg:text-[5.625rem]"
          >
            One page for
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="text-emerald-500">everything you share.</span>
          </h1>
        </div>

        <p className="hero-enter hero-enter-3 relative mx-auto mt-6 max-w-[600px] px-2 text-base leading-relaxed text-muted-foreground sm:mt-8 sm:px-0 sm:text-lg md:text-xl">
          Creators, founders, and artists use LinkBio to bring every link, offer, and story into one
          beautiful page — so the people who matter always find the right door.
        </p>

        <div className="hero-enter hero-enter-4 mt-12 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <Link href="/sign-up" className="sm:w-auto">
            <span className="group inline-flex w-full min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_16px_rgba(16,185,129,0.32)] transition-all duration-[250ms] hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_8px_28px_rgba(16,185,129,0.38)] sm:w-auto">
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform duration-[250ms] group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
          <Link href="/sign-in" className="sm:w-auto">
            <span className="inline-flex w-full min-w-[200px] items-center justify-center rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all duration-[250ms] hover:-translate-y-0.5 hover:shadow-md sm:w-auto">
              Sign In
            </span>
          </Link>
        </div>

        <HeroPreviewCard />

        <div className="hero-enter hero-enter-6 mt-14 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-[20px] border border-border bg-card/90 p-5 text-center shadow-soft backdrop-blur-sm transition-all duration-[250ms] hover:-translate-y-1 hover:shadow-card"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors duration-[250ms] group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:group-hover:bg-emerald-950/70">
                <stat.icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

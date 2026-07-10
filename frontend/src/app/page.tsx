"use client";

import Link from "next/link";
import {
  ArrowRight, BarChart3, Globe, Link2, Palette, Shield, Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar/Navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Palette,
    title: "Custom Themes",
    description: "Personalize your page with colors, fonts, and button styles that match your brand.",
  },
  {
    icon: Globe,
    title: "Mobile First",
    description: "Optimized for Instagram, TikTok, X, and every platform your audience uses.",
  },
  {
    icon: BarChart3,
    title: "Built-in Analytics",
    description: "Track page views, link clicks, and performance with a clean analytics dashboard.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Go from sign-up to live in under 60 seconds. No coding required.",
  },
];

export default function LandingPage() {
  return (
    <div className="light relative min-h-screen overflow-x-hidden bg-white text-[#111827]">
      <Navbar heroMode />
      <main>
        <HeroSection />

        <section className="border-y border-border bg-secondary/50 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Built for the modern creator
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to share your world — beautifully.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, i) => (
                <div key={feature.title} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <Card className="h-full hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-display font-semibold">{feature.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card dark:bg-card">
              <div className="grid lg:grid-cols-2">
                <div className="flex flex-col justify-center p-10 lg:p-14">
                  <div className="mb-4 flex items-center gap-2 text-emerald-600">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-semibold">Trusted & fast</span>
                  </div>
                  <h2 className="font-display text-3xl font-bold tracking-tight">
                    Your audience deserves a better first impression
                  </h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    Replace cluttered bios with a single, elegant page. Add links, track clicks, and customize your look — all from one dashboard.
                  </p>
                  <Link href="/sign-up" className="mt-8">
                    <Button size="lg">
                      Create your page <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-center bg-secondary/80 p-10 lg:p-14">
                  <div className="w-full max-w-xs space-y-3">
                    {[Link2, Globe, BarChart3].map((Icon, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-soft transition-all hover:border-emerald-400/60 hover:-translate-y-0.5 dark:bg-card"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="h-3 flex-1 rounded-full bg-border" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-secondary/30 py-12 text-center text-sm text-muted-foreground">
        © 2026 LinkBio. All rights reserved.
      </footer>
    </div>
  );
}

"use client";

import {
  BarChart3, Globe, Link2, Palette, Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar/Navbar";
import { FinalCtaFaqSection } from "@/components/landing/final-cta-faq";
import { HeroSection } from "@/components/landing/hero-section";
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
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
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

        <FinalCtaFaqSection />
      </main>

      <footer className="finale-footer">
        © 2026 LinkBio. All rights reserved.
      </footer>
    </div>
  );
}

import { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="pointer-events-none absolute inset-0 gradient-bg" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />
      <Card className="relative w-full max-w-md border-border bg-card/90 shadow-card backdrop-blur-sm animate-slide-up">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <Logo href="/" height={36} className="mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, AtSign, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

type ClaimUsernameStateProps = {
  username: string;
  className?: string;
};

export function ClaimUsernameState({ username, className }: ClaimUsernameStateProps) {
  const handle = username.toLowerCase().replace(/^@/, "").trim();
  const signupHref = `/sign-up?username=${encodeURIComponent(handle)}`;

  return (
    <div className={cn("relative flex min-h-screen items-center justify-center bg-secondary px-4 py-12", className)}>
      <div className="pointer-events-none absolute inset-0 gradient-bg" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

      <Card className="relative w-full max-w-md border-border bg-card/90 shadow-card backdrop-blur-sm animate-slide-up">
        <CardContent className="p-8 text-center">
          <Logo href="/" height={36} className="mx-auto mb-6" />

          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-emerald-100/80 dark:bg-emerald-950/40" />
            <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <AtSign className="relative h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2} aria-hidden />
          </div>

          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Username available</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
            @{handle} is available
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            No one has claimed this page yet. Create your free {SITE_NAME} page and share your links in one place.
          </p>

          <Link
            href={signupHref}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
          >
            Claim this username
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>

          <p className="mt-4 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

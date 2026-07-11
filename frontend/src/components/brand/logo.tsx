import Link from "next/link";
import { cn } from "@/lib/utils";

const GREEN = "#10b981";

type LogoProps = {
  className?: string;
  href?: string;
  height?: number;
};

function LinkBioMark({ className, height = 32 }: { className?: string; height?: number }) {
  const width = Math.round(height * 3.35);

  return (
    <svg
      viewBox="0 0 335 80"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0 text-foreground", className)}
      aria-hidden
    >
      <text
        x="0"
        y="62"
        fill="currentColor"
        fontFamily="var(--font-display), 'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="58"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        L
      </text>

      {/* Stylized i in Link */}
      <circle cx="52" cy="14" r="6.5" fill={GREEN} />
      <rect x="48.5" y="20" width="7" height="26" rx="3.5" fill="currentColor" />
      <circle cx="52" cy="52" r="5.5" fill="currentColor" />

      <text
        x="68"
        y="62"
        fill="currentColor"
        fontFamily="var(--font-display), 'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="58"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        nk
      </text>

      <text
        x="168"
        y="62"
        fill={GREEN}
        fontFamily="var(--font-display), 'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="58"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        Bio
      </text>
    </svg>
  );
}

export function Logo({ className, href = "/", height = 32 }: LogoProps) {
  const mark = <LinkBioMark className={className} height={height} />;

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="LinkBio home">
      {mark}
    </Link>
  );
}

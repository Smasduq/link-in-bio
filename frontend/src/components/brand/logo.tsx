import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const EMERALD = "#10b981";

/** LinkBio mark geometry — matches the original Link SVG (emerald i-dot, stem, base dot). */
export const LINKBIO_MARK_VIEWBOX = { w: 244, h: 80 };

type LogoProps = {
  className?: string;
  href?: string;
  height?: number;
  /** Show only the LinkBio mark without "Smasduq" */
  markOnly?: boolean;
  color?: string;
};

/** Stylized LinkBio — no gap between Link and Bio; i matches the provided Link mark. */
export function LinkBioMark({ className, height = 32 }: { className?: string; height?: number }) {
  const width = Math.round(height * (LINKBIO_MARK_VIEWBOX.w / LINKBIO_MARK_VIEWBOX.h));

  return (
    <svg
      viewBox={`0 0 ${LINKBIO_MARK_VIEWBOX.w} ${LINKBIO_MARK_VIEWBOX.h}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0", className)}
      aria-hidden
    >
      <text
        x="0"
        y="62"
        fill="currentColor"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="58"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        L
      </text>
      <circle cx="52" cy="14" r="6.5" fill={EMERALD} />
      <rect x="48.5" y="20" width="7" height="26" rx="3.5" fill="currentColor" />
      <circle cx="52" cy="52" r="5.5" fill="currentColor" />
      <text
        x="68"
        y="62"
        fill="currentColor"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="58"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        nk
      </text>
      <text
        x="136"
        y="62"
        fill={EMERALD}
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="58"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        Bio
      </text>
    </svg>
  );
}

function LogoMark({
  className,
  height = 32,
  markOnly = false,
  color,
}: {
  className?: string;
  height?: number;
  markOnly?: boolean;
  color?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0 whitespace-nowrap leading-none", !color && "text-foreground", className)}
      style={color ? { color } : undefined}
    >
      {!markOnly ? (
        <span
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: Math.round(height * 0.72), marginRight: Math.round(height * 0.28) }}
        >
          Smasduq
        </span>
      ) : null}
      <LinkBioMark height={height} />
    </span>
  );
}

export function Logo({ className, href = "/", height = 32, markOnly = false, color }: LogoProps) {
  const mark = <LogoMark className={className} height={height} markOnly={markOnly} color={color} />;

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label={`${SITE_NAME} home`}>
      {mark}
    </Link>
  );
}

/** Inline wordmark for footers and compact UI (Smasduq + LinkBio mark). */
export function BrandWordmark({
  height = 20,
  className,
  color,
}: {
  height?: number;
  className?: string;
  color?: string;
}) {
  return <LogoMark className={className} height={height} markOnly={false} color={color} />;
}

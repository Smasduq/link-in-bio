import { Mail } from "lucide-react";
import { getSocialPlatform, type SocialPlatform } from "@/lib/social-platforms";
import { cn } from "@/lib/utils";

type SocialPlatformIconProps = {
  platform: SocialPlatform;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function SocialPlatformIcon({
  platform,
  size = 20,
  className,
  style,
}: SocialPlatformIconProps) {
  const config = getSocialPlatform(platform);

  if (config.lucideIcon) {
    const Lucide = config.lucideIcon;
    return <Lucide className={cn("shrink-0", className)} size={size} style={style} aria-hidden />;
  }

  if (!config.icon) {
    return <Mail className={cn("shrink-0", className)} size={size} style={style} aria-hidden />;
  }

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      style={style}
      aria-hidden
    >
      <path d={config.icon.path} fill="currentColor" />
    </svg>
  );
}

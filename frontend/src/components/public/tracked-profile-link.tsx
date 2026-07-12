"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackLinkClick } from "@/lib/track-click";

type TrackedProfileLinkProps = {
  linkId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function TrackedProfileLink({ linkId, href, className, style, children }: TrackedProfileLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={() => trackLinkClick(linkId)}
    >
      {children}
    </a>
  );
}

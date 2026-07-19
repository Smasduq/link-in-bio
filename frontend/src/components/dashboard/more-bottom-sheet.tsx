"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Crown,
  Mail,
  Receipt,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MoreSheetItem = {
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
};

export const MORE_SHEET_ITEMS: MoreSheetItem[] = [
  {
    label: "Wallet",
    description: "Referral earnings & withdrawals",
    href: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    label: "Sales",
    description: "Product purchase history",
    href: "/dashboard/sales",
    icon: Receipt,
  },
  {
    label: "Subscribers",
    description: "Email capture list",
    href: "/dashboard/subscribers",
    icon: Mail,
  },
  {
    label: "Notifications",
    description: "Billing and account alerts",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    label: "Settings",
    description: "Profile and account",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    label: "Billing",
    description: "Subscription and plan",
    href: "/dashboard/settings/billing",
    icon: Crown,
  },
];

type MoreBottomSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function MoreBottomSheet({ open, onClose }: MoreBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleTouchStart = (event: React.TouchEvent) => {
    dragStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const endY = event.changedTouches[0]?.clientY ?? dragStartY.current;
    if (endY - dragStartY.current > 72) onClose();
    dragStartY.current = null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[65vh] flex-col rounded-t-2xl border border-border bg-card shadow-2xl",
          "pb-[env(safe-area-inset-bottom,0px)]"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex shrink-0 flex-col items-center px-4 pb-2 pt-3">
          <div className="mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
          <h2 className="w-full text-left font-display text-lg font-semibold tracking-tight">More</h2>
          <p className="w-full text-left text-sm text-muted-foreground">Sales, subscribers, and account</p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="More navigation">
          <ul className="space-y-1">
            {MORE_SHEET_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary active:bg-secondary/80"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    {item.description ? (
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    ) : null}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

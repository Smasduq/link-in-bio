"use client";

import { cn } from "@/lib/utils";

export type PageTab = {
  id: string;
  label: string;
};

type PageTabsProps = {
  tabs: PageTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function PageTabs({
  tabs,
  active,
  onChange,
  className,
  ariaLabel = "Page sections",
}: PageTabsProps) {
  return (
    <div
      className={cn(
        "border-b border-border",
        className
      )}
    >
      <div
        className="-mb-px flex gap-1 overflow-x-auto md:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                "min-h-[44px] md:min-h-0 md:px-1 md:py-3",
                isActive
                  ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

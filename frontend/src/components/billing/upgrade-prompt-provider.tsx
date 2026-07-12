"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import {
  UPGRADE_PROMPTS,
  shouldShowUpgradePrompt,
  type UpgradeSaveContext,
} from "@/lib/upgrade-prompts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type UpgradePromptContextValue = {
  promptAfterSave: (context: UpgradeSaveContext, isPremium: boolean) => void;
};

const UpgradePromptContext = createContext<UpgradePromptContextValue | null>(null);

export function UpgradePromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<UpgradeSaveContext>("profile");

  const promptAfterSave = useCallback((ctx: UpgradeSaveContext, isPremium: boolean) => {
    if (isPremium) return;
    if (!shouldShowUpgradePrompt(ctx)) return;
    setContext(ctx);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ promptAfterSave }), [promptAfterSave]);
  const content = UPGRADE_PROMPTS[context];

  return (
    <UpgradePromptContext.Provider value={value}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title={content.savedLabel}>
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50/80 p-4 dark:bg-emerald-950/30">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
                <Crown className="h-4 w-4 text-amber-500" />
                {content.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{content.description}</p>
            </div>
          </div>

          <ul className="space-y-2">
            {content.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/upgrade" className="flex-1" onClick={() => setOpen(false)}>
              <Button className="w-full">Upgrade to Pro</Button>
            </Link>
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              Keep building free
            </Button>
          </div>
        </div>
      </Modal>
    </UpgradePromptContext.Provider>
  );
}

export function useUpgradeAfterSave(isPremium: boolean) {
  const ctx = useContext(UpgradePromptContext);

  return useCallback(
    (context: UpgradeSaveContext) => {
      ctx?.promptAfterSave(context, isPremium);
    },
    [ctx, isPremium]
  );
}

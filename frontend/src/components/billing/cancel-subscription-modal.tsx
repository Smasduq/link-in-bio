"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { type CancelBillingResponse } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function formatBillingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type CancelSubscriptionModalProps = {
  open: boolean;
  periodEnd: string;
  onClose: () => void;
  onSuccess: (result: CancelBillingResponse) => void;
};

export function CancelSubscriptionModal({
  open,
  periodEnd,
  onClose,
  onSuccess,
}: CancelSubscriptionModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const formattedEnd = formatBillingDate(periodEnd);

  const handleClose = () => {
    if (cancelling) return;
    setError("");
    onClose();
  };

  const handleConfirm = async () => {
    setCancelling(true);
    setError("");
    try {
      const result = await apiFetch<CancelBillingResponse>("/api/billing/cancel", { method: "POST" });
      onSuccess(result);
      setError("");
      onClose();
    } catch {
      setError("Something went wrong — please try again");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cancel your Pro subscription?"
      dismissible={!cancelling}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        You&apos;ll keep all Pro features until{" "}
        <span className="font-medium text-foreground">{formattedEnd}</span>. After that, your account switches to
        Free.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          loading={cancelling}
          disabled={cancelling}
          onClick={handleConfirm}
        >
          Yes, cancel
        </Button>
        <Button variant="primary" disabled={cancelling} onClick={handleClose}>
          Keep my subscription
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </Modal>
  );
}

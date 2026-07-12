"use client";

import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatNgn, type PublicProduct, type PurchaseInitializeResponse } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { ThemeSettings } from "@/types/database";

type ProductPurchaseModalProps = {
  product: PublicProduct;
  theme: ThemeSettings;
  open: boolean;
  onClose: () => void;
};

export function ProductPurchaseModal({ product, theme, open, onClose }: ProductPurchaseModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const init = await apiFetch<PurchaseInitializeResponse>(
        `/api/products/${product.id}/purchase/initialize`,
        {
          method: "POST",
          body: JSON.stringify({ buyer_email: email.trim() }),
        },
        null
      );

      const PaystackPop = (await import("@paystack/inline-js")).default;
      const popup = new PaystackPop();

      popup.newTransaction({
        key: init.public_key,
        email: init.buyer_email,
        amount: init.pricing.total_charge_kobo,
        reference: init.reference,
        access_code: init.access_code,
        onSuccess: () => {
          window.location.href = `/purchase/result?reference=${encodeURIComponent(init.reference)}`;
        },
        onCancel: () => {
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Buy ${product.title}`}>
      <form onSubmit={handlePurchase} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pay {formatNgn(product.total_charge)} (includes payment fees). Your download link will be emailed to you.
        </p>
        <Input
          label="Your email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>
          <ShoppingBag className="h-4 w-4" />
          Pay {formatNgn(product.total_charge)}
        </Button>
        <p className="text-center text-xs text-muted-foreground" style={{ color: theme.textColor }}>
          Secure payment via Paystack
        </p>
      </form>
    </Modal>
  );
}

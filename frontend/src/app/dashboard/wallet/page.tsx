"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Share2,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";

// ---------------------------------------------------------------------------
// Types (mirror the backend WalletResponse schema)
// ---------------------------------------------------------------------------

type ReferralEarningItem = {
  id: string;
  referral_id: string;
  amount: number;
  created_at: string;
};

type WithdrawalRequestItem = {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "paid";
  requested_at: string;
  paid_at: string | null;
};

type WalletData = {
  wallet_balance: number;
  minimum_withdrawal: number;
  referral_earnings: ReferralEarningItem[];
  withdrawal_requests: WithdrawalRequestItem[];
  pending_withdrawal: WithdrawalRequestItem | null;
  referrals_needed_for_withdrawal: number;
  referral_link_code: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BalanceCard({
  balance,
  minimum,
  referralsNeeded,
  onWithdrawClick,
  hasPending,
}: {
  balance: number;
  minimum: number;
  referralsNeeded: number;
  onWithdrawClick: () => void;
  hasPending: boolean;
}) {
  const pct = Math.min(100, Math.round((balance / minimum) * 100));
  const canWithdraw = balance >= minimum && !hasPending;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Wallet balance</p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums">
            {formatNGN(balance)}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Wallet className="h-6 w-6" />
        </span>
      </div>

      {/* Progress bar toward withdrawal threshold */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatNGN(balance)}</span>
          <span>{formatNGN(minimum)} withdrawal threshold</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={balance}
            aria-valuemin={0}
            aria-valuemax={minimum}
            aria-label={`${pct}% toward withdrawal threshold`}
          />
        </div>
        {!canWithdraw && !hasPending && referralsNeeded > 0 && (
          <p className="text-xs text-muted-foreground">
            Refer{" "}
            <span className="font-semibold text-foreground">
              {referralsNeeded} more {referralsNeeded === 1 ? "friend" : "friends"}
            </span>{" "}
            to unlock withdrawal
          </p>
        )}
      </div>

      <div className="mt-5">
        {hasPending ? (
          <Button variant="secondary" className="w-full" disabled>
            <Clock className="h-4 w-4" />
            Withdrawal pending…
          </Button>
        ) : (
          <Button
            variant={canWithdraw ? "primary" : "secondary"}
            className="w-full"
            disabled={!canWithdraw}
            onClick={onWithdrawClick}
            title={
              !canWithdraw
                ? `Minimum withdrawal is ${formatNGN(minimum)}`
                : undefined
            }
          >
            Request withdrawal
          </Button>
        )}
        {!canWithdraw && !hasPending && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Minimum withdrawal: {formatNGN(minimum)}
          </p>
        )}
      </div>
    </div>
  );
}

function ReferralLinkCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://yoursite.com";
  const link = `${origin}/sign-up?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select the text
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join me on LinkBio",
        text: "Sign up with my referral link and we both benefit!",
        url: link,
      });
    } else {
      copy();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-base font-semibold">Your referral link</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Earn <span className="font-semibold text-foreground">₦100</span> every time
        someone you refer pays for their first month.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 truncate rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs font-mono text-muted-foreground">
          {link}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-secondary"
          aria-label="Copy referral link"
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-secondary"
          aria-label="Share referral link"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function PendingBanner({ w }: { w: WithdrawalRequestItem }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-amber-900 dark:text-amber-300">
          Withdrawal of {formatNGN(w.amount)} requested on {formatDate(w.requested_at)}
        </p>
        <p className="mt-0.5 text-amber-700 dark:text-amber-400">
          Expect payment within 2 working days.
        </p>
      </div>
    </div>
  );
}

function EarningsTable({ earnings }: { earnings: ReferralEarningItem[] }) {
  if (earnings.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Wallet className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">No earnings yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Share your referral link — you'll earn ₦100 each time a referred friend
          pays for their first month.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {earnings.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-sm font-medium">Referral reward</p>
            <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +{formatNGN(e.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WithdrawalHistory({ requests }: { requests: WithdrawalRequestItem[] }) {
  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-display text-base font-semibold">Withdrawal history</h2>
      <ul className="divide-y divide-border">
        {requests.map((w) => (
          <li key={w.id} className="flex items-center gap-4 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{w.bank_name}</p>
              <p className="text-xs text-muted-foreground">
                {w.account_number} · {w.account_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested {formatDate(w.requested_at)}
                {w.paid_at ? ` · Paid ${formatDate(w.paid_at)}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">{formatNGN(w.amount)}</p>
              {w.status === "pending" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  Pending
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paystack bank list (for the dropdown — UI only, no resolve API)
// ---------------------------------------------------------------------------

type BankOption = { name: string; code: string };

async function fetchBanks(): Promise<BankOption[]> {
  try {
    const res = await fetch(
      "https://api.paystack.co/bank?currency=NGN&use_cursor=false&perPage=100"
    );
    const json = await res.json();
    if (json.status && Array.isArray(json.data)) {
      return (json.data as Array<{ name: string; code: string }>).map((b) => ({
        name: b.name,
        code: b.code,
      }));
    }
  } catch {
    // fall through to static fallback
  }
  // Static fallback — most-used Nigerian banks
  return [
    { name: "Access Bank", code: "044" },
    { name: "Citibank Nigeria", code: "023" },
    { name: "Ecobank Nigeria", code: "050" },
    { name: "Fidelity Bank", code: "070" },
    { name: "First Bank of Nigeria", code: "011" },
    { name: "First City Monument Bank (FCMB)", code: "214" },
    { name: "Globus Bank", code: "103" },
    { name: "Guaranty Trust Bank (GTBank)", code: "058" },
    { name: "Heritage Bank", code: "030" },
    { name: "Jaiz Bank", code: "301" },
    { name: "Keystone Bank", code: "082" },
    { name: "Kuda Bank", code: "50211" },
    { name: "Moniepoint MFB", code: "50515" },
    { name: "OPay", code: "999992" },
    { name: "Palmpay", code: "999991" },
    { name: "Polaris Bank", code: "076" },
    { name: "Providus Bank", code: "101" },
    { name: "Stanbic IBTC Bank", code: "221" },
    { name: "Standard Chartered", code: "068" },
    { name: "Sterling Bank", code: "232" },
    { name: "SunTrust Bank", code: "100" },
    { name: "Union Bank of Nigeria", code: "032" },
    { name: "United Bank for Africa (UBA)", code: "033" },
    { name: "Unity Bank", code: "215" },
    { name: "VFD MFB", code: "566" },
    { name: "Wema Bank", code: "035" },
    { name: "Zenith Bank", code: "057" },
  ];
}

// ---------------------------------------------------------------------------
// Withdrawal form modal
// ---------------------------------------------------------------------------

type WithdrawFormState = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  submitting: boolean;
  error: string | null;
};

function WithdrawModal({
  open,
  amount,
  onClose,
  onSuccess,
}: {
  open: boolean;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [form, setForm] = useState<WithdrawFormState>({
    bankName: "",
    accountNumber: "",
    accountName: "",
    submitting: false,
    error: null,
  });

  useEffect(() => {
    if (open && banks.length === 0) {
      fetchBanks().then(setBanks);
    }
  }, [open, banks.length]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({ bankName: "", accountNumber: "", accountName: "", submitting: false, error: null });
    }
  }, [open]);

  function set(field: keyof Omit<WithdrawFormState, "submitting" | "error">, value: string) {
    setForm((s) => ({ ...s, [field]: value, error: null }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      setForm((s) => ({ ...s, error: "All fields are required." }));
      return;
    }
    setForm((s) => ({ ...s, submitting: true, error: null }));
    try {
      await apiFetch("/api/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({
          bank_name: form.bankName,
          account_number: form.accountNumber,
          account_name: form.accountName,
        }),
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setForm((s) => ({ ...s, submitting: false, error: msg }));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request withdrawal" dismissible={!form.submitting}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          <p className="text-muted-foreground">Withdrawal amount</p>
          <p className="mt-0.5 font-display text-2xl font-bold">{formatNGN(amount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your full balance will be withdrawn. You'll receive payment within 2 working days.
          </p>
        </div>

        {/* Bank dropdown */}
        <div className="space-y-1.5">
          <label htmlFor="bank-name" className="text-sm font-medium">
            Bank name
          </label>
          <select
            id="bank-name"
            value={form.bankName}
            onChange={(e) => set("bankName", e.target.value)}
            required
            disabled={form.submitting}
            className={cn(
              "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary"
            )}
          >
            <option value="">Select bank…</option>
            {banks.map((b) => (
              <option key={b.code} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Account number"
          id="account-number"
          type="text"
          inputMode="numeric"
          pattern="\d{6,20}"
          maxLength={20}
          placeholder="e.g. 0123456789"
          value={form.accountNumber}
          onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, ""))}
          disabled={form.submitting}
          required
        />

        <Input
          label="Account name"
          id="account-name"
          type="text"
          placeholder="As shown on your bank account"
          value={form.accountName}
          onChange={(e) => set("accountName", e.target.value)}
          disabled={form.submitting}
          required
        />

        {form.error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {form.error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={form.submitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={form.submitting}>
            {form.submitting ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<WalletData>("/api/wallet");
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleWithdrawSuccess() {
    setShowWithdrawModal(false);
    setSuccessMsg(
      "Withdrawal request submitted! You'll receive payment within 2 working days."
    );
    setLoading(true);
    load();
  }

  if (loading) return <PageLoader />;

  if (!data) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">Could not load wallet</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setLoading(true); load(); }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Wallet</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Earn ₦100 for every friend you refer who pays for their first month.
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Pending withdrawal banner */}
      {data.pending_withdrawal && !successMsg && (
        <PendingBanner w={data.pending_withdrawal} />
      )}

      {/* Balance + progress */}
      <BalanceCard
        balance={data.wallet_balance}
        minimum={data.minimum_withdrawal}
        referralsNeeded={data.referrals_needed_for_withdrawal}
        onWithdrawClick={() => setShowWithdrawModal(true)}
        hasPending={data.pending_withdrawal !== null}
      />

      {/* Referral link */}
      <ReferralLinkCard code={data.referral_link_code} />

      {/* Earnings history */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-display text-base font-semibold">Referral earnings</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {data.referral_earnings.length} successful referral
          {data.referral_earnings.length !== 1 ? "s" : ""}
        </p>
        <EarningsTable earnings={data.referral_earnings} />
      </div>

      {/* Withdrawal history */}
      <WithdrawalHistory requests={data.withdrawal_requests} />

      {/* Withdrawal modal */}
      <WithdrawModal
        open={showWithdrawModal}
        amount={data.wallet_balance}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={handleWithdrawSuccess}
      />
    </div>
  );
}

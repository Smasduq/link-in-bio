"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

type DownloadStatus =
  | { valid: true; product_title: string; expires_at?: string; requires_email?: boolean }
  | { valid: false; message: string; creator_email?: string | null };

function parseErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  return "Something went wrong. Please try again.";
}

export default function DownloadPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<DownloadStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creatorEmail, setCreatorEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/download/${encodeURIComponent(params.token)}/status`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.valid === false) {
          setStatus({
            valid: false,
            message: data.message || "This download link is not available.",
          });
          return;
        }
        setStatus(data as DownloadStatus);
      })
      .catch(() =>
        setStatus({ valid: false, message: "This download link is not available." })
      )
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCreatorEmail(null);
    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_URL}/api/download/${encodeURIComponent(params.token)}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = parseErrorDetail(data.detail);
        setFormError(message);
        if (data.detail && typeof data.detail === "object" && data.detail.creator_email) {
          setCreatorEmail(data.detail.creator_email);
        }
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "download";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFormError("Could not complete your download. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!status?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <h1 className="font-display text-xl font-bold">Download unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">{status?.message}</p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-600">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 className="text-center font-display text-xl font-bold">{status.product_title}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the email you used to purchase this product to download your file.
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Download links expire 24 hours after purchase.
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label htmlFor="buyer-email" className="sr-only">
              Purchase email
            </label>
            <input
              id="buyer-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-emerald-600 focus:ring-2"
            />
          </div>

          {formError ? (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}

          {creatorEmail ? (
            <p className="text-sm text-muted-foreground">
              Contact the creator at{" "}
              <a href={`mailto:${creatorEmail}`} className="font-medium text-emerald-600">
                {creatorEmail}
              </a>
              .
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {submitting ? "Preparing download…" : "Verify and download"}
          </button>
        </form>
      </div>
    </div>
  );
}

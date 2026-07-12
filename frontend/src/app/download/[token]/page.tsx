"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

type DownloadStatus =
  | { valid: true; product_title: string; expires_at: string; creator_email?: string | null }
  | { valid: false; message: string; creator_email?: string | null };

export default function DownloadPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<DownloadStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/download/${encodeURIComponent(params.token)}/status`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 410 || data.valid === false) {
          setStatus({
            valid: false,
            message: data.message || "This download link has expired.",
            creator_email: data.creator_email,
          });
          return;
        }
        if (!res.ok) {
          setStatus({ valid: false, message: data.detail || "Download link not found." });
          return;
        }
        setStatus(data as DownloadStatus);
      })
      .catch(() => setStatus({ valid: false, message: "Could not verify download link." }))
      .finally(() => setLoading(false));
  }, [params.token]);

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
          {status?.creator_email ? (
            <p className="mt-4 text-sm">
              Contact the creator at{" "}
              <a href={`mailto:${status.creator_email}`} className="font-medium text-emerald-600">
                {status.creator_email}
              </a>{" "}
              if you need help.
            </p>
          ) : null}
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-600">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-xl font-bold">{status.product_title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your purchase is ready to download.</p>
        <a
          href={`${API_URL}/api/download/${encodeURIComponent(params.token)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" />
          Download file
        </a>
      </div>
    </div>
  );
}

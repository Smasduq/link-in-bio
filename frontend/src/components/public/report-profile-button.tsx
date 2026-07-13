"use client";

import { FormEvent, useState } from "react";
import { Flag } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type ReportButtonProps = {
  profileId: string;
  username: string;
  textColor?: string;
};

export function ReportProfileButton({ profileId, username, textColor = "#ffffff" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/public/report", {
        method: "POST",
        body: JSON.stringify({
          reporter_email: email,
          target_type: "profile",
          target_id: profileId,
          reason,
        }),
      });
      setSuccess("Report submitted. Thank you.");
      setEmail("");
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs opacity-50 transition-opacity hover:opacity-80"
        style={{ color: textColor }}
      >
        <Flag className="h-3.5 w-3.5" />
        Report this page
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Report @${username}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="space-y-2">
            <label htmlFor="report-reason" className="text-sm font-medium">
              What is wrong with this page?
            </label>
            <textarea
              id="report-reason"
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" loading={submitting}>
              Submit report
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

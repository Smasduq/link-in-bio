"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match");
    if (!token) return setError("Invalid reset link");
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      router.push("/sign-in");
    } catch (err: any) {
      setError(err.message || "Reset failed");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-destructive">
        Invalid reset link. <Link href="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
      </p>
    );
  }

  return (
    <>
      {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        <Button type="submit" className="w-full" loading={loading}>Update Password</Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your account">
      <Suspense fallback={<PageLoader />}>
        <ResetForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OtpInput from "@/components/auth/OtpInput";
import { EmailDeliveryHint } from "@/components/auth/email-delivery-hint";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME } from "@/lib/site";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login, verifyLoginOtp, resendOtp } = useAuth();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("reason") === "session-expired") {
      setError("Your session expired. Please sign in again.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(identifier, password);

      if (!data.requires_otp) {
        return;
      }

      if (!data.challenge_id || !data.email) {
        setError("Unexpected login response. Please try again.");
        return;
      }

      setChallengeId(data.challenge_id);
      setMaskedEmail(data.email);
      setOtp("");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("Enter the 6-digit code");
    setLoading(true);
    setError(null);
    try {
      await verifyLoginOtp(challengeId, otp);
    } catch (err: any) {
      setError(err.message || "Verification failed");
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError(null);
    try {
      await resendOtp(challengeId);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  if (step === "otp") {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a 6-digit code to ${maskedEmail}`}>
        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
        <EmailDeliveryHint className="mb-4 text-center text-xs text-muted-foreground" />
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verification code</label>
            <OtpInput value={otp} onChange={setOtp} disabled={loading || resending} />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={otp.length !== 6 || resending}>
            Verify & Sign In
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:underline disabled:opacity-60"
            onClick={handleResendOtp}
            disabled={loading || resending}
          >
            {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {resending ? "Sending…" : "Resend code"}
          </button>
          {" · "}
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setStep("credentials"); setError(null); }}>
            Back
          </button>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle={`Sign in to your ${SITE_NAME} dashboard`}>
      {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
      <form onSubmit={handleCredentials} className="space-y-4">
        <Input
          label="Email or username"
          type="text"
          placeholder="name@example.com or yourname"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          required
        />
        <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" className="w-full" loading={loading}>Continue</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link href="/sign-up" className="font-semibold text-primary hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthShell title="Welcome back" subtitle="Loading…" />}>
      <SignInForm />
    </Suspense>
  );
}

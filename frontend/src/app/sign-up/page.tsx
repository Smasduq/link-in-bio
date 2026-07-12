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
import { buildSignInUrl, consumeAuthRedirect, stashRedirectFromSearchParams } from "@/lib/auth-redirect";

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/^@/, "").trim();
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, requestRegisterOtp, verifyRegisterOtp, resendOtp } = useAuth();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stashRedirectFromSearchParams(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(consumeAuthRedirect(searchParams));
    }
  }, [authLoading, user, router, searchParams]);

  useEffect(() => {
    const prefill = searchParams.get("username");
    if (prefill) {
      setUsername(normalizeUsername(prefill));
    }
  }, [searchParams]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await requestRegisterOtp(email, password, username);
      setChallengeId(data.challenge_id);
      setMaskedEmail(data.email);
      setOtp("");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
      await verifyRegisterOtp(challengeId, otp);
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

  const claimedUsername = normalizeUsername(searchParams.get("username") || username);

  if (step === "otp") {
    return (
      <AuthShell title="Verify your email" subtitle={`We sent a 6-digit code to ${maskedEmail}`}>
        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
        <EmailDeliveryHint className="mb-4 text-center text-xs text-muted-foreground" />
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <OtpInput value={otp} onChange={setOtp} disabled={loading || resending} />
          <Button type="submit" className="w-full" loading={loading} disabled={otp.length !== 6 || resending}>
            Verify & Create Account
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
    <AuthShell
      title="Create account"
      subtitle={
        searchParams.get("username")
          ? `Claim @${claimedUsername} on ${SITE_NAME}`
          : `Join ${SITE_NAME} and share your brand`
      }
    >
      {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
      <form onSubmit={handleCredentials} className="space-y-4">
        <Input label="Username" type="text" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input label="Email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <Button type="submit" className="w-full" loading={loading}>Get Started</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={
            searchParams.get("redirect")
              ? buildSignInUrl(searchParams.get("redirect")!)
              : "/sign-in"
          }
          className="font-semibold text-primary hover:underline"
        >
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthShell title="Create account" subtitle="Loading…" />}>
      <SignUpForm />
    </Suspense>
  );
}

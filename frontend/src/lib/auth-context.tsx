"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import {
  clearAuthToken,
  getStoredAuthToken,
  setAuthToken,
  syncAuthTokenStorage,
} from "@/lib/auth-token";

type User = {
  id: string;
  email: string;
  name: string | null;
};

type OtpChallenge = {
  challenge_id: string;
  message: string;
  email: string;
};

type LoginRequestResponse = {
  requires_otp: boolean;
  challenge_id?: string;
  message?: string;
  email?: string;
  access_token?: string;
  user?: User;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<LoginRequestResponse>;
  verifyLoginOtp: (challengeId: string, otp: string) => Promise<void>;
  requestRegisterOtp: (email: string, password: string, username: string) => Promise<OtpChallenge>;
  verifyRegisterOtp: (challengeId: string, otp: string) => Promise<void>;
  resendOtp: (challengeId: string) => Promise<OtpChallenge>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    syncAuthTokenStorage();

    const token = getStoredAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const data = await apiFetch<User>("/api/auth/me", {}, token);
      setUser(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
        clearAuthToken();
      }
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const finishAuth = (data: { access_token: string; user: User }) => {
    setAuthToken(data.access_token);
    setUser(data.user);

    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    const destination =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";

    router.push(destination);
    router.refresh();
  };

  const login = async (identifier: string, password: string) => {
    const data = await apiFetch<LoginRequestResponse>("/api/auth/login/request", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    if (!data.requires_otp && data.access_token && data.user) {
      finishAuth({ access_token: data.access_token, user: data.user });
    }

    return data;
  };

  const verifyLoginOtp = async (challengeId: string, otp: string) => {
    const data = await apiFetch<{ access_token: string; user: User }>("/api/auth/login/verify", {
      method: "POST",
      body: JSON.stringify({ challenge_id: challengeId, otp }),
    });
    finishAuth(data);
  };

  const requestRegisterOtp = async (email: string, password: string, username: string) => {
    return apiFetch<OtpChallenge>("/api/auth/register/request", {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    });
  };

  const verifyRegisterOtp = async (challengeId: string, otp: string) => {
    const data = await apiFetch<{ access_token: string; user: User }>("/api/auth/register/verify", {
      method: "POST",
      body: JSON.stringify({ challenge_id: challengeId, otp }),
    });
    finishAuth(data);
  };

  const resendOtp = async (challengeId: string) => {
    return apiFetch<OtpChallenge>("/api/auth/otp/resend", {
      method: "POST",
      body: JSON.stringify({ challenge_id: challengeId }),
    });
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyLoginOtp,
        requestRegisterOtp,
        verifyRegisterOtp,
        resendOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export type { LoginRequestResponse, OtpChallenge };

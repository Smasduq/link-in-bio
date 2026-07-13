"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuthToken, setAuthToken } from "@/lib/api";
import { syncAuthTokenStorage } from "@/lib/auth-token";
import { ApiError } from "@/lib/api-error";
import type { AdminUser } from "@/lib/types";
import { isStaffRole } from "@/lib/types";

type AuthContextType = {
  user: AdminUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

type LoginResponse = {
  requires_otp?: boolean;
  access_token?: string;
  user?: AdminUser;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    syncAuthTokenStorage();

    try {
      const data = await apiFetch<AdminUser>("/api/auth/me");
      if (!isStaffRole(data.role)) {
        clearAuthToken();
        setUser(null);
        return;
      }
      setUser(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearAuthToken();
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    const result = await apiFetch<LoginResponse>("/api/auth/login/request", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    if (result.requires_otp) {
      throw new ApiError("This account requires email verification. Complete login in the main app first.", 403);
    }

    if (!result.access_token || !result.user) {
      throw new ApiError("Login failed", 401);
    }

    if (!isStaffRole(result.user.role)) {
      throw new ApiError("You do not have admin access.", 403);
    }

    setAuthToken(result.access_token);
    setUser(result.user);
    router.replace("/admin");
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    router.replace("/admin/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

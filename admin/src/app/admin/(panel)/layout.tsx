"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { PageLoader } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { isStaffRole } from "@/lib/types";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isStaffRole(user.role))) {
      router.replace("/admin/login");
    }
  }, [loading, user, router]);

  if (loading) return <PageLoader />;
  if (!user || !isStaffRole(user.role)) return <PageLoader />;

  return <AdminShell>{children}</AdminShell>;
}

"use client";

import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

export default function UserProfile() {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
          <User className="w-4 h-4" />
        </div>
        <div className="text-sm">
          <p className="font-medium">My Account</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
      </div>
      <button 
        onClick={handleSignOut}
        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
        title="Sign Out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Settings, BarChart2, Globe } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="text-xl font-bold text-primary flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              L
            </div>
            LinkBio
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-slate-100 text-primary"
          >
            <LayoutDashboard className="w-5 h-5" />
            Links
          </Link>
          <Link 
            href="/dashboard/analytics" 
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-slate-50 transition-colors"
          >
            <BarChart2 className="w-5 h-5" />
            Analytics
          </Link>
          <Link 
            href="/dashboard/settings" 
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-4 py-3">
            <UserButton afterSignOutUrl="/" />
            <div className="text-sm">
              <p className="font-medium">My Account</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 md:hidden">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            LinkBio
          </Link>
          <UserButton afterSignOutUrl="/" />
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

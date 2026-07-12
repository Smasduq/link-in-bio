import {
  BarChart2,
  LayoutDashboard,
  Link2,
  Palette,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  name: string;
  shortName?: string;
  icon: LucideIcon;
  path: string;
};

export const dashboardNav: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Links", icon: Link2, path: "/dashboard/links" },
  { name: "Insights", icon: BarChart2, path: "/dashboard/analytics" },
  { name: "Theme", icon: Palette, path: "/dashboard/appearance" },
  { name: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export function isDashboardNavActive(pathname: string, path: string): boolean {
  return path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path);
}

export function getDashboardPageTitle(pathname: string): string {
  return dashboardNav.find((item) => isDashboardNavActive(pathname, item.path))?.name ?? "Dashboard";
}

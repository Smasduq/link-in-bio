import {

  BarChart2,

  LayoutDashboard,

  Link2,

  Mail,

  Menu,

  Package,

  Palette,

  Receipt,

  Settings,

  type LucideIcon,

} from "lucide-react";



export type DashboardNavItem = {

  name: string;

  shortName?: string;

  icon: LucideIcon;

  path: string;

  contentTab?: string;

  action?: "more-sheet";

};



export const dashboardSidebarNav: DashboardNavItem[] = [

  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },

  { name: "Links", icon: Link2, path: "/dashboard/content", contentTab: "links" },

  { name: "Products", icon: Package, path: "/dashboard/content", contentTab: "products" },

  { name: "Sales", icon: Receipt, path: "/dashboard/sales" },

  { name: "Subscribers", icon: Mail, path: "/dashboard/subscribers" },

  { name: "Insights", icon: BarChart2, path: "/dashboard/analytics" },

  { name: "Theme", icon: Palette, path: "/dashboard/appearance" },

  { name: "Settings", icon: Settings, path: "/dashboard/settings" },

];



export const mobileBottomNav: DashboardNavItem[] = [

  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },

  { name: "Content", shortName: "Content", icon: Link2, path: "/dashboard/content" },

  { name: "Insights", shortName: "Insights", icon: BarChart2, path: "/dashboard/analytics" },

  { name: "Theme", icon: Palette, path: "/dashboard/appearance" },

  { name: "More", icon: Menu, path: "#more", action: "more-sheet" },

];



export const dashboardNav = dashboardSidebarNav;



const CONTENT_PATHS = new Set(["/dashboard/content", "/dashboard/links", "/dashboard/products"]);



const MORE_PATH_PREFIXES = [

  "/dashboard/sales",

  "/dashboard/subscribers",

  "/dashboard/notifications",

  "/dashboard/settings",

  "/dashboard/settings/billing",

];



export function isDashboardNavActive(

  pathname: string,

  item: DashboardNavItem,

  searchParams?: URLSearchParams | null

): boolean {

  if (item.action === "more-sheet") return false;



  if (item.contentTab) {

    if (!CONTENT_PATHS.has(pathname)) return false;

    const tab = searchParams?.get("tab") ?? "links";

    return tab === item.contentTab;

  }



  if (item.path === "/dashboard/content") {

    return CONTENT_PATHS.has(pathname);

  }



  if (item.path === "/dashboard") return pathname === "/dashboard";

  return pathname.startsWith(item.path);

}



export function isMoreSectionActive(pathname: string): boolean {

  return MORE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

}



export function getDashboardPageTitle(pathname: string, searchParams?: URLSearchParams | null): string {

  if (CONTENT_PATHS.has(pathname)) {

    const tab = searchParams?.get("tab") ?? "links";

    const tabLabel = dashboardSidebarNav.find((item) => item.contentTab === tab)?.name;

    return tabLabel ? `Content · ${tabLabel}` : "Content";

  }



  if (pathname === "/dashboard/notifications") return "Notifications";



  const match = [...dashboardSidebarNav, ...mobileBottomNav].find((item) =>

    isDashboardNavActive(pathname, item, searchParams)

  );

  if (match) return match.name;



  if (isMoreSectionActive(pathname)) {

    if (pathname.startsWith("/dashboard/sales")) return "Sales";

    if (pathname.startsWith("/dashboard/subscribers")) return "Subscribers";

    if (pathname.startsWith("/dashboard/settings/billing")) return "Billing";

    if (pathname.startsWith("/dashboard/settings")) return "Settings";

    if (pathname.startsWith("/dashboard/notifications")) return "Notifications";

  }



  return "Dashboard";

}



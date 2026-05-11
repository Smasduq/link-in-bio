import styles from "./Dashboard.module.css";
import Link from "next/link";
import { Link2, Palette, BarChart2, Settings } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tabs = [
    { name: "Links", icon: <Link2 size={20} />, path: "/dashboard/links" },
    { name: "Appearance", icon: <Palette size={20} />, path: "/dashboard/appearance" },
    { name: "Analytics", icon: <BarChart2 size={20} />, path: "/dashboard/analytics" },
    { name: "Settings", icon: <Settings size={20} />, path: "/dashboard/settings" },
  ];

  return (
    <div className={styles.layout}>
      {/* Sidebar Desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>
            <div className={styles.icon}>L</div>
            <span>LinkBio</span>
          </Link>
        </div>
        <nav className={styles.nav}>
          {tabs.map((tab) => (
            <Link key={tab.path} href={tab.path} className={styles.navLink}>
              {tab.icon}
              <span>{tab.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className={styles.tabBar}>
        {tabs.map((tab) => (
          <Link key={tab.path} href={tab.path} className={styles.tabItem}>
            {tab.icon}
            <span>{tab.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

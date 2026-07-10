import { ProfileThemeScope } from "@/components/public/profile-theme-scope";

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileThemeScope>{children}</ProfileThemeScope>;
}

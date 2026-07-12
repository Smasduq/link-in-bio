"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnnouncementEditor } from "@/components/dashboard/content/announcement-editor";
import { LayoutSettings } from "@/components/dashboard/content/layout-settings";
import { LinksEditor } from "@/components/dashboard/content/links-editor";
import { ProductsEditor } from "@/components/dashboard/content/products-editor";
import { UnifiedContentEditor } from "@/components/dashboard/content/unified-content-editor";
import { PageTabs } from "@/components/dashboard/page-tabs";
import { SocialIconsEditor } from "@/components/dashboard/social-icons-editor";
import { apiFetch } from "@/lib/api";
import { isPremiumFromProfile } from "@/lib/premium-features";
import type { Profile } from "@/types/database";
import { PageLoader } from "@/components/ui/spinner";

const CONTENT_TABS = [
  { id: "links", label: "Links" },
  { id: "products", label: "Products" },
  { id: "social", label: "Social" },
  { id: "announcement", label: "Announcement" },
  { id: "newsletter", label: "Newsletter" },
] as const;

type ContentTab = (typeof CONTENT_TABS)[number]["id"];

function isContentTab(value: string | null): value is ContentTab {
  return CONTENT_TABS.some((tab) => tab.id === value);
}

export default function ContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ContentTab>(
    isContentTab(tabParam) ? tabParam : "links"
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then(setProfile)
      .finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    if (isContentTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (id: string) => {
    if (!isContentTab(id)) return;
    setActiveTab(id);
    router.replace(`/dashboard/content?tab=${id}`, { scroll: false });
  };

  const isPremium = isPremiumFromProfile(profile);
  const layoutMode = isPremium ? (profile?.layout_mode ?? "grouped") : "grouped";
  const isFreeform = layoutMode === "freeform";

  if (loadingProfile) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Links, embeds, products, social icons, and announcements for your profile
        </p>
      </div>

      {profile ? (
        <LayoutSettings
          profile={profile}
          onUpdated={(updated) => setProfile(updated)}
        />
      ) : null}

      {isFreeform ? (
        <UnifiedContentEditor />
      ) : (
        <>
          <PageTabs
            tabs={[...CONTENT_TABS]}
            active={activeTab}
            onChange={handleTabChange}
            ariaLabel="Content sections"
          />

          <div className="pt-2">
            {activeTab === "links" ? <LinksEditor /> : null}
            {activeTab === "products" ? <ProductsEditor /> : null}
            {activeTab === "social" ? <SocialIconsEditor /> : null}
            {activeTab === "announcement" ? <AnnouncementEditor /> : null}
            {activeTab === "newsletter" ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Newsletter signup is managed in{" "}
                <a href="/dashboard/settings" className="font-medium text-emerald-600 hover:underline">
                  Settings → Email capture
                </a>
                . Enable it there to show the block in your grouped layout.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

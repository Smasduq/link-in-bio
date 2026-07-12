"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnnouncementEditor } from "@/components/dashboard/content/announcement-editor";
import { LinksEditor } from "@/components/dashboard/content/links-editor";
import { ProductsEditor } from "@/components/dashboard/content/products-editor";
import { PageTabs } from "@/components/dashboard/page-tabs";
import { SocialIconsEditor } from "@/components/dashboard/social-icons-editor";

const CONTENT_TABS = [
  { id: "links", label: "Links" },
  { id: "products", label: "Products" },
  { id: "social", label: "Social" },
  { id: "announcement", label: "Announcement" },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Links, embeds, products, social icons, and announcements for your profile
        </p>
      </div>

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
      </div>
    </div>
  );
}

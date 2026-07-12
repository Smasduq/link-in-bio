"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AnnouncementSection } from "@/components/dashboard/announcement-section";
import { PageLoader } from "@/components/ui/spinner";
import type { Profile } from "@/types/database";

export function AnnouncementEditor() {
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState({ enabled: false, text: "" });

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then((data) => {
        setAnnouncement({
          enabled: data.announcement_enabled ?? false,
          text: data.announcement_text || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <AnnouncementSection
      enabled={announcement.enabled}
      text={announcement.text}
      onChange={setAnnouncement}
    />
  );
}

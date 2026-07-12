"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Share2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isPremiumFromProfile } from "@/lib/premium-features";
import type { Profile } from "@/types/database";
import { useUpgradeAfterSave } from "@/components/billing/upgrade-prompt-provider";
import {
  MAX_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  getSocialPlatform,
  formatSocialDisplayValue,
  type SocialLink,
  type SocialPlatform,
} from "@/lib/social-platforms";
import { SocialPlatformIcon } from "@/components/social/social-platform-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function SortableSocialItem({
  link,
  onRemove,
}: {
  link: SocialLink;
  onRemove: (platform: SocialPlatform) => void;
}) {
  const platform = getSocialPlatform(link.platform);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: link.platform,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="min-w-0"
    >
      <Card>
        <CardContent className="flex items-center gap-2 p-4 md:gap-3">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab text-muted-foreground hover:text-emerald-600"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
            <SocialPlatformIcon platform={link.platform} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{platform.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatSocialDisplayValue(link.platform, link.url)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(link.platform)}
            aria-label={`Remove ${platform.label}`}
            className="hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function SocialIconsEditor() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const promptUpgrade = useUpgradeAfterSave(isPremium);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftPlatform, setDraftPlatform] = useState<SocialPlatform>("instagram");
  const [draftUrl, setDraftUrl] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const availablePlatforms = useMemo(
    () => SOCIAL_PLATFORMS.filter((platform) => !links.some((link) => link.platform === platform.id)),
    [links]
  );

  const selectedPlatform = getSocialPlatform(draftPlatform);

  useEffect(() => {
    Promise.all([
      apiFetch<SocialLink[]>("/api/social-links").then(setLinks),
      apiFetch<Profile>("/api/profile").then((p) => setIsPremium(isPremiumFromProfile(p))),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (availablePlatforms.length === 0) return;
    if (!availablePlatforms.some((platform) => platform.id === draftPlatform)) {
      setDraftPlatform(availablePlatforms[0].id);
    }
  }, [availablePlatforms, draftPlatform]);

  const persistLinks = async (nextLinks: SocialLink[]) => {
    setSaving(true);
    setError("");
    try {
      const saved = await apiFetch<SocialLink[]>("/api/social-links", {
        method: "PUT",
        body: JSON.stringify({
          links: nextLinks.map((link, index) => ({
            platform: link.platform,
            url: link.url,
            position: index,
          })),
        }),
      });
      setLinks(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save social icons.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (links.length >= MAX_SOCIAL_LINKS) return;
    if (!draftUrl.trim()) return;

    const nextLinks = [
      ...links,
      { platform: draftPlatform, url: draftUrl.trim(), position: links.length },
    ];
    try {
      await persistLinks(nextLinks);
      setDraftUrl("");
      promptUpgrade("social");
    } catch {
      // error shown via state
    }
  };

  const handleRemove = async (platform: SocialPlatform) => {
    const nextLinks = links
      .filter((link) => link.platform !== platform)
      .map((link, index) => ({ ...link, position: index }));
    try {
      await persistLinks(nextLinks);
    } catch {
      // error shown via state
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((link) => link.platform === active.id);
    const newIndex = links.findIndex((link) => link.platform === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex).map((link, index) => ({
      ...link,
      position: index,
    }));

    setLinks(reordered);
    try {
      await persistLinks(reordered);
    } catch {
      const refreshed = await apiFetch<SocialLink[]>("/api/social-links");
      setLinks(refreshed);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <PageLoader />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-600" />
              Social Icons
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Add usernames only — we build the profile links for you. Up to {MAX_SOCIAL_LINKS} platforms.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {links.length}/{MAX_SOCIAL_LINKS}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {links.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map((link) => link.platform)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {links.map((link) => (
                  <SortableSocialItem key={link.platform} link={link} onRemove={handleRemove} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="rounded-xl border border-dashed border-emerald-200/60 bg-emerald-50/20 px-4 py-8 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-sm text-muted-foreground">No social icons yet. Add Instagram, TikTok, X, and more.</p>
          </div>
        )}

        {links.length < MAX_SOCIAL_LINKS && availablePlatforms.length > 0 ? (
          <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <div className="relative">
                <select
                  value={draftPlatform}
                  onChange={(event) => setDraftPlatform(event.target.value as SocialPlatform)}
                  className="w-full appearance-none rounded-xl border border-input bg-background py-2.5 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                >
                  {availablePlatforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                  <SocialPlatformIcon platform={draftPlatform} size={18} />
                </span>
              </div>
            </div>
            <Input
              label={selectedPlatform.inputLabel}
              placeholder={selectedPlatform.placeholder}
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              required
            />
            {selectedPlatform.hint ? (
              <p className="text-xs text-muted-foreground">{selectedPlatform.hint}</p>
            ) : null}
            <Button type="submit" loading={saving} disabled={saving} className={cn("w-full sm:w-auto")}>
              <Plus className="h-4 w-4" />
              Add social icon
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

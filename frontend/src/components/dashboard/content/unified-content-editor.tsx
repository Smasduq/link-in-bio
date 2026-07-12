"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { GripVertical, Link as LinkIcon, Mail, Play, Plus, ShoppingBag } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ContentBlockType, Link, Profile } from "@/types/database";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

type UnifiedItem = {
  id: string;
  block_type: ContentBlockType;
  title: string;
  subtitle: string;
  position: number;
};

function blockIcon(type: ContentBlockType) {
  if (type === "link") return LinkIcon;
  if (type === "embed") return Play;
  if (type === "product") return ShoppingBag;
  return Mail;
}

function SortableUnifiedItem({ item }: { item: UnifiedItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const Icon = blockIcon(item.block_type);
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-emerald-600"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildItems(profile: Profile, links: Link[], products: Product[]): UnifiedItem[] {
  const items: UnifiedItem[] = [];

  for (const link of links.filter((entry) => entry.type === "link")) {
    items.push({
      id: link.id,
      block_type: "link",
      title: link.title,
      subtitle: link.url,
      position: link.position,
    });
  }
  for (const product of products) {
    items.push({
      id: product.id,
      block_type: "product",
      title: product.title,
      subtitle: product.is_active ? "Active product" : "Draft product",
      position: product.position ?? 0,
    });
  }
  for (const link of links.filter((entry) => entry.type !== "link")) {
    items.push({
      id: link.id,
      block_type: "embed",
      title: link.title,
      subtitle: link.type === "youtube_embed" ? "YouTube embed" : "Spotify embed",
      position: link.position,
    });
  }
  if (profile.email_capture_enabled) {
    items.push({
      id: "newsletter",
      block_type: "newsletter",
      title: profile.email_capture_heading || "Newsletter signup",
      subtitle: "Email capture block",
      position: profile.email_capture_position ?? 0,
    });
  }

  return items.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

export function UnifiedContentEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const [profileData, linksData, productsData] = await Promise.all([
      apiFetch<Profile>("/api/profile"),
      apiFetch<Link[]>("/api/links"),
      apiFetch<Product[]>("/api/products"),
    ]);
    setProfile(profileData);
    setLinks(linksData);
    setProducts(productsData);
    setItems(buildItems(profileData, linksData, productsData));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, position: index }));
    setItems(reordered);
    setSaving(true);
    try {
      await apiFetch("/api/content/reorder", {
        method: "POST",
        body: JSON.stringify({
          blocks: reordered.map((item) => ({
            id: item.id,
            block_type: item.block_type,
            position: item.position,
          })),
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!profile) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Drag blocks into any order. Add new content with the buttons below.
        </p>
        {saving ? <span className="text-xs text-muted-foreground">Saving order…</span> : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No blocks yet. Add a link, product, or embed to get started.
                </CardContent>
              </Card>
            ) : (
              items.map((item) => <SortableUnifiedItem key={item.id} item={item} />)
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/content?tab=links">
            <Plus className="mr-1 h-4 w-4" />
            Add link / embed
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/content?tab=products">
            <ShoppingBag className="mr-1 h-4 w-4" />
            Add product
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/settings">
            <Mail className="mr-1 h-4 w-4" />
            Newsletter settings
          </Link>
        </Button>
      </div>
    </div>
  );
}

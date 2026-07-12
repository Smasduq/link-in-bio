"use client";

import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye, EyeOff, GripVertical, Link as LinkIcon, Music2, Pencil, Play, Plus, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Link, LinkType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type EmbedDetectResult = {
  type: LinkType;
  title_suggestion: string;
  embed_src: string;
  canonical_url: string;
};

function linkTypeIcon(type: LinkType) {
  if (type === "youtube_embed") return Play;
  if (type === "spotify_embed") return Music2;
  return LinkIcon;
}

function SortableLinkItem({
  link, onDelete, onEdit, onToggle,
}: {
  link: Link;
  onDelete: (id: string) => void;
  onEdit: (link: Link) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const TypeIcon = linkTypeIcon(link.type);
  const isEmbed = link.type !== "link";

  return (
    <div ref={setNodeRef} style={style} className={cn("min-w-0 transition-opacity", !link.is_active && "opacity-50")}>
      <Card className="hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-2 p-4 md:gap-3 md:p-6">
          <button {...attributes} {...listeners} className="shrink-0 cursor-grab text-muted-foreground hover:text-emerald-600" aria-label="Drag to reorder">
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 md:h-11 md:w-11">
            {!isEmbed && link.icon ? (
              <img src={link.icon} alt="" className="h-4 w-4 object-contain md:h-5 md:w-5" />
            ) : (
              <TypeIcon className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{link.title}</p>
            <p className="truncate text-xs text-muted-foreground">{link.url}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-emerald-600">
              {isEmbed ? (link.type === "youtube_embed" ? "YouTube embed" : "Spotify embed") : `${link.click_count} clicks`}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5 md:gap-1">
            <Button variant="ghost" size="icon" onClick={() => onToggle(link.id, !link.is_active)} aria-label={link.is_active ? "Hide" : "Show"}>
              {link.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(link)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(link.id)} aria-label="Delete" className="hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LinksEditor() {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", url: "" });
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDetect, setEmbedDetect] = useState<EmbedDetectResult | null>(null);
  const [embedError, setEmbedError] = useState("");
  const [detecting, setDetecting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchLinks(); }, []);

  const fetchLinks = async () => {
    try {
      setLinks(await apiFetch<Link[]>("/api/links"));
    } finally {
      setLoading(false);
    }
  };

  const openAddLinkModal = () => {
    setEditingLink(null);
    setFormData({ title: "", url: "" });
    setShowLinkModal(true);
  };

  const openAddEmbedModal = () => {
    setEditingLink(null);
    setEmbedUrl("");
    setEmbedTitle("");
    setEmbedDetect(null);
    setEmbedError("");
    setShowEmbedModal(true);
  };

  const openEditModal = (link: Link) => {
    setEditingLink(link);
    if (link.type === "link") {
      setFormData({ title: link.title, url: link.url });
      setShowLinkModal(true);
    } else {
      setEmbedUrl(link.url);
      setEmbedTitle(link.title);
      setEmbedDetect({
        type: link.type,
        title_suggestion: link.title,
        embed_src: link.embed_src || "",
        canonical_url: link.url,
      });
      setEmbedError("");
      setShowEmbedModal(true);
    }
  };

  const detectEmbed = async (url: string) => {
    if (!url.trim()) {
      setEmbedDetect(null);
      return;
    }
    setDetecting(true);
    setEmbedError("");
    try {
      const result = await apiFetch<EmbedDetectResult>("/api/links/detect-embed", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      setEmbedDetect(result);
      if (!embedTitle.trim()) {
        setEmbedTitle(result.title_suggestion);
      }
    } catch (err) {
      setEmbedDetect(null);
      setEmbedError(err instanceof Error ? err.message : "Could not validate this URL.");
    } finally {
      setDetecting(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingLink) {
        const updated = await apiFetch<Link>(`/api/links/${editingLink.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...formData, type: "link" }),
        });
        setLinks(links.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const added = await apiFetch<Link>("/api/links", {
          method: "POST",
          body: JSON.stringify({ ...formData, type: "link" }),
        });
        setLinks([...links, added]);
      }
      setShowLinkModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmbedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!embedDetect) {
      await detectEmbed(embedUrl);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: embedTitle.trim() || embedDetect.title_suggestion,
        url: embedUrl.trim(),
        type: embedDetect.type,
      };
      if (editingLink) {
        const updated = await apiFetch<Link>(`/api/links/${editingLink.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setLinks(links.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const added = await apiFetch<Link>("/api/links", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setLinks([...links, added]);
      }
      setShowEmbedModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await apiFetch(`/api/links/${id}`, { method: "DELETE" });
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    const updated = await apiFetch<Link>(`/api/links/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) });
    setLinks(links.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex).map((link, index) => ({ ...link, position: index }));
    setLinks(reordered);
    try {
      await apiFetch("/api/links/reorder", {
        method: "POST",
        body: JSON.stringify({ links: reordered.map((l) => ({ id: l.id, position: l.position })) }),
      });
    } catch {
      fetchLinks();
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={openAddEmbedModal}>
          <Music2 className="h-4 w-4" /> Add Embed
        </Button>
        <Button onClick={openAddLinkModal}><Plus className="h-4 w-4" /> Add Link</Button>
      </div>

      {links.length === 0 ? (
        <Card className="border-dashed border-emerald-200/60 bg-emerald-50/20">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <LinkIcon className="h-7 w-7" />
            </div>
            <h3 className="font-display font-semibold">No content yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Add links or embed YouTube and Spotify content on your page.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={openAddEmbedModal}>
                <Music2 className="h-4 w-4" /> Add Embed
              </Button>
              <Button onClick={openAddLinkModal}>
                <Plus className="h-4 w-4" /> Add Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {links.map((link) => (
                <SortableLinkItem key={link.id} link={link} onDelete={handleDeleteLink} onEdit={openEditModal} onToggle={handleToggleActive} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)} title={editingLink ? "Edit Link" : "Add New Link"}>
        <form onSubmit={handleLinkSubmit} className="space-y-4">
          <Input label="Link Title" placeholder="e.g. My Portfolio" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Input label="URL" type="url" placeholder="https://..." value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required />
          <Button type="submit" className="w-full" loading={submitting}>{editingLink ? "Update Link" : "Save Link"}</Button>
        </form>
      </Modal>

      <Modal open={showEmbedModal} onClose={() => setShowEmbedModal(false)} title={editingLink ? "Edit Embed" : "Add Embed"}>
        <form onSubmit={handleEmbedSubmit} className="space-y-4">
          <Input
            label="YouTube or Spotify URL"
            type="url"
            placeholder="https://www.youtube.com/watch?v=... or https://open.spotify.com/track/..."
            value={embedUrl}
            onChange={(e) => {
              setEmbedUrl(e.target.value);
              setEmbedDetect(null);
              setEmbedError("");
            }}
            onBlur={() => void detectEmbed(embedUrl)}
            required
          />
          {detecting ? <p className="text-sm text-muted-foreground">Validating URL…</p> : null}
          {embedError ? <p className="text-sm text-destructive">{embedError}</p> : null}
          {embedDetect ? (
            <>
              <p className="text-sm text-emerald-600">
                Detected: {embedDetect.type === "youtube_embed" ? "YouTube video" : "Spotify embed"}
              </p>
              <Input
                label="Title (optional)"
                placeholder={embedDetect.title_suggestion}
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
              />
              <div className="overflow-hidden rounded-xl border border-border">
                {embedDetect.type === "youtube_embed" ? (
                  <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                    <iframe
                      src={embedDetect.embed_src}
                      title="Embed preview"
                      loading="lazy"
                      className="absolute inset-0 h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : (
                  <iframe
                    src={embedDetect.embed_src}
                    title="Embed preview"
                    loading="lazy"
                    className="w-full border-0"
                    style={{ height: embedDetect.embed_src.includes("/playlist/") || embedDetect.embed_src.includes("/album/") ? 352 : 152 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
                )}
              </div>
            </>
          ) : null}
          <Button type="submit" className="w-full" loading={submitting || detecting}>
            {embedDetect ? (editingLink ? "Update Embed" : "Save Embed") : "Validate URL"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

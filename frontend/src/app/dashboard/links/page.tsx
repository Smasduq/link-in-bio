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
  Eye, EyeOff, GripVertical, Link as LinkIcon, Pencil, Plus, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Link } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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

  return (
    <div ref={setNodeRef} style={style} className={cn("transition-opacity", !link.is_active && "opacity-50")}>
      <Card className="hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-3 p-4">
          <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-emerald-600" aria-label="Drag to reorder">
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
            {link.icon ? <img src={link.icon} alt="" className="h-5 w-5 object-contain" /> : <LinkIcon className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{link.title}</p>
            <p className="truncate text-xs text-muted-foreground">{link.url}</p>
            <p className="mt-0.5 text-xs font-medium text-emerald-600">{link.click_count} clicks</p>
          </div>
          <div className="flex gap-1">
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

export default function LinksPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", url: "" });

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

  const openAddModal = () => { setEditingLink(null); setFormData({ title: "", url: "" }); setShowModal(true); };
  const openEditModal = (link: Link) => { setEditingLink(link); setFormData({ title: link.title, url: link.url }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingLink) {
        const updated = await apiFetch<Link>(`/api/links/${editingLink.id}`, { method: "PATCH", body: JSON.stringify(formData) });
        setLinks(links.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const added = await apiFetch<Link>("/api/links", { method: "POST", body: JSON.stringify(formData) });
        setLinks([...links, added]);
      }
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Links</h1>
          <p className="text-sm text-muted-foreground">Manage and reorder your public links</p>
        </div>
        <Button onClick={openAddModal}><Plus className="h-4 w-4" /> Add Link</Button>
      </div>

      {links.length === 0 ? (
        <Card className="border-dashed border-emerald-200/60 bg-emerald-50/20">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <LinkIcon className="h-7 w-7" />
            </div>
            <h3 className="font-display font-semibold">No links yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Add your first link to start building your page.
            </p>
            <Button className="mt-6" onClick={openAddModal}>
              <Plus className="h-4 w-4" /> Add Link
            </Button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingLink ? "Edit Link" : "Add New Link"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Link Title" placeholder="e.g. My Portfolio" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Input label="URL" type="url" placeholder="https://..." value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required />
          <Button type="submit" className="w-full" loading={submitting}>{editingLink ? "Update Link" : "Save Link"}</Button>
        </form>
      </Modal>
    </div>
  );
}

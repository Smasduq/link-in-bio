"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { Link as LinkType } from "@/types/database";
import { Plus, GripVertical, Trash2, ExternalLink, MousePointer2 } from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUser();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState({ title: "", url: "" });

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .eq("user_id", user?.id)
      .order("position", { ascending: true });

    if (data) setLinks(data);
    setLoading(false);
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url) return;

    const { data, error } = await supabase
      .from("links")
      .insert([
        {
          user_id: user?.id,
          title: newLink.title,
          url: newLink.url,
          position: links.length,
        },
      ])
      .select();

    if (data) {
      setLinks([...links, data[0]]);
      setNewLink({ title: "", url: "" });
      setIsAdding(false);
    }
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (!error) {
      setLinks(links.filter((l) => l.id !== id));
    }
  };

  const handleReorder = async (reorderedLinks: LinkType[]) => {
    setLinks(reorderedLinks);
    // In a real app, you'd update positions in Supabase here
    // Optimistic UI is already handled by setLinks
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Links</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and reorder your profile links</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border shadow-sm mb-6"
        >
          <form onSubmit={addLink} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  placeholder="e.g. My Portfolio"
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">URL</label>
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Save Link
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <Reorder.Group axis="y" values={links} onReorder={handleReorder} className="space-y-3">
        {links.map((link) => (
          <Reorder.Item
            key={link.id}
            value={link}
            className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 group cursor-default"
          >
            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
              <GripVertical className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{link.title}</h3>
                <span className="bg-slate-100 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-slate-500">
                  {link.click_count} Clicks
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{link.url}</p>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => deleteLink(link.id)}
                className="p-2 text-slate-400 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {links.length === 0 && !isAdding && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-medium">No links yet</h2>
          <p className="text-muted-foreground mb-6">Start by adding your first link to your profile.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium"
          >
            Create your first link
          </button>
        </div>
      )}
    </div>
  );
}

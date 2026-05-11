"use client";

import { useState, useEffect } from "react";
import styles from "./Links.module.css";
import { Plus, GripVertical, Trash2, Loader2, Link as LinkIcon, Globe, Github } from "lucide-react";

export default function LinksPage() {
  const [showModal, setShowModal] = useState(false);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [newLink, setNewLink] = useState({ title: "", url: "", icon: "🔗" });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      if (Array.isArray(data)) setLinks(data);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLink),
      });
      const addedLink = await res.json();
      if (addedLink.id) {
        setLinks([...links, addedLink]);
        setNewLink({ title: "", url: "", icon: "🔗" });
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error adding link:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
      await fetch(`/api/links/${id}`, { method: "DELETE" });
      setLinks(links.filter(l => l.id !== id));
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-accent" />
    </div>
  );

  return (
    <div className="animate-entrance">
      <div className={styles.header}>
        <h1>Links</h1>
        <button className="premium-button" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Link
        </button>
      </div>

      <div className={styles.linksList}>
        {links.length === 0 ? (
          <div className={`glass-card ${styles.empty}`}>
            <p>No links yet. Add your first link to get started!</p>
          </div>
        ) : (
          links.map((link) => (
            <div key={link.id} className={`glass-card ${styles.linkItem}`}>
              <div className={styles.dragHandle}>
                <GripVertical size={18} />
              </div>
              <div className={styles.linkInfo}>
                <span className={styles.icon}>
                  {link.icon ? (
                    <img src={link.icon} alt="" className={styles.favicon} />
                  ) : (
                    <LinkIcon size={18} />
                  )}
                </span>
                <div>
                  <h3 className={styles.linkTitle}>{link.title}</h3>
                  <p className={styles.linkUrl}>{link.url}</p>
                </div>
              </div>
              <div className={styles.actions}>
                <button 
                  className={styles.actionBtn}
                  onClick={() => handleDeleteLink(link.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-up Modal */}
      <div className={`${styles.modalOverlay} ${showModal ? styles.visible : ""}`} onClick={() => setShowModal(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Add New Link</h2>
            <button onClick={() => setShowModal(false)}>✕</button>
          </div>
          <form className={styles.form} onSubmit={handleAddLink}>
            <div className={styles.inputGroup}>
              <label>Link Title</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. My Portfolio"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>URL</label>
              <input 
                type="url" 
                className="input-field" 
                placeholder="https://..." 
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="premium-button" disabled={submitting}>
              {submitting ? "Saving..." : "Save Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

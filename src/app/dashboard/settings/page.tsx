"use client";

import { useState, useEffect } from "react";
import styles from "./Settings.module.css";
import { User, Mail, MessageSquare, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Update failed" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
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
        <h1>Settings</h1>
        <p>Manage your profile and public information</p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        <form onSubmit={handleUpdate} className={styles.form}>
          {message.text && (
            <div className={`${styles.alert} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label><User size={16} /> Username</label>
            <div className={styles.inputWrapper}>
              <span className={styles.prefix}>linkbio.com/</span>
              <input 
                type="text" 
                className="input-field" 
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label><MessageSquare size={16} /> Bio</label>
            <textarea 
              className="input-field" 
              rows={4}
              placeholder="Tell your story..."
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label><Mail size={16} /> Avatar URL</label>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://..."
              value={profile.avatar_url || ""}
              onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
            />
          </div>

          <button type="submit" className="premium-button" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

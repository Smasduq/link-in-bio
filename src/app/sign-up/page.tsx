"use client";

import { useState } from "react";
import styles from "../sign-in/Auth.module.css";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { Github, Globe } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await signUpAction({ email, password, username });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={`glass-card ${styles.card} animate-entrance`}>
        <div className={styles.header}>
          <h1>Create Account</h1>
          <p>Join LinkBio and share your brand</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center", marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <div className={styles.inputGroup}>
            <label>Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="premium-button" disabled={loading}>
            {loading ? "Creating account..." : "Get Started"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.oauth}>
          <button className={styles.oauthBtn}>
            Google
          </button>
          <button className={styles.oauthBtn}>
            GitHub
          </button>
        </div>

        <p className={styles.footer}>
          Already have an account? <Link href="/sign-in">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./Auth.module.css";
import Link from "next/link";
import { Github, Globe } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    setLoading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={`glass-card ${styles.card} animate-entrance`}>
        <div className={styles.header}>
          <h1>Welcome Back</h1>
          <p>Sign in to your premium dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.oauth}>
          <button onClick={() => signIn("google")} className={styles.oauthBtn}>
            Google
          </button>
          <button onClick={() => signIn("github")} className={styles.oauthBtn}>
            GitHub
          </button>
        </div>

        <p className={styles.footer}>
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

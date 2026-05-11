import Navbar from "@/components/Navbar/Navbar";
import styles from "./Landing.module.css";
import Link from "next/link";
import { Zap, Globe, Smartphone, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className={styles.wrapper}>
      <Navbar />
      
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={`${styles.container} animate-entrance`}>
          <div className={styles.badge}>
            <Zap size={14} fill="currentColor" /> Version 2.0 is live
          </div>
          <h1 className={styles.headline}>
            Your links. Your brand. <span className="text-accent">One page.</span>
          </h1>
          <p className={styles.subtext}>
            Create a beautiful, glassmorphism link-in-bio page in seconds. 
            Built for creators who value premium aesthetics and fast performance.
          </p>
          <div className={styles.ctas}>
            <Link href="/sign-up" className="premium-button">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link href="/demo" className={styles.demoBtn}>
              See Example
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Built for the Modern Creator</h2>
          <div className={styles.grid}>
            <div className={`glass-card ${styles.card} animate-entrance stagger-1`}>
              <div className={styles.cardIcon}><Globe size={32} /></div>
              <h3>Custom Themes</h3>
              <p>Personalize your page with glassmorphism, gradients, and custom fonts.</p>
            </div>
            <div className={`glass-card ${styles.card} animate-entrance stagger-2`}>
              <div className={styles.cardIcon}><Smartphone size={32} /></div>
              <h3>Mobile First</h3>
              <p>Optimized for social media apps like Instagram, TikTok, and Twitter.</p>
            </div>
            <div className={`glass-card ${styles.card} animate-entrance stagger-3`}>
              <div className={styles.cardIcon}><Zap size={32} /></div>
              <h3>Instant Setup</h3>
              <p>Go from sign-up to live in under 60 seconds. No coding required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>© 2026 LinkBio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

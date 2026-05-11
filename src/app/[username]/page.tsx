import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Image from "next/image";
import styles from "./Profile.module.css";
import { Metadata } from "next";
import { Link as LinkIcon } from "lucide-react";

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) return { title: "Profile Not Found" };

  return {
    title: `${profile.username} | LinkBio`,
    description: profile.bio || `Check out ${profile.username}'s premium links`,
    openGraph: {
      title: `${profile.username} | LinkBio`,
      description: profile.bio || `Check out ${profile.username}'s premium links`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = params;
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const { data: links } = await supabase
    .from("links")
    .select("*")
    .eq("user_id", profile.id)
    .order("position", { ascending: true });

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Avatar with spinning ring */}
        <div className={styles.avatarWrapper}>
          <div className={styles.ring}></div>
          <div className={styles.avatar}>
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={username} fill className="object-cover" />
            ) : (
              <div className={styles.placeholder}>{username[0].toUpperCase()}</div>
            )}
          </div>
        </div>

        <h1 className={styles.name}>@{profile.username}</h1>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        <div className={styles.links}>
          {links?.map((link, index) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`glass-card ${styles.linkCard} animate-entrance`}
              style={{ animationDelay: `${0.2 + index * 0.1}s` } as any}
            >
              <span className={styles.icon}>
                {link.icon ? (
                  <img src={link.icon} alt="" className={styles.favicon} />
                ) : (
                  <LinkIcon size={20} />
                )}
              </span>
              <span className={styles.title}>{link.title}</span>
              <div className={styles.glow}></div>
            </a>
          ))}
        </div>

        <footer className={styles.footer}>
          <a href="/">Powered by LinkBio</a>
        </footer>
      </div>
    </div>
  );
}

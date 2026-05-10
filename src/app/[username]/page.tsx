import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { Profile, Link } from "@/types/database";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Metadata } from "next";
import LinkButton from "@/components/public/LinkButton";

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) return { title: "Profile Not Found" };

  return {
    title: `${profile.full_name || profile.username} | LinkBio`,
    description: profile.bio || `Check out ${profile.username}'s links`,
    openGraph: {
      title: `${profile.full_name || profile.username} | LinkBio`,
      description: profile.bio || `Check out ${profile.username}'s links`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = params;

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Fetch links
  const { data: links, error: linksError } = await supabase
    .from("links")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  const theme = profile.theme_settings as any;

  return (
    <div className={`min-h-screen ${theme.background || 'bg-slate-50'} py-12 px-4`}>
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        {/* Profile Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="relative w-24 h-24 mb-4 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{profile.full_name || `@${profile.username}`}</h1>
          {profile.bio && <p className="text-muted-foreground max-w-md mx-auto">{profile.bio}</p>}
        </div>

        {/* Links List */}
        <div className="w-full space-y-4">
          {links?.map((link: Link) => (
            <LinkButton key={link.id} link={link} theme={theme} />
          ))}
        </div>

        {/* Branding */}
        <footer className="mt-16 text-center">
          <a href="/" className="text-sm font-semibold opacity-50 hover:opacity-100 transition-opacity">
            Created with LinkBio
          </a>
        </footer>
      </div>
    </div>
  );
}

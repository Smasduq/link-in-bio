import { notFound } from "next/navigation";
import Image from "next/image";
import { Metadata } from "next";
import { serverApiFetch } from "@/lib/api";
import { PublicProfile } from "@/types/database";
import ProfileView from "./ProfileView";

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  try {
    const profile = await serverApiFetch<PublicProfile>(`/api/public/${params.username}`);
    return {
      title: `${profile.username} | LinkBio`,
      description: profile.bio || `Check out ${profile.username}'s links`,
      openGraph: {
        title: `${profile.username} | LinkBio`,
        description: profile.bio || `Check out ${profile.username}'s links`,
        images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
      },
    };
  } catch {
    return { title: "Profile Not Found" };
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  let profile: PublicProfile;

  try {
    profile = await serverApiFetch<PublicProfile>(`/api/public/${params.username}`);
  } catch {
    notFound();
  }

  return <ProfileView profile={profile} />;
}

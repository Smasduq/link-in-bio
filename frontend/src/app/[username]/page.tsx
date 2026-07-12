import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { getUsernameStyle, normalizeTheme } from "@/lib/profile-theme";
import { ClaimUsernameState } from "@/components/public/claim-username-state";
import { ProfileThemeShell } from "@/components/public/profile-theme-shell";
import { ProfileAnnouncementBanner } from "@/components/public/profile-announcement-banner";
import { ProfileContentBlocks } from "@/components/public/profile-content-blocks";
import { SocialIconsRow } from "@/components/social/social-icons-row";
import { BrandWordmark } from "@/components/brand/logo";
import type { PublicProfile } from "@/types/database";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type PageProps = {
  params: { username: string };
};

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const res = await fetch(`${API_URL}/api/public/${encodeURIComponent(username.toLowerCase())}`, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);

  return res.json() as Promise<PublicProfile>;
}

function profileMetadata(profile: PublicProfile): Metadata {
  const displayName = profile.full_name || `@${profile.username}`;
  const description =
    profile.bio?.trim() || `Visit ${displayName}'s ${SITE_NAME} page — links, socials, and more in one place.`;
  const ogImage = profile.avatar_url || `${SITE_URL}/logo.png`;

  return {
    title: `${displayName} | ${SITE_NAME}`,
    description,
    openGraph: {
      title: `${displayName} | ${SITE_NAME}`,
      description,
      type: "profile",
      url: `${SITE_URL}/${profile.username}`,
      images: [
        {
          url: ogImage,
          width: profile.avatar_url ? 400 : 512,
          height: profile.avatar_url ? 400 : 512,
          alt: `${displayName} on ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: profile.avatar_url ? "summary_large_image" : "summary",
      title: `${displayName} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const profile = await fetchProfile(params.username);
    if (!profile) {
      return {
        title: `Claim @${params.username} | ${SITE_NAME}`,
        description: `This username is available. Create your free ${SITE_NAME} page at @${params.username}.`,
      };
    }
    return profileMetadata(profile);
  } catch {
    return {
      title: `${SITE_NAME} Profile`,
      description: `View this creator's links on ${SITE_NAME}.`,
    };
  }
}

function ProfileErrorState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-xl font-bold text-foreground">Couldn&apos;t load this profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The server may be unavailable. Check your connection and try again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ProfileContent({ profile }: { profile: PublicProfile }) {
  const theme = normalizeTheme(profile.theme_settings);
  const displayName = profile.full_name || `@${profile.username}`;
  const trackUrl = `${API_URL}/api/public/${profile.username}/view`;
  const layoutMode = profile.layout_mode ?? "grouped";
  const blocks = profile.content_blocks ?? [];

  return (
    <ProfileThemeShell theme={theme} className="px-4 py-10 sm:py-12">
      <Script id={`view-${profile.username}`} strategy="afterInteractive">
        {`fetch(${JSON.stringify(trackUrl)},{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null}),keepalive:true}).catch(function(){});`}
      </Script>

      <div className="mx-auto w-full max-w-[480px]">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              className="profile-avatar-ring absolute -inset-1 rounded-full opacity-70 blur-sm"
              style={{ background: `linear-gradient(135deg, ${theme.accentColor}, transparent)` }}
            />
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white/10 bg-white/5 shadow-lg sm:h-28 sm:w-28">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  fill
                  sizes="112px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-3xl font-bold sm:text-4xl"
                  style={{ color: theme.accentColor }}
                >
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <h1 className="profile-username text-xl font-bold sm:text-2xl" style={getUsernameStyle(theme)}>
            @{profile.username}
          </h1>
          {profile.full_name && (
            <p className="mt-1 text-base font-semibold opacity-90 sm:text-lg" style={{ color: theme.textColor }}>
              {profile.full_name}
            </p>
          )}
          {profile.bio && (
            <p className="profile-bio mt-3 max-w-sm text-sm leading-relaxed opacity-70" style={{ color: theme.textColor }}>
              {profile.bio}
            </p>
          )}
          <ProfileAnnouncementBanner text={profile.announcement_text} theme={theme} />
          {profile.social_links && profile.social_links.length > 0 ? (
            <SocialIconsRow links={profile.social_links} theme={theme} className="mt-5" />
          ) : null}
        </header>

        <nav aria-label="Profile content">
          <ProfileContentBlocks
            username={profile.username}
            blocks={blocks}
            layoutMode={layoutMode}
            theme={theme}
          />
        </nav>

        {profile.show_branding_badge !== false ? (
          <footer className="mt-10 flex flex-col items-center gap-1.5 text-center">
            <span className="text-xs opacity-40" style={{ color: theme.textColor }}>
              Powered by
            </span>
            <Link href="/" className="opacity-50 transition-opacity hover:opacity-80">
              <BrandWordmark height={18} color={theme.textColor} />
            </Link>
          </footer>
        ) : null}
      </div>
    </ProfileThemeShell>
  );
}

export default async function ProfilePage({ params }: PageProps) {
  try {
    const profile = await fetchProfile(params.username);

    if (!profile) {
      return <ClaimUsernameState username={params.username} />;
    }

    return <ProfileContent profile={profile} />;
  } catch {
    return <ProfileErrorState />;
  }
}

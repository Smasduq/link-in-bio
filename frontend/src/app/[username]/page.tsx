import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { detectPlatform } from "@/lib/social";
import { getLinkButtonStyle, normalizeTheme } from "@/lib/profile-theme";
import { ClaimUsernameState } from "@/components/public/claim-username-state";
import { ProfileThemeShell } from "@/components/public/profile-theme-shell";
import { TrackedProfileLink } from "@/components/public/tracked-profile-link";
import type { PublicProfile, ThemeSettings } from "@/types/database";

export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://link.smasduq.xyz";

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

function sortLinks(links: PublicProfile["links"]) {
  return [...links].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return a.position - b.position;
  });
}

function profileMetadata(profile: PublicProfile): Metadata {
  const displayName = profile.full_name || `@${profile.username}`;
  const description =
    profile.bio?.trim() || `Visit ${displayName}'s LinkBio page — links, socials, and more in one place.`;
  const ogImage = profile.avatar_url || `${SITE_URL}/logo.png`;

  return {
    title: `${displayName} | LinkBio`,
    description,
    openGraph: {
      title: `${displayName} | LinkBio`,
      description,
      type: "profile",
      url: `${SITE_URL}/${profile.username}`,
      images: [
        {
          url: ogImage,
          width: profile.avatar_url ? 400 : 512,
          height: profile.avatar_url ? 400 : 512,
          alt: `${displayName} on LinkBio`,
        },
      ],
    },
    twitter: {
      card: profile.avatar_url ? "summary_large_image" : "summary",
      title: `${displayName} | LinkBio`,
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
        title: `Claim @${params.username} | LinkBio`,
        description: `This username is available. Create your free LinkBio page at @${params.username}.`,
      };
    }
    return profileMetadata(profile);
  } catch {
    return {
      title: "LinkBio Profile",
      description: "View this creator's links on LinkBio.",
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

function ProfileLink({
  label,
  url,
  icon,
  featured,
  theme,
  linkId,
}: {
  label: string;
  url: string;
  icon: string | null;
  featured: boolean;
  theme: ThemeSettings;
  linkId: string;
}) {
  const PlatformIcon = detectPlatform(url).icon;
  const buttonStyle = getLinkButtonStyle(theme, { featured });

  return (
    <TrackedProfileLink
      linkId={linkId}
      href={url}
      className={`group relative flex w-full items-center gap-3 border transition-all duration-200 active:scale-[0.99] ${
        featured ? "px-5 py-5 text-base" : "px-4 py-3.5 text-sm"
      }`}
      style={buttonStyle}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg ${
          featured ? "h-11 w-11 bg-white/20" : "h-9 w-9 bg-white/10"
        }`}
      >
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className={featured ? "h-5 w-5 object-contain" : "h-4 w-4 object-contain"} />
        ) : (
          <PlatformIcon
            className={featured ? "h-5 w-5" : "h-4 w-4"}
            style={{ color: theme.buttonStyle === "outline" ? theme.accentColor : "#ffffff" }}
          />
        )}
      </span>
      <span className={`flex-1 text-left font-semibold ${featured ? "text-base" : "text-sm"}`}>{label}</span>
      <Globe className={`shrink-0 opacity-0 transition-opacity group-hover:opacity-60 ${featured ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
    </TrackedProfileLink>
  );
}

function ProfileContent({ profile }: { profile: PublicProfile }) {
  const theme = normalizeTheme(profile.theme_settings);
  const links = sortLinks(profile.links);
  const displayName = profile.full_name || `@${profile.username}`;
  const trackUrl = `${API_URL}/api/public/${profile.username}/view`;

  return (
    <ProfileThemeShell theme={theme} className="px-4 py-10 sm:py-12">
      <Script id={`view-${profile.username}`} strategy="afterInteractive">
        {`fetch(${JSON.stringify(trackUrl)},{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer||null}),keepalive:true}).catch(function(){});`}
      </Script>

      <div className="mx-auto w-full max-w-[480px]">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              className="absolute -inset-1 rounded-full opacity-70 blur-sm"
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

          <h1 className="font-display text-xl font-bold sm:text-2xl" style={{ color: theme.accentColor }}>
            @{profile.username}
          </h1>
          {profile.full_name && (
            <p className="mt-1 text-base font-semibold text-white/90 sm:text-lg">{profile.full_name}</p>
          )}
          {profile.bio && (
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">{profile.bio}</p>
          )}
        </header>

        <nav className="flex flex-col gap-3" aria-label="Profile links">
          {links.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
              No links yet.
            </p>
          ) : (
            links.map((link) => (
              <ProfileLink
                key={link.id}
                linkId={link.id}
                label={link.title}
                url={link.url}
                icon={link.icon}
                featured={link.is_featured}
                theme={theme}
              />
            ))
          )}
        </nav>

        <footer className="mt-10 text-center">
          <Link href="/" className="text-xs text-white/40 transition-colors hover:text-white/70">
            Powered by LinkBio
          </Link>
        </footer>
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

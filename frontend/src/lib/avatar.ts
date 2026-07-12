export const DEFAULT_AVATAR_URL = "/linkbio-mark.png";

export function resolveAvatarUrl(url: string | null | undefined): string {
  const trimmed = url?.trim();
  return trimmed || DEFAULT_AVATAR_URL;
}

export function hasCustomAvatar(url: string | null | undefined): boolean {
  return Boolean(url?.trim());
}

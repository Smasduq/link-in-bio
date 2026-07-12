/** sessionStorage key for post-auth redirect fallback (OAuth / OTP round-trips). */
export const AUTH_REDIRECT_STORAGE_KEY = "auth_redirect_path";

export const DEFAULT_AUTH_REDIRECT = "/dashboard";

/**
 * Validate a post-login redirect target and block open-redirect attacks.
 *
 * Rules:
 * - null/empty → default (/dashboard)
 * - must start with "/" (blocks https://evil.com and other absolute URLs)
 * - must not start with "//" (blocks protocol-relative URLs like //evil.com)
 * - otherwise return the path as-is (including query string, e.g. /upgrade?plan=monthly)
 */
export function validateRedirectPath(path: string | null | undefined): string {
  if (!path || !path.trim()) {
    return DEFAULT_AUTH_REDIRECT;
  }

  const trimmed = path.trim();

  if (!trimmed.startsWith("/")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (trimmed.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return trimmed;
}

/** Build sign-in URL with encoded redirect for middleware and client guards. */
export function buildSignInUrl(returnPath: string): string {
  const safePath = validateRedirectPath(returnPath);
  return `/sign-in?redirect=${encodeURIComponent(safePath)}`;
}

/** Build sign-up URL preserving username claim and optional redirect. */
export function buildSignUpUrl(options: { username?: string; redirect?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.username) {
    params.set("username", options.username);
  }
  if (options.redirect) {
    params.set("redirect", validateRedirectPath(options.redirect));
  }
  const query = params.toString();
  return query ? `/sign-up?${query}` : "/sign-up";
}

/** Read redirect from query (supports legacy callbackUrl / next) and persist to sessionStorage. */
export function stashRedirectFromSearchParams(searchParams: URLSearchParams): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate =
    searchParams.get("redirect") ??
    searchParams.get("callbackUrl") ??
    searchParams.get("next");

  if (!candidate) {
    return sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  }

  sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, candidate);
  return candidate;
}

/** Resolve redirect after auth: query param first, then sessionStorage fallback. Clears storage. */
export function consumeAuthRedirect(searchParams?: URLSearchParams): string {
  if (typeof window === "undefined") {
    return DEFAULT_AUTH_REDIRECT;
  }

  const fromQuery = searchParams
    ? searchParams.get("redirect") ?? searchParams.get("callbackUrl") ?? searchParams.get("next")
    : null;
  const fromStorage = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  const destination = validateRedirectPath(fromQuery ?? fromStorage);

  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return destination;
}

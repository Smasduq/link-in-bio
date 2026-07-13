export const AUTH_COOKIE_NAME = "admin_auth_token";
export const AUTH_STORAGE_KEY = "admin_auth_token";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type JwtPayload = {
  exp?: number;
  sub?: string;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAuthTokenValid(token: string | undefined | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${AUTH_COOKIE_NAME}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage = localStorage.getItem(AUTH_STORAGE_KEY);
  const fromCookie = readCookieToken();

  if (fromStorage && isAuthTokenValid(fromStorage)) return fromStorage;
  if (fromCookie && isAuthTokenValid(fromCookie)) return fromCookie;
  return null;
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, token);
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function syncAuthTokenStorage() {
  if (typeof window === "undefined") return;

  const storageToken = localStorage.getItem(AUTH_STORAGE_KEY);
  const cookieToken = readCookieToken();

  if (storageToken && isAuthTokenValid(storageToken)) {
    if (storageToken !== cookieToken) setAuthToken(storageToken);
    return;
  }

  if (cookieToken && isAuthTokenValid(cookieToken)) {
    localStorage.setItem(AUTH_STORAGE_KEY, cookieToken);
    return;
  }

  if (storageToken || cookieToken) clearAuthToken();
}

import { ApiError } from "@/lib/api-error";
import { clearAuthToken, getStoredAuthToken } from "@/lib/auth-token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export { ApiError };

function parseError(data: Record<string, unknown>): string {
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: { msg?: string }) => d.msg || "").filter(Boolean).join(", ") || "Request failed";
  }
  return (data.message as string) || "Request failed";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const authToken = token !== undefined ? token : getStoredAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Make sure the backend is running.", 0);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      res.status === 404
        ? "This feature is unavailable. Restart the backend server and try again."
        : parseError(data);
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export async function serverApiFetch<T>(
  path: string,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(parseError(data), res.status);
  }

  return data as T;
}

export { clearAuthToken, getStoredAuthToken as getAuthToken, setAuthToken } from "@/lib/auth-token";
export { API_BASE_URL as API_URL };

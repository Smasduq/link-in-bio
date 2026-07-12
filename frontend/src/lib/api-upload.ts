import { ApiError } from "@/lib/api-error";
import { getStoredAuthToken } from "@/lib/auth-token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function parseError(data: Record<string, unknown>): string {
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: { msg?: string }) => d.msg || "").filter(Boolean).join(", ") || "Upload failed";
  }
  return (data.message as string) || "Upload failed";
}

export async function apiUploadFile<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers: Record<string, string> = {};
  const authToken = getStoredAuthToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Make sure the backend is running.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(parseError(data), res.status);
  }

  return data as T;
}

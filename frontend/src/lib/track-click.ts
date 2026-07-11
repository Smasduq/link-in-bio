const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** Fire-and-forget click tracking — sendBeacon first, fetch+keepalive fallback. Does not block navigation. */
export function trackLinkClick(linkId: string): void {
  if (typeof window === "undefined") return;

  const url = `${API_URL}/api/links/${encodeURIComponent(linkId)}/click`;
  const payload = JSON.stringify({
    referrer: document.referrer || null,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

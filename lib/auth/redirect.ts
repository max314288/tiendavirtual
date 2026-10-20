/**
 * Validates a post-login redirect target. Only same-origin absolute paths are
 * allowed, which prevents open redirects like ?next=//evil.com.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/cuenta"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

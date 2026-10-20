import "server-only";
import { getServerEnv } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** User-facing message from the backend body ({ message }), if any. */
    readonly userMessage: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Typed fetch against the NestJS backend. Runs only on the server: it attaches
 * the store's API key (`x-store-key`), which identifies the tenant.
 */
export async function apiFetch<T>(path: string, init: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const { API_URL, STORE_API_KEY } = getServerEnv();
  if (!API_URL || !STORE_API_KEY) {
    throw new Error("apiFetch requires API_MODE=live with API_URL and STORE_API_KEY");
  }

  const { accessToken, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  headers.set("x-store-key", STORE_API_KEY);
  // Customer requests carry the Supabase JWT; the backend verifies it.
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (requestInit.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(new URL(path, API_URL), { ...requestInit, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
    const userMessage = typeof body?.message === "string" ? body.message : null;
    throw new ApiError(res.status, `${requestInit.method ?? "GET"} ${path} failed with ${res.status}`, userMessage);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

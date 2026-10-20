import "server-only";
import { cacheLife } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { getServerEnv } from "@/lib/env";
import { getMockStore } from "./mock-stores";
import type { Store } from "./types";

/**
 * The tenant served by this deployment. Each Vercel project has its own
 * STORE_API_KEY, so the result is constant per deployment and safe to cache.
 */
export async function getStore(): Promise<Store> {
  "use cache";
  cacheLife("hours");

  const env = getServerEnv();
  if (env.API_MODE === "mock") return getMockStore(env.STORE_SLUG);
  return apiFetch<Store>("/v1/store");
}

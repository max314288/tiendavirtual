import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getServerEnv } from "@/lib/env";
import { mockAuth } from "./mock";
import { supabaseAuth } from "./supabase";
import type { AuthProvider, SessionUser } from "./types";

/** Customer auth: Supabase in live mode, a local cookie session in mock mode. */
export function auth(): AuthProvider {
  return getServerEnv().API_MODE === "live" ? supabaseAuth : mockAuth;
}

/**
 * Reads the session cookie (deduplicated per request). Call it inside a
 * <Suspense> boundary: it is runtime data.
 */
export const getSessionUser = cache((): Promise<SessionUser | null> => auth().getUser());

/** For account pages and actions: redirects to /login when signed out. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

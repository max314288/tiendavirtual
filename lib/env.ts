import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    API_MODE: z.enum(["mock", "live"]).default("mock"),
    STORE_SLUG: z.string().min(1).default("aura"),
    API_URL: z.url().optional(),
    STORE_API_KEY: z.string().min(1).optional(),
    // Supabase Auth (customers). Public by design: the anon key only grants
    // what RLS allows.
    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    // Culqi public key (pk_test_… / pk_live_…). The secret key lives only in the backend.
    NEXT_PUBLIC_CULQI_PUBLIC_KEY: z.string().regex(/^pk_(test|live)_/, "Debe ser una llave pública de Culqi").optional(),
  })
  .superRefine((env, ctx) => {
    if (env.API_MODE !== "live") return;
    for (const key of [
      "API_URL",
      "STORE_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_CULQI_PUBLIC_KEY",
    ] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required when API_MODE=live" });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Server-only environment. STORE_API_KEY must never reach the browser. */
export function getServerEnv(): ServerEnv {
  cached ??= serverEnvSchema.parse({
    API_MODE: process.env.API_MODE || undefined,
    STORE_SLUG: process.env.STORE_SLUG || undefined,
    API_URL: process.env.API_URL || undefined,
    STORE_API_KEY: process.env.STORE_API_KEY || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    NEXT_PUBLIC_CULQI_PUBLIC_KEY: process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || undefined,
  });
  return cached;
}

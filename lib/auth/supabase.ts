import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import type { AuthProvider, SessionUser } from "./types";

async function client() {
  const env = getServerEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase Auth requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const jar = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) jar.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // proxy.ts refreshes the session on every request instead.
        }
      },
    },
  });
}

const messages: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos",
  email_not_confirmed: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con este correo. Inicia sesión.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  weak_password: "La contraseña es muy débil. Usa una más larga o con más variedad.",
};

const friendly = (code: string | undefined) => (code && messages[code]) || "No pudimos completar la operación. Inténtalo de nuevo.";

export const supabaseAuth: AuthProvider = {
  async getUser(): Promise<SessionUser | null> {
    const supabase = await client();
    // getUser() validates the JWT with Supabase; getSession() alone would trust the cookie.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    const meta = data.user.user_metadata ?? {};
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      firstName: typeof meta.first_name === "string" ? meta.first_name : null,
      lastName: typeof meta.last_name === "string" ? meta.last_name : null,
      accessToken: sessionData.session?.access_token ?? null,
    };
  },

  async signIn(email, password) {
    const supabase = await client();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, error: friendly(error.code) } : { ok: true };
  },

  async signUp(input) {
    const supabase = await client();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // Read by the backend when it creates the store's `customers` row.
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          accepts_marketing: input.acceptsMarketing,
        },
      },
    });
    if (error) return { ok: false, error: friendly(error.code) };
    return { ok: true, needsEmailConfirmation: !data.session };
  },

  async signOut() {
    const supabase = await client();
    await supabase.auth.signOut();
  },
};

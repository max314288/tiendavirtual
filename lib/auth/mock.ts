import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { hashPassword, readMockDb, withMockDb } from "@/lib/mock-db";
import type { AuthProvider, SessionUser } from "./types";

const COOKIE = "tv_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function sameHash(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await withMockDb((db) => {
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt) > new Date());
    db.sessions.push({ tokenHash: sha256(token), userId, expiresAt: expiresAt.toISOString() });
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Cookie session + scrypt passwords in .data/mock-db.json. Dev only. */
export const mockAuth: AuthProvider = {
  async getUser(): Promise<SessionUser | null> {
    // Request-time only: the session check reads a file and the clock, which
    // must not run during prerendering or prefetching.
    await connection();
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const db = await readMockDb();
    const session = db.sessions.find((s) => s.tokenHash === sha256(token) && new Date(s.expiresAt) > new Date());
    const user = session && db.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, accessToken: null };
  },

  async signIn(email, password) {
    const db = await readMockDb();
    const user = db.users.find((u) => u.email === email);
    // Same generic message for unknown email and wrong password.
    if (!user || !sameHash(hashPassword(password, user.salt), user.passwordHash)) {
      return { ok: false, error: "Correo o contraseña incorrectos" };
    }
    await startSession(user.id);
    return { ok: true };
  },

  async signUp(input) {
    const userId = await withMockDb((db) => {
      if (db.users.some((u) => u.email === input.email)) return null;
      const salt = randomUUID();
      const id = randomUUID();
      db.users.push({
        id,
        email: input.email,
        salt,
        passwordHash: hashPassword(input.password, salt),
        firstName: input.firstName,
        lastName: input.lastName,
        createdAt: new Date().toISOString(),
      });
      return id;
    });
    if (!userId) return { ok: false, error: "Ya existe una cuenta con este correo. Inicia sesión." };
    await startSession(userId);
    return { ok: true, needsEmailConfirmation: false };
  },

  async signOut() {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token) {
      await withMockDb((db) => {
        db.sessions = db.sessions.filter((s) => s.tokenHash !== sha256(token));
      });
    }
    jar.delete(COOKIE);
  },
};

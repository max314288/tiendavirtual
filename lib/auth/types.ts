export type SessionUser = {
  /** profiles.id (= auth.users.id) */
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** Supabase JWT forwarded to the backend; null in mock mode. */
  accessToken: string | null;
};

export type SignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
};

export type AuthResult = { ok: true } | { ok: false; error: string };
export type SignUpResult = { ok: true; needsEmailConfirmation: boolean } | { ok: false; error: string };

export interface AuthProvider {
  getUser(): Promise<SessionUser | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
}

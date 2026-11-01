// Email verification. Identical in the web app and the native app
// (src/lib/emailVerification.ts).
//
// A new account gets in straight away and receives a "confirm your email"
// link (sent free by Firebase). Until it is confirmed the account can browse
// but not publish products/offers/ads, send orders or lab cases, or open a
// booking page — enforced by firestore.rules (`isVerifiedAccount()`) and the
// placeVerifiedOrder function, not just here. Accounts created before this
// shipped carry no `mustVerifyEmail` flag and are not restricted; they only
// see the reminder banner.
import { useSyncExternalStore } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

const CONTINUE_URL = "https://dental-hub-df069.web.app/";
const RESEND_COOLDOWN_MS = 60_000;

type State = {
  /** Signed in with an email that isn't confirmed yet. */
  unverified: boolean;
  /** …and the account was created after verification became required. */
  restricted: boolean;
  email: string;
  gateOpen: boolean;
  lastSentAt: number;
};

let state: State = { unverified: false, restricted: false, email: "", gateOpen: false, lastSentAt: 0 };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useVerification(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

/** Same cutoff as firestore.rules' isVerifiedAccount(): accounts created from then on are restricted. */
const REQUIRED_FROM = Date.UTC(2026, 10, 1);

/** Whether this account must confirm its email before publishing. */
export function mustVerifyAccount(role: { mustVerifyEmail?: boolean; createdAt?: unknown } | null | undefined): boolean {
  if (!role) return false;
  if (role.mustVerifyEmail === true) return true;
  const c = role.createdAt as { toMillis?: () => number; seconds?: number } | null | undefined;
  const ms = typeof c?.toMillis === "function" ? c.toMillis() : typeof c?.seconds === "number" ? c.seconds * 1000 : NaN;
  return Number.isFinite(ms) && ms >= REQUIRED_FROM;
}

/** Called by the root layout whenever the user or their role doc changes. */
export function syncVerification(user: User | null | undefined, mustVerifyEmail: boolean | undefined) {
  const unverified = !!user && !!user.email && !user.emailVerified;
  set({ unverified, restricted: unverified && mustVerifyEmail === true, email: user?.email ?? "" });
  if (!unverified && state.gateOpen) set({ gateOpen: false });
}

/**
 * Reloads the account from Firebase: after the link was clicked (in the mail
 * app or a browser) this flips `emailVerified`, and a fresh ID token carries
 * `email_verified` so the security rules see it too.
 */
export async function refreshVerification(mustVerifyEmail?: boolean): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    await u.reload();
    if (u.emailVerified) await u.getIdToken(true);
  } catch {
    /* offline — keep the current state */
  }
  const fresh = auth.currentUser;
  syncVerification(fresh, mustVerifyEmail ?? state.restricted);
  return !!fresh?.emailVerified;
}

export type SendResult = "sent" | "cooldown" | "too-many" | "error";

export async function sendVerificationEmail(user: User | null = auth.currentUser): Promise<SendResult> {
  if (!user) return "error";
  if (Date.now() - state.lastSentAt < RESEND_COOLDOWN_MS) return "cooldown";
  try {
    auth.languageCode = "ar"; // Firebase's own Arabic template
    await sendEmailVerification(user, { url: CONTINUE_URL });
    set({ lastSentAt: Date.now() });
    return "sent";
  } catch (err) {
    return (err as { code?: string }).code === "auth/too-many-requests" ? "too-many" : "error";
  }
}

export const resendSecondsLeft = () => Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - state.lastSentAt)) / 1000));

export type ChangeEmailResult = "sent" | "wrong-password" | "in-use" | "invalid" | "error";

/**
 * For a mistyped address: confirms the password, then sends a link to the new
 * address; the account's email switches to it once that link is opened.
 */
export async function changeUnverifiedEmail(newEmail: string, password: string): Promise<ChangeEmailResult> {
  const u = auth.currentUser;
  if (!u?.email) return "error";
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
    auth.languageCode = "ar";
    await verifyBeforeUpdateEmail(u, newEmail, { url: CONTINUE_URL });
    set({ lastSentAt: Date.now() });
    return "sent";
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return "wrong-password";
    if (code.includes("email-already-in-use")) return "in-use";
    if (code.includes("invalid-email")) return "invalid";
    return "error";
  }
}

/**
 * Guard for publishing actions: true when allowed; otherwise opens the
 * "confirm your email first" dialog and returns false.
 *   if (!ensureVerified()) return;
 */
export function ensureVerified(): boolean {
  if (!state.restricted) return true;
  set({ gateOpen: true });
  return false;
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("email-not-verified");
  }
}

/** Throwing form of ensureVerified(), for the data functions that publish. */
export function assertVerified() {
  if (!ensureVerified()) throw new EmailNotVerifiedError();
}

export const openVerifyGate = () => set({ gateOpen: true });
export const closeVerifyGate = () => set({ gateOpen: false });

/** A Firestore/Functions refusal caused by the unverified email (rules or function). */
export function isUnverifiedRefusal(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return state.restricted && (/permission-denied/.test(e?.code ?? "") || /email-not-verified/.test(e?.message ?? ""));
}

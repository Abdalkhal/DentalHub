// Sign-up checks: email format and common typos, throw-away email services,
// password strength. Identical in the web app and the native app
// (src/lib/authValidation.ts). Firebase Auth itself accepts any "x@y" and any
// 6-character password; these run before the account is created.

/** Trimmed and lower-cased — "Ahmed@Gmail.com " and "ahmed@gmail.com" are one account. */
export const normalizeEmail = (raw: string) => (raw || "").trim().toLowerCase();

// name@domain.tld — letters/digits/._%+- before @, a dotted domain, a 2+ letter TLD.
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

const POPULAR = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com", "msn.com", "aol.com", "protonmail.com", "ymail.com"];

// Typos seen in practice, mapped to what was meant.
const KNOWN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.om": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
};

// Throw-away inbox services: an account on one can't be reached later.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "10minutemail.net",
  "temp-mail.org", "tempmail.com", "tempmail.net", "temp-mail.io", "tempmailo.com", "throwawaymail.com", "yopmail.com",
  "yopmail.net", "getnada.com", "nada.email", "trashmail.com", "dispostable.com", "maildrop.cc", "mintemail.com",
  "fakeinbox.com", "mohmal.com", "emailondeck.com", "tempr.email", "discard.email", "mailnesia.com", "moakt.com",
  "burnermail.io", "spamgourmet.com", "mytemp.email", "tmpmail.org", "tmail.ws", "1secmail.com", "emailfake.com",
]);

/** Levenshtein distance, small inputs only. */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export type EmailCheck =
  | { ok: true; email: string; reason?: undefined; suggestion?: undefined }
  | { ok: false; email: string; reason: "empty" | "format" | "disposable"; suggestion?: undefined }
  | { ok: false; email: string; reason: "typo"; suggestion: string };

/**
 * Validates an email for sign-up. A likely typo of a popular provider
 * ("gmial.com") is refused with the corrected address as `suggestion`, so
 * the form can offer "هل تقصد …؟" in one tap.
 */
export function checkEmail(raw: string): EmailCheck {
  const email = normalizeEmail(raw);
  if (!email) return { ok: false, email, reason: "empty" };
  if (!EMAIL_RE.test(email) || email.includes("..")) return { ok: false, email, reason: "format" };
  const [user, domain] = email.split("@");
  if (DISPOSABLE.has(domain)) return { ok: false, email, reason: "disposable" };
  const fixed = KNOWN_TYPOS[domain] ?? (POPULAR.includes(domain) ? undefined : POPULAR.find((p) => distance(domain, p) === 1));
  if (fixed) return { ok: false, email, reason: "typo", suggestion: `${user}@${fixed}` };
  return { ok: true, email };
}

export function emailError(c: EmailCheck, ar = true): string {
  if (c.ok) return "";
  switch (c.reason) {
    case "empty":
      return ar ? "أدخل البريد الإلكتروني" : "Enter your email";
    case "format":
      return ar ? "صيغة البريد غير صحيحة، مثال: name@gmail.com" : "Invalid email, e.g. name@gmail.com";
    case "disposable":
      return ar ? "لا يُقبل البريد المؤقت، استخدم بريدك الدائم" : "Temporary emails aren't accepted";
    case "typo":
      return ar ? `هل تقصد ${c.suggestion}؟` : `Did you mean ${c.suggestion}?`;
  }
}

/* ── Password ──────────────────────────────────────────────── */

const COMMON = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "password", "password1", "password123",
  "qwerty123", "qwertyui", "abc12345", "abcd1234", "1q2w3e4r", "aa123456", "iloveyou", "admin123", "dentist1",
  "dental123", "denthub1", "11223344", "12341234", "a1234567", "1234abcd", "qwerty12", "asdf1234",
]);

export type PasswordCheck = {
  ok: boolean;
  /** 0 empty · 1 weak · 2 fair · 3 strong */
  score: 0 | 1 | 2 | 3;
  problems: ("length" | "letter" | "digit" | "common")[];
};

/** At least 8 characters with a letter and a digit, and not a well-known password. */
export function checkPassword(pw: string): PasswordCheck {
  const problems: PasswordCheck["problems"] = [];
  if (pw.length < 8) problems.push("length");
  if (!/[A-Za-z؀-ۿ]/.test(pw)) problems.push("letter");
  if (!/\d/.test(pw)) problems.push("digit");
  if (COMMON.has(pw.toLowerCase())) problems.push("common");
  if (!pw) return { ok: false, score: 0, problems };
  if (problems.length) return { ok: false, score: 1, problems };
  const strong = pw.length >= 12 || (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) || /[^A-Za-z0-9]/.test(pw);
  return { ok: true, score: strong ? 3 : 2, problems };
}

export function passwordError(c: PasswordCheck, ar = true): string {
  if (c.ok) return "";
  const p = c.problems;
  if (p.includes("common")) return ar ? "كلمة المرور هذه شائعة ويسهل تخمينها" : "This password is too common";
  if (p.includes("length")) return ar ? "8 أحرف على الأقل" : "At least 8 characters";
  return ar ? "يجب أن تحتوي على حروف وأرقام" : "Use both letters and numbers";
}

export const STRENGTH_LABEL = { ar: ["", "ضعيفة", "متوسطة", "قوية"], en: ["", "Weak", "Fair", "Strong"] };
export const STRENGTH_COLOR = ["#E2E8F0", "#EF4444", "#F59E0B", "#10B981"];

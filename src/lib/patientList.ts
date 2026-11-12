/* Shared with native-app/src/lib/patientList.ts — keep the two identical. */
/** Small helpers for the patients list: next visit, short dates, avatar colours. */
import type { Appointment } from "./appointmentsStore";
import type { Patient } from "./patientsStore";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 نوفمبر" / "12 Nov"; the year only when it isn't this year. */
export function shortDate(day: string | undefined, ar: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || "");
  if (!m) return "";
  const [, y, mo, d] = m;
  const month = (ar ? MONTHS_AR : MONTHS_EN)[Number(mo) - 1] ?? "";
  const year = Number(y) !== new Date().getFullYear() ? ` ${y}` : "";
  return `${Number(d)} ${month}${year}`;
}

/** Today as the appointments store writes dates (local day). */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Each patient's next appointment from today on (not cancelled or done),
 * keyed by patient id. Appointments made before patients were linked carry
 * only a name, so a name match counts too.
 */
export function nextVisits(patients: Patient[], appointments: Appointment[]): Map<string, Appointment> {
  const today = localToday();
  const upcoming = appointments
    .filter((a) => a.date >= today && a.status !== "cancelled" && a.status !== "completed")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const byName = new Map<string, string>();
  for (const p of patients) if (p.name.trim()) byName.set(norm(p.name), p.id);
  const out = new Map<string, Appointment>();
  for (const a of upcoming) {
    const id = (a.patientId && patients.some((p) => p.id === a.patientId) ? a.patientId : undefined) ?? byName.get(norm(a.patientName || ""));
    if (id && !out.has(id)) out.set(id, a);
  }
  return out;
}

/** Calm avatar colours; the same name always gets the same one. */
const AVATARS = [
  { bg: "#E0EDFF", fg: "#1D5FD1" },
  { bg: "#E3E8FF", fg: "#4338CA" },
  { bg: "#DDF4F1", fg: "#0F766E" },
  { bg: "#EFE7FF", fg: "#6D28D9" },
  { bg: "#FFF1DB", fg: "#B45309" },
  { bg: "#FFE4EA", fg: "#BE123C" },
];
export function avatarColor(name: string): { bg: string; fg: string } {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

/** The first letter shown in the avatar. */
export const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "؟";

/** "مريض واحد" / "مريضان" / "5 مرضى" / "12 مريضاً". */
export function patientsCount(n: number, ar: boolean): string {
  if (!ar) return `${n} ${n === 1 ? "patient" : "patients"}`;
  if (n === 1) return "مريض واحد";
  if (n === 2) return "مريضان";
  if (n >= 3 && n <= 10) return `${n} مرضى`;
  return `${n} مريضاً`;
}

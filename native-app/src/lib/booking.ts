// Public booking link ("احجز موعدك"). Identical in the web app and the native
// app (src/lib/booking.ts).
//
// A dentist publishes a booking page; patients open it from a link (Instagram,
// WhatsApp, a QR code) with no account, pick a free time and send a request.
// The request waits for the dentist to accept or reject it.
//
//   booking_pages/{slug}                    BookingPage — public, written by the owner
//   booking_busy/{ownerId}_{clinicId}_{date} { times: ["16:00", …] } — public,
//                                            written only by Cloud Functions; the
//                                            start times already taken, nothing else
//   booking_requests/{id}                   BookingRequest — created only by the
//                                            `createBookingRequest` function; the
//                                            owner reads it and accepts/rejects
//
// The functions in functions/index.js use the same slot rules (keep in step).
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import qrcode from "qrcode-generator";
import { db } from "@/integrations/firebase/client";
import { assertVerified } from "./emailVerification";

export const BOOKING_BASE_URL = "https://dental-hub-df069.web.app/book/";

/* ── Types ──────────────────────────────────────────────────── */

export type DayHours = {
  open: boolean;
  from: string;
  to: string;
  breakFrom?: string;
  breakTo?: string;
};
/** Keyed by JS weekday: "0" Sunday … "6" Saturday. */
export type WeekHours = Record<string, DayHours>;

export type BookingClinic = {
  id: string;
  name: string;
  address: string;
  mapUrl?: string;
  enabled: boolean;
  hours: WeekHours;
};

export type BookingPage = {
  slug: string;
  ownerId: string;
  enabled: boolean;
  doctorName: string;
  specialty?: string;
  photoURL?: string;
  about?: string;
  whatsapp?: string; // clinic's number, shown to the patient after booking
  slotMinutes: number;
  daysAhead: number;
  closedDates: string[]; // YYYY-MM-DD
  clinics: BookingClinic[];
  updatedAt: number;
};

export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export type BookingRequest = {
  id: string;
  ownerId: string;
  slug: string;
  clinicId: string;
  clinicName: string;
  date: string;
  time: string;
  patientName: string;
  phone: string;
  reason: string;
  note: string;
  code: string;
  status: BookingStatus;
  rejectReason?: string;
  appointmentId?: string;
  patientId?: string;
  createdAt: number;
  handledAt?: number;
  cancelledAt?: number;
};

export const BOOKING_REASONS: { id: string; ar: string; en: string }[] = [
  { id: "checkup", ar: "فحص واستشارة", en: "Check-up" },
  { id: "cleaning", ar: "تنظيف", en: "Cleaning" },
  { id: "pain", ar: "ألم", en: "Pain" },
  { id: "filling", ar: "حشوة", en: "Filling" },
  { id: "ortho", ar: "تقويم", en: "Orthodontics" },
  { id: "cosmetic", ar: "تجميل", en: "Cosmetic" },
  { id: "implant", ar: "زراعة", en: "Implant" },
  { id: "other", ar: "أخرى", en: "Other" },
];

export const reasonLabel = (id: string, ar = true) => {
  const r = BOOKING_REASONS.find((x) => x.id === id);
  return r ? (ar ? r.ar : r.en) : id;
};

/** Saturday first — the Iraqi working week. */
export const WEEK_ORDER = ["6", "0", "1", "2", "3", "4", "5"];
export const DAY_NAMES_AR: Record<string, string> = {
  "0": "الأحد",
  "1": "الاثنين",
  "2": "الثلاثاء",
  "3": "الأربعاء",
  "4": "الخميس",
  "5": "الجمعة",
  "6": "السبت",
};
export const MONTHS_AR = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

export function defaultWeekHours(): WeekHours {
  const h: WeekHours = {};
  for (const d of WEEK_ORDER) h[d] = { open: d !== "5", from: "16:00", to: "21:00" };
  return h;
}

/* ── Time and slot math (pure) ─────────────────────────────── */

export const toMinutes = (t: string) => {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const fromMinutes = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** "16:30" → "4:30 م" */
export function formatTime12(t: string, ar = true): string {
  const n = toMinutes(t);
  const h = Math.floor(n / 60);
  const m = n % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? (ar ? "ص" : "AM") : ar ? "م" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const weekdayOf = (date: string) => String(new Date(`${date}T00:00:00`).getDay());

/** "الثلاثاء 4 تشرين الثاني" */
export function formatDateAr(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${DAY_NAMES_AR[String(d.getDay())]} ${d.getDate()} ${MONTHS_AR[d.getMonth()]}`;
}

/** Every slot start of a working day, before removing taken ones. */
export function daySlots(hours: DayHours | undefined, slotMinutes: number): string[] {
  if (!hours?.open || slotMinutes <= 0) return [];
  const start = toMinutes(hours.from);
  const end = toMinutes(hours.to);
  const bFrom = hours.breakFrom ? toMinutes(hours.breakFrom) : -1;
  const bTo = hours.breakTo ? toMinutes(hours.breakTo) : -1;
  const out: string[] = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
    if (bFrom >= 0 && bTo > bFrom && t < bTo && t + slotMinutes > bFrom) continue;
    out.push(fromMinutes(t));
  }
  return out;
}

/** A slot is taken when any booked start time overlaps it. */
export function isSlotTaken(slot: string, taken: string[], slotMinutes: number): boolean {
  const s = toMinutes(slot);
  return taken.some((t) => {
    const b = toMinutes(t);
    return b < s + slotMinutes && s < b + slotMinutes;
  });
}

/** Minutes since midnight in Baghdad (UTC+3, no DST) and today's date there. */
export function baghdadNow(now = new Date()): { date: string; minutes: number } {
  const b = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const date = `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")}`;
  return { date, minutes: b.getUTCHours() * 60 + b.getUTCMinutes() };
}

/** Free slots of one day for one clinic. */
export function freeSlots(
  page: BookingPage,
  clinic: BookingClinic,
  date: string,
  taken: string[],
  now = new Date(),
): string[] {
  if (page.closedDates?.includes(date)) return [];
  const today = baghdadNow(now);
  if (date < today.date) return [];
  return daySlots(clinic.hours[weekdayOf(date)], page.slotMinutes).filter(
    (s) =>
      !(date === today.date && toMinutes(s) <= today.minutes + 15) &&
      !isSlotTaken(s, taken, page.slotMinutes),
  );
}

/** The days a patient may pick from: today … today + daysAhead. */
export function bookableDates(page: BookingPage, now = new Date()): string[] {
  const start = new Date(`${baghdadNow(now).date}T00:00:00`);
  const out: string[] = [];
  for (let i = 0; i <= Math.max(1, page.daysAhead); i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(dateStr(d));
  }
  return out;
}

/* ── Phone ─────────────────────────────────────────────────── */

/** Iraqi mobile numbers only, normalised to "07XXXXXXXXX"; null if invalid. */
export function normalizeIraqiPhone(raw: string): string | null {
  const latin = (raw || "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("00964")) digits = digits.slice(5);
  else if (digits.startsWith("964")) digits = digits.slice(3);
  if (digits.startsWith("7")) digits = `0${digits}`;
  return /^07[0-9]{9}$/.test(digits) ? digits : null;
}

/** wa.me link with a prefilled message. */
export function whatsappLink(phone: string, text: string): string {
  const n = normalizeIraqiPhone(phone);
  const intl = n ? `964${n.slice(1)}` : phone.replace(/\D/g, "");
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/* ── QR code ───────────────────────────────────────────────── */

/** SVG path ("M x y h1 v1 h-1 z …") of the QR code's dark modules, plus its size. */
export function qrPath(text: string): { d: string; size: number } {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { d, size };
}

/* ── Slug ──────────────────────────────────────────────────── */

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export function suggestSlug(name: string): string {
  const s = (name || "")
    .toLowerCase()
    .replace(/^(dr|د)\.?\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return s.length >= 3 ? `dr-${s}` : `dr-${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Firestore ─────────────────────────────────────────────── */

export const bookingPageDoc = (slug: string) => doc(db, "booking_pages", slug);
export const bookingBusyDoc = (ownerId: string, clinicId: string, date: string) =>
  doc(db, "booking_busy", `${ownerId}_${clinicId}_${date}`);
export const bookingRequestsCol = () => collection(db, "booking_requests");

/** /book/demo — a sample page showing doctors (and us) the patient's view; it sends nothing. */
export const DEMO_SLUG = "demo";
const DEMO_PAGE: BookingPage = {
  slug: DEMO_SLUG,
  ownerId: "demo",
  enabled: true,
  doctorName: "د. سارة الخفاجي",
  specialty: "طب وجراحة الفم والأسنان · تجميل وزراعة",
  about: "صفحة تجريبية لعرض تجربة الحجز — لن يُرسل أي طلب.",
  whatsapp: "07700000000",
  slotMinutes: 30,
  daysAhead: 14,
  closedDates: [],
  clinics: [
    {
      id: "demo-1",
      name: "عيادة الابتسامة",
      address: "بغداد، المنصور، شارع 14 رمضان",
      enabled: true,
      hours: {
        ...defaultWeekHours(),
        "6": { open: true, from: "10:00", to: "14:00" },
        "4": { open: true, from: "16:00", to: "22:00", breakFrom: "19:00", breakTo: "19:30" },
      },
    },
  ],
  updatedAt: 0,
};

export async function getBookingPage(slug: string): Promise<BookingPage | null> {
  if (slug === DEMO_SLUG) return DEMO_PAGE;
  const snap = await getDoc(bookingPageDoc(slug));
  return snap.exists() ? (snap.data() as BookingPage) : null;
}

export async function getMyBookingPage(ownerId: string): Promise<BookingPage | null> {
  const snap = await getDocs(
    query(collection(db, "booking_pages"), where("ownerId", "==", ownerId), limit(1)),
  );
  return snap.empty ? null : (snap.docs[0].data() as BookingPage);
}

export async function getBusyTimes(
  ownerId: string,
  clinicId: string,
  date: string,
): Promise<string[]> {
  if (ownerId === "demo")
    return Number(date.slice(-2)) % 3 === 0 ? ["16:30", "17:00", "18:00"] : ["20:00"];
  const snap = await getDoc(bookingBusyDoc(ownerId, clinicId, date));
  return snap.exists() ? ((snap.data().times as string[] | undefined) ?? []) : [];
}

export type SaveResult = { ok: true } | { ok: false; error: "slug-taken" | "slug-invalid" };

/** Saves the owner's page; a changed slug moves the page to the new id. */
export async function saveBookingPage(
  page: BookingPage,
  previousSlug?: string,
): Promise<SaveResult> {
  assertVerified();
  if (!SLUG_RE.test(page.slug)) return { ok: false, error: "slug-invalid" };
  if (previousSlug !== page.slug) {
    const existing = await getDoc(bookingPageDoc(page.slug));
    if (existing.exists() && (existing.data() as BookingPage).ownerId !== page.ownerId) {
      return { ok: false, error: "slug-taken" };
    }
  }
  try {
    await setDoc(
      bookingPageDoc(page.slug),
      JSON.parse(JSON.stringify({ ...page, updatedAt: Date.now() })),
    );
  } catch (err) {
    // The rules refuse a create over someone else's page (a race with the check above).
    if ((err as { code?: string }).code === "permission-denied")
      return { ok: false, error: "slug-taken" };
    throw err;
  }
  if (previousSlug && previousSlug !== page.slug)
    await deleteDoc(bookingPageDoc(previousSlug)).catch(() => {});
  return { ok: true };
}

export async function acceptBookingRequest(id: string, appointmentId: string, patientId?: string) {
  await updateDoc(doc(db, "booking_requests", id), {
    status: "accepted",
    appointmentId,
    ...(patientId ? { patientId } : {}),
    handledAt: Date.now(),
  });
}

export async function rejectBookingRequest(id: string, rejectReason: string) {
  await updateDoc(doc(db, "booking_requests", id), {
    status: "rejected",
    rejectReason,
    handledAt: Date.now(),
  });
}

/** A pending request whose time has passed is shown as expired. */
export function effectiveStatus(
  r: Pick<BookingRequest, "status" | "date" | "time">,
  now = new Date(),
): BookingStatus {
  if (r.status !== "pending") return r.status;
  const t = baghdadNow(now);
  if (r.date < t.date || (r.date === t.date && toMinutes(r.time) <= t.minutes)) return "expired";
  return "pending";
}

export const statusLabel: Record<BookingStatus, string> = {
  pending: "بانتظار التأكيد",
  accepted: "مؤكد",
  rejected: "مرفوض",
  cancelled: "ملغى",
  expired: "منتهي",
};

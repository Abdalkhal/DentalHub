// Shared pieces of the public booking pages (/book/$slug and
// /book/r/$requestId). These pages are opened by patients with no account,
// often inside Instagram's or WhatsApp's in-app browser, so they stand alone:
// no app shell, no sign-in, light theme only.
import type { ReactNode } from "react";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page frame: a teal band holding `hero` (it grows with it), then the
 *  content column, whose first card overlaps the band's lower edge. */
export function BookingFrame({ hero, children }: { hero?: ReactNode; children?: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-dvh bg-[#F3F7F7] font-arabic text-[#10302D] antialiased">
      <div className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_80%_0%,#1FB5A1_0%,#0E6E66_45%,#0A4F4A_100%)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-white/[0.06]"
        />
        <div className="relative mx-auto w-full max-w-[520px] px-4 pb-14 pt-6">{hero}</div>
      </div>
      <div className="relative mx-auto -mt-9 w-full max-w-[520px] px-4 pb-36">{children}</div>
    </div>
  );
}

/** Doctor avatar: photo, or initials on a gradient. */
export function DoctorAvatar({
  name,
  photoURL,
  size = 84,
}: {
  name: string;
  photoURL?: string;
  size?: number;
}) {
  const initials = (name || "")
    .replace(/^(د\.?|dr\.?)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div
      className="relative shrink-0 rounded-[28px] bg-white p-1 shadow-[0_12px_30px_-12px_rgba(6,60,55,0.55)]"
      style={{ width: size, height: size }}
    >
      {photoURL ? (
        <img src={photoURL} alt="" className="size-full rounded-[24px] object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center rounded-[24px] bg-gradient-to-br from-[#14A08F] to-[#0E6E66] text-2xl font-bold text-white">
          {initials || <Stethoscope className="size-8" />}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(6,60,55,0.45)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  step,
  title,
  hint,
}: {
  step?: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {step !== undefined && (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E3F4F1] text-[13px] font-bold text-[#0E6E66]">
          {step}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold leading-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-[#5B7774]">{hint}</p>}
      </div>
    </div>
  );
}

/** Small footer credit. */
export function PoweredBy() {
  return (
    <p className="mt-8 text-center text-[11px] text-[#7C9592]">
      الحجز عبر <span className="font-bold text-[#0E6E66]">Dent Hub</span>
    </p>
  );
}

/* ── Patient's own bookings on this device ─────────────────── */

export type SavedBooking = {
  id: string;
  token: string;
  slug: string;
  date: string;
  time: string;
  doctorName: string;
};
const MY_BOOKINGS = "dh_my_bookings_v1";
const MY_DETAILS = "dh_booking_details_v1";

export function readSavedBookings(): SavedBooking[] {
  try {
    return JSON.parse(localStorage.getItem(MY_BOOKINGS) || "[]") as SavedBooking[];
  } catch {
    return [];
  }
}

export function saveBooking(b: SavedBooking) {
  try {
    localStorage.setItem(
      MY_BOOKINGS,
      JSON.stringify([b, ...readSavedBookings().filter((x) => x.id !== b.id)].slice(0, 20)),
    );
  } catch {}
}

export function readSavedDetails(): { name: string; phone: string } {
  try {
    const d = JSON.parse(localStorage.getItem(MY_DETAILS) || "{}") as {
      name?: string;
      phone?: string;
    };
    return { name: d.name || "", phone: d.phone || "" };
  } catch {
    return { name: "", phone: "" };
  }
}

export function saveDetails(name: string, phone: string) {
  try {
    localStorage.setItem(MY_DETAILS, JSON.stringify({ name, phone }));
  } catch {}
}

export const statusLink = (id: string, token: string) => `/book/r/${id}?t=${token}`;

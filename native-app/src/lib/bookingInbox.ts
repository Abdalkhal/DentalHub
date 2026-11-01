// Dentist side of the booking link: the requests inbox and what "accept"
// does. Identical in the web app and the native app (src/lib/bookingInbox.ts).
import { useEffect, useState } from "react";
import { limit, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import {
  acceptBookingRequest,
  bookingRequestsCol,
  defaultWeekHours,
  effectiveStatus,
  suggestSlug,
  getMyBookingPage,
  reasonLabel,
  type BookingPage,
  type BookingRequest,
} from "./booking";
import { addAppointment, getAppointmentsClinicId, type Appointment } from "./appointmentsStore";
import { findOrCreatePatient, getPatients } from "./patientsStore";
import { appointmentDoc, toFirestore } from "./dentistRecords";

/** The dentist's booking page (undefined while loading, null when none). */
export function useMyBookingPage(uid: string | undefined) {
  const [page, setPage] = useState<BookingPage | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getMyBookingPage(uid)
      .then((p) => alive && setPage(p))
      .catch(() => alive && setPage(null));
    return () => {
      alive = false;
    };
  }, [uid, version]);
  return { page, setPage, reload: () => setVersion((v) => v + 1) };
}

/** Live list of the requests sent to this dentist, newest first. */
export function useBookingRequests(uid: string | undefined) {
  const [list, setList] = useState<BookingRequest[] | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(
        bookingRequestsCol(),
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(150),
      ),
      (snap) => setList(snap.docs.map((d) => ({ ...(d.data() as BookingRequest), id: d.id }))),
      (err) => {
        console.warn("Booking requests listener error:", err);
        setList([]);
      },
    );
  }, [uid]);
  return list;
}

export const isOpenRequest = (r: BookingRequest) => effectiveStatus(r) === "pending";

export function usePendingBookingCount(uid: string | undefined): number {
  const list = useBookingRequests(uid);
  return (list ?? []).filter(isOpenRequest).length;
}

const digits = (s: string) => (s || "").replace(/\D/g, "").replace(/^964/, "0");

/** An existing patient file with the same number (active clinic only). */
export function matchPatient(r: BookingRequest) {
  if (r.clinicId !== getAppointmentsClinicId()) return undefined;
  const phone = digits(r.phone);
  return getPatients().find((p) => digits(p.phone) === phone);
}

const TREATMENT_BY_REASON: Record<string, string> = {
  cleaning: "تنظيف اسنان",
  filling: "حشوة",
  implant: "زراعة اسنان",
  ortho: "تقويم",
  cosmetic: "تبييض",
};

/**
 * Accepts a request: puts it on the calendar (synced to every device) and
 * optionally links/creates the patient file, then marks the request accepted
 * so the patient's page shows "مؤكد".
 */
export async function acceptRequest(
  uid: string,
  r: BookingRequest,
  opts: { linkPatient: boolean },
) {
  const input: Omit<Appointment, "id" | "createdAt"> = {
    patientName: r.patientName,
    phone: r.phone,
    date: r.date,
    time: r.time,
    appointmentType:
      r.reason === "pain" ? "طوارئ" : r.reason === "checkup" ? "فحص دوري" : "استشارة",
    clinicRoom: "",
    doctor: "",
    treatment: TREATMENT_BY_REASON[r.reason] ?? reasonLabel(r.reason),
    notes: r.note,
    reminder: true,
    status: "confirmed",
    source: "booking",
    bookingRequestId: r.id,
  };
  let appointmentId: string;
  let patientId: string | undefined;
  if (r.clinicId === getAppointmentsClinicId()) {
    if (opts.linkPatient) patientId = findOrCreatePatient(r.patientName, r.phone).id;
    appointmentId = addAppointment({ ...input, patientId }).id;
  } else {
    // Another of the dentist's clinics: written straight to the cloud copy;
    // it appears when that clinic is opened.
    appointmentId = `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await setDoc(
      appointmentDoc(uid, appointmentId),
      toFirestore({
        ...input,
        id: appointmentId,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        clinicId: r.clinicId,
        deleted: false,
      }),
    );
  }
  await acceptBookingRequest(r.id, appointmentId, patientId);
}

type ProfileLike = {
  name?: string;
  surname?: string;
  phone?: string;
  photoURL?: string;
  title?: string;
  address?: string;
  mapUrl?: string;
};

/** A first draft of the page, filled from the dentist's profile and clinics. */
export function draftBookingPage(
  uid: string,
  profile: ProfileLike | null | undefined,
  clinics: { id: string; name: string; address: string }[],
): BookingPage {
  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ").trim();
  return {
    slug: suggestSlug(fullName),
    ownerId: uid,
    enabled: true,
    doctorName: fullName ? `د. ${fullName}` : "",
    specialty: profile?.title || "",
    photoURL: profile?.photoURL || "",
    about: "",
    whatsapp: profile?.phone || "",
    slotMinutes: 30,
    daysAhead: 14,
    closedDates: [],
    clinics: clinics.map((c, i) => ({
      id: c.id,
      name: c.name,
      address: c.address || (i === 0 ? profile?.address || "" : ""),
      mapUrl: i === 0 ? profile?.mapUrl || "" : "",
      enabled: i === 0,
      hours: defaultWeekHours(),
    })),
    updatedAt: Date.now(),
  };
}

/** Keeps the page's clinic list in step with the dentist's clinics. */
export function withCurrentClinics(
  page: BookingPage,
  clinics: { id: string; name: string; address: string }[],
): BookingPage {
  return {
    ...page,
    clinics: clinics.map(
      (c) =>
        page.clinics.find((x) => x.id === c.id) ?? {
          id: c.id,
          name: c.name,
          address: c.address,
          enabled: false,
          hours: defaultWeekHours(),
        },
    ),
  };
}

/** Prefilled WhatsApp texts the clinic sends from its own phone. */
export const whatsappTexts = {
  confirm: (r: BookingRequest, clinic: string, when: string) =>
    `مرحباً ${r.patientName.split(" ")[0]}، نؤكد موعدك ${when} في ${clinic}. رقم الطلب ${r.code}.`,
  ask: (r: BookingRequest, when: string) =>
    `مرحباً ${r.patientName.split(" ")[0]}، وصلنا طلب حجزك ${when}. هل يمكنك تأكيد حضورك؟`,
  reject: (r: BookingRequest, when: string) =>
    `مرحباً ${r.patientName.split(" ")[0]}، نعتذر لعدم توفر موعد ${when}. يسعدنا اختيار وقت آخر عبر رابط الحجز.`,
  reminder: (name: string, clinic: string, when: string) =>
    `مرحباً ${name.split(" ")[0]}، تذكير بموعدك ${when} في ${clinic}. ننتظرك.`,
};

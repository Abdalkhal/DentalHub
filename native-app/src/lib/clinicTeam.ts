// Clinic team: doctors join each other's clinics as members, by invite or by a
// join request. The rules and the writing live in functions/clinicTeam.js;
// this reads the results. Identical in the web app and the native app
// (src/lib/clinicTeam.ts).
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";

export type ClinicRole = "doctor" | "visitor";

export type ClinicMember = {
  id: string;
  ownerId: string;
  ownerName: string;
  clinicId: string;
  clinicName: string;
  memberId: string;
  memberName: string;
  memberPhoto?: string;
  memberPhone?: string;
  role: ClinicRole;
  status: "requested" | "active" | "left";
  requestedAt: number;
  // Sees every patient of the clinic, not only those they treat.
  allPatients?: boolean;
  // Sees fees and records payments for their patients.
  financeAccess?: boolean;
  agreementType?: "percentage" | "fixed";
  agreementPercent?: number;
  agreementHistory?: { from: string; type: "percentage" | "fixed"; percent: number; at: number }[];
  payouts?: DoctorPayout[];
};

export type DoctorPayout = {
  id: string;
  date: string;
  amount: number;
  currency: "USD" | "IQD";
  note?: string;
  voidedAt?: number;
};

export type SharedFile = { id: string; name: string; type: string; addedAt: string; url: string };

/** A member's copy of a patient (see functions/clinicTeam.js → patientCopy). */
export type SharedPatient = {
  id: string;
  ownerId: string;
  clinicId: string;
  fileNo: string;
  name: string;
  age: number | "";
  gender: string;
  phone: string;
  status: string;
  history: Record<string, boolean>;
  complaint: string;
  doctorNote: string;
  allergies: string;
  meds: string;
  lastVisit: string;
  teeth: Record<string, string>;
  visits: { id: string; date: string; procedure: string; note?: string; upcoming?: boolean; byName?: string; doctor?: string }[];
  plan: { id: string; title: string; status: "done" | "active" | "planned"; tooth?: string; dept?: string; note?: string; cost?: number; currency?: "USD" | "IQD"; byName?: string }[];
  log: { id: string; date: string; text: string }[];
  files: SharedFile[];
  finance?: {
    fees: { USD: number; IQD: number };
    payments: { id: string; date: string; amount: number; currency: "USD" | "IQD"; receiptNo: string; note: string }[];
  };
};

export type DuesReport = {
  agreementType: "percentage" | "fixed" | null;
  agreementPercent: number;
  totals: Record<"IQD" | "USD", { collected: number; earned: number; paidOut: number }>;
  items: { date: string; patientName: string; fileNo: string; receiptNo: string; amount: number; currency: "USD" | "IQD"; percent: number; share: number }[];
  payouts: DoctorPayout[];
};

/** What the member may do, spelled out in one place for both apps. */
export const canAddPatients = (m: Pick<ClinicMember, "role">) => m.role === "doctor";
export const canRecordPayments = (m: Pick<ClinicMember, "role" | "financeAccess">) =>
  m.role === "doctor" && m.financeAccess === true;

export const TOOTH_STATUSES = ["healthy", "caries", "filled", "crown", "missing", "implant", "rct", "bridge", "unerupted"] as const;
export function toothLabel(s: string, ar: boolean): string {
  const m: Record<string, [string, string]> = {
    healthy: ["سليم", "Healthy"],
    caries: ["تسوس", "Caries"],
    filled: ["حشو", "Filled"],
    crown: ["تاج", "Crown"],
    missing: ["مفقود", "Missing"],
    implant: ["زرعة", "Implant"],
    rct: ["عصب", "RCT"],
    bridge: ["جسر", "Bridge"],
    unerupted: ["غير بازغ", "Unerupted"],
  };
  return m[s] ? (ar ? m[s][0] : m[s][1]) : s;
}
export function planStatusLabel(s: string, ar: boolean): string {
  const m: Record<string, [string, string]> = {
    done: ["مكتمل", "Done"],
    active: ["قيد التنفيذ", "In progress"],
    planned: ["مقترح", "Planned"],
  };
  return m[s] ? (ar ? m[s][0] : m[s][1]) : s;
}
export function sharedBalance(f: NonNullable<SharedPatient["finance"]>, c: "USD" | "IQD") {
  const paid = f.payments.filter((x) => x.currency === c).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  return { fees: f.fees[c] ?? 0, paid, remaining: (f.fees[c] ?? 0) - paid };
}
export const sharedUploadPath = (uid: string, name: string) =>
  `clinic_uploads/${uid}/${Date.now().toString(36)}-${(name || "file").replace(/[^\w.\-]+/g, "_").slice(-60)}`;

export type ClinicInvite = {
  code: string;
  kind: "invite" | "clinic";
  clinicId: string;
  clinicName: string;
  role?: ClinicRole | "secretary";
  expiresAt?: number;
};

export type SharedAppointment = {
  id: string;
  ownerId: string;
  clinicId: string;
  patientName: string;
  phone: string;
  date: string;
  time: string;
  appointmentType: string;
  treatment: string;
  notes: string;
  status: "confirmed" | "waiting" | "completed" | "cancelled";
};

export type CodeInfo = {
  code: string;
  kind: "invite" | "clinic";
  clinicName: string;
  ownerName: string;
  role: ClinicRole | "secretary" | null;
  mine: boolean;
};

export function roleLabel(role: ClinicRole | "secretary", ar: boolean): string {
  if (role === "secretary") return ar ? "سكرتارية" : "Secretary";
  if (role === "visitor") return ar ? "طبيب زائر" : "Visiting doctor";
  return ar ? "طبيب" : "Doctor";
}

export function roleHint(role: ClinicRole | "secretary", ar: boolean): string {
  if (role === "secretary") return ar ? "تعمل بما يحدده لك الطبيب من صلاحيات، ويمكنه تغييرها في أي وقت." : "You work within the permissions the doctor sets, which they can change at any time.";
  if (role === "visitor") {
    return ar ? "يعمل على مرضاه ويرى مواعيده، بدون مبالغ ودفعات، ولا يضيف مرضى." : "Works on their patients and sees appointments, without money or adding patients.";
  }
  return ar ? "يعمل على مرضاه ومواعيده، ويضيف مرضى ويسجل دفعاتهم." : "Works on their patients and appointments, adds patients and records their payments.";
}

export const statusLabel = (s: SharedAppointment["status"], ar: boolean): string =>
  ({
    confirmed: ar ? "مؤكد" : "Confirmed",
    waiting: ar ? "بالانتظار" : "Waiting",
    completed: ar ? "مكتمل" : "Completed",
    cancelled: ar ? "ملغي" : "Cancelled",
  })[s] ?? s;

export const joinLink = (code: string) => `https://dental-hub-df069.web.app/join/${code}`;

export function inviteMessage(code: string, clinicName: string, ar: boolean): string {
  return ar
    ? `دعوة للانضمام إلى ${clinicName} على Dent Hub.\nافتح الرابط: ${joinLink(code)}\nأو أدخل الرمز ${code} من «أطباء العيادة» في التطبيق.\nتنتهي الدعوة بعد 7 أيام.`
    : `You're invited to join ${clinicName} on Dent Hub.\nOpen: ${joinLink(code)}\nOr enter code ${code} under "Clinic Doctors" in the app.\nThe invite expires in 7 days.`;
}

export function clinicCodeMessage(code: string, clinicName: string, ar: boolean): string {
  return ar
    ? `لطلب الانضمام إلى ${clinicName} على Dent Hub، أدخل الرمز ${code} من «أطباء العيادة» في التطبيق، أو افتح: ${joinLink(code)}`
    : `To request to join ${clinicName} on Dent Hub, enter code ${code} under "Clinic Doctors" in the app, or open: ${joinLink(code)}`;
}

/** The people in one of my clinics, and its open invites. */
export function useClinicTeam(ownerId: string | undefined, clinicId: string | undefined) {
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [invites, setInvites] = useState<ClinicInvite[]>([]);
  useEffect(() => {
    if (!ownerId) {
      setMembers([]);
      setInvites([]);
      return;
    }
    const a = onSnapshot(
      query(collection(db, "clinic_members"), where("ownerId", "==", ownerId)),
      (s) => setMembers(s.docs.map((d) => ({ ...(d.data() as ClinicMember), id: d.id }))),
      (e) => console.warn("Team not loaded:", e),
    );
    const b = onSnapshot(
      query(collection(db, "clinic_codes"), where("ownerId", "==", ownerId)),
      (s) => setInvites(s.docs.map((d) => d.data() as ClinicInvite)),
      (e) => console.warn("Invites not loaded:", e),
    );
    return () => {
      a();
      b();
    };
  }, [ownerId]);
  return useMemo(() => {
    const here = members.filter((m) => m.clinicId === clinicId);
    const secretary = (m: { role?: string }) => m.role === "secretary";
    const open = invites.filter(
      (i) => i.kind === "invite" && i.clinicId === clinicId && (i.expiresAt ?? 0) > Date.now(),
    );
    return {
      // Doctors. Secretaries are kept apart so no doctor list ever shows them.
      active: here.filter((m) => m.status === "active" && !secretary(m)),
      requests: here.filter((m) => m.status === "requested"),
      invites: open.filter((i) => !secretary(i)),
      staff: here.filter((m) => m.status === "active" && secretary(m)) as unknown as StaffMember[],
      staffInvites: open.filter(secretary),
    };
  }, [members, invites, clinicId]);
}

/** The other doctors' clinics I belong to or asked to join. */
export function useMyClinicMemberships(uid: string | undefined): ClinicMember[] {
  const [list, setList] = useState<ClinicMember[]>([]);
  useEffect(() => {
    if (!uid) {
      setList([]);
      return;
    }
    return onSnapshot(
      query(collection(db, "clinic_members"), where("memberId", "==", uid)),
      (s) =>
        setList(
          s.docs
            .map((d) => ({ ...(d.data() as ClinicMember), id: d.id }))
            .filter((m) => m.status !== "left"),
        ),
      (e) => console.warn("Memberships not loaded:", e),
    );
  }, [uid]);
  return list;
}

/** My appointments in one clinic I joined: nearest date first, past ones after. */
export function useSharedAppointments(uid: string | undefined, ownerId: string, clinicId: string) {
  const [list, setList] = useState<SharedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setList([]);
      setLoading(false);
      return;
    }
    return onSnapshot(
      query(collection(db, "clinic_shared_appointments"), where("doctorUid", "==", uid)),
      (s) => {
        setList(
          sortShared(
            s.docs
              .map((d) => ({ ...(d.data() as SharedAppointment), id: d.id }))
              .filter((a) => a.ownerId === ownerId && a.clinicId === clinicId),
            new Date().toISOString().slice(0, 10),
          ),
        );
        setLoading(false);
      },
      (e) => {
        console.warn("Shared appointments not loaded:", e);
        setLoading(false);
      },
    );
  }, [uid, ownerId, clinicId]);
  return { list, loading };
}

/** My copies of the patients of one clinic I joined. */
export function useSharedPatients(uid: string | undefined, ownerId: string, clinicId: string) {
  const [list, setList] = useState<SharedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setList([]);
      setLoading(false);
      return;
    }
    return onSnapshot(
      query(collection(db, "clinic_shared_patients"), where("memberId", "==", uid)),
      (s) => {
        setList(
          s.docs
            .map((d) => d.data() as SharedPatient)
            .filter((p) => p.ownerId === ownerId && p.clinicId === clinicId)
            .sort((a, b) => String(a.fileNo).localeCompare(String(b.fileNo), "en", { numeric: true })),
        );
        setLoading(false);
      },
      (e) => {
        console.warn("Shared patients not loaded:", e);
        setLoading(false);
      },
    );
  }, [uid, ownerId, clinicId]);
  return { list, loading };
}

export function sortShared(list: SharedAppointment[], today: string): SharedAppointment[] {
  const stamp = (a: SharedAppointment) => `${a.date} ${a.time}`;
  const upcoming = list.filter((a) => a.date >= today).sort((a, b) => stamp(a).localeCompare(stamp(b)));
  const past = list.filter((a) => a.date < today).sort((a, b) => stamp(b).localeCompare(stamp(a)));
  return [...upcoming, ...past];
}

async function call<T>(name: string, data: object): Promise<T> {
  const res = await httpsCallable(getFunctions(app), name)(data);
  return res.data as T;
}

export const createClinicInvite = (clinicId: string, role: ClinicRole) =>
  call<{ code: string; expiresAt: number }>("createClinicInvite", { clinicId, role });
export const getClinicJoinCode = (clinicId: string) => call<{ code: string }>("getClinicJoinCode", { clinicId });
export const lookupClinicCode = (code: string) => call<CodeInfo>("lookupClinicCode", { code });
export const joinClinicWithCode = (code: string) =>
  call<{ status: "active" | "requested"; clinicName: string }>("joinClinicWithCode", { code });
export const resolveClinicRequest = (memberDocId: string, approve: boolean, role: ClinicRole = "doctor") =>
  call("resolveClinicRequest", { memberDocId, approve, role });
export const setClinicMemberRole = (memberDocId: string, role: ClinicRole) =>
  call("setClinicMemberRole", { memberDocId, role });
export const removeClinicMember = (memberDocId: string) => call("removeClinicMember", { memberDocId });
export const revokeClinicInvite = (code: string) => call("revokeClinicInvite", { code });
export const updateSharedAppointment = (id: string, patch: { status?: SharedAppointment["status"]; notes?: string }) =>
  call("updateSharedAppointment", { id, ...patch });

export const createSharedPatient = (
  ownerId: string,
  clinicId: string,
  input: { name: string; phone?: string; age?: number | string; gender?: string; complaint?: string },
) => call<{ id: string }>("createSharedPatient", { ownerId, clinicId, ...input });
export const updateSharedPatient = (
  p: Pick<SharedPatient, "id" | "ownerId" | "clinicId">,
  op: string,
  payload: Record<string, unknown> = {},
) => call("updateSharedPatient", { ownerId: p.ownerId, clinicId: p.clinicId, patientId: p.id, op, ...payload });
export const updateClinicMember = (
  memberDocId: string,
  patch: { allPatients?: boolean; financeAccess?: boolean; agreementType?: "percentage" | "fixed"; agreementPercent?: number },
) => call("updateClinicMember", { memberDocId, ...patch });
export const getClinicDues = (memberDocId: string) => call<DuesReport>("getClinicDues", { memberDocId });
export const addDoctorPayout = (memberDocId: string, amount: number, currency: "USD" | "IQD", note: string) =>
  call("addDoctorPayout", { memberDocId, amount, currency, note });
export const voidDoctorPayout = (memberDocId: string, payoutId: string) =>
  call("voidDoctorPayout", { memberDocId, payoutId });

/* ── Secretaries (functions/clinicStaff.js) ────────────────────────── */

// The invite a new secretary signed up from, answered once their email is verified.
export const PENDING_STAFF_CODE = "dh_pending_staff_code";

export type StaffPermission = "appointments" | "bookings" | "patients" | "medical" | "files" | "payments" | "balances" | "reports" | "materials";
export type StaffPermissions = Record<StaffPermission, boolean>;

export const STAFF_PERMISSIONS: { key: StaffPermission; ar: string; en: string; hintAr: string; hintEn: string }[] = [
  { key: "appointments", ar: "المواعيد", en: "Appointments", hintAr: "يحجز ويعدّل ويلغي مواعيد العيادة", hintEn: "Book, change and cancel the clinic's appointments" },
  { key: "bookings", ar: "طلبات الحجز", en: "Booking requests", hintAr: "يقبل أو يرفض طلبات رابط الحجز", hintEn: "Accept or decline booking-link requests" },
  { key: "patients", ar: "بيانات المرضى", en: "Patient details", hintAr: "الاسم والهاتف والعمر، وإضافة مريض وتعديله", hintEn: "Name, phone and age; add and edit patients" },
  { key: "medical", ar: "الملف الطبي", en: "Medical file", hintAr: "يطّلع على التاريخ المرضي والزيارات والخطة، بلا تعديل", hintEn: "View history, visits and plan, without editing" },
  { key: "files", ar: "الأشعة والملفات", en: "X-rays and files", hintAr: "يرفع الملفات ويفتحها، بلا حذف", hintEn: "Upload and open files, without deleting" },
  { key: "payments", ar: "تسجيل الدفعات", en: "Record payments", hintAr: "يسجل دفعة ويصدر وصلاً، بلا حذف أو تعديل", hintEn: "Record a payment and issue a receipt, without deleting" },
  { key: "balances", ar: "الأرصدة", en: "Balances", hintAr: "يرى الأتعاب والمدفوع والمتبقي لكل مريض", hintEn: "See each patient's fees, paid and remaining" },
  { key: "reports", ar: "تقارير العيادة", en: "Clinic reports", hintAr: "دخل العيادة وعدد المواعيد، بدون مستحقات الأطباء", hintEn: "Clinic income and appointment counts, without doctors' dues" },
  { key: "materials", ar: "مواد العيادة", en: "Clinic materials", hintAr: "يرى المواد ويحدّث حالتها", hintEn: "See materials and update their status" },
];

const perms = (...on: StaffPermission[]) =>
  Object.fromEntries(STAFF_PERMISSIONS.map((p) => [p.key, on.includes(p.key)])) as StaffPermissions;

export const STAFF_TEMPLATES: { id: string; ar: string; en: string; permissions: StaffPermissions }[] = [
  { id: "reception", ar: "استقبال", en: "Reception", permissions: perms("appointments", "bookings", "patients") },
  { id: "accounts", ar: "استقبال ومحاسبة", en: "Reception and accounts", permissions: perms("appointments", "bookings", "patients", "payments", "balances") },
  { id: "manager", ar: "مدير مكتب", en: "Office manager", permissions: perms(...STAFF_PERMISSIONS.map((p) => p.key)) },
];

export const staffTemplateOf = (p: StaffPermissions) =>
  STAFF_TEMPLATES.find((t) => STAFF_PERMISSIONS.every(({ key }) => !!p[key] === t.permissions[key]));

// These open a patient's file, so they can't exist without the patient list.
const NEEDS_PATIENTS: StaffPermission[] = ["medical", "files", "payments", "balances"];
export function togglePermission(p: StaffPermissions, key: StaffPermission): StaffPermissions {
  const next = { ...p, [key]: !p[key] };
  if (next[key] && NEEDS_PATIENTS.includes(key)) next.patients = true;
  if (key === "patients" && !next.patients) for (const k of NEEDS_PATIENTS) next[k] = false;
  return next;
}

export const STAFF_RED_LINES: { ar: string; en: string }[] = [
  { ar: "حذف مريض أو ملف", en: "Delete a patient or a file" },
  { ar: "تغيير الأتعاب أو حذف دفعة", en: "Change fees or delete a payment" },
  { ar: "تصدير البيانات", en: "Export data" },
  { ar: "إضافة موظف أو تغيير صلاحيات", en: "Add staff or change permissions" },
  { ar: "رؤية مستحقات الأطباء", en: "See doctors' dues" },
  { ar: "حذف العيادة أو تغيير إعداداتها", en: "Delete the clinic or change its settings" },
];

export type StaffMember = Omit<ClinicMember, "role"> & { role: "secretary"; permissions: StaffPermissions };

export type StaffAppointment = SharedAppointment & {
  appointmentId: string;
  doctor?: string;
  assignedDoctorUid?: string;
  createdBy?: string;
};

/** A secretary's copy of a patient: the optional parts follow the permissions. */
export type StaffPatient = {
  id: string;
  ownerId: string;
  clinicId: string;
  fileNo: string;
  name: string;
  age: number | "";
  gender: string;
  phone: string;
  status: string;
  lastVisit: string;
  medical?: {
    history: Record<string, boolean>;
    complaint: string;
    doctorNote: string;
    allergies: string;
    meds: string;
    teeth: Record<string, string>;
    visits: { id: string; date: string; procedure: string; note?: string }[];
    plan: { id: string; title: string; status: "done" | "active" | "planned"; tooth?: string; note?: string }[];
  };
  files?: SharedFile[];
  finance?: SharedPatient["finance"];
};

export type StaffBooking = { id: string; patientName: string; phone: string; date: string; time: string; reason: string; note: string; code: string };
export type StaffMaterial = { id: string; name: string; qty: number; status: "available" | "half" | "low" | "out"; category: string; expiryDate: string };
export type StaffReport = {
  totals: Record<"IQD" | "USD", { month: number; all: number }>;
  patientCount: number;
  appointmentsThisMonth: number;
  appointmentsToday: number;
};
export type StaffReceipt = {
  receiptNo: string;
  amount: number;
  currency: "USD" | "IQD";
  date: string;
  patientName: string;
  fileNo: string;
  note?: string;
  balance?: { fees: number; paid: number; remaining: number };
};
export type ActivityEntry = { id: string; ownerId: string; clinicId: string; memberId: string; memberName: string; message: string; at: number };

export const BOOKING_REASONS: Record<string, [string, string]> = {
  pain: ["ألم أو طوارئ", "Pain or emergency"],
  checkup: ["فحص دوري", "Checkup"],
  cleaning: ["تنظيف أسنان", "Cleaning"],
  filling: ["حشوة", "Filling"],
  implant: ["زراعة", "Implant"],
  ortho: ["تقويم", "Orthodontics"],
  cosmetic: ["تجميل", "Cosmetic"],
  other: ["استشارة", "Consultation"],
};

export const MATERIAL_STATUSES: { id: StaffMaterial["status"]; ar: string; en: string }[] = [
  { id: "available", ar: "متوفرة", en: "Available" },
  { id: "half", ar: "النصف", en: "Half" },
  { id: "low", ar: "قليلة", en: "Low" },
  { id: "out", ar: "نفدت", en: "Out" },
];

/** The clinics this secretary works in. */
export function useStaffMemberships(uid: string | undefined): StaffMember[] {
  const list = useMyClinicMemberships(uid) as unknown as StaffMember[];
  return useMemo(() => list.filter((m) => m.role === "secretary" && m.status === "active"), [list]);
}

export function useStaffAppointments(uid: string | undefined, ownerId: string, clinicId: string) {
  const { list, loading } = useSharedAppointments(uid, ownerId, clinicId);
  return { list: list as StaffAppointment[], loading };
}

export function useStaffPatients(uid: string | undefined, ownerId: string, clinicId: string) {
  const { list, loading } = useSharedPatients(uid, ownerId, clinicId);
  return { list: list as unknown as StaffPatient[], loading };
}

/** What was done in a clinic: all of it for the owner, their own for a secretary. */
export function useClinicActivity(by: "ownerId" | "memberId", uid: string | undefined, clinicId: string) {
  const [list, setList] = useState<ActivityEntry[]>([]);
  useEffect(() => {
    if (!uid) {
      setList([]);
      return;
    }
    return onSnapshot(
      query(collection(db, "clinic_activity"), where(by, "==", uid)),
      (s) =>
        setList(
          s.docs
            .map((d) => ({ ...(d.data() as ActivityEntry), id: d.id }))
            .filter((a) => a.clinicId === clinicId)
            .sort((a, b) => b.at - a.at)
            .slice(0, 100),
        ),
      (e) => console.warn("Activity not loaded:", e),
    );
  }, [by, uid, clinicId]);
  return list;
}

export function activityTime(at: number, ar: boolean): string {
  return new Date(at).toLocaleString(ar ? "ar-IQ" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Scope = { ownerId: string; clinicId: string };
const scope = (m: Scope) => ({ ownerId: m.ownerId, clinicId: m.clinicId });

export const createStaffInvite = (clinicId: string, permissions: StaffPermissions) =>
  call<{ code: string; expiresAt: number }>("createClinicInvite", { clinicId, role: "secretary", permissions });
export const lookupStaffInvite = (code: string) =>
  call<{ secretary: boolean; clinicName?: string; ownerName?: string }>("lookupStaffInvite", { code });
export const setStaffPermissions = (memberDocId: string, permissions: StaffPermissions) =>
  call("setStaffPermissions", { memberDocId, permissions });
export const getStaffContext = (m: Scope) => call<{ doctors: { uid: string; name: string }[] }>("getStaffContext", scope(m));
export const createStaffAppointment = (
  m: Scope,
  input: { patientName: string; phone: string; date: string; time: string; treatment: string; notes: string; doctorUid: string },
) => call<{ id: string }>("createStaffAppointment", { ...scope(m), ...input });
export const updateStaffAppointment = (
  m: Scope,
  appointmentId: string,
  patch: { status?: SharedAppointment["status"]; date?: string; time?: string; notes?: string; doctorUid?: string },
) => call("updateStaffAppointment", { ...scope(m), appointmentId, ...patch });
export const listStaffBookings = (m: Scope) => call<{ requests: StaffBooking[] }>("listStaffBookings", scope(m));
export const resolveStaffBooking = (m: Scope, id: string, accept: boolean, reason = "") =>
  call("resolveStaffBooking", { ...scope(m), id, accept, reason });
export const listStaffMaterials = (m: Scope) => call<{ items: StaffMaterial[] }>("listStaffMaterials", scope(m));
export const setStaffMaterial = (m: Scope, id: string, status: StaffMaterial["status"]) =>
  call("setStaffMaterial", { ...scope(m), id, status });
export const getStaffReport = (m: Scope) => call<StaffReport>("getStaffReport", scope(m));
export const updateStaffPatient = (
  p: { id: string; ownerId: string; clinicId: string },
  op: "setBasics" | "addPayment" | "addFile",
  payload: Record<string, unknown>,
) =>
  call<{ ok: boolean; receipt: StaffReceipt | null }>("updateSharedPatient", { ownerId: p.ownerId, clinicId: p.clinicId, patientId: p.id, op, ...payload });

const receiptMoney = (n: number, c: "USD" | "IQD") =>
  c === "USD" ? `$${n.toLocaleString("en-US")}` : `${n.toLocaleString("en-US")} د.ع`;

/** The message sent to the patient on WhatsApp. */
export function staffReceiptText(r: StaffReceipt, clinicName: string, ar: boolean): string {
  const lines = ar
    ? [
        `وصل دفع${clinicName ? ` — ${clinicName}` : ""}`,
        `المريض: ${r.patientName}`,
        `رقم الوصل: ${r.receiptNo}`,
        `التاريخ: ${r.date}`,
        `المبلغ المدفوع: ${receiptMoney(r.amount, r.currency)}`,
        ...(r.note ? [`ملاحظة: ${r.note}`] : []),
        ...(r.balance
          ? [`إجمالي الأتعاب: ${receiptMoney(r.balance.fees, r.currency)}`, `مجموع المدفوع: ${receiptMoney(r.balance.paid, r.currency)}`, `المتبقي: ${receiptMoney(r.balance.remaining, r.currency)}`]
          : []),
      ]
    : [
        `Payment receipt${clinicName ? ` — ${clinicName}` : ""}`,
        `Patient: ${r.patientName}`,
        `Receipt #: ${r.receiptNo}`,
        `Date: ${r.date}`,
        `Amount paid: ${receiptMoney(r.amount, r.currency)}`,
        ...(r.note ? [`Note: ${r.note}`] : []),
        ...(r.balance
          ? [`Total fees: ${receiptMoney(r.balance.fees, r.currency)}`, `Total paid: ${receiptMoney(r.balance.paid, r.currency)}`, `Remaining: ${receiptMoney(r.balance.remaining, r.currency)}`]
          : []),
      ];
  return lines.join("\n");
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Body of the printed receipt; goes inside the app's print shell. */
export function staffReceiptBody(r: StaffReceipt, clinicName: string, ar: boolean): string {
  const t = (a: string, e: string) => (ar ? a : e);
  const cell = (label: string, value: string) =>
    `<div class="meta-cell"><span class="meta-label">${esc(label)}</span><span class="meta-value">${esc(value)}</span></div>`;
  const row = (label: string, n: number, strong = false) =>
    `<tr><td${strong ? ' style="font-weight:800"' : ""}>${esc(label)}</td><td class="num"${strong ? ' style="font-weight:800"' : ""}>${esc(receiptMoney(n, r.currency))}</td></tr>`;
  return `
    <h1>${t("وصل دفع", "Payment receipt")}</h1>
    ${clinicName ? `<p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700">${esc(clinicName)}</p>` : ""}
    <div style="margin:0 0 16px;padding:18px;border-radius:12px;background:#ecfdf5;text-align:center">
      <div style="color:#047857;font-size:11px;font-weight:700">${t("المبلغ المدفوع", "Amount paid")}</div>
      <div style="color:#065f46;font-size:26px;font-weight:800;margin-top:4px">${esc(receiptMoney(r.amount, r.currency))}</div>
    </div>
    <div class="meta-grid">
      ${cell(t("رقم الوصل", "Receipt #"), r.receiptNo)}
      ${cell(t("التاريخ", "Date"), r.date)}
      ${cell(t("اسم المريض", "Patient"), r.patientName)}
      ${cell(t("رقم الملف", "File #"), r.fileNo)}
    </div>
    ${r.note ? `<div class="note"><b>${t("ملاحظة", "Note")}</b>${esc(r.note)}</div>` : ""}
    ${
      r.balance
        ? `<div class="section"><table><tbody>
            ${row(t("إجمالي الأتعاب", "Total fees"), r.balance.fees)}
            ${row(t("مجموع المدفوع", "Total paid"), r.balance.paid)}
            ${row(t("المتبقي", "Remaining"), r.balance.remaining, true)}
          </tbody></table></div>`
        : ""
    }`;
}

export function teamErrorMessage(err: unknown, ar: boolean): string {
  const message = (err as { message?: string } | null)?.message ?? "";
  const m: Record<string, [string, string]> = {
    "invalid-code": ["الرمز غير صحيح أو انتهت صلاحيته", "This code is invalid or has expired"],
    "own-clinic": ["هذه عيادتك أنت", "This is your own clinic"],
    "already-member": ["أنت عضو في هذه العيادة", "You are already a member of this clinic"],
    "already-requested": ["أرسلت طلباً لهذه العيادة وهو بانتظار الموافقة", "Your request is awaiting approval"],
    "dentists-only": ["هذه الميزة لحسابات الأطباء فقط", "This is for dentist accounts only"],
    "verify-email": ["أكّد بريدك الإلكتروني أولاً", "Verify your email first"],
    "no-clinic": ["احفظ بيانات عيادتك أولاً ثم حاول مجدداً", "Save your clinic first, then try again"],
    "not-allowed": ["لا تملك صلاحية هذا الإجراء", "You don't have permission for this"],
    "not-assigned": ["هذا المريض غير مسند إليك", "This patient isn't assigned to you"],
    "not-member": ["لم تعد عضواً في هذه العيادة", "You're no longer a member of this clinic"],
    "bad-amount": ["أدخل مبلغاً صحيحاً", "Enter a valid amount"],
    "bad-percent": ["النسبة بين 0 و100", "The percentage must be 0 to 100"],
    "bad-input": ["تحقق من البيانات المدخلة", "Check what you entered"],
    "needs-secretary-account": ["هذه الدعوة لحساب سكرتارية. سجّل الخروج وافتح الرابط لإنشاء حساب جديد", "This invite is for a secretary account. Sign out and open the link to create one"],
    "needs-doctor-account": ["هذا الرمز لحسابات الأطباء فقط", "This code is for doctor accounts only"],
    "no-appointment": ["لم يعد هذا الموعد موجوداً", "This appointment no longer exists"],
    "no-request": ["لم يعد هذا الطلب موجوداً", "This request no longer exists"],
    "already-handled": ["عولج هذا الطلب من قبل", "This request was already handled"],
    "no-material": ["لم تعد هذه المادة موجودة", "This material no longer exists"],
    "bad-date": ["تحقق من التاريخ والوقت", "Check the date and time"],
    "bad-doctor": ["هذا الطبيب ليس في العيادة", "This doctor isn't in the clinic"],
    "name-required": ["اسم المريض مطلوب", "Patient name is required"],
    "too-many-invites": ["لديك دعوات مفتوحة كثيرة. ألغِ بعضها أولاً", "Too many open invites. Revoke some first"],
  };
  const hit = m[message];
  if (hit) return ar ? hit[0] : hit[1];
  return ar ? "تعذر تنفيذ العملية. تحقق من الاتصال وحاول مجدداً" : "That didn't work. Check your connection and retry";
}

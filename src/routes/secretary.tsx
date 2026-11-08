import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { ref, uploadBytes } from "firebase/storage";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileImage,
  History,
  Inbox,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { JoinCodePanel } from "@/components/ClinicTeam";
import { auth, storage } from "@/integrations/firebase/client";
import { whatsappLink } from "@/lib/booking";
import {
  activityTime,
  BOOKING_REASONS,
  createSharedPatient,
  createStaffAppointment,
  getStaffContext,
  getStaffReport,
  joinClinicWithCode,
  listStaffBookings,
  listStaffMaterials,
  MATERIAL_STATUSES,
  PENDING_STAFF_CODE,
  planStatusLabel,
  resolveStaffBooking,
  setStaffMaterial,
  sharedBalance,
  sharedUploadPath,
  staffReceiptBody,
  staffReceiptText,
  statusLabel,
  teamErrorMessage,
  toothLabel,
  updateStaffAppointment,
  updateStaffPatient,
  useClinicActivity,
  useStaffAppointments,
  useStaffMemberships,
  useStaffPatients,
  type StaffAppointment,
  type StaffBooking,
  type StaffMaterial,
  type StaffMember,
  type StaffPatient,
  type StaffPermission,
  type StaffReceipt,
  type StaffReport,
} from "@/lib/clinicTeam";
import { useI18n } from "@/lib/i18n";
import { formatAmountInput, formatMoney, localDay, parseAmountInput, type FeeCurrency } from "@/lib/patientsStore";
import { printHtml, receiptHtml } from "@/lib/print";
import { useUserRole } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { Field, Sheet, inputCls } from "./clinic.materials";

export const Route = createFileRoute("/secretary")({
  head: () => ({ meta: [{ title: "مساحة السكرتارية | Dent Hub" }, { name: "robots", content: "noindex" }] }),
  component: SecretaryPage,
});

type Tab = "appointments" | "bookings" | "patients" | "materials" | "reports" | "activity";
type Common = { m: StaffMember; ar: boolean };

const STATUS_STYLE: Record<StaffAppointment["status"], string> = {
  confirmed: "bg-blue-50 text-blue-700",
  waiting: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-soft", className)}>{children}</div>
);

const Empty = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center">
    <Icon className="mx-auto mb-2 size-8 text-muted-foreground/50" />
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

const Spinner = () => <Loader2 className="mx-auto my-10 size-5 animate-spin text-primary" />;

function ErrorLine({ text }: { text: string }) {
  return text ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{text}</p> : null;
}

function SecretaryPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user, role, loading } = useUserRole();
  const navigate = useNavigate();
  const memberships = useStaffMemberships(user?.uid);
  const [clinicKey, setClinicKey] = useState("");
  const [tab, setTab] = useState<Tab | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [joining, setJoining] = useState(false);

  // Another account type doesn't belong here.
  useEffect(() => {
    if (!loading && role && role.accountType !== "secretary") navigate({ to: "/", replace: true });
  }, [loading, role, navigate]);

  // The invite they signed up from, answered as soon as their email is verified.
  useEffect(() => {
    const code = localStorage.getItem(PENDING_STAFF_CODE);
    if (!user?.emailVerified || !code) return;
    setJoining(true);
    joinClinicWithCode(code)
      .catch((e) => console.warn("Invite not accepted:", e))
      .finally(() => {
        localStorage.removeItem(PENDING_STAFF_CODE);
        setJoining(false);
      });
  }, [user?.emailVerified]);

  const m = memberships.find((x) => x.id === clinicKey) ?? memberships[0];
  const p = m?.permissions;

  const tabs = useMemo(() => {
    const all: { id: Tab; ar: string; en: string; icon: React.ElementType; needs?: StaffPermission }[] = [
      { id: "appointments", ar: "المواعيد", en: "Appointments", icon: CalendarDays, needs: "appointments" },
      { id: "bookings", ar: "طلبات الحجز", en: "Requests", icon: Inbox, needs: "bookings" },
      { id: "patients", ar: "المرضى", en: "Patients", icon: Users, needs: "patients" },
      { id: "materials", ar: "المواد", en: "Materials", icon: Boxes, needs: "materials" },
      { id: "reports", ar: "التقارير", en: "Reports", icon: BarChart3, needs: "reports" },
      { id: "activity", ar: "نشاطي", en: "My activity", icon: History },
    ];
    return all.filter((t) => !t.needs || p?.[t.needs]);
  }, [p]);
  const current = tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id;

  const refreshPending = useCallback(() => {
    if (!m || !m.permissions.bookings) return setPendingCount(0);
    listStaffBookings(m)
      .then((r) => setPendingCount(r.requests.length))
      .catch(() => setPendingCount(0));
  }, [m]);
  useEffect(refreshPending, [refreshPending]);

  return (
    <MobileShell wide hideBottomNav>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-base font-extrabold text-primary-foreground">
            {(m?.clinicName || role?.name || "?").trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            {memberships.length > 1 ? (
              <select
                value={m?.id}
                onChange={(e) => {
                  setClinicKey(e.target.value);
                  setTab(null);
                }}
                aria-label={ar ? "العيادة" : "Clinic"}
                className="block max-w-full truncate bg-transparent font-display text-sm font-extrabold focus:outline-none"
              >
                {memberships.map((x) => (
                  <option key={x.id} value={x.id}>{x.clinicName}</option>
                ))}
              </select>
            ) : (
              <p className="truncate font-display text-sm font-extrabold">{m?.clinicName ?? (ar ? "مساحة السكرتارية" : "Secretary workspace")}</p>
            )}
            <p className="truncate text-[11px] text-muted-foreground">
              {role?.name}{m ? ` · ${ar ? "عيادة" : "Clinic of"} ${m.ownerName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut(auth).then(() => navigate({ to: "/auth", replace: true }))}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-[11px] font-bold text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">{ar ? "تسجيل الخروج" : "Sign out"}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-3 md:grid md:grid-cols-[210px_minmax(0,1fr)] md:gap-5 md:px-4 md:pt-5">
        {m && (
          <nav className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] md:sticky md:top-20 md:mb-0 md:flex-col md:self-start md:overflow-visible" aria-label={ar ? "الأقسام" : "Sections"}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={current === t.id ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition md:w-full",
                  current === t.id ? "bg-primary text-primary-foreground shadow-card" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-4" />
                <span className="flex-1 text-start">{ar ? t.ar : t.en}</span>
                {t.id === "bookings" && pendingCount > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[10px] font-extrabold", current === t.id ? "bg-white/25" : "bg-rose-500 text-white")}>{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
        )}

        <main className={cn("min-w-0 space-y-3", !m && "md:col-span-2")}>
          {!m ? (
            loading || joining ? (
              <Spinner />
            ) : (
              <NoClinic ar={ar} />
            )
          ) : current === "appointments" ? (
            <AppointmentsTab key={m.id} m={m} ar={ar} uid={user?.uid} />
          ) : current === "bookings" ? (
            <BookingsTab key={m.id} m={m} ar={ar} onChanged={refreshPending} />
          ) : current === "patients" ? (
            <PatientsTab key={m.id} m={m} ar={ar} uid={user?.uid} />
          ) : current === "materials" ? (
            <MaterialsTab key={m.id} m={m} ar={ar} />
          ) : current === "reports" ? (
            <ReportsTab key={m.id} m={m} ar={ar} />
          ) : (
            <ActivityTab key={m.id} m={m} ar={ar} uid={user?.uid} />
          )}
          {m && memberships.length > 0 && current === "activity" && (
            <Card>
              <p className="mb-2 text-xs font-extrabold">{ar ? "الانضمام إلى عيادة أخرى" : "Join another clinic"}</p>
              <JoinCodePanel ar={ar} />
            </Card>
          )}
        </main>
      </div>
    </MobileShell>
  );
}

function NoClinic({ ar }: { ar: boolean }) {
  return (
    <Card className="mx-auto max-w-md space-y-3">
      <div className="text-center">
        <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardList className="size-6" />
        </span>
        <p className="font-display text-sm font-extrabold">{ar ? "لم تنضم إلى عيادة بعد" : "You haven't joined a clinic yet"}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{ar ? "أدخل رمز الدعوة الذي وصلك من الطبيب." : "Enter the invite code the doctor sent you."}</p>
      </div>
      <JoinCodePanel ar={ar} />
    </Card>
  );
}

/* ── Appointments ─────────────────────────────────────────────────── */

const shiftDay = (day: string, by: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + by);
  return localDay(d);
};

function AppointmentsTab({ m, ar, uid }: Common & { uid?: string }) {
  const { list, loading } = useStaffAppointments(uid, m.ownerId, m.clinicId);
  const [day, setDay] = useState(localDay());
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<StaffAppointment | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [doctors, setDoctors] = useState<{ uid: string; name: string }[]>([]);

  useEffect(() => {
    getStaffContext(m).then((r) => setDoctors(r.doctors)).catch(() => undefined);
  }, [m]);

  const today = localDay();
  const items = useMemo(
    () => list.filter((a) => a.date === day).sort((a, b) => a.time.localeCompare(b.time)),
    [list, day],
  );
  const counts = useMemo(() => {
    const live = items.filter((a) => a.status !== "cancelled");
    return { all: live.length, waiting: items.filter((a) => a.status === "waiting").length, done: items.filter((a) => a.status === "completed").length };
  }, [items]);

  const setStatus = async (a: StaffAppointment, status: StaffAppointment["status"]) => {
    setBusyId(a.id);
    setError("");
    try {
      await updateStaffAppointment(m, a.appointmentId, { status });
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <button type="button" onClick={() => setDay(shiftDay(day, -1))} aria-label={ar ? "اليوم السابق" : "Previous day"} className="flex size-9 items-center justify-center rounded-xl border border-border">
          {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} dir="ltr" className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-card px-2 text-xs font-bold sm:flex-none" />
        <button type="button" onClick={() => setDay(shiftDay(day, 1))} aria-label={ar ? "اليوم التالي" : "Next day"} className="flex size-9 items-center justify-center rounded-xl border border-border">
          {ar ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {day !== today && (
          <button type="button" onClick={() => setDay(today)} className="h-9 rounded-xl bg-muted px-3 text-[11px] font-bold">{ar ? "اليوم" : "Today"}</button>
        )}
        <button type="button" onClick={() => setAdding(true)} className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground">
          <Plus className="size-4" />
          {ar ? "موعد جديد" : "New appointment"}
        </button>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          [ar ? "مواعيد" : "Booked", counts.all, "text-primary"],
          [ar ? "بالانتظار" : "Waiting", counts.waiting, "text-amber-600"],
          [ar ? "مكتملة" : "Done", counts.done, "text-emerald-600"],
        ].map(([label, n, color]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <p className={cn("font-display text-xl font-extrabold", String(color))}>{n}</p>
            <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <ErrorLine text={error} />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty icon={CalendarDays} text={ar ? "لا مواعيد في هذا اليوم" : "No appointments on this day"} />
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className={cn("rounded-2xl border border-border bg-card p-3 shadow-soft", a.status === "cancelled" && "opacity-60")}>
              <div className="flex items-start gap-3">
                <span className="w-14 shrink-0 rounded-xl bg-primary/10 py-2 text-center font-display text-sm font-extrabold text-primary" dir="ltr">{a.time}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-extrabold">{a.patientName}</p>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_STYLE[a.status])}>{statusLabel(a.status, ar)}</span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{[a.treatment || a.appointmentType, a.doctor].filter(Boolean).join(" · ")}</p>
                  {a.notes && <p className="mt-0.5 text-[11px] text-muted-foreground">{a.notes}</p>}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {a.phone && (
                  <>
                    <a href={`tel:${a.phone}`} aria-label={ar ? "اتصال" : "Call"} className="flex size-8 items-center justify-center rounded-lg bg-muted text-primary"><Phone className="size-3.5" /></a>
                    <a href={whatsappLink(a.phone, "")} target="_blank" rel="noreferrer" aria-label={ar ? "واتساب" : "WhatsApp"} className="flex size-8 items-center justify-center rounded-lg bg-muted text-emerald-700"><MessageCircle className="size-3.5" /></a>
                  </>
                )}
                <span className="flex-1" />
                {busyId === a.id ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  a.status !== "cancelled" && (
                    <>
                      {a.status === "confirmed" && <SmallButton onClick={() => void setStatus(a, "waiting")}>{ar ? "وصل المريض" : "Arrived"}</SmallButton>}
                      {a.status !== "completed" && <SmallButton onClick={() => void setStatus(a, "completed")}>{ar ? "اكتمل" : "Done"}</SmallButton>}
                      <SmallButton onClick={() => setMoving(a)}>{ar ? "نقل" : "Move"}</SmallButton>
                      {a.status !== "completed" && (
                        <SmallButton
                          danger
                          onClick={() => {
                            if (window.confirm(ar ? `إلغاء موعد ${a.patientName}؟` : `Cancel ${a.patientName}'s appointment?`)) void setStatus(a, "cancelled");
                          }}
                        >
                          {ar ? "إلغاء" : "Cancel"}
                        </SmallButton>
                      )}
                    </>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && <AppointmentSheet m={m} ar={ar} day={day} doctors={doctors} onClose={() => setAdding(false)} />}
      {moving && <MoveSheet m={m} ar={ar} a={moving} onClose={() => setMoving(null)} />}
    </>
  );
}

function SmallButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-8 rounded-lg border px-2.5 text-[11px] font-bold", danger ? "border-rose-200 text-rose-600" : "border-border text-foreground")}>
      {children}
    </button>
  );
}

function AppointmentSheet({ m, ar, day, doctors, onClose }: Common & { day: string; doctors: { uid: string; name: string }[]; onClose: () => void }) {
  const [f, setF] = useState({ patientName: "", phone: "", date: day, time: "10:00", treatment: "", notes: "", doctorUid: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createStaffAppointment(m, f);
      onClose();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
      setBusy(false);
    }
  };
  return (
    <Sheet title={ar ? "موعد جديد" : "New appointment"} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Field label={ar ? "اسم المريض" : "Patient name"}>
          <input required autoFocus value={f.patientName} onChange={set("patientName")} className={inputCls} />
        </Field>
        <Field label={ar ? "الهاتف" : "Phone"}>
          <input value={f.phone} onChange={set("phone")} inputMode="tel" dir="ltr" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "التاريخ" : "Date"}>
            <input required type="date" value={f.date} onChange={set("date")} dir="ltr" className={inputCls} />
          </Field>
          <Field label={ar ? "الوقت" : "Time"}>
            <input required type="time" value={f.time} onChange={set("time")} dir="ltr" className={inputCls} />
          </Field>
        </div>
        {doctors.length > 1 && (
          <Field label={ar ? "الطبيب" : "Doctor"}>
            <select value={f.doctorUid} onChange={set("doctorUid")} className={inputCls}>
              {doctors.map((d) => (
                <option key={d.uid} value={d.uid}>{d.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={ar ? "العلاج" : "Treatment"}>
          <input value={f.treatment} onChange={set("treatment")} className={inputCls} />
        </Field>
        <Field label={ar ? "ملاحظة" : "Note"}>
          <input value={f.notes} onChange={set("notes")} className={inputCls} />
        </Field>
        <ErrorLine text={error} />
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-display text-sm font-extrabold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "حفظ الموعد" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}

function MoveSheet({ m, ar, a, onClose }: Common & { a: StaffAppointment; onClose: () => void }) {
  const [date, setDate] = useState(a.date);
  const [time, setTime] = useState(a.time);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await updateStaffAppointment(m, a.appointmentId, { date, time });
      onClose();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
      setBusy(false);
    }
  };
  return (
    <Sheet title={ar ? `نقل موعد ${a.patientName}` : `Move ${a.patientName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "التاريخ" : "Date"}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className={inputCls} />
          </Field>
          <Field label={ar ? "الوقت" : "Time"}>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" className={inputCls} />
          </Field>
        </div>
        <ErrorLine text={error} />
        <button type="button" disabled={busy || !date || !time} onClick={() => void save()} className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-display text-sm font-extrabold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "حفظ" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}

/* ── Booking requests ─────────────────────────────────────────────── */

function BookingsTab({ m, ar, onChanged }: Common & { onChanged: () => void }) {
  const [list, setList] = useState<StaffBooking[] | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    listStaffBookings(m)
      .then((r) => setList(r.requests))
      .catch((err) => {
        setList([]);
        setError(teamErrorMessage(err, ar));
      });
  }, [m, ar]);
  useEffect(load, [load]);

  const resolve = async (r: StaffBooking, accept: boolean) => {
    let reason = "";
    if (!accept) {
      const answer = window.prompt(ar ? "سبب الرفض (اختياري، يصل إلى المريض)" : "Reason (optional, sent to the patient)", "");
      if (answer === null) return;
      reason = answer;
    }
    setBusyId(r.id);
    setError("");
    try {
      await resolveStaffBooking(m, r.id, accept, reason);
      setList((cur) => (cur ?? []).filter((x) => x.id !== r.id));
      onChanged();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusyId("");
    }
  };

  if (!list) return <Spinner />;
  return (
    <>
      <ErrorLine text={error} />
      {list.length === 0 ? (
        <Empty icon={Inbox} text={ar ? "لا طلبات حجز جديدة" : "No new booking requests"} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {list.map((r) => (
            <li key={r.id} className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{r.patientName}</p>
                  <p className="text-[11px] text-muted-foreground">{BOOKING_REASONS[r.reason]?.[ar ? 0 : 1] ?? r.reason}</p>
                </div>
                <span className="shrink-0 rounded-xl bg-primary/10 px-2.5 py-1 text-center text-[11px] font-bold text-primary" dir="ltr">{r.date}<br />{r.time}</span>
              </div>
              {r.note && <p className="rounded-xl bg-muted/60 p-2 text-[11px]">{r.note}</p>}
              <div className="flex gap-1.5">
                <a href={`tel:${r.phone}`} aria-label={ar ? "اتصال" : "Call"} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"><Phone className="size-4" /></a>
                <button type="button" disabled={busyId === r.id} onClick={() => void resolve(r, true)} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60">
                  {busyId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {ar ? "قبول" : "Accept"}
                </button>
                <button type="button" disabled={busyId === r.id} onClick={() => void resolve(r, false)} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-border px-4 text-xs font-bold text-muted-foreground disabled:opacity-60">
                  <X className="size-4" />
                  {ar ? "رفض" : "Decline"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ── Patients ─────────────────────────────────────────────────────── */

function PatientsTab({ m, ar, uid }: Common & { uid?: string }) {
  const { list, loading } = useStaffPatients(uid, m.ownerId, m.clinicId);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState("");
  const [adding, setAdding] = useState(false);
  const open = list.find((p) => p.id === openId);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term) || (p.phone || "").includes(term) || String(p.fileNo).toLowerCase().includes(term));
  }, [list, q]);

  return (
    <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-4">
      <div className={cn("space-y-2", open && "hidden lg:block")}>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "الاسم أو الهاتف أو رقم الملف" : "Name, phone or file #"} className="h-11 w-full rounded-xl border border-border bg-card pe-3 ps-9 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <button type="button" onClick={() => setAdding(true)} aria-label={ar ? "مريض جديد" : "New patient"} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plus className="size-5" />
          </button>
        </div>
        {loading ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <Empty icon={Users} text={q ? (ar ? "لا نتائج" : "No results") : ar ? "لا يوجد مرضى بعد" : "No patients yet"} />
        ) : (
          <ul className="space-y-1.5">
            {shown.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpenId(p.id)} className={cn("flex w-full items-center gap-2.5 rounded-xl border bg-card p-2.5 text-start shadow-soft", openId === p.id ? "border-primary" : "border-border")}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-extrabold text-sky-700">{p.name.trim().charAt(0) || "?"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{p.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground" dir="ltr">{[p.fileNo, p.phone].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cn("space-y-3", !open && "hidden lg:block")}>
        {open ? (
          <PatientDetail key={open.id} m={m} ar={ar} p={open} uid={uid} onBack={() => setOpenId("")} />
        ) : (
          <Empty icon={Users} text={ar ? "اختر مريضاً لعرض ملفه" : "Choose a patient to open their file"} />
        )}
      </div>
      {adding && <PatientSheet m={m} ar={ar} onClose={() => setAdding(false)} />}
    </div>
  );
}

function PatientSheet({ m, ar, p, onClose }: Common & { p?: StaffPatient; onClose: () => void }) {
  const [f, setF] = useState({ name: p?.name ?? "", phone: p?.phone ?? "", age: String(p?.age ?? ""), gender: p?.gender === "female" ? "female" : "male" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (p) await updateStaffPatient(p, "setBasics", f);
      else await createSharedPatient(m.ownerId, m.clinicId, f);
      onClose();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
      setBusy(false);
    }
  };
  return (
    <Sheet title={p ? (ar ? "تعديل البيانات" : "Edit details") : ar ? "مريض جديد" : "New patient"} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Field label={ar ? "الاسم" : "Name"}>
          <input required autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
        </Field>
        <Field label={ar ? "الهاتف" : "Phone"}>
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" dir="ltr" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "العمر" : "Age"}>
            <input value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/\D/g, "") })} inputMode="numeric" dir="ltr" className={inputCls} />
          </Field>
          <Field label={ar ? "الجنس" : "Gender"}>
            <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className={inputCls}>
              <option value="male">{ar ? "ذكر" : "Male"}</option>
              <option value="female">{ar ? "أنثى" : "Female"}</option>
            </select>
          </Field>
        </div>
        <ErrorLine text={error} />
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-display text-sm font-extrabold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "حفظ" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}

function PatientDetail({ m, ar, p, uid, onBack }: Common & { p: StaffPatient; uid?: string; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-primary lg:hidden">
        <ArrowRight className="size-4 ltr:rotate-180" />
        {ar ? "كل المرضى" : "All patients"}
      </button>
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-extrabold">{p.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {[p.fileNo, p.age ? `${p.age} ${ar ? "سنة" : "y"}` : "", p.gender === "female" ? (ar ? "أنثى" : "Female") : ar ? "ذكر" : "Male", p.lastVisit && `${ar ? "آخر زيارة" : "Last visit"} ${p.lastVisit}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-bold">
            <Pencil className="size-3" />
            {ar ? "تعديل" : "Edit"}
          </button>
        </div>
        {p.phone && (
          <div className="flex gap-3">
            <a href={`tel:${p.phone}`} dir="ltr" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><Phone className="size-3" />{p.phone}</a>
            <a href={whatsappLink(p.phone, "")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><MessageCircle className="size-3" />{ar ? "واتساب" : "WhatsApp"}</a>
          </div>
        )}
      </Card>
      {(m.permissions.payments || p.finance) && <FinanceCard m={m} ar={ar} p={p} />}
      {m.permissions.files && <FilesCard ar={ar} p={p} uid={uid} />}
      {p.medical && <MedicalCard ar={ar} medical={p.medical} />}
      {editing && <PatientSheet m={m} ar={ar} p={p} onClose={() => setEditing(false)} />}
    </>
  );
}

function FinanceCard({ m, ar, p }: Common & { p: StaffPatient }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [cur, setCur] = useState<FeeCurrency>(() => (p.finance && p.finance.fees.USD > 0 && !p.finance.fees.IQD ? "USD" : "IQD"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<StaffReceipt | null>(null);
  const f = p.finance;
  const used = f ? (["IQD", "USD"] as const).filter((c) => f.fees[c] > 0 || sharedBalance(f, c).paid > 0) : [];

  const record = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await updateStaffPatient(p, "addPayment", { amount: parseAmountInput(amount), currency: cur, note });
      setReceipt(r.receipt);
      setAmount("");
      setNote("");
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-2.5">
      <p className="text-xs font-extrabold">{ar ? "المالية" : "Finances"}</p>
      {f && used.length === 0 && <p className="text-[11px] text-muted-foreground">{ar ? "لا توجد مبالغ مسجلة" : "No amounts recorded"}</p>}
      {f && used.map((c) => {
        const b = sharedBalance(f, c);
        return (
          <div key={c} className="grid grid-cols-3 gap-1.5">
            {([[ar ? "الأتعاب" : "Fees", b.fees], [ar ? "المدفوع" : "Paid", b.paid], [ar ? "المتبقي" : "Remaining", b.remaining]] as const).map(([label, v]) => (
              <div key={label} className="rounded-xl bg-muted/60 p-2 text-center">
                <p className="text-xs font-extrabold">{formatMoney(v, c)}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        );
      })}
      {m.permissions.payments && (
        <div className="space-y-1.5 rounded-xl bg-muted/50 p-2.5">
          <div className="flex gap-1.5">
            {(["IQD", "USD"] as const).map((c) => (
              <button key={c} type="button" onClick={() => { setCur(c); setAmount((a) => formatAmountInput(a, c)); }} className={cn("h-10 rounded-xl border px-3 text-[11px] font-bold", cur === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
                {c === "IQD" ? "د.ع" : "$"}
              </button>
            ))}
            <input value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value, cur))} placeholder={ar ? "المبلغ" : "Amount"} inputMode="decimal" dir="ltr" className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-xs" />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "ملاحظة" : "Note"} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs" />
          <button type="button" disabled={busy || !parseAmountInput(amount)} onClick={() => void record()} className="flex h-10 w-full items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "تسجيل الدفعة وإصدار وصل" : "Record and issue receipt"}
          </button>
          <ErrorLine text={error} />
        </div>
      )}
      {receipt && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-extrabold text-emerald-900">
            {ar ? `سُجلت الدفعة ${formatMoney(receipt.amount, receipt.currency)} · وصل ${receipt.receiptNo}` : `Recorded ${formatMoney(receipt.amount, receipt.currency)} · receipt ${receipt.receiptNo}`}
          </p>
          <div className="flex gap-1.5">
            <a href={whatsappLink(p.phone || "", staffReceiptText(receipt, m.clinicName, ar))} target="_blank" rel="noreferrer" className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[11px] font-bold text-white">
              <MessageCircle className="size-3.5" />
              {ar ? "إرسال واتساب" : "WhatsApp"}
            </a>
            <button type="button" onClick={() => printHtml(receiptHtml(ar ? "وصل دفع" : "Receipt", staffReceiptBody(receipt, m.clinicName, ar), ar))} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11px] font-bold">
              <Printer className="size-3.5" />
              {ar ? "طباعة" : "Print"}
            </button>
          </div>
        </div>
      )}
      {f && f.payments.length > 0 && (
        <ul className="space-y-1">
          {[...f.payments].reverse().map((x) => (
            <li key={x.id} className="rounded-xl border border-border px-3 py-2 text-[11px]">
              <span className="font-bold">{formatMoney(x.amount, x.currency)}</span>
              <span className="text-muted-foreground"> · {[x.date, x.receiptNo, x.note].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FilesCard({ ar, p, uid }: { ar: boolean; p: StaffPatient; uid?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [tag, setTag] = useState<"xray" | "">("xray");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file: File | undefined) => {
    if (!file || !uid) return;
    setBusy(true);
    setError("");
    try {
      const uploadPath = sharedUploadPath(uid, file.name);
      await uploadBytes(ref(storage, uploadPath), file, { contentType: file.type });
      await updateStaffPatient(p, "addFile", { uploadPath, name: file.name, type: file.type, tag });
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-2">
      <p className="text-xs font-extrabold">{ar ? "الأشعة والملفات" : "X-rays and files"}</p>
      <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex gap-1.5">
        {([["xray", ar ? "أشعة" : "X-ray"], ["", ar ? "صورة" : "Photo"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setTag(v)} className={cn("h-9 rounded-xl border px-3 text-[11px] font-bold", tag === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
            {label}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11px] font-bold">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {ar ? "رفع ملف" : "Upload"}
        </button>
      </div>
      <ErrorLine text={error} />
      {(p.files ?? []).length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {(p.files ?? []).map((f) => (
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-border bg-muted">
              {f.type.startsWith("image/") ? (
                <img src={f.url} alt={f.name} className="aspect-square w-full object-cover" />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center"><FileImage className="size-6 text-muted-foreground" /></span>
              )}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

function MedicalCard({ ar, medical }: { ar: boolean; medical: NonNullable<StaffPatient["medical"]> }) {
  const names: Record<string, string> = { diabetes: "السكري", hypertension: "ضغط الدم", heart: "أمراض القلب", allergy: "الحساسية", bleeding: "النزف" };
  const conditions = Object.keys(medical.history || {}).filter((k) => medical.history[k]);
  const alerts = [conditions.map((k) => (ar ? names[k] ?? k : k)).join("، "), medical.allergies && `${ar ? "حساسية" : "Allergy"}: ${medical.allergies}`, medical.meds && `${ar ? "أدوية" : "Meds"}: ${medical.meds}`].filter(Boolean).join(" · ");
  const teeth = Object.keys(medical.teeth || {}).sort((a, b) => Number(a) - Number(b));
  return (
    <Card className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold">{ar ? "الملف الطبي" : "Medical file"}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{ar ? "للاطلاع فقط" : "View only"}</span>
      </div>
      {alerts && <p className="rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-900">{alerts}</p>}
      {medical.complaint && <p className="text-[11px]"><b>{ar ? "الشكوى: " : "Complaint: "}</b>{medical.complaint}</p>}
      {medical.doctorNote && <p className="text-[11px]"><b>{ar ? "ملاحظات الطبيب: " : "Doctor's notes: "}</b>{medical.doctorNote}</p>}
      {teeth.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teeth.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold">{t} — {toothLabel(medical.teeth[t], ar)}</span>
          ))}
        </div>
      )}
      {medical.plan.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "خطة العلاج" : "Treatment plan"}</p>
          {medical.plan.map((s) => (
            <p key={s.id} className="flex justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[11px]">
              <span className="truncate font-semibold">{[s.title, s.tooth].filter(Boolean).join(" · ")}</span>
              <span className="shrink-0 text-muted-foreground">{planStatusLabel(s.status, ar)}</span>
            </p>
          ))}
        </div>
      )}
      {medical.visits.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "الزيارات" : "Visits"}</p>
          {medical.visits.map((v) => (
            <p key={v.id} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold">{v.procedure}</span>
              <span className="text-muted-foreground"> · {[v.date, v.note].filter(Boolean).join(" · ")}</span>
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Materials, reports, activity ─────────────────────────────────── */

const MATERIAL_STYLE: Record<StaffMaterial["status"], string> = {
  available: "border-emerald-600 bg-emerald-600 text-white",
  half: "border-sky-600 bg-sky-600 text-white",
  low: "border-amber-500 bg-amber-500 text-white",
  out: "border-rose-600 bg-rose-600 text-white",
};

function MaterialsTab({ m, ar }: Common) {
  const [items, setItems] = useState<StaffMaterial[] | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    listStaffMaterials(m)
      .then((r) => setItems(r.items))
      .catch((err) => {
        setItems([]);
        setError(teamErrorMessage(err, ar));
      });
  }, [m, ar]);
  const update = async (id: string, status: StaffMaterial["status"]) => {
    setBusyId(id);
    setError("");
    try {
      await setStaffMaterial(m, id, status);
      setItems((cur) => (cur ?? []).map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusyId("");
    }
  };
  if (!items) return <Spinner />;
  return (
    <>
      <ErrorLine text={error} />
      {items.length === 0 ? (
        <Empty icon={Boxes} text={ar ? "لا توجد مواد مسجلة" : "No materials recorded"} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {items.map((x) => (
            <li key={x.id} className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold">{x.name}</p>
                {busyId === x.id ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <span className="shrink-0 text-[10px] text-muted-foreground">{ar ? `الكمية ${x.qty}` : `Qty ${x.qty}`}</span>}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {MATERIAL_STATUSES.map((s) => (
                  <button key={s.id} type="button" disabled={busyId === x.id || x.status === s.id} onClick={() => void update(x.id, s.id)} className={cn("h-8 rounded-lg border text-[10px] font-bold", x.status === s.id ? MATERIAL_STYLE[s.id] : "border-border bg-card text-muted-foreground")}>
                    {ar ? s.ar : s.en}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ReportsTab({ m, ar }: Common) {
  const [r, setR] = useState<StaffReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getStaffReport(m).then(setR).catch((err) => setError(teamErrorMessage(err, ar)));
  }, [m, ar]);
  if (error) return <ErrorLine text={error} />;
  if (!r) return <Spinner />;
  const stats = [
    [ar ? "مواعيد اليوم" : "Today", r.appointmentsToday],
    [ar ? "مواعيد الشهر" : "This month", r.appointmentsThisMonth],
    [ar ? "المرضى" : "Patients", r.patientCount],
  ] as const;
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <p className="font-display text-xl font-extrabold text-primary">{n}</p>
            <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {(["IQD", "USD"] as const).map((c) => (
          <Card key={c}>
            <p className="mb-2 text-xs font-extrabold">{c === "IQD" ? (ar ? "الدخل بالدينار" : "Income in IQD") : ar ? "الدخل بالدولار" : "Income in USD"}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([[ar ? "هذا الشهر" : "This month", r.totals[c].month], [ar ? "الإجمالي" : "All time", r.totals[c].all]] as const).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-muted/60 p-2.5 text-center">
                  <p className="text-sm font-extrabold">{formatMoney(v, c)}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function ActivityTab({ m, ar, uid }: Common & { uid?: string }) {
  const list = useClinicActivity("memberId", uid, m.clinicId).filter((a) => a.ownerId === m.ownerId);
  if (list.length === 0) return <Empty icon={History} text={ar ? "لم تسجل أي عمل بعد" : "Nothing recorded yet"} />;
  return (
    <ul className="space-y-1.5">
      {list.map((a) => (
        <li key={a.id} className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft">
          {a.message}
          <span className="block text-[10px] text-muted-foreground">{activityTime(a.at, ar)}</span>
        </li>
      ))}
    </ul>
  );
}

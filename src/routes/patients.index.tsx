import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  addPatient,
  updatePatient,
  usePatients,
  syncPatientsNow,
  usePatientSyncStatus,
  EMPTY_HISTORY,
  type MedicalHistory,
  type Patient,
  type PatientStatus,
} from "@/lib/patientsStore";
import { setClinicsStoreUser } from "@/lib/clinicsStore";
import { useSession } from "@/lib/useAuth";
import { setActiveClinic, useClinics } from "@/lib/clinicsStore";
import { usePatientCountsByClinic } from "@/lib/patientClinicCounts";
import { ArrowRight, ArrowLeft, Phone, Plus, Search, Users, X, CalendarClock, ChevronDown, CloudOff, Loader2, MessageCircle } from "lucide-react";
import { useAppointments, type Appointment } from "@/lib/appointmentsStore";
import { avatarColor, initial, nextVisits, patientsCount, shortDate } from "@/lib/patientList";
import { whatsappLink } from "@/lib/booking";
import { toast } from "sonner";

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "سجل المرضى | Dent Hub" },
      { name: "description", content: "إدارة ملفات ومعلومات المرضى، الحالة العلاجية، والزيارات داخل Dent Hub." },
      { property: "og:title", content: "سجل المرضى | Dent Hub" },
      { property: "og:description", content: "إدارة ملفات ومعلومات المرضى داخل Dent Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientsPage,
});

export const STATUS_META: Record<PatientStatus, { ar: string; en: string; cls: string }> = {
  new: { ar: "مريض جديد", en: "New", cls: "bg-blue-100 text-blue-700" },
  in_treatment: { ar: "علاج قيد الإنجاز", en: "In treatment", cls: "bg-amber-100 text-amber-700" },
  completed: { ar: "مكتمل", en: "Completed", cls: "bg-emerald-100 text-emerald-700" },
};

export const HISTORY_LABELS: Array<{ key: keyof MedicalHistory; ar: string; en: string }> = [
  { key: "diabetes", ar: "السكري", en: "Diabetes" },
  { key: "hypertension", ar: "ضغط الدم", en: "Hypertension" },
  { key: "heart", ar: "أمراض القلب", en: "Heart conditions" },
  { key: "allergy", ar: "حساسية أدوية", en: "Drug allergies" },
  { key: "bleeding", ar: "ميل للنزف", en: "Bleeding tendency" },
];

function PatientsPage() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();

  useEffect(() => {
    // Defensive re-init for landing directly on this route (e.g. a reload)
    // without passing through the home route's effect first — must resolve
    // the full clinic context (list + active clinic), not just re-key this
    // one store, or it could point at the wrong clinic's data.
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  const patients = usePatients();
  const appointments = useAppointments();
  const upcoming = useMemo(() => nextVisits(patients, appointments), [patients, appointments]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PatientStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return patients.filter((p) => {
      const okQ = !s || [p.name, p.phone, p.fileNo].some((v) => v.toLowerCase().includes(s));
      return okQ && (status === "all" || p.status === status);
    });
  }, [patients, q, status]);
  const counts = useMemo(() => {
    const c: Record<PatientStatus | "all", number> = { all: patients.length, new: 0, in_treatment: 0, completed: 0 };
    for (const p of patients) c[p.status] += 1;
    return c;
  }, [patients]);

  return (
    <MobileShell wide>
      <header className="px-3 pt-4 pb-3 bg-gradient-to-b from-[oklch(0.97_0.02_240)] to-transparent md:px-6 md:pt-8 md:pb-5 lg:px-8 lg:max-w-6xl lg:mx-auto">
        <div className="flex items-center gap-2.5">
          <Link to="/clinic" className="size-9 rounded-full bg-white border border-[#DCE7F5] flex items-center justify-center text-[#0F2747] shadow-sm" aria-label={ar ? "رجوع" : "Back"}>
            <Back className="size-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-extrabold text-lg leading-tight text-[#0F2747] md:text-3xl">{ar ? "المرضى" : "Patients"}</h1>
            <p className="text-xs font-bold text-[#5B6B82] md:mt-1 md:text-sm">{patientsCount(patients.length, ar)}</p>
          </div>
          {/* md:+ : the add button sits with the title; phones get a floating one. */}
          <button
            onClick={() => setOpen(true)}
            className="hidden h-11 items-center gap-2 rounded-xl bg-[#1D6FE8] px-5 font-display text-sm font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(29,78,216,0.6)] transition hover:brightness-110 md:flex"
          >
            <Plus className="size-4" strokeWidth={3} />
            {ar ? "مريض جديد" : "New patient"}
          </button>
        </div>

      <SyncNotice ar={ar} />
      <OtherClinicsNotice ar={ar} uid={user?.uid} />

        <div className="md:mt-6 md:flex md:items-center md:gap-4">
        <div className="mt-3 relative md:mt-0 md:flex-1 md:max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder={ar ? "ابحث بالاسم أو الهاتف أو رقم الملف…" : "Search name, phone or file ID…"}
            className="w-full h-12 rounded-2xl bg-white border border-[#CFDDF0] ps-4 pe-11 text-sm text-[#0F2747] placeholder:text-[#8A9AB0] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]/25 focus:border-[#1D6FE8] shadow-[0_4px_14px_-8px_rgba(30,58,138,0.25)]"
          />
          <Search className="size-[18px] absolute top-1/2 -translate-y-1/2 end-4 text-[#1D6FE8] pointer-events-none" />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar md:mt-0 md:overflow-visible md:gap-2">
          {(["all", "in_treatment", "completed", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "h-8 ps-3 pe-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition inline-flex items-center gap-1.5",
                status === s ? "bg-[#1D6FE8] text-white border-[#1D6FE8]" : "bg-white text-[#5B6B82] border-[#DCE7F5] hover:border-[#1D6FE8]/40"
              )}
            >
              {s === "all" ? (ar ? "الكل" : "All") : ar ? STATUS_META[s].ar : STATUS_META[s].en}
              <span className={cn("min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center", status === s ? "bg-white/25 text-white" : "bg-[#EEF3FA] text-[#0F2747]")}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        </div>
      </header>

      <section className="px-3 pb-28 space-y-2 md:px-6 md:pb-12 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3 md:items-start lg:px-8 lg:max-w-6xl lg:mx-auto">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center md:col-span-full md:py-16">
            <Users className="size-8 mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold">{ar ? "لا يوجد مرضى بعد" : "No patients yet"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {ar ? "أضف أول مريض للبدء بإدارة الملفات" : "Add your first patient to get started"}
            </p>
          </div>
        ) : (
          list.map((p) => <PatientCard key={p.id} p={p} ar={ar} next={upcoming.get(p.id)} />)
        )}
      </section>

      {/* Phones: a floating add button, so it doesn't split the filters from their results. */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 end-4 z-30 flex h-14 items-center gap-2 rounded-full bg-[#1D6FE8] px-5 font-display text-sm font-extrabold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.7)] md:hidden"
        aria-label={ar ? "إضافة مريض جديد" : "Add new patient"}
      >
        <Plus className="size-5" strokeWidth={2.8} />
        {ar ? "مريض جديد" : "New patient"}
      </button>

      {open && <PatientModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

/**
 * One patient on a compact row: avatar, name and status, then the next visit
 * (or the last one), with call / WhatsApp buttons when there is a phone.
 * Empty fields are left out instead of showing a dash.
 */
function PatientCard({ p, ar, next }: { p: Patient; ar: boolean; next?: Appointment }) {
  const meta = STATUS_META[p.status];
  const av = avatarColor(p.name);
  const age = p.age ? `${p.age} ${ar ? "سنة" : "yrs"}` : "";
  const last = p.lastVisit ? `${ar ? "آخر زيارة" : "Last visit"} ${shortDate(p.lastVisit, ar)}` : "";
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <Link
      to="/patients/$patientId"
      params={{ patientId: p.id }}
      className="flex items-center gap-3 rounded-[18px] border border-[#DCE7F5] bg-white px-3 py-2.5 shadow-[0_4px_14px_-8px_rgba(30,58,138,0.25)] transition hover:border-[#1D6FE8]/40 hover:shadow-md md:px-4 md:py-3"
    >
      <span
        className="size-11 shrink-0 rounded-full font-display text-base font-extrabold flex items-center justify-center md:size-12"
        style={{ backgroundColor: av.bg, color: av.fg }}
      >
        {initial(p.name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-display font-extrabold text-[14px] text-[#0F2747] truncate">{p.name}</p>
          <div
            onPointerDown={stop}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn("shrink-0 inline-flex items-center rounded-full cursor-pointer", meta.cls)}
          >
            <select
              value={p.status}
              onChange={(e) => updatePatient(p.id, { status: e.target.value as PatientStatus })}
              title={ar ? "تغيير حالة العلاج من هنا" : "Change treatment status here"}
              className="bg-transparent text-[10px] font-bold appearance-none outline-none cursor-pointer ps-2 py-0.5 pe-0.5 text-center"
            >
              {(["new", "in_treatment", "completed"] as const).map((st) => (
                <option key={st} value={st}>
                  {ar ? STATUS_META[st].ar : STATUS_META[st].en}
                </option>
              ))}
            </select>
            <ChevronDown className="size-3 me-1.5 pointer-events-none opacity-70" />
          </div>
        </div>
        {next ? (
          <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] font-bold text-[#1D6FE8]">
            <CalendarClock className="size-3.5 shrink-0" />
            {ar ? "موعد قادم" : "Next visit"} {shortDate(next.date, ar)}
            {next.time && (
              <>
                {" · "}
                <bdi dir="ltr">{next.time}</bdi>
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 truncate text-[11.5px] text-[#5B6B82]">{[age, last].filter(Boolean).join(" · ")}</p>
        )}
        <p className="mt-0.5 truncate text-[10px] text-slate-400">{[next ? age : "", p.fileNo].filter(Boolean).join(" · ")}</p>
      </div>
      {p.phone && (
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={`tel:${p.phone}`}
            onClick={stop}
            className="flex size-9 items-center justify-center rounded-full bg-[#E8F1FE] text-[#1D6FE8] hover:bg-[#d8e8fe]"
            aria-label={ar ? "اتصال" : "Call"}
            title={p.phone}
          >
            <Phone className="size-4" />
          </a>
          <a
            href={whatsappLink(p.phone, "")}
            target="_blank"
            rel="noreferrer"
            onClick={stop}
            className="flex size-9 items-center justify-center rounded-full bg-[#E3F7EC] text-[#15803D] hover:bg-[#d2f2df]"
            aria-label="WhatsApp"
          >
            <MessageCircle className="size-4" />
          </a>
        </div>
      )}
    </Link>
  );
}

function PatientModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    age: "" as number | "",
    gender: "male" as "male" | "female",
    phone: "",
    complaint: "",
    status: "new" as PatientStatus,
    history: { ...EMPTY_HISTORY },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const p = addPatient(form);
    onClose();
    navigate({ to: "/patients/$patientId", params: { patientId: p.id } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[85vh] flex flex-col rounded-t-3xl bg-background"
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-base">{ar ? "إضافة مريض جديد" : "Add new patient"}</h2>
            <button type="button" onClick={onClose} className="size-8 rounded-full bg-card border border-border flex items-center justify-center"><X className="size-4" /></button>
          </div>
          <Field label={ar ? "الاسم الكامل" : "Full name"}><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={ar ? "العمر" : "Age"}><input type="number" min={0} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value === "" ? "" : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label={ar ? "الجنس" : "Gender"}><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as "male" | "female" })} className={inputCls}><option value="male">{ar ? "ذكر" : "Male"}</option><option value="female">{ar ? "أنثى" : "Female"}</option></select></Field>
          </div>
          <Field label={ar ? "رقم الهاتف" : "Phone number"}><input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
          <Field label={ar ? "الحالة" : "Status"}><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PatientStatus })} className={inputCls}>{(Object.keys(STATUS_META) as PatientStatus[]).map((s) => (<option key={s} value={s}>{ar ? STATUS_META[s].ar : STATUS_META[s].en}</option>))}</select></Field>
          <div><p className="text-[11px] font-bold text-muted-foreground mb-1.5">{ar ? "التاريخ المرضي" : "Medical history"}</p><div className="grid grid-cols-2 gap-1.5">{HISTORY_LABELS.map((h) => (<button type="button" key={h.key} onClick={() => setForm({ ...form, history: { ...form.history, [h.key]: !form.history[h.key] } })} className={cn("h-10 px-3 rounded-xl border text-[12px] font-semibold text-start transition", form.history[h.key] ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground")}>{ar ? h.ar : h.en}</button>))}</div></div>
          <Field label={ar ? "الشكوى الرئيسية / ملاحظات" : "Chief complaint / notes"}><textarea rows={3} value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} className={cn(inputCls, "h-auto py-2 resize-none")} /></Field>
        </div>

        <div className="p-4 border-t border-border bg-background shrink-0 mb-16">
          <button type="submit" className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card">
            {ar ? "حفظ المريض" : "Save patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Sync is automatic; this only appears when records did not reach the cloud
 *  (they are retried on their own — the button just does it now). */
function SyncNotice({ ar }: { ar: boolean }) {
  const { failed, error } = usePatientSyncStatus();
  const [busy, setBusy] = useState(false);
  if (!error) return null;
  const retry = async () => {
    setBusy(true);
    try {
      const r = await syncPatientsNow();
      if (r.failed === 0 && !r.error) toast.success(ar ? "تمت مزامنة المرضى" : "Patients synced");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 md:max-w-xl">
      <CloudOff className="size-[18px] shrink-0 text-amber-700" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-amber-800">
          {failed > 0
            ? ar
              ? `لم تُرفع بيانات ${failed} مريض إلى السحابة بعد`
              : `${failed} patient(s) not saved to the cloud yet`
            : ar
              ? "تعذر الاتصال بالسحابة لمزامنة المرضى"
              : "Could not reach the cloud to sync patients"}
        </p>
        <p className="mt-0.5 text-[11px] text-amber-700">{ar ? "ستُعاد المحاولة تلقائياً." : "Retrying automatically."}</p>
        <p className="mt-0.5 break-all text-[10px] text-amber-600" dir="ltr">{error}</p>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="h-8 shrink-0 rounded-xl bg-white px-2.5 text-[11px] font-bold text-amber-800 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "أعد الآن" : "Retry"}
      </button>
    </div>
  );
}

/** Patients belong to one clinic, and adding a clinic switches to it — an
 *  empty list then looked like the patients were gone. Points to the others. */
function OtherClinicsNotice({ ar, uid }: { ar: boolean; uid?: string }) {
  const { clinics, activeClinicId } = useClinics();
  const counts = usePatientCountsByClinic(clinics.length > 1 ? uid : undefined);
  const [hidden, setHidden] = useState(false);
  const others = clinics.filter((c) => c.id !== activeClinicId && (counts[c.id] ?? 0) > 0);
  if (hidden || others.length === 0) return null;
  return (
    <div className="mt-2.5 space-y-1.5 md:max-w-xl">
      {others.map((c) => (
        <div key={c.id} className="flex h-10 items-center gap-2 rounded-xl border border-[#DCE7F5] bg-white ps-3 pe-1.5 text-xs text-[#5B6B82]">
          <Users className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {ar ? `${patientsCount(counts[c.id], true)} في «${c.name}»` : `${patientsCount(counts[c.id], false)} in “${c.name}”`}
          </span>
          <button
            type="button"
            onClick={() => setActiveClinic(c.id)}
            className="h-7 shrink-0 rounded-lg bg-[#E8F1FE] px-2.5 text-[11px] font-extrabold text-[#1D6FE8] hover:bg-[#d8e8fe]"
          >
            {ar ? "عرض" : "Show"}
          </button>
          <button type="button" onClick={() => setHidden(true)} className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label={ar ? "إخفاء" : "Hide"}>
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

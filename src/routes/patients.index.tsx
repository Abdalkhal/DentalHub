import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  addPatient,
  usePatients,
  EMPTY_HISTORY,
  type MedicalHistory,
  type Patient,
  type PatientStatus,
} from "@/lib/patientsStore";
import { ArrowRight, ArrowLeft, Phone, Plus, Search, Users, X, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "سجل المرضى | DentalHub" },
      { name: "description", content: "إدارة ملفات ومعلومات المرضى، الحالة العلاجية، والزيارات داخل DentalHub." },
      { property: "og:title", content: "سجل المرضى | DentalHub" },
      { property: "og:description", content: "إدارة ملفات ومعلومات المرضى داخل DentalHub." },
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
  const patients = usePatients();
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

  return (
    <MobileShell>
      <header className="px-3 pt-4 pb-3 bg-gradient-to-b from-[oklch(0.97_0.02_240)] to-transparent">
        <div className="flex items-center gap-2">
          <Link to="/" className="size-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
            <Back className="size-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-extrabold text-lg leading-tight">{ar ? "سجل المرضى" : "Patient Records"}</h1>
            <p className="text-[11px] text-muted-foreground">{ar ? "إدارة ملفات ومعلومات المرضى" : "Manage patient files & info"}</p>
          </div>
          <span className="size-10 rounded-2xl bg-[oklch(0.93_0.06_250)] ring-1 ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)] flex items-center justify-center">
            <Users className="size-5" />
          </span>
        </div>

        <div className="mt-3 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder={ar ? "ابحث بالاسم أو الهاتف أو رقم الملف…" : "Search name, phone or file ID…"}
            className="w-full h-12 rounded-2xl bg-card border border-border ps-4 pe-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary shadow-sm"
          />
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 end-4 text-muted-foreground pointer-events-none" />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(["all", "in_treatment", "completed", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "h-8 px-3 rounded-full text-[11px] font-bold border whitespace-nowrap transition",
                status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
              )}
            >
              {s === "all" ? (ar ? "الكل" : "All") : ar ? STATUS_META[s].ar : STATUS_META[s].en}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2 hover:brightness-105 transition"
        >
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "إضافة مريض جديد" : "Add new patient"}
        </button>
      </header>

      <section className="px-3 pb-6 space-y-2.5">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Users className="size-8 mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold">{ar ? "لا يوجد مرضى بعد" : "No patients yet"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {ar ? "أضف أول مريض للبدء بإدارة الملفات" : "Add your first patient to get started"}
            </p>
          </div>
        ) : (
          list.map((p) => <PatientCard key={p.id} p={p} ar={ar} />)
        )}
      </section>

      {open && <PatientModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

function PatientCard({ p, ar }: { p: Patient; ar: boolean }) {
  const meta = STATUS_META[p.status];
  return (
    <Link
      to="/patients/$patientId"
      params={{ patientId: p.id }}
      className="block rounded-2xl bg-card border border-border p-3.5 shadow-soft hover:shadow-card transition"
    >
      <div className="flex items-start gap-3">
        <span className="size-11 shrink-0 rounded-2xl bg-[oklch(0.95_0.04_250)] text-[oklch(0.45_0.18_256)] font-display font-extrabold flex items-center justify-center">
          {p.name.trim().charAt(0) || "?"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-extrabold text-sm truncate">{p.name}</p>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", meta.cls)}>
              {ar ? meta.ar : meta.en}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {p.fileNo} · {p.age || "—"} {ar ? "سنة" : "yrs"}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="size-3" />{p.phone || "—"}</span>
            <span className="flex items-center gap-1"><CalendarDays className="size-3" />{p.lastVisit}</span>
          </div>
        </div>
      </div>
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

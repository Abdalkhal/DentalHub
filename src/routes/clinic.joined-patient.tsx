import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { FileImage, Loader2, MessageCircle, Phone, Plus, Upload } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { storage } from "@/integrations/firebase/client";
import { whatsappLink } from "@/lib/booking";
import {
  canRecordPayments,
  planStatusLabel,
  sharedBalance,
  sharedUploadPath,
  teamErrorMessage,
  toothLabel,
  TOOTH_STATUSES,
  updateSharedPatient,
  useMyClinicMemberships,
  useSharedPatients,
  type SharedPatient,
} from "@/lib/clinicTeam";
import { useI18n } from "@/lib/i18n";
import { formatAmountInput, formatMoney, localDay, parseAmountInput, type FeeCurrency } from "@/lib/patientsStore";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic/joined-patient")({
  validateSearch: (s: Record<string, unknown>) => ({
    ownerId: String(s.ownerId ?? ""),
    clinicId: String(s.clinicId ?? ""),
    patientId: String(s.patientId ?? ""),
  }),
  component: JoinedPatientPage,
});

const inputCls = "w-full h-10 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40";
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card p-3.5 shadow-soft space-y-2">
    <h2 className="text-xs font-extrabold">{title}</h2>
    {children}
  </section>
);

function JoinedPatientPage() {
  const { ownerId, clinicId, patientId } = Route.useSearch();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const memberships = useMyClinicMemberships(user?.uid);
  const member = memberships.find((m) => m.ownerId === ownerId && m.clinicId === clinicId && m.status === "active");
  const { list, loading } = useSharedPatients(user?.uid, ownerId, clinicId);
  const p = list.find((x) => x.id === patientId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (op: string, payload: Record<string, unknown>, after?: () => void) => {
    if (!p) return;
    setBusy(true);
    setError("");
    try {
      await updateSharedPatient(p, op, payload);
      after?.();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell wide>
      <TopBar title={p?.name ?? (ar ? "المريض" : "Patient")} showBack wide />
      <div className="px-3 pt-3 pb-6 space-y-3 md:px-6 md:pt-6 lg:max-w-3xl lg:mx-auto">
        {!p && !loading && (
          <p className="rounded-2xl border border-dashed border-border bg-card py-10 text-center text-xs text-muted-foreground">
            {ar ? "هذا الملف غير متاح لك" : "This file isn't available to you"}
          </p>
        )}
        {p && (
          <>
            {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p>}
            <Info p={p} ar={ar} />
            <Notes key={`${p.complaint}|${p.doctorNote}`} p={p} ar={ar} busy={busy} run={run} />
            <Visits p={p} ar={ar} busy={busy} run={run} />
            <Plan p={p} ar={ar} busy={busy} run={run} canPrice={!!p.finance} />
            <Teeth p={p} ar={ar} busy={busy} run={run} />
            <Files p={p} ar={ar} busy={busy} run={run} uid={user?.uid ?? ""} onError={setError} setBusy={setBusy} />
            {p.finance && member && <Finance p={p} ar={ar} busy={busy} run={run} canRecord={canRecordPayments(member)} />}
            <Activity p={p} ar={ar} busy={busy} run={run} />
          </>
        )}
      </div>
    </MobileShell>
  );
}

type Run = (op: string, payload: Record<string, unknown>, after?: () => void) => Promise<void>;
type Props = { p: SharedPatient; ar: boolean; busy: boolean; run: Run };

function Info({ p, ar }: { p: SharedPatient; ar: boolean }) {
  const conditions = Object.keys(p.history || {}).filter((k) => p.history[k]);
  const names: Record<string, string> = { diabetes: "السكري", hypertension: "ضغط الدم", heart: "أمراض القلب", allergy: "الحساسية", bleeding: "النزف" };
  return (
    <Section title={`${p.name} · ${p.fileNo}`}>
      <p className="text-[11px] text-muted-foreground">
        {p.age ? `${p.age} ${ar ? "سنة" : "y"} · ` : ""}
        {p.gender === "female" ? (ar ? "أنثى" : "Female") : ar ? "ذكر" : "Male"}
        {p.lastVisit ? ` · ${ar ? "آخر زيارة" : "Last visit"}: ${p.lastVisit}` : ""}
      </p>
      {p.phone && (
        <div className="flex gap-3">
          <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary" dir="ltr">
            <Phone className="size-3" />
            {p.phone}
          </a>
          <a href={whatsappLink(p.phone, "")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <MessageCircle className="size-3" />
            {ar ? "واتساب" : "WhatsApp"}
          </a>
        </div>
      )}
      {(conditions.length > 0 || p.allergies || p.meds) && (
        <p className="rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-900">
          {[conditions.map((k) => (ar ? names[k] ?? k : k)).join("، "), p.allergies && `${ar ? "حساسية" : "Allergy"}: ${p.allergies}`, p.meds && `${ar ? "أدوية" : "Meds"}: ${p.meds}`].filter(Boolean).join(" · ")}
        </p>
      )}
    </Section>
  );
}

function Notes({ p, ar, busy, run }: Props) {
  const [complaint, setComplaint] = useState(p.complaint);
  const [doctorNote, setDoctorNote] = useState(p.doctorNote);
  const dirty = complaint !== p.complaint || doctorNote !== p.doctorNote;
  return (
    <Section title={ar ? "الشكوى والملاحظات" : "Complaint and notes"}>
      <input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder={ar ? "الشكوى الرئيسية" : "Main complaint"} className={inputCls} />
      <textarea value={doctorNote} onChange={(e) => setDoctorNote(e.target.value)} placeholder={ar ? "ملاحظات الطبيب" : "Doctor's notes"} rows={2} className={cn(inputCls, "h-auto py-2")} />
      {dirty && (
        <button type="button" disabled={busy} onClick={() => void run("setNotes", { complaint, doctorNote })} className="h-9 w-full rounded-xl bg-primary text-[11px] font-bold text-primary-foreground">
          {ar ? "حفظ" : "Save"}
        </button>
      )}
    </Section>
  );
}

function Visits({ p, ar, busy, run }: Props) {
  const [procedure, setProcedure] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(localDay());
  return (
    <Section title={ar ? "الزيارات" : "Visits"}>
      <div className="grid grid-cols-2 gap-2">
        <input value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder={ar ? "الإجراء" : "Procedure"} className={inputCls} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} dir="ltr" />
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "ملاحظة" : "Note"} className={inputCls} />
      <button
        type="button"
        disabled={busy || !procedure.trim()}
        onClick={() =>
          void run("addVisit", { procedure, note, date, upcoming: date > localDay() }, () => {
            setProcedure("");
            setNote("");
          })
        }
        className="h-9 w-full rounded-xl bg-primary text-[11px] font-bold text-primary-foreground disabled:opacity-50"
      >
        {ar ? "إضافة زيارة" : "Add visit"}
      </button>
      {p.visits.map((v) => (
        <div key={v.id} className="rounded-xl border border-border px-3 py-2 text-[11px]">
          <p className="font-bold">{v.procedure}</p>
          <p className="text-muted-foreground">{[v.date, v.byName || v.doctor, v.note].filter(Boolean).join(" · ")}</p>
        </div>
      ))}
    </Section>
  );
}

function Plan({ p, ar, busy, run, canPrice }: Props & { canPrice: boolean }) {
  const [title, setTitle] = useState("");
  const [tooth, setTooth] = useState("");
  const [cost, setCost] = useState("");
  const [cur, setCur] = useState<FeeCurrency>("IQD");
  const next = { planned: "active", active: "done", done: "planned" } as const;
  return (
    <Section title={ar ? "خطة العلاج" : "Treatment plan"}>
      <div className="grid grid-cols-3 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? "الإجراء" : "Procedure"} className={cn(inputCls, "col-span-2")} />
        <input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder={ar ? "السن" : "Tooth"} dir="ltr" className={inputCls} />
      </div>
      {canPrice && (
        <div className="flex gap-1.5">
          {(["IQD", "USD"] as const).map((c) => (
            <button key={c} type="button" onClick={() => { setCur(c); setCost((a) => formatAmountInput(a, c)); }} className={cn("h-10 rounded-xl border px-3 text-[11px] font-bold", cur === c ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}>
              {c === "IQD" ? "د.ع" : "$"}
            </button>
          ))}
          <input value={cost} onChange={(e) => setCost(formatAmountInput(e.target.value, cur))} placeholder={ar ? "الكلفة" : "Cost"} inputMode="decimal" dir="ltr" className={inputCls} />
        </div>
      )}
      <button
        type="button"
        disabled={busy || !title.trim()}
        onClick={() =>
          void run("addPlanStep", { title, tooth, cost: parseAmountInput(cost), currency: cur }, () => {
            setTitle("");
            setTooth("");
            setCost("");
          })
        }
        className="h-9 w-full rounded-xl bg-primary text-[11px] font-bold text-primary-foreground disabled:opacity-50"
      >
        {ar ? "إضافة إلى الخطة" : "Add to plan"}
      </button>
      {p.plan.map((s) => (
        <div key={s.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-[11px]">
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">{s.title}</p>
            <p className="text-muted-foreground truncate">{[s.tooth, s.cost && s.currency ? formatMoney(s.cost, s.currency) : "", s.byName].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" disabled={busy} onClick={() => void run("setPlanStatus", { stepId: s.id, status: next[s.status] })} className="h-7 shrink-0 rounded-full bg-primary/10 px-2.5 text-[10px] font-bold text-primary">
            {planStatusLabel(s.status, ar)}
          </button>
        </div>
      ))}
    </Section>
  );
}

function Teeth({ p, ar, busy, run }: Props) {
  const [tooth, setTooth] = useState("");
  const [status, setStatus] = useState<string>("caries");
  const flagged = Object.keys(p.teeth || {}).sort((a, b) => Number(a) - Number(b));
  return (
    <Section title={ar ? "حالة الأسنان" : "Teeth"}>
      {flagged.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {flagged.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold">{t} — {toothLabel(p.teeth[t], ar)}</span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">{ar ? "لا توجد ملاحظات" : "Nothing flagged"}</p>
      )}
      <div className="flex gap-2">
        <input value={tooth} onChange={(e) => setTooth(e.target.value.replace(/\D/g, ""))} placeholder={ar ? "رقم السن" : "Tooth #"} inputMode="numeric" dir="ltr" className={cn(inputCls, "w-24 shrink-0")} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {TOOTH_STATUSES.map((s) => (
            <option key={s} value={s}>{toothLabel(s, ar)}</option>
          ))}
        </select>
        <button type="button" disabled={busy || !tooth} onClick={() => void run("setTooth", { tooth: Number(tooth), status }, () => setTooth(""))} className="size-10 shrink-0 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center disabled:opacity-50" aria-label={ar ? "حفظ" : "Save"}>
          <Plus className="size-4" />
        </button>
      </div>
    </Section>
  );
}

function Files({ p, ar, busy, run, uid, onError, setBusy }: Props & { uid: string; onError: (e: string) => void; setBusy: (b: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [tag, setTag] = useState<"xray" | "">("xray");
  const pick = async (file: File | undefined) => {
    if (!file || !uid) return;
    setBusy(true);
    onError("");
    try {
      const uploadPath = sharedUploadPath(uid, file.name);
      await uploadBytes(ref(storage, uploadPath), file, { contentType: file.type });
      await run("addFile", { uploadPath, name: file.name, type: file.type, tag });
    } catch (err) {
      onError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title={ar ? "الأشعة والصور" : "X-rays and photos"}>
      <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex gap-1.5">
        {([["xray", ar ? "أشعة" : "X-ray"], ["", ar ? "صورة" : "Photo"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setTag(v)} className={cn("h-9 rounded-xl border px-3 text-[11px] font-bold", tag === v ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}>
            {label}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="h-9 flex-1 rounded-xl border border-border bg-card text-[11px] font-bold inline-flex items-center justify-center gap-1.5">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {ar ? "رفع" : "Upload"}
        </button>
      </div>
      {p.files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {p.files.map((f) => (
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
    </Section>
  );
}

function Finance({ p, ar, busy, run, canRecord }: Props & { canRecord: boolean }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [cur, setCur] = useState<FeeCurrency>(() => (p.finance && p.finance.fees.USD > 0 && !p.finance.fees.IQD ? "USD" : "IQD"));
  useEffect(() => setAmount((a) => formatAmountInput(a, cur)), [cur]);
  const f = p.finance!;
  const used = (["IQD", "USD"] as const).filter((c) => f.fees[c] > 0 || sharedBalance(f, c).paid > 0);
  return (
    <Section title={ar ? "المالية" : "Finances"}>
      {used.length === 0 && <p className="text-[11px] text-muted-foreground">{ar ? "لا توجد مبالغ مسجلة" : "No amounts recorded"}</p>}
      {used.map((c) => {
        const b = sharedBalance(f, c);
        return (
          <div key={c} className="grid grid-cols-3 gap-1.5">
            {[[ar ? "الأتعاب" : "Fees", b.fees], [ar ? "المدفوع" : "Paid", b.paid], [ar ? "المتبقي" : "Remaining", b.remaining]].map(([label, v]) => (
              <div key={String(label)} className="rounded-xl bg-muted/60 p-2 text-center">
                <p className="text-xs font-extrabold">{formatMoney(Number(v), c)}</p>
                <p className="text-[10px] text-muted-foreground">{String(label)}</p>
              </div>
            ))}
          </div>
        );
      })}
      {canRecord && (
        <div className="space-y-1.5 rounded-xl bg-muted/50 p-2.5">
          <div className="flex gap-1.5">
            {(["IQD", "USD"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setCur(c)} className={cn("h-10 rounded-xl border px-3 text-[11px] font-bold", cur === c ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}>
                {c === "IQD" ? "د.ع" : "$"}
              </button>
            ))}
            <input value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value, cur))} placeholder={ar ? "المبلغ" : "Amount"} inputMode="decimal" dir="ltr" className={inputCls} />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "ملاحظة" : "Note"} className={inputCls} />
          <button
            type="button"
            disabled={busy || !parseAmountInput(amount)}
            onClick={() => void run("addPayment", { amount: parseAmountInput(amount), currency: cur, note }, () => { setAmount(""); setNote(""); })}
            className="h-9 w-full rounded-xl bg-primary text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            {ar ? "تسجيل دفعة" : "Record payment"}
          </button>
        </div>
      )}
      {f.payments.map((x) => (
        <div key={x.id} className="rounded-xl border border-border px-3 py-2 text-[11px]">
          <p className="font-bold">{formatMoney(x.amount, x.currency)}</p>
          <p className="text-muted-foreground">{[x.date, x.receiptNo, x.note].filter(Boolean).join(" · ")}</p>
        </div>
      ))}
    </Section>
  );
}

function Activity({ p, ar, busy, run }: Props) {
  const [text, setText] = useState("");
  return (
    <Section title={ar ? "سجل العمل" : "Activity"}>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={ar ? "إضافة ملاحظة" : "Add a note"} className={inputCls} />
        <button type="button" disabled={busy || !text.trim()} onClick={() => void run("addNote", { text }, () => setText(""))} className="size-10 shrink-0 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center disabled:opacity-50" aria-label={ar ? "إضافة" : "Add"}>
          <Plus className="size-4" />
        </button>
      </div>
      {p.log.map((e) => (
        <p key={e.id} className="text-[11px] text-muted-foreground"><span className="font-bold">{e.date}</span> · {e.text}</p>
      ))}
    </Section>
  );
}

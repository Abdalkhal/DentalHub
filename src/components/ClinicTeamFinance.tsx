import { useEffect, useState } from "react";
import { Loader2, Wallet, X } from "lucide-react";
import { removeDoctor, useClinic } from "@/lib/clinicStore";
import { useClinics } from "@/lib/clinicsStore";
import {
  addDoctorPayout,
  getClinicDues,
  teamErrorMessage,
  updateClinicMember,
  useClinicTeam,
  voidDoctorPayout,
  type ClinicMember,
  type DuesReport,
} from "@/lib/clinicTeam";
import { formatAmountInput, formatMoney, parseAmountInput, setPatientDoctors, type FeeCurrency, type Patient } from "@/lib/patientsStore";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center gap-2 text-start disabled:opacity-50">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold">{label}</span>
        {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
      <span className={cn("h-5 w-9 shrink-0 rounded-full p-0.5 transition", on ? "bg-primary" : "bg-muted-foreground/30")}>
        <span className={cn("block size-4 rounded-full bg-white transition", on ? "ltr:translate-x-4 rtl:-translate-x-4" : "")} />
      </span>
    </button>
  );
}

/** The owner's settings for one member: what they see, and their agreement. */
export function MemberControls({ m, ar, busy, run }: { m: ClinicMember; ar: boolean; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { doctors } = useClinic();
  const [type, setType] = useState(m.agreementType ?? "percentage");
  const [percent, setPercent] = useState(String(m.agreementPercent ?? ""));
  const [showDues, setShowDues] = useState(false);
  const dirty = type !== (m.agreementType ?? "percentage") || (type === "percentage" && percent !== String(m.agreementPercent ?? ""));

  return (
    <div className="space-y-2.5 border-t border-border pt-2.5">
      <Toggle
        label={ar ? "يرى كل مرضى العيادة" : "Sees all clinic patients"}
        hint={ar ? "عند إيقافه يرى من أُسندوا إليه أو سجّلهم فقط" : "When off, only those assigned to or added by them"}
        on={m.allPatients === true}
        disabled={busy}
        onChange={(v) => void run(() => updateClinicMember(m.id, { allPatients: v }))}
      />
      <Toggle
        label={ar ? "يرى المبالغ ويسجل الدفعات" : "Sees amounts and records payments"}
        hint={m.role === "visitor" ? (ar ? "غير متاح للطبيب الزائر" : "Not available to visiting doctors") : ar ? "لمرضاه فقط، ولا يغيّر الأتعاب ولا يحذف دفعة" : "Their patients only; can't change fees or delete payments"}
        on={m.financeAccess === true}
        disabled={busy || m.role === "visitor"}
        onChange={(v) => void run(() => updateClinicMember(m.id, { financeAccess: v }))}
      />

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold">{ar ? "الاتفاقية المالية" : "Financial agreement"}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["percentage", "fixed"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={cn("h-8 px-3 rounded-full border text-[11px] font-bold", type === t ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}>
              {t === "percentage" ? (ar ? "نسبة" : "Percent") : ar ? "راتب ثابت" : "Fixed salary"}
            </button>
          ))}
          {type === "percentage" && (
            <input
              inputMode="numeric"
              value={percent}
              onChange={(e) => setPercent(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="%"
              dir="ltr"
              className="h-8 w-16 rounded-lg border border-border bg-card text-center text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          )}
          {dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => updateClinicMember(m.id, { agreementType: type, agreementPercent: type === "percentage" ? Number(percent) || 0 : 0 }))}
              className="h-8 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground"
            >
              {ar ? "حفظ" : "Save"}
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{ar ? "تغيير النسبة يسري على الدفعات من تاريخ التغيير فقط." : "A new percentage applies from its date onward."}</p>
        {!m.agreementType && doctors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{ar ? "من السجل الداخلي:" : "From the internal list:"}</span>
            {doctors.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(ar ? `اعتماد اتفاقية ${d.name} لهذا الطبيب وحذفه من السجل الداخلي؟` : `Use ${d.name}'s agreement and remove them from the internal list?`)) return;
                  void run(() =>
                    updateClinicMember(m.id, { agreementType: d.agreementType, agreementPercent: d.agreementType === "percentage" ? d.agreementPercent : 0 }).then(() => removeDoctor(d.id)),
                  );
                }}
                className="h-7 rounded-full border border-border bg-card px-2.5 text-[10px] font-bold"
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowDues((v) => !v)} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11px] font-bold">
        <Wallet className="size-3.5" />
        {showDues ? (ar ? "إخفاء المستحقات" : "Hide dues") : ar ? "المستحقات والدفعات" : "Dues and payouts"}
      </button>
      {showDues && <DuesPanel memberDocId={m.id} ar={ar} owner />}
    </div>
  );
}

/** What a doctor earned at a clinic. Both sides see the same figures. */
export function DuesPanel({ memberDocId, ar, owner }: { memberDocId: string; ar: boolean; owner?: boolean }) {
  const [data, setData] = useState<DuesReport | null>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [cur, setCur] = useState<FeeCurrency>("IQD");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    getClinicDues(memberDocId)
      .then(setData)
      .catch((err) => setError(teamErrorMessage(err, ar)));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberDocId]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <p className="text-xs text-destructive">{error}</p> : <Loader2 className="mx-auto size-4 animate-spin" />;
  const used = (["IQD", "USD"] as const).filter((c) => data.totals[c].collected > 0 || data.totals[c].paidOut > 0);

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] text-muted-foreground">
        {data.agreementType === "fixed"
          ? ar ? "الاتفاقية: راتب ثابت" : "Agreement: fixed salary"
          : data.agreementType === "percentage"
            ? ar ? `الاتفاقية: ${data.agreementPercent}% من دفعات مرضاه` : `Agreement: ${data.agreementPercent}% of their patients' payments`
            : ar ? "لم تُحدد الاتفاقية بعد" : "No agreement set yet"}
      </p>
      {used.length === 0 && <p className="text-[11px] text-muted-foreground">{ar ? "لا توجد دفعات بعد" : "No payments yet"}</p>}
      {used.map((c) => {
        const t = data.totals[c];
        const balance = t.earned - t.paidOut;
        return (
          <div key={c} className="grid grid-cols-3 gap-1.5">
            {[
              [ar ? "دفعات مرضاه" : "Collected", t.collected, "bg-muted/60"],
              [ar ? "المُستلم" : "Paid out", t.paidOut, "bg-emerald-50"],
              [ar ? "المستحق" : "Owed", balance, "bg-blue-50"],
            ].map(([label, value, cls]) => (
              <div key={String(label)} className={cn("rounded-xl p-2 text-center", String(cls))}>
                <p className="text-xs font-extrabold">{formatMoney(Number(value), c)}</p>
                <p className="text-[10px] text-muted-foreground">{String(label)}</p>
              </div>
            ))}
          </div>
        );
      })}

      {owner && (
        <div className="space-y-1.5 rounded-xl bg-muted/50 p-2.5">
          <p className="text-[11px] font-bold">{ar ? "تسجيل دفعة للطبيب" : "Record a payout"}</p>
          <div className="flex gap-1.5">
            {(["IQD", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCur(c);
                  setAmount((a) => formatAmountInput(a, c));
                }}
                className={cn("h-9 rounded-xl border px-2.5 text-[11px] font-bold", cur === c ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}
              >
                {c === "IQD" ? "د.ع" : "$"}
              </button>
            ))}
            <input value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value, cur))} inputMode="decimal" placeholder="0" dir="ltr" className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-card px-2 text-xs" />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "ملاحظة" : "Note"} className="h-9 w-full rounded-xl border border-border bg-card px-2 text-xs" />
          <button
            type="button"
            disabled={busy || !parseAmountInput(amount)}
            onClick={() =>
              void act(async () => {
                await addDoctorPayout(memberDocId, parseAmountInput(amount) ?? 0, cur, note);
                setAmount("");
                setNote("");
              })
            }
            className="h-9 w-full rounded-xl bg-primary text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            {ar ? "تسجيل" : "Record"}
          </button>
        </div>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {data.payouts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-bold">{ar ? "الدفعات المستلمة" : "Payouts"}</p>
          {data.payouts.map((o) => (
            <div key={o.id} className={cn("flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-[11px]", o.voidedAt && "opacity-50")}>
              <span className={cn("font-bold", o.voidedAt && "line-through")}>{formatMoney(o.amount, o.currency)}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{o.date}{o.note ? ` · ${o.note}` : ""}</span>
              {o.voidedAt ? (
                <span className="text-[10px] font-bold text-rose-600">{ar ? "ملغاة" : "Void"}</span>
              ) : (
                owner && (
                  <button type="button" disabled={busy} aria-label={ar ? "إلغاء" : "Void"} onClick={() => window.confirm(ar ? "إلغاء هذه الدفعة؟ ستبقى ظاهرة كملغاة." : "Void this payout? It stays visible as void.") && void act(() => voidDoctorPayout(memberDocId, o.id))}>
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {data.items.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-bold">{ar ? "تفاصيل الدفعات" : "Payment details"}</p>
          {data.items.map((i, n) => (
            <div key={n} className="rounded-lg border border-border px-2 py-1.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="truncate font-bold">{i.patientName}</span>
                <span className="shrink-0 font-bold text-primary">{formatMoney(i.share, i.currency)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {i.date} · {i.receiptNo || "—"} · {formatMoney(i.amount, i.currency)} · {i.percent}%
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Owner: which team members treat this patient. */
export function PatientDoctorsCard({ p, ar }: { p: Patient; ar: boolean }) {
  const { user } = useSession();
  const { activeClinicId } = useClinics();
  const team = useClinicTeam(user?.uid, activeClinicId);
  if (team.active.length === 0) return null;
  const chosen = p.doctorUids ?? [];
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-bold text-muted-foreground">{ar ? "الأطباء المعالجون" : "Treating doctors"}</p>
      <div className="flex flex-wrap gap-1.5">
        {team.active.map((m) => {
          const on = chosen.includes(m.memberId);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setPatientDoctors(p.id, on ? chosen.filter((u) => u !== m.memberId) : [...chosen, m.memberId])}
              className={cn("h-8 rounded-full border px-3 text-[11px] font-bold", on ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}
            >
              {m.memberName}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {ar ? "الطبيب المختار يرى ملف هذا المريض فقط، وتُحسب دفعاته الجديدة ضمن مستحقاته (الأول في القائمة)." : "A chosen doctor sees this patient only; new payments count towards the first one listed."}
      </p>
    </div>
  );
}

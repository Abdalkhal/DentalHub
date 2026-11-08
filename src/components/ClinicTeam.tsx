import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, Copy, KeyRound, Loader2, MessageCircle, Trash2, UserPlus, Users, X } from "lucide-react";
import { useClinics } from "@/lib/clinicsStore";
import {
  clinicCodeMessage,
  createClinicInvite,
  getClinicJoinCode,
  inviteMessage,
  joinClinicWithCode,
  lookupClinicCode,
  removeClinicMember,
  resolveClinicRequest,
  revokeClinicInvite,
  roleHint,
  roleLabel,
  setClinicMemberRole,
  teamErrorMessage,
  useClinicTeam,
  useMyClinicMemberships,
  type ClinicMember,
  type ClinicRole,
  type CodeInfo,
} from "@/lib/clinicTeam";
import { MemberControls } from "@/components/ClinicTeamFinance";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

const ROLES: ClinicRole[] = ["doctor", "visitor"];

function RolePills({ value, onChange, ar }: { value: ClinicRole; onChange: (r: ClinicRole) => void; ar: boolean }) {
  return (
    <div className="flex gap-1.5">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "h-8 px-3 rounded-full border text-[11px] font-bold",
            value === r ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground",
          )}
        >
          {roleLabel(r, ar)}
        </button>
      ))}
    </div>
  );
}

export function ShareButtons({ text, ar }: { text: string; ar: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className="h-9 flex-1 rounded-xl bg-emerald-600 text-[11px] font-bold text-white inline-flex items-center justify-center gap-1.5 hover:bg-emerald-700"
      >
        <MessageCircle className="size-3.5" />
        {ar ? "إرسال واتساب" : "WhatsApp"}
      </a>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="h-9 flex-1 rounded-xl border border-border bg-card text-[11px] font-bold inline-flex items-center justify-center gap-1.5"
      >
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        {copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ" : "Copy"}
      </button>
    </div>
  );
}

export const Code = ({ code }: { code: string }) => (
  <p className="font-mono text-lg font-extrabold tracking-[0.2em] text-center" dir="ltr">{code}</p>
);

/** The owner's side: invite doctors, answer requests, manage roles. */
export function ClinicTeamCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics, activeClinicId } = useClinics();
  const clinicName = clinics.find((c) => c.id === activeClinicId)?.name ?? "";
  const team = useClinicTeam(user?.uid, activeClinicId);
  const [panel, setPanel] = useState<"invite" | "code" | null>(null);
  const [role, setRole] = useState<ClinicRole>("doctor");
  const [clinicCode, setClinicCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  const openCode = () => {
    setPanel("code");
    if (!clinicCode && activeClinicId) {
      void run(async () => setClinicCode((await getClinicJoinCode(activeClinicId)).code));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3">
      <div className="flex items-center gap-3">
        <span className="size-10 shrink-0 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <Users className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display font-extrabold text-sm">{ar ? "فريق العيادة" : "Clinic team"}</p>
          <p className="text-[11px] text-muted-foreground">
            {clinicName ? `${clinicName} · ` : ""}{ar ? "كل طبيب يدخل بحسابه ويعمل على مرضاه ومواعيده" : "Each doctor uses their own account and works on their own patients"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPanel(panel === "invite" ? null : "invite")} className="h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5">
          <UserPlus className="size-4" />
          {ar ? "دعوة طبيب" : "Invite a doctor"}
        </button>
        <button type="button" onClick={openCode} className="h-10 rounded-xl border border-border bg-card text-xs font-bold inline-flex items-center justify-center gap-1.5">
          <KeyRound className="size-4" />
          {ar ? "رمز العيادة" : "Clinic code"}
        </button>
      </div>

      {panel === "invite" && (
        <div className="rounded-xl bg-muted/50 p-3 space-y-2">
          <RolePills value={role} onChange={setRole} ar={ar} />
          <p className="text-[11px] text-muted-foreground">{roleHint(role, ar)}</p>
          <button
            type="button"
            disabled={busy || !activeClinicId}
            onClick={() => void run(() => createClinicInvite(activeClinicId, role))}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
          >
            {ar ? "إنشاء دعوة" : "Create invite"}
          </button>
        </div>
      )}

      {panel === "code" && (
        <div className="rounded-xl bg-muted/50 p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {ar ? "شاركه مع طبيب ليرسل طلب انضمام. لا ينضم أحد بهذا الرمز إلا بعد موافقتك." : "Share it so a doctor can send a request. Nobody joins until you approve."}
          </p>
          {clinicCode ? (
            <>
              <Code code={clinicCode} />
              <ShareButtons text={clinicCodeMessage(clinicCode, clinicName, ar)} ar={ar} />
            </>
          ) : (
            busy && <Loader2 className="size-4 animate-spin mx-auto" />
          )}
        </div>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {team.requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "طلبات الانضمام" : "Join requests"}</p>
          {team.requests.map((m) => (
            <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <MemberLine m={m} />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void run(() => resolveClinicRequest(m.id, true, "doctor"))} className="h-9 flex-1 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold">
                  {ar ? "قبول كطبيب" : "Accept as doctor"}
                </button>
                <button type="button" disabled={busy} onClick={() => void run(() => resolveClinicRequest(m.id, true, "visitor"))} className="h-9 flex-1 rounded-xl border border-border bg-card text-[11px] font-bold">
                  {ar ? "قبول كزائر" : "Accept as visitor"}
                </button>
                <button type="button" disabled={busy} onClick={() => void run(() => resolveClinicRequest(m.id, false))} aria-label={ar ? "رفض" : "Decline"} className="size-9 shrink-0 rounded-xl border border-border bg-card inline-flex items-center justify-center text-muted-foreground">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {team.invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "دعوات لم تُقبل بعد" : "Open invites"}</p>
          {team.invites.map((i) => (
            <div key={i.code} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">{i.role ? roleLabel(i.role, ar) : ""}</span>
                <button type="button" disabled={busy} onClick={() => void run(() => revokeClinicInvite(i.code))} className="text-[11px] font-bold text-destructive">
                  {ar ? "إلغاء الدعوة" : "Revoke"}
                </button>
              </div>
              <Code code={i.code} />
              <ShareButtons text={inviteMessage(i.code, clinicName, ar)} ar={ar} />
            </div>
          ))}
        </div>
      )}

      {team.active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "أعضاء الفريق" : "Team members"}</p>
          {team.active.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3 space-y-2">
              <MemberLine m={m} />
              <div className="flex items-center justify-between gap-2">
                <RolePills value={m.role} onChange={(r) => void run(() => setClinicMemberRole(m.id, r))} ar={ar} />
                <button
                  type="button"
                  disabled={busy}
                  aria-label={ar ? "إزالة" : "Remove"}
                  onClick={() => {
                    if (window.confirm(ar ? `إزالة ${m.memberName} من الفريق؟ تبقى المواعيد في عيادتك.` : `Remove ${m.memberName}? Appointments stay in your clinic.`)) {
                      void run(() => removeClinicMember(m.id));
                    }
                  }}
                  className="size-8 shrink-0 rounded-full bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <MemberControls m={m} ar={ar} busy={busy} run={run} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function MemberLine({ m }: { m: Pick<ClinicMember, "memberName" | "memberPhoto" | "memberPhone"> }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-9 shrink-0 overflow-hidden rounded-xl bg-sky-100 text-sky-700 font-extrabold text-sm inline-flex items-center justify-center">
        {m.memberPhoto ? <img src={m.memberPhoto} alt="" className="size-full object-cover" /> : m.memberName.trim().charAt(0) || "?"}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold truncate">{m.memberName}</p>
        {m.memberPhone && <p className="text-[11px] text-muted-foreground" dir="ltr">{m.memberPhone}</p>}
      </div>
    </div>
  );
}

/** Enter a code (or arrive with one from a link), see what it is, confirm. */
export function JoinCodePanel({ ar, initialCode, onJoined }: { ar: boolean; initialCode?: string; onJoined?: () => void }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [info, setInfo] = useState<CodeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const check = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    setError("");
    setDone("");
    setInfo(null);
    try {
      setInfo(await lookupClinicCode(value));
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (initialCode) void check(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const confirm = async () => {
    if (!info) return;
    setBusy(true);
    setError("");
    try {
      const r = await joinClinicWithCode(info.code);
      setDone(
        r.status === "active"
          ? ar ? `انضممت إلى ${r.clinicName}.` : `You joined ${r.clinicName}.`
          : ar ? `أُرسل طلبك إلى ${r.clinicName}. سيصلك إشعار عند الموافقة.` : `Request sent to ${r.clinicName}. You'll be notified.`,
      );
      setInfo(null);
      setCode("");
      onJoined?.();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setInfo(null);
            setError("");
          }}
          placeholder={ar ? "رمز الدعوة أو رمز العيادة" : "Invite or clinic code"}
          dir="ltr"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-bold tracking-widest text-center placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button type="button" disabled={busy || !code.trim()} onClick={() => void check(code)} className="h-11 shrink-0 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60">
          {busy && !info ? <Loader2 className="size-4 animate-spin" /> : ar ? "متابعة" : "Continue"}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {done && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{done}</p>}
      {info && (
        <div className="rounded-xl bg-blue-50 p-3 space-y-2">
          <p className="text-sm font-extrabold text-blue-950">{info.clinicName}</p>
          <p className="text-[11px] text-blue-900">
            {ar ? `صاحب العيادة: ${info.ownerName}` : `Owner: ${info.ownerName}`}
            {info.role ? ` · ${roleLabel(info.role, ar)}` : ""}
          </p>
          <p className="text-[11px] text-blue-900">
            {info.kind === "invite"
              ? roleHint(info.role ?? "doctor", ar)
              : ar ? "سيصل طلبك إلى صاحب العيادة، وهو من يحدد دورك." : "The owner receives your request and sets your role."}
          </p>
          <p className="text-[11px] text-blue-900">
            {info.role === "secretary" ? "" : ar ? "تبقى عيادتك ومرضاك الخاصون منفصلين، ولا يراهم صاحب هذه العيادة." : "Your own clinic and patients stay separate and private."}
          </p>
          {info.mine ? (
            <p className="text-xs font-bold text-destructive">{ar ? "هذه عيادتك أنت" : "This is your own clinic"}</p>
          ) : (
            <button type="button" disabled={busy} onClick={() => void confirm()} className="w-full h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60">
              {info.kind === "invite" ? (ar ? "قبول الدعوة" : "Accept invite") : ar ? "إرسال طلب الانضمام" : "Send join request"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The doctor's side: other clinics they work in, or asked to join. */
export function JoinedClinicsCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const list = useMyClinicMemberships(user?.uid);
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3">
      <div>
        <p className="font-display font-extrabold text-sm">{ar ? "الانضمام إلى عيادة" : "Join a clinic"}</p>
        <p className="text-[11px] text-muted-foreground">{ar ? "أدخل الرمز الذي وصلك من صاحب العيادة." : "Enter the code the clinic's owner gave you."}</p>
      </div>
      <JoinCodePanel ar={ar} />
      {list.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "عيادات أعمل فيها" : "Clinics I work in"}</p>
          {list.map((m) =>
            m.status === "active" ? (
              <Link key={m.id} to="/clinic/joined" search={{ ownerId: m.ownerId, clinicId: m.clinicId }} className="flex items-center gap-2 rounded-xl border border-border p-3 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{m.clinicName}</p>
                  <p className="text-[11px] text-muted-foreground">{m.ownerName} · {roleLabel(m.role, ar)}</p>
                </div>
                <ChevronLeft className="size-4 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
              </Link>
            ) : (
              <div key={m.id} className="flex items-center gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{m.clinicName}</p>
                  <p className="text-[11px] text-amber-700">{ar ? "بانتظار موافقة صاحب العيادة" : "Awaiting the owner's approval"}</p>
                </div>
                <button type="button" onClick={() => void removeClinicMember(m.id)} className="text-[11px] font-bold text-destructive">
                  {ar ? "سحب الطلب" : "Withdraw"}
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

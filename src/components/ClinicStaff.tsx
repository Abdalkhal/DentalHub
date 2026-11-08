import { useState } from "react";
import { Ban, ChevronDown, History, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Code, MemberLine, ShareButtons } from "@/components/ClinicTeam";
import { useClinics } from "@/lib/clinicsStore";
import {
  activityTime,
  createStaffInvite,
  joinLink,
  removeClinicMember,
  revokeClinicInvite,
  setStaffPermissions,
  STAFF_PERMISSIONS,
  STAFF_RED_LINES,
  STAFF_TEMPLATES,
  staffTemplateOf,
  teamErrorMessage,
  togglePermission,
  useClinicActivity,
  useClinicTeam,
  type StaffMember,
  type StaffPermissions,
} from "@/lib/clinicTeam";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

/** The on/off list, used when inviting and when changing a secretary later. */
export function PermissionToggles({
  value,
  onChange,
  disabled,
  ar,
}: {
  value: StaffPermissions;
  onChange: (next: StaffPermissions) => void;
  disabled?: boolean;
  ar: boolean;
}) {
  return (
    <div className="grid gap-1.5 md:grid-cols-2">
      {STAFF_PERMISSIONS.map((p) => {
        const on = !!value[p.key];
        return (
          <button
            key={p.key}
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(togglePermission(value, p.key))}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-2.5 text-start transition disabled:opacity-60",
              on ? "border-primary/40 bg-primary/5" : "border-border bg-card",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">{ar ? p.ar : p.en}</span>
              <span className="block text-[10px] leading-4 text-muted-foreground">{ar ? p.hintAr : p.hintEn}</span>
            </span>
            <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-slate-300")}>
              <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", on ? "start-[18px]" : "start-0.5")} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TemplatePills({ value, onPick, ar }: { value: StaffPermissions; onPick: (p: StaffPermissions) => void; ar: boolean }) {
  const current = staffTemplateOf(value)?.id;
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAFF_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onPick(t.permissions)}
          className={cn(
            "h-8 rounded-full border px-3 text-[11px] font-bold",
            current === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
          )}
        >
          {ar ? t.ar : t.en}
        </button>
      ))}
    </div>
  );
}

const staffInviteMessage = (code: string, clinicName: string, ar: boolean) =>
  ar
    ? `دعوة للعمل في ${clinicName} على Dent Hub.\nافتح الرابط وأنشئ حسابك: ${joinLink(code)}\nتنتهي الدعوة بعد 7 أيام.`
    : `You're invited to work at ${clinicName} on Dent Hub.\nOpen the link and create your account: ${joinLink(code)}\nThe invite expires in 7 days.`;

function permissionCount(p: StaffPermissions) {
  return STAFF_PERMISSIONS.filter((x) => p[x.key]).length;
}

function StaffRow({ m, ar, busy, run }: { m: StaffMember; ar: boolean; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const template = staffTemplateOf(m.permissions);
  const save = (next: StaffPermissions) => void run(() => setStaffPermissions(m.id, next));
  return (
    <div className="rounded-xl border border-border">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-start">
        <span className="min-w-0 flex-1">
          <MemberLine m={m} />
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
          {template ? (ar ? template.ar : template.en) : ar ? `${permissionCount(m.permissions)} من ${STAFF_PERMISSIONS.length} صلاحيات` : `${permissionCount(m.permissions)} of ${STAFF_PERMISSIONS.length}`}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-border p-3">
          <TemplatePills value={m.permissions} onPick={save} ar={ar} />
          <PermissionToggles value={m.permissions} onChange={save} disabled={busy} ar={ar} />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(ar ? `إيقاف ${m.memberName}؟ يفقد الوصول إلى العيادة فوراً، ويبقى ما سجله.` : `Stop ${m.memberName}? They lose access at once; what they recorded stays.`)) {
                void run(() => removeClinicMember(m.id));
              }
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-700"
          >
            <Trash2 className="size-3.5" />
            {ar ? "إيقاف الوصول فوراً" : "Stop access now"}
          </button>
        </div>
      )}
    </div>
  );
}

/** The owner's side: invite secretaries, choose what each may do, see what they did. */
export function ClinicStaffCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics, activeClinicId } = useClinics();
  const clinicName = clinics.find((c) => c.id === activeClinicId)?.name ?? "";
  const team = useClinicTeam(user?.uid, activeClinicId);
  const activity = useClinicActivity("ownerId", user?.uid, activeClinicId);
  const [inviting, setInviting] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [draft, setDraft] = useState<StaffPermissions>(STAFF_TEMPLATES[0].permissions);
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

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold">{ar ? "السكرتارية" : "Secretaries"}</p>
          <p className="text-[11px] text-muted-foreground">
            {ar ? "لكل سكرتير حسابه، ويرى فقط ما تسمح به أنت" : "Each has their own account and sees only what you allow"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviting(!inviting)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
        >
          <UserPlus className="size-4" />
          {ar ? "دعوة" : "Invite"}
        </button>
      </div>

      {inviting && (
        <div className="space-y-2.5 rounded-xl bg-muted/50 p-3">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "ابدأ بقالب، ثم عدّل كما تريد" : "Start from a template, then adjust"}</p>
          <TemplatePills value={draft} onPick={setDraft} ar={ar} />
          <PermissionToggles value={draft} onChange={setDraft} ar={ar} />
          <div className="rounded-xl border border-border bg-card p-2.5">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-rose-700">
              <Ban className="size-3.5" />
              {ar ? "لا يستطيع السكرتير أبداً" : "A secretary can never"}
            </p>
            <p className="text-[10px] leading-4 text-muted-foreground">{STAFF_RED_LINES.map((l) => (ar ? l.ar : l.en)).join(ar ? "، " : ", ")}</p>
          </div>
          <button
            type="button"
            disabled={busy || !activeClinicId}
            onClick={() =>
              void run(async () => {
                await createStaffInvite(activeClinicId, draft);
                setInviting(false);
              })
            }
            className="flex h-10 w-full items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "إنشاء الدعوة" : "Create invite"}
          </button>
        </div>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {team.staffInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground">{ar ? "دعوات لم تُقبل بعد" : "Open invites"}</p>
          {team.staffInvites.map((i) => (
            <div key={i.code} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex justify-end">
                <button type="button" disabled={busy} onClick={() => void run(() => revokeClinicInvite(i.code))} className="text-[11px] font-bold text-destructive">
                  {ar ? "إلغاء الدعوة" : "Revoke"}
                </button>
              </div>
              <Code code={i.code} />
              <ShareButtons text={staffInviteMessage(i.code, clinicName, ar)} ar={ar} />
            </div>
          ))}
        </div>
      )}

      {team.staff.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 md:items-start">
          {team.staff.map((m) => (
            <StaffRow key={m.id} m={m} ar={ar} busy={busy} run={run} />
          ))}
        </div>
      ) : (
        !inviting &&
        team.staffInvites.length === 0 && (
          <p className="rounded-xl border border-dashed border-border py-5 text-center text-[11px] text-muted-foreground">
            {ar ? "لا يوجد سكرتير بعد" : "No secretaries yet"}
          </p>
        )
      )}

      {activity.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowLog(!showLog)} className="flex w-full items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <History className="size-3.5" />
            <span className="flex-1 text-start">{ar ? "سجل النشاط" : "Activity log"}</span>
            <ChevronDown className={cn("size-4 transition", showLog && "rotate-180")} />
          </button>
          {showLog && (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {activity.map((a) => (
                <li key={a.id} className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px]">
                  <span className="font-bold">{a.memberName}:</span> {a.message}
                  <span className="block text-[10px] text-muted-foreground">{activityTime(a.at, ar)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

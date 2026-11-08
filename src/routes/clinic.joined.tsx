import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, ChevronLeft, Phone, Plus, Users } from "lucide-react";
import { DuesPanel } from "@/components/ClinicTeamFinance";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import {
  canAddPatients,
  createSharedPatient,
  teamErrorMessage,
  useSharedPatients,
  removeClinicMember,
  roleHint,
  roleLabel,
  statusLabel,
  updateSharedAppointment,
  useMyClinicMemberships,
  useSharedAppointments,
  type SharedAppointment,
} from "@/lib/clinicTeam";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic/joined")({
  validateSearch: (s: Record<string, unknown>) => ({
    ownerId: String(s.ownerId ?? ""),
    clinicId: String(s.clinicId ?? ""),
  }),
  component: JoinedClinicPage,
});

const STATUSES: SharedAppointment["status"][] = ["confirmed", "waiting", "completed", "cancelled"];

function JoinedClinicPage() {
  const { ownerId, clinicId } = Route.useSearch();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const navigate = useNavigate();
  const memberships = useMyClinicMemberships(user?.uid);
  const member = memberships.find((m) => m.ownerId === ownerId && m.clinicId === clinicId && m.status === "active");
  const { list, loading } = useSharedAppointments(user?.uid, ownerId, clinicId);
  const [tab, setTab] = useState<"patients" | "appointments" | "dues">("patients");

  return (
    <MobileShell wide>
      <TopBar title={member?.clinicName ?? (ar ? "عيادة" : "Clinic")} showBack wide />
      <div className="px-3 pt-3 pb-6 space-y-3 md:px-6 md:pt-6 lg:max-w-3xl lg:mx-auto">
        {member && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-xs font-bold">{ar ? `صاحب العيادة: ${member.ownerName}` : `Owner: ${member.ownerName}`}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {roleLabel(member.role, ar)} · {roleHint(member.role, ar)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
          {([["patients", ar ? "مرضاي" : "My patients"], ["appointments", ar ? "مواعيدي" : "Appointments"], ["dues", ar ? "مستحقاتي" : "My dues"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("h-9 rounded-xl text-[11px] font-bold", tab === k ? "bg-card shadow-soft" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>

        {tab === "patients" && member && <PatientsTab ownerId={ownerId} clinicId={clinicId} uid={user?.uid} ar={ar} canAdd={canAddPatients(member)} />}
        {tab === "dues" && member && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <DuesPanel memberDocId={member.id} ar={ar} />
          </div>
        )}
        {tab === "appointments" && !loading && list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center">
            <CalendarDays className="mx-auto size-9 text-muted-foreground/50" />
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {ar ? "لم يُسند إليك أي موعد في هذه العيادة بعد" : "No appointments assigned to you here yet"}
            </p>
          </div>
        )}
        {tab === "appointments" && list.map((a) => (
          <AppointmentCard key={a.id} a={a} ar={ar} canEdit={member?.role === "doctor"} />
        ))}

        {member && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(ar ? `مغادرة ${member.clinicName}؟ ستُزال مواعيدها من حسابك.` : `Leave ${member.clinicName}? Its appointments will be removed from your account.`)) {
                void removeClinicMember(member.id).then(() => navigate({ to: "/clinic/doctors" }));
              }
            }}
            className="w-full h-11 rounded-xl border border-destructive/30 bg-card text-xs font-bold text-destructive"
          >
            {ar ? "مغادرة العيادة" : "Leave clinic"}
          </button>
        )}
      </div>
    </MobileShell>
  );
}

function PatientsTab({ ownerId, clinicId, uid, ar, canAdd }: { ownerId: string; clinicId: string; uid?: string; ar: boolean; canAdd: boolean }) {
  const { list, loading } = useSharedPatients(uid, ownerId, clinicId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [complaint, setComplaint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inp = "w-full h-10 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40";
  const add = async () => {
    setBusy(true);
    setError("");
    try {
      await createSharedPatient(ownerId, clinicId, { name, phone, complaint });
      setAdding(false);
      setName("");
      setPhone("");
      setComplaint("");
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2.5">
      {canAdd && (
        <button type="button" onClick={() => setAdding((v) => !v)} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary text-xs font-bold text-primary-foreground">
          <Plus className="size-4" />
          {ar ? "إضافة مريض إلى هذه العيادة" : "Add a patient to this clinic"}
        </button>
      )}
      {adding && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "اسم المريض" : "Patient name"} className={inp} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder={ar ? "الهاتف" : "Phone"} className={inp} />
          <input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder={ar ? "الشكوى الرئيسية" : "Main complaint"} className={inp} />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <button type="button" disabled={busy || !name.trim()} onClick={() => void add()} className="h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50">
            {ar ? "حفظ" : "Save"}
          </button>
        </div>
      )}
      {!loading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center">
          <Users className="mx-auto size-9 text-muted-foreground/50" />
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {ar ? "لم يُسند إليك أي مريض في هذه العيادة بعد" : "No patients assigned to you here yet"}
          </p>
        </div>
      )}
      {list.map((p) => (
        <Link key={p.id} to="/clinic/joined-patient" search={{ ownerId, clinicId, patientId: p.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-soft hover:bg-muted/40">
          <span className="size-10 shrink-0 rounded-xl bg-sky-100 text-sm font-extrabold text-sky-700 inline-flex items-center justify-center">{p.name.trim().charAt(0) || "?"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{p.name}</p>
            <p className="text-[11px] text-muted-foreground">{p.fileNo}{p.lastVisit ? ` · ${p.lastVisit}` : ""}</p>
          </div>
          <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" />
        </Link>
      ))}
    </div>
  );
}

function AppointmentCard({ a, ar, canEdit }: { a: SharedAppointment; ar: boolean; canEdit: boolean }) {
  const [notes, setNotes] = useState(a.notes);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const save = (patch: { status?: SharedAppointment["status"]; notes?: string }) => {
    setBusy(true);
    setFailed(false);
    updateSharedAppointment(a.id, patch)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold truncate">{a.patientName}</p>
          <p className="text-[11px] text-muted-foreground" dir="ltr">{a.date} {a.time}</p>
        </div>
        {!canEdit && <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold">{statusLabel(a.status, ar)}</span>}
      </div>
      {a.phone && (
        <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary" dir="ltr">
          <Phone className="size-3" />
          {a.phone}
        </a>
      )}
      {(a.treatment || a.appointmentType) && <p className="text-[11px] text-muted-foreground">{a.treatment || a.appointmentType}</p>}
      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => s !== a.status && save({ status: s })}
                className={cn("h-8 px-3 rounded-full border text-[11px] font-bold", a.status === s ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground")}
              >
                {statusLabel(s, ar)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={ar ? "ملاحظة" : "Note"}
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {notes !== a.notes && (
              <button type="button" disabled={busy} onClick={() => save({ notes })} className="h-10 shrink-0 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
                {ar ? "حفظ" : "Save"}
              </button>
            )}
          </div>
          {failed && <p className="text-[11px] font-medium text-destructive">{ar ? "تعذر الحفظ. حاول مجدداً." : "Could not save. Try again."}</p>}
        </>
      ) : (
        a.notes && <p className="text-[11px] text-muted-foreground">{a.notes}</p>
      )}
    </div>
  );
}

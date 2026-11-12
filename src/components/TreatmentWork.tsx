import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Pencil,
  PlayCircle,
  Plus,
  RotateCcw,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient, PlanStep } from "@/lib/patientsStore";
import {
  ENDO_IRRIGANTS,
  ENDO_MEDICAMENTS,
  ENDO_OBTURATION,
  ENDO_RESTORATION,
  ENDO_SEALERS,
  ENDO_STAGES,
  ENDO_SYSTEMS,
  NAOCL_STRENGTHS,
  WORK_STAGE_META,
  approveStep,
  chartStatusFor,
  finishStep,
  newEndoSession,
  optionLabel,
  removeSession,
  reopenStep,
  saveSession,
  startStep,
  workKind,
  workStage,
  workToday,
  type EndoSession,
  type WorkSession,
  newImplantSession,
  newOrthoSession,
  implantLoadingDate,
  orthoProgress,
  sessionLines,
  sessionTypeLabel,
  type ImplantSession,
  type OrthoSession,
  type TreatmentWork,
} from "@/lib/treatmentWork";
import {
  FixturesTable,
  IMPLANT_TYPES,
  ImplantFields,
  ORTHO_TYPES,
  OrthoFields,
  TypePicker,
} from "@/components/TreatmentWorkForms";

const fieldCls =
  "h-10 w-full rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40";

/** The buttons under a plan procedure: approve → start → work sheet. */
export function StepWorkActions({
  p,
  step,
  ar,
  onOpen,
}: {
  p: Patient;
  step: PlanStep;
  ar: boolean;
  onOpen: () => void;
}) {
  const stage = workStage(step);
  const sessions = step.work?.sessions.length ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5 ps-10">
      <StageBadge step={step} ar={ar} />
      {stage === "proposed" && (
        <button
          type="button"
          onClick={() => approveStep(p.id, step.id, true)}
          className="h-7 px-2.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-bold inline-flex items-center gap-1"
        >
          <ThumbsUp className="size-3.5" />
          {ar ? "وافق المريض" : "Patient agreed"}
        </button>
      )}
      {stage === "approved" && (
        <>
          <button
            type="button"
            onClick={() => {
              startStep(p.id, step);
              onOpen();
            }}
            className="h-7 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold inline-flex items-center gap-1 shadow-sm"
          >
            <PlayCircle className="size-3.5" />
            {ar ? "ابدأ العلاج" : "Start treatment"}
          </button>
          <button
            type="button"
            onClick={() => approveStep(p.id, step.id, false)}
            className="text-[10px] text-muted-foreground underline underline-offset-2"
          >
            {ar ? "تراجع" : "Undo"}
          </button>
        </>
      )}
      {(stage === "inProgress" || stage === "done") && (
        <button
          type="button"
          onClick={onOpen}
          className="h-7 px-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-bold inline-flex items-center gap-1"
        >
          <ClipboardList className="size-3.5" />
          {ar ? "ملف العمل" : "Work sheet"}
          <span className="rounded-full bg-primary/10 px-1.5 text-[10px]">{sessions}</span>
        </button>
      )}
    </div>
  );
}

function StageBadge({ step, ar }: { step: PlanStep; ar: boolean }) {
  const m = WORK_STAGE_META[workStage(step)];
  return (
    <span
      className="h-6 px-2 rounded-full text-[10px] font-bold inline-flex items-center"
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      {ar ? m.ar : m.en}
    </span>
  );
}

/** The work record of one procedure: its sessions, and finishing it. */
export function WorkSheet({
  p,
  stepId,
  ar,
  onClose,
}: {
  p: Patient;
  stepId: string;
  ar: boolean;
  onClose: () => void;
}) {
  const step = (p.plan ?? []).find((s) => s.id === stepId);
  const [editing, setEditing] = useState<WorkSession | "new" | null>(null);
  if (!step) return null;
  const sessions = step.work?.sessions ?? [];
  const done = step.status === "done";
  // The form follows the department, so a case started before its form existed gets it too.
  const kind = workKind(step);
  const mark = chartStatusFor(step);
  const progress = kind === "ortho" ? orthoProgress(step) : null;
  const loading = kind === "implant" && !done ? implantLoadingDate(step) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label={ar ? "إغلاق" : "Close"}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card md:max-w-2xl md:rounded-3xl border-t border-border shadow-card">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-start gap-3">
            <span className="size-11 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-sky-500 text-primary-foreground flex items-center justify-center font-display font-extrabold text-[13px]">
              {step.tooth ? <bdi dir="ltr">{step.tooth}</bdi> : <ClipboardList className="size-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-display font-extrabold truncate">{step.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <StageBadge step={step} ar={ar} />
                {step.approvedAt && (
                  <span>
                    {ar ? "الموافقة" : "Approved"} <bdi dir="ltr">{step.approvedAt}</bdi>
                  </span>
                )}
                {step.work?.startedAt && (
                  <span>
                    · {ar ? "البدء" : "Started"} <bdi dir="ltr">{step.work.startedAt}</bdi>
                  </span>
                )}
                {step.work?.finishedAt && (
                  <span>
                    · {ar ? "الانتهاء" : "Finished"} <bdi dir="ltr">{step.work.finishedAt}</bdi>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"
              aria-label={ar ? "إغلاق" : "Close"}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {!editing && progress && (
            <div className="rounded-2xl bg-gradient-to-l from-primary/10 to-sky-50 p-3">
              <div className="flex items-center justify-between text-[11px] font-extrabold">
                <span>{ar ? "تقدّم التقويم" : "Treatment progress"}</span>
                <span className="text-primary">
                  {ar
                    ? `الشهر ${progress.month} من ${progress.of}`
                    : `Month ${progress.month} of ${progress.of}`}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary to-sky-400"
                  style={{ width: `${Math.min(100, (progress.month / progress.of) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {!editing && loading && (
            <div className="rounded-2xl bg-emerald-50 px-3 py-2.5 text-[11px] font-bold text-emerald-800">
              {ar ? "موعد التحميل المتوقع" : "Expected loading"} <bdi dir="ltr">{loading}</bdi>
            </div>
          )}
          {editing ? (
            <SessionForm
              key={editing === "new" ? "new" : editing.id}
              step={step}
              kind={kind}
              initial={editing === "new" ? undefined : editing}
              number={
                editing === "new"
                  ? sessions.length + 1
                  : sessions.findIndex((x) => x.id === editing.id) + 1
              }
              ar={ar}
              onCancel={() => setEditing(null)}
              onSave={(s) => {
                saveSession(p.id, step.id, s, ar);
                setEditing(null);
              }}
            />
          ) : (
            <>
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <ClipboardList className="mx-auto size-7 text-muted-foreground/60" />
                  <p className="mt-2 text-[12px] font-bold">
                    {ar ? "لا توجد جلسات بعد" : "No sessions yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {kind === "ortho"
                      ? ar
                        ? "ابدأ بجلسة التركيب، ثم سجّل الأسلاك والمطاط في كل متابعة"
                        : "Start with the setup, then record wires and elastics each visit"
                      : kind === "implant"
                        ? ar
                          ? "سجّل الزرعات بالمقاس والعزم ورقم التشغيلة في جلسة وضع الزرعة"
                          : "Record each implant's size, torque and lot at placement"
                        : kind === "endo"
                          ? ar
                            ? "سجّل أطوال القنوات ونظام الحفر والغسل في كل جلسة"
                            : "Record canal lengths, file system and irrigation each session"
                          : ar
                            ? "سجّل ما تم عمله والمواد المستخدمة في كل جلسة"
                            : "Record what was done and the materials each session"}
                  </p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {sessions.map((x, i) => (
                    <SessionCard
                      key={x.id}
                      x={x}
                      n={i + 1}
                      ar={ar}
                      onEdit={() => setEditing(x)}
                      onDelete={() => {
                        if (
                          window.confirm(ar ? `حذف الجلسة ${i + 1}؟` : `Delete session ${i + 1}?`)
                        )
                          removeSession(p.id, step.id, x.id);
                      }}
                    />
                  ))}
                </ol>
              )}

              <button
                type="button"
                onClick={() => setEditing("new")}
                className="w-full h-11 rounded-xl border-2 border-dashed border-primary/40 text-primary text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 hover:bg-primary/5"
              >
                <Plus className="size-4" strokeWidth={3} />
                {ar ? "جلسة جديدة" : "New session"}
              </button>

              {done ? (
                <button
                  type="button"
                  onClick={() => reopenStep(p.id, step.id)}
                  className="w-full h-11 rounded-xl bg-muted text-foreground text-[12px] font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="size-4" />
                  {ar ? "إعادة فتح العلاج" : "Reopen treatment"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const msg = mark
                      ? ar
                        ? `إنهاء العلاج؟ سيُعلَّم السن ${step.tooth || ""} في خريطة الأسنان.`
                        : `Finish the treatment? Tooth ${step.tooth || ""} will be marked on the chart.`
                      : ar
                        ? "إنهاء العلاج؟"
                        : "Finish the treatment?";
                    if (window.confirm(msg)) finishStep(p.id, step.id);
                  }}
                  className="w-full h-11 rounded-xl bg-emerald-600 text-white text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="size-4" />
                  {ar ? "إنهاء العلاج" : "Finish treatment"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  x,
  n,
  ar,
  onEdit,
  onDelete,
}: {
  x: WorkSession;
  n: number;
  ar: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const e = x.endo;
  return (
    <li className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">
          {n}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-extrabold">
            {ar ? `الجلسة ${n}` : `Session ${n}`}
            {sessionTypeLabel(x, ar) && (
              <span className="ms-1.5 font-bold text-primary">· {sessionTypeLabel(x, ar)}</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">
            <bdi dir="ltr">{x.date}</bdi>
          </p>
        </div>
        <button
          onClick={onEdit}
          className="size-8 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label={ar ? "تعديل" : "Edit"}
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="size-8 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label={ar ? "حذف" : "Delete"}
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      {e && e.canals.some((c) => c.length || c.maf || c.ref) && (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-border" dir="ltr">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Canal</th>
                <th className="px-2 py-1.5 text-left font-bold">WL (mm)</th>
                <th className="px-2 py-1.5 text-left font-bold">Ref.</th>
                <th className="px-2 py-1.5 text-left font-bold">MAF</th>
              </tr>
            </thead>
            <tbody>
              {e.canals.map((c, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1.5 font-extrabold">{c.name}</td>
                  <td className="px-2 py-1.5 font-bold text-primary">{c.length || "—"}</td>
                  <td className="px-2 py-1.5">{c.ref || "—"}</td>
                  <td className="px-2 py-1.5">{c.maf || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {e && (
        <div className="mt-2 flex flex-wrap gap-1">
          {[
            e.system,
            e.apexLocator ? (ar ? "جهاز تحديد الذروة" : "Apex locator") : "",
            ...(e.irrigation ?? []).map((r) => (r === "NaOCl" && e.naocl ? `NaOCl ${e.naocl}` : r)),
            e.medicament && e.medicament !== "none"
              ? optionLabel(ENDO_MEDICAMENTS, e.medicament, ar)
              : "",
            optionLabel(ENDO_OBTURATION, e.obturation, ar),
            e.sealer,
            optionLabel(ENDO_RESTORATION, e.restoration, ar),
          ]
            .filter(Boolean)
            .map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground/80"
              >
                {t}
              </span>
            ))}
        </div>
      )}

      {x.implant && (x.implant.type === "surgery" || x.implant.type === "uncover") && (
        <FixturesTable fixtures={x.implant.fixtures} />
      )}
      {!e && (
        <div className="mt-2 space-y-0.5">
          {sessionLines(x, ar)
            .filter(
              (_l, i) =>
                !(
                  x.implant &&
                  (x.implant.type === "surgery" || x.implant.type === "uncover") &&
                  i === 0
                ),
            )
            .map((l, i) => (
              <p
                key={i}
                className={cn("text-[12px] leading-relaxed", i === 0 && "font-bold")}
               
              >
                {l}
              </p>
            ))}
        </div>
      )}
      {x.note && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
          {x.note}
        </p>
      )}
    </li>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full border text-[11px] font-bold transition",
        on
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-extrabold text-foreground/80">{title}</p>
      {children}
    </div>
  );
}

function SessionForm({
  step,
  kind,
  initial,
  number,
  ar,
  onCancel,
  onSave,
}: {
  step: PlanStep;
  kind: TreatmentWork["kind"];
  initial?: WorkSession;
  number: number;
  ar: boolean;
  onCancel: () => void;
  onSave: (s: Omit<WorkSession, "id"> & { id?: string }) => void;
}) {
  const [date, setDate] = useState(initial?.date ?? workToday());
  const [note, setNote] = useState(initial?.note ?? "");
  const [endo, setEndo] = useState<EndoSession>(() => initial?.endo ?? newEndoSession(step));
  const [general, setGeneral] = useState(initial?.general ?? { done: "", materials: "" });
  const [ortho, setOrtho] = useState<OrthoSession>(() => initial?.ortho ?? newOrthoSession(step));
  const [implant, setImplant] = useState<ImplantSession>(
    () => initial?.implant ?? newImplantSession(step),
  );
  const [customSystem, setCustomSystem] = useState(
    () => !!endo.system && !ENDO_SYSTEMS.includes(endo.system),
  );

  const set = (patch: Partial<EndoSession>) => setEndo((e) => ({ ...e, ...patch }));
  const setCanal = (i: number, patch: Partial<EndoSession["canals"][number]>) =>
    setEndo((e) => ({ ...e, canals: e.canals.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const toggleIrrigant = (r: string) =>
    set({
      irrigation: (endo.irrigation ?? []).includes(r)
        ? (endo.irrigation ?? []).filter((x) => x !== r)
        : [...(endo.irrigation ?? []), r],
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (s: string | undefined) => (s ?? "").trim() || undefined;
    onSave({
      id: initial?.id,
      date,
      note: clean(note),
      ...(kind === "endo"
        ? {
            endo: {
              ...endo,
              canals: endo.canals
                .map((c) => ({
                  name: c.name.trim(),
                  length: clean(c.length),
                  ref: clean(c.ref),
                  maf: clean(c.maf),
                }))
                .filter((c) => c.name),
              system: clean(endo.system),
              sealer: clean(endo.sealer),
            },
          }
        : kind === "ortho"
          ? { ortho }
          : kind === "implant"
            ? {
                implant: {
                  ...implant,
                  fixtures: implant.fixtures.filter((fx) => fx.site || fx.brand),
                },
              }
            : { general: { done: clean(general.done), materials: clean(general.materials) } }),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="size-8 rounded-full bg-primary text-primary-foreground text-[12px] font-extrabold flex items-center justify-center">
          {number}
        </span>
        <p className="flex-1 text-[14px] font-display font-extrabold">
          {initial
            ? ar
              ? `تعديل الجلسة ${number}`
              : `Edit session ${number}`
            : ar
              ? `الجلسة ${number}`
              : `Session ${number}`}
        </p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={cn(fieldCls, "w-auto")}
          dir="ltr"
          required
        />
      </div>

      {kind === "ortho" && (
        <>
          <TypePicker
            options={ORTHO_TYPES}
            value={ortho.type}
            onChange={(t) => setOrtho(t === ortho.type ? ortho : newOrthoSession(step, t))}
            ar={ar}
          />
          <OrthoFields value={ortho} onChange={setOrtho} date={date} ar={ar} />
        </>
      )}
      {kind === "implant" && (
        <>
          <TypePicker
            options={IMPLANT_TYPES}
            value={implant.type}
            onChange={(t) => setImplant(t === implant.type ? implant : newImplantSession(step, t))}
            ar={ar}
          />
          <ImplantFields value={implant} onChange={setImplant} date={date} ar={ar} />
        </>
      )}
      {kind === "ortho" || kind === "implant" ? null : kind === "endo" ? (
        <>
          <Section title={ar ? "مرحلة الجلسة" : "Stage"}>
            <div className="flex flex-wrap gap-1.5">
              {ENDO_STAGES.map((s) => (
                <Chip
                  key={s.key}
                  on={endo.stage === s.key}
                  onClick={() => set({ stage: endo.stage === s.key ? undefined : s.key })}
                >
                  {ar ? s.ar : s.en}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title={ar ? "القنوات وأطوال العمل" : "Canals & working lengths"}>
            <div className="rounded-xl border border-border overflow-hidden" dir="ltr">
              <div className="grid grid-cols-[72px_1fr_1fr_1fr_28px] gap-1.5 bg-muted/60 px-2 py-1.5 text-[10px] font-bold text-muted-foreground">
                <span>Canal</span>
                <span>WL (mm)</span>
                <span>Ref. point</span>
                <span>MAF</span>
                <span />
              </div>
              {endo.canals.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[72px_1fr_1fr_1fr_28px] gap-1.5 border-t border-border px-2 py-1.5 items-center"
                >
                  <input
                    value={c.name}
                    onChange={(e) => setCanal(i, { name: e.target.value })}
                    className={cn(fieldCls, "h-9 px-2 font-extrabold")}
                  />
                  <input
                    value={c.length ?? ""}
                    onChange={(e) =>
                      setCanal(i, {
                        length: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                      })
                    }
                    inputMode="decimal"
                    placeholder="21.5"
                    className={cn(fieldCls, "h-9 px-2 font-bold text-primary")}
                  />
                  <input
                    value={c.ref ?? ""}
                    onChange={(e) => setCanal(i, { ref: e.target.value })}
                    placeholder="MB cusp"
                    className={cn(fieldCls, "h-9 px-2")}
                  />
                  <input
                    value={c.maf ?? ""}
                    onChange={(e) => setCanal(i, { maf: e.target.value })}
                    placeholder="25/.06"
                    className={cn(fieldCls, "h-9 px-2")}
                  />
                  <button
                    type="button"
                    onClick={() => set({ canals: endo.canals.filter((_, j) => j !== i) })}
                    className="size-7 rounded-full hover:bg-muted flex items-center justify-center"
                    aria-label={ar ? "حذف القناة" : "Remove canal"}
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set({ canals: [...endo.canals, { name: "" }] })}
              className="h-8 px-3 rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center gap-1"
            >
              <Plus className="size-3.5" strokeWidth={3} />
              {ar ? "إضافة قناة" : "Add canal"}
            </button>
          </Section>

          <Section title={ar ? "نظام الحفر" : "File system"}>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {ENDO_SYSTEMS.map((s) => (
                <Chip
                  key={s}
                  on={!customSystem && endo.system === s}
                  onClick={() => {
                    setCustomSystem(false);
                    set({ system: endo.system === s ? undefined : s });
                  }}
                >
                  {s}
                </Chip>
              ))}
              <Chip
                on={customSystem}
                onClick={() => {
                  setCustomSystem(true);
                  set({ system: "" });
                }}
              >
                {ar ? "أخرى" : "Other"}
              </Chip>
            </div>
            {customSystem && (
              <input
                autoFocus
                value={endo.system ?? ""}
                onChange={(e) => set({ system: e.target.value })}
                placeholder={ar ? "اسم النظام" : "System name"}
                className={fieldCls}
                dir="ltr"
              />
            )}
            <label className="flex items-center gap-2 text-[12px] font-bold pt-1">
              <input
                type="checkbox"
                checked={!!endo.apexLocator}
                onChange={(e) => set({ apexLocator: e.target.checked })}
                className="size-4 accent-primary"
              />
              {ar ? "تم القياس بجهاز تحديد الذروة" : "Measured with an apex locator"}
            </label>
          </Section>

          <Section title={ar ? "الغسل" : "Irrigation"}>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {ENDO_IRRIGANTS.map((r) => (
                <Chip
                  key={r}
                  on={(endo.irrigation ?? []).includes(r)}
                  onClick={() => toggleIrrigant(r)}
                >
                  {r}
                </Chip>
              ))}
            </div>
            {(endo.irrigation ?? []).includes("NaOCl") && (
              <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
                <span className="text-[10px] font-bold text-muted-foreground">NaOCl</span>
                {NAOCL_STRENGTHS.map((s) => (
                  <Chip
                    key={s}
                    on={endo.naocl === s}
                    onClick={() => set({ naocl: endo.naocl === s ? undefined : s })}
                  >
                    {s}
                  </Chip>
                ))}
              </div>
            )}
          </Section>

          <Section title={ar ? "الحشوة الدوائية بين الجلسات" : "Intracanal medicament"}>
            <div className="flex flex-wrap gap-1.5">
              {ENDO_MEDICAMENTS.map((m) => (
                <Chip
                  key={m.key}
                  on={endo.medicament === m.key}
                  onClick={() => set({ medicament: endo.medicament === m.key ? undefined : m.key })}
                >
                  {ar ? m.ar : m.en}
                </Chip>
              ))}
            </div>
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title={ar ? "طريقة حشو القنوات" : "Obturation"}>
              <div className="flex flex-wrap gap-1.5">
                {ENDO_OBTURATION.map((m) => (
                  <Chip
                    key={m.key}
                    on={endo.obturation === m.key}
                    onClick={() =>
                      set({ obturation: endo.obturation === m.key ? undefined : m.key })
                    }
                  >
                    {ar ? m.ar : m.en}
                  </Chip>
                ))}
              </div>
            </Section>
            <Section title={ar ? "السيلر" : "Sealer"}>
              <div className="flex flex-wrap gap-1.5" dir="ltr">
                {ENDO_SEALERS.map((s) => (
                  <Chip
                    key={s}
                    on={endo.sealer === s}
                    onClick={() => set({ sealer: endo.sealer === s ? undefined : s })}
                  >
                    {s}
                  </Chip>
                ))}
              </div>
              <input
                value={endo.sealer ?? ""}
                onChange={(e) => set({ sealer: e.target.value })}
                placeholder={ar ? "أو اكتب اسم السيلر" : "Or type the sealer"}
                className={fieldCls}
                dir="ltr"
              />
            </Section>
          </div>

          <Section title={ar ? "الترميم بعد الجلسة" : "Restoration"}>
            <div className="flex flex-wrap gap-1.5">
              {ENDO_RESTORATION.map((m) => (
                <Chip
                  key={m.key}
                  on={endo.restoration === m.key}
                  onClick={() =>
                    set({ restoration: endo.restoration === m.key ? undefined : m.key })
                  }
                >
                  {ar ? m.ar : m.en}
                </Chip>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <>
          <Section title={ar ? "ما تم عمله" : "What was done"}>
            <textarea
              rows={3}
              value={general.done ?? ""}
              onChange={(e) => setGeneral({ ...general, done: e.target.value })}
              placeholder={
                ar ? "مثال: تحضير السن وأخذ الطبعة" : "e.g. Tooth prepared, impression taken"
              }
              className={cn(fieldCls, "h-auto py-2 resize-none")}
            />
          </Section>
          <Section title={ar ? "المواد المستخدمة" : "Materials used"}>
            <input
              value={general.materials ?? ""}
              onChange={(e) => setGeneral({ ...general, materials: e.target.value })}
              placeholder={ar ? "مثال: كومبوزت A2، لاصق" : "e.g. Composite A2, bonding"}
              className={fieldCls}
            />
          </Section>
        </>
      )}

      <Section title={ar ? "ملاحظات الجلسة" : "Session notes"}>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            ar ? "ألم، مضاعفات، موعد الجلسة القادمة…" : "Pain, complications, next session…"
          }
          className={cn(fieldCls, "h-auto py-2 resize-none")}
        />
      </Section>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl bg-muted text-[12px] font-bold"
        >
          {ar ? "إلغاء" : "Cancel"}
        </button>
        <button
          type="submit"
          className="flex-[2] h-11 rounded-xl bg-primary text-primary-foreground text-[12px] font-display font-extrabold"
        >
          {ar ? "حفظ الجلسة" : "Save session"}
        </button>
      </div>
    </form>
  );
}

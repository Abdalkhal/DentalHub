import { useState, type ReactNode } from "react";
import { Alert, Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Pencil,
  PlayCircle,
  Plus,
  RotateCcw,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react-native";

import { Text } from "@/components/ui";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { CalendarPickerModal } from "@/components/CalendarPickerModal";
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
  IMPLANT_TYPES,
  ORTHO_TYPES,
  implantLoadingDate,
  newImplantSession,
  newOrthoSession,
  orthoProgress,
  sessionLines,
  sessionTypeLabel,
  type ImplantSession,
  type OrthoSession,
  type TreatmentWork,
} from "@/lib/treatmentWork";
import {
  FixturesList,
  ImplantFields,
  OrthoFields,
  TypePicker,
} from "@/components/TreatmentWorkForms";

const PRIMARY = "#2563EB";
const inputCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] text-slate-800";
const ltr = { writingDirection: "ltr" as const, textAlign: "left" as const };

function StageBadge({ step, ar }: { step: PlanStep; ar: boolean }) {
  const m = WORK_STAGE_META[workStage(step)];
  return (
    <View
      style={{ backgroundColor: m.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: m.fg }}>{ar ? m.ar : m.en}</Text>
    </View>
  );
}

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
    <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
      <StageBadge step={step} ar={ar} />
      {stage === "proposed" && (
        <Pressable
          onPress={() => approveStep(p.id, step.id, true)}
          className="h-7 flex-row items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5"
        >
          <ThumbsUp size={13} color="#6D28D9" />
          <Text className="text-[11px] font-bold text-violet-700">
            {ar ? "وافق المريض" : "Patient agreed"}
          </Text>
        </Pressable>
      )}
      {stage === "approved" && (
        <>
          <Pressable
            onPress={() => {
              startStep(p.id, step);
              onOpen();
            }}
            className="h-7 flex-row items-center gap-1 rounded-full bg-primary px-3"
          >
            <PlayCircle size={13} color="#FFFFFF" />
            <Text className="text-[11px] font-extrabold text-white">
              {ar ? "ابدأ العلاج" : "Start treatment"}
            </Text>
          </Pressable>
          <Pressable onPress={() => approveStep(p.id, step.id, false)} hitSlop={6}>
            <Text className="text-[10px] text-slate-400 underline">{ar ? "تراجع" : "Undo"}</Text>
          </Pressable>
        </>
      )}
      {(stage === "inProgress" || stage === "done") && (
        <Pressable
          onPress={onOpen}
          className="h-7 flex-row items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5"
        >
          <ClipboardList size={13} color={PRIMARY} />
          <Text className="text-[11px] font-bold text-primary">
            {ar ? "ملف العمل" : "Work sheet"}
          </Text>
          <View className="rounded-full bg-blue-100 px-1.5">
            <Text className="text-[10px] font-bold text-primary">{sessions}</Text>
          </View>
        </Pressable>
      )}
    </View>
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
  const insets = useSafeAreaInsets();
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

  const finish = () => {
    const msg = mark
      ? ar
        ? `سيُعلَّم السن ${step.tooth || ""} في خريطة الأسنان.`
        : `Tooth ${step.tooth || ""} will be marked on the chart.`
      : "";
    Alert.alert(ar ? "إنهاء العلاج؟" : "Finish the treatment?", msg, [
      { text: ar ? "إلغاء" : "Cancel", style: "cancel" },
      { text: ar ? "إنهاء" : "Finish", onPress: () => finishStep(p.id, step.id) },
    ]);
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={editing ? () => setEditing(null) : onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="max-h-[92%] overflow-hidden rounded-t-3xl bg-white"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-start gap-3 border-b border-slate-100 px-4 pb-3 pt-4">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
              {step.tooth ? (
                <Text
                  numberOfLines={2}
                  className="text-center text-[11px] font-extrabold text-white"
                >
                  {"\u2066" + step.tooth + "\u2069"}
                </Text>
              ) : (
                <ClipboardList size={20} color="#FFFFFF" />
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-[15px] font-extrabold text-slate-900">
                {step.title}
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                <StageBadge step={step} ar={ar} />
                {!!step.work?.startedAt && (
                  <Text className="text-[10px] text-slate-400">
                    {ar ? "البدء " : "Started "}
                    {"⁦" + step.work.startedAt + "⁩"}
                  </Text>
                )}
                {!!step.work?.finishedAt && (
                  <Text className="text-[10px] text-slate-400">
                    {ar ? "· الانتهاء " : "· Finished "}
                    {"⁦" + step.work.finishedAt + "⁩"}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={16} color="#64748B" />
            </Pressable>
          </View>

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
            <KeyboardAwareScrollView className="px-4" contentContainerClassName="gap-3 py-4">
              {progress && (
                <View className="rounded-2xl bg-blue-50 p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-extrabold text-slate-800">
                      {ar ? "تقدّم التقويم" : "Treatment progress"}
                    </Text>
                    <Text className="text-[11px] font-extrabold text-primary">
                      {ar
                        ? `الشهر ${progress.month} من ${progress.of}`
                        : `Month ${progress.month} of ${progress.of}`}
                    </Text>
                  </View>
                  <View className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <View
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (progress.month / progress.of) * 100)}%` }}
                    />
                  </View>
                </View>
              )}
              {!!loading && (
                <View className="rounded-2xl bg-emerald-50 px-3 py-2.5">
                  <Text className="text-[11px] font-bold text-emerald-800">
                    {ar ? "موعد التحميل المتوقع " : "Expected loading "}
                    {"\u2066" + loading + "\u2069"}
                  </Text>
                </View>
              )}
              {sessions.length === 0 ? (
                <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                  <ClipboardList size={26} color="#94A3B8" />
                  <Text className="mt-2 text-[12px] font-bold text-slate-700">
                    {ar ? "لا توجد جلسات بعد" : "No sessions yet"}
                  </Text>
                  <Text className="mt-0.5 text-center text-[11px] text-slate-400">
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
                  </Text>
                </View>
              ) : (
                sessions.map((x, i) => (
                  <SessionCard
                    key={x.id}
                    x={x}
                    n={i + 1}
                    ar={ar}
                    onEdit={() => setEditing(x)}
                    onDelete={() =>
                      Alert.alert(ar ? `حذف الجلسة ${i + 1}؟` : `Delete session ${i + 1}?`, "", [
                        { text: ar ? "إلغاء" : "Cancel", style: "cancel" },
                        {
                          text: ar ? "حذف" : "Delete",
                          style: "destructive",
                          onPress: () => removeSession(p.id, step.id, x.id),
                        },
                      ])
                    }
                  />
                ))
              )}

              <Pressable
                onPress={() => setEditing("new")}
                className="h-11 flex-row items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-blue-300"
              >
                <Plus size={16} color={PRIMARY} strokeWidth={3} />
                <Text className="text-[12px] font-extrabold text-primary">
                  {ar ? "جلسة جديدة" : "New session"}
                </Text>
              </Pressable>

              {done ? (
                <Pressable
                  onPress={() => reopenStep(p.id, step.id)}
                  className="h-11 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-100"
                >
                  <RotateCcw size={16} color="#334155" />
                  <Text className="text-[12px] font-bold text-slate-700">
                    {ar ? "إعادة فتح العلاج" : "Reopen treatment"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={finish}
                  className="h-11 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-600"
                >
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text className="text-[12px] font-extrabold text-white">
                    {ar ? "إنهاء العلاج" : "Finish treatment"}
                  </Text>
                </Pressable>
              )}
            </KeyboardAwareScrollView>
          )}
        </View>
      </View>
    </Modal>
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
  const chips = e
    ? [
        e.system,
        e.apexLocator ? (ar ? "جهاز تحديد الذروة" : "Apex locator") : "",
        ...(e.irrigation ?? []).map((r) => (r === "NaOCl" && e.naocl ? `NaOCl ${e.naocl}` : r)),
        e.medicament && e.medicament !== "none"
          ? optionLabel(ENDO_MEDICAMENTS, e.medicament, ar)
          : "",
        optionLabel(ENDO_OBTURATION, e.obturation, ar),
        e.sealer,
        optionLabel(ENDO_RESTORATION, e.restoration, ar),
      ].filter(Boolean)
    : [];
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-3">
      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-50">
          <Text className="text-[11px] font-extrabold text-primary">{n}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[12px] font-extrabold text-slate-800">
            {ar ? `الجلسة ${n}` : `Session ${n}`}
            {sessionTypeLabel(x, ar) ? ` · ${sessionTypeLabel(x, ar)}` : ""}
          </Text>
          <Text className="text-[10px] text-slate-400">{"⁦" + x.date + "⁩"}</Text>
        </View>
        <Pressable onPress={onEdit} hitSlop={6} className="p-1.5">
          <Pencil size={14} color="#64748B" />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={6} className="p-1.5">
          <Trash2 size={14} color="#94A3B8" />
        </Pressable>
      </View>

      {e && e.canals.some((c) => c.length || c.maf || c.ref) && (
        <View
          className="mt-2.5 overflow-hidden rounded-xl border border-slate-200"
          style={{ direction: "ltr" }}
        >
          <View className="flex-row bg-slate-50 px-2 py-1.5">
            {["Canal", "WL (mm)", "Ref.", "MAF"].map((h) => (
              <Text key={h} className="flex-1 text-[10px] font-bold text-slate-500" style={ltr}>
                {h}
              </Text>
            ))}
          </View>
          {e.canals.map((c, i) => (
            <View key={i} className="flex-row border-t border-slate-100 px-2 py-1.5">
              <Text className="flex-1 text-[11px] font-extrabold text-slate-800" style={ltr}>
                {c.name}
              </Text>
              <Text className="flex-1 text-[11px] font-bold text-primary" style={ltr}>
                {c.length || "—"}
              </Text>
              <Text className="flex-1 text-[11px] text-slate-600" style={ltr}>
                {c.ref || "—"}
              </Text>
              <Text className="flex-1 text-[11px] text-slate-600" style={ltr}>
                {c.maf || "—"}
              </Text>
            </View>
          ))}
        </View>
      )}

      {chips.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {chips.map((t, i) => (
            <View key={i} className="rounded-full bg-slate-100 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-slate-600">{t}</Text>
            </View>
          ))}
        </View>
      )}

      {!!x.implant && (x.implant.type === "surgery" || x.implant.type === "uncover") && (
        <FixturesList fixtures={x.implant.fixtures} />
      )}
      {!e && (
        <View className="mt-2 gap-0.5">
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
              <Text
                key={i}
                className={cn(
                  "text-[12px] leading-5 text-slate-700",
                  i === 0 && "font-bold text-slate-800",
                )}
              >
                {l}
              </Text>
            ))}
        </View>
      )}
      {!!x.note && (
        <View className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
          <Text className="text-[11px] text-amber-900">{x.note}</Text>
        </View>
      )}
    </View>
  );
}

function Chip({
  on,
  onPress,
  children,
}: {
  on: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "h-8 justify-center rounded-full border px-3",
        on ? "border-primary bg-primary" : "border-slate-200 bg-white",
      )}
    >
      <Text className={cn("text-[11px] font-bold", on ? "text-white" : "text-slate-500")}>
        {children}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-extrabold text-slate-700">{title}</Text>
      {children}
    </View>
  );
}

function Chips({ children, isLtr }: { children: ReactNode; isLtr?: boolean }) {
  return (
    <View className="flex-row flex-wrap gap-1.5" style={isLtr ? { direction: "ltr" } : undefined}>
      {children}
    </View>
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
  const [pickingDate, setPickingDate] = useState(false);
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
  const toggle = <
    K extends "stage" | "medicament" | "obturation" | "restoration" | "naocl" | "sealer",
  >(
    k: K,
    v: string,
  ) => set({ [k]: endo[k] === v ? undefined : v } as Partial<EndoSession>);
  const toggleIrrigant = (r: string) =>
    set({
      irrigation: (endo.irrigation ?? []).includes(r)
        ? (endo.irrigation ?? []).filter((x) => x !== r)
        : [...(endo.irrigation ?? []), r],
    });

  const submit = () => {
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
    <>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        className="px-4"
        contentContainerClassName="gap-4 py-4"
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Text className="text-[12px] font-extrabold text-white">{number}</Text>
          </View>
          <Text className="flex-1 text-[14px] font-extrabold text-slate-900">
            {initial
              ? ar
                ? `تعديل الجلسة ${number}`
                : `Edit session ${number}`
              : ar
                ? `الجلسة ${number}`
                : `Session ${number}`}
          </Text>
          <Pressable
            onPress={() => setPickingDate(true)}
            className="h-9 flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5"
          >
            <CalendarDays size={14} color="#64748B" />
            <Text className="text-[12px] font-bold text-slate-700">{"⁦" + date + "⁩"}</Text>
          </Pressable>
        </View>

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
              onChange={(t) =>
                setImplant(t === implant.type ? implant : newImplantSession(step, t))
              }
              ar={ar}
            />
            <ImplantFields value={implant} onChange={setImplant} date={date} ar={ar} />
          </>
        )}
        {kind === "ortho" || kind === "implant" ? null : kind === "endo" ? (
          <>
            <Section title={ar ? "مرحلة الجلسة" : "Stage"}>
              <Chips>
                {ENDO_STAGES.map((s) => (
                  <Chip
                    key={s.key}
                    on={endo.stage === s.key}
                    onPress={() => toggle("stage", s.key)}
                  >
                    {ar ? s.ar : s.en}
                  </Chip>
                ))}
              </Chips>
            </Section>

            <Section title={ar ? "القنوات وأطوال العمل" : "Canals & working lengths"}>
              <View
                className="overflow-hidden rounded-xl border border-slate-200"
                style={{ direction: "ltr" }}
              >
                <View className="flex-row gap-1.5 bg-slate-50 px-2 py-1.5">
                  <Text className="w-14 text-[10px] font-bold text-slate-500" style={ltr}>
                    Canal
                  </Text>
                  <Text className="flex-1 text-[10px] font-bold text-slate-500" style={ltr}>
                    WL (mm)
                  </Text>
                  <Text className="flex-1 text-[10px] font-bold text-slate-500" style={ltr}>
                    Ref.
                  </Text>
                  <Text className="flex-1 text-[10px] font-bold text-slate-500" style={ltr}>
                    MAF
                  </Text>
                  <View className="w-6" />
                </View>
                {endo.canals.map((c, i) => (
                  <View
                    key={i}
                    className="flex-row items-center gap-1.5 border-t border-slate-100 px-2 py-1.5"
                  >
                    <TextInput
                      value={c.name}
                      onChangeText={(v) => setCanal(i, { name: v })}
                      autoCapitalize="characters"
                      className={cn(inputCls, "w-14 h-9 px-2 font-extrabold")}
                      style={ltr}
                    />
                    <TextInput
                      value={c.length ?? ""}
                      onChangeText={(v) =>
                        setCanal(i, { length: v.replace(/[^\d.,]/g, "").replace(",", ".") })
                      }
                      keyboardType="decimal-pad"
                      placeholder="21.5"
                      placeholderTextColor="#CBD5E1"
                      className={cn(inputCls, "h-9 flex-1 px-2 font-bold text-primary")}
                      style={ltr}
                    />
                    <TextInput
                      value={c.ref ?? ""}
                      onChangeText={(v) => setCanal(i, { ref: v })}
                      placeholder="MB cusp"
                      placeholderTextColor="#CBD5E1"
                      className={cn(inputCls, "h-9 flex-1 px-2")}
                      style={ltr}
                    />
                    <TextInput
                      value={c.maf ?? ""}
                      onChangeText={(v) => setCanal(i, { maf: v })}
                      placeholder="25/.06"
                      placeholderTextColor="#CBD5E1"
                      className={cn(inputCls, "h-9 flex-1 px-2")}
                      style={ltr}
                    />
                    <Pressable
                      onPress={() => set({ canals: endo.canals.filter((_, j) => j !== i) })}
                      hitSlop={6}
                      className="w-6 items-center"
                    >
                      <X size={14} color="#94A3B8" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => set({ canals: [...endo.canals, { name: "" }] })}
                className="h-8 flex-row items-center gap-1 self-start rounded-full bg-blue-50 px-3"
              >
                <Plus size={13} color={PRIMARY} strokeWidth={3} />
                <Text className="text-[11px] font-bold text-primary">
                  {ar ? "إضافة قناة" : "Add canal"}
                </Text>
              </Pressable>
            </Section>

            <Section title={ar ? "نظام الحفر" : "File system"}>
              <Chips isLtr>
                {ENDO_SYSTEMS.map((s) => (
                  <Chip
                    key={s}
                    on={!customSystem && endo.system === s}
                    onPress={() => {
                      setCustomSystem(false);
                      set({ system: endo.system === s ? undefined : s });
                    }}
                  >
                    {s}
                  </Chip>
                ))}
                <Chip
                  on={customSystem}
                  onPress={() => {
                    setCustomSystem(true);
                    set({ system: "" });
                  }}
                >
                  {ar ? "أخرى" : "Other"}
                </Chip>
              </Chips>
              {customSystem && (
                <TextInput
                  autoFocus
                  value={endo.system ?? ""}
                  onChangeText={(v) => set({ system: v })}
                  placeholder={ar ? "اسم النظام" : "System name"}
                  placeholderTextColor="#94A3B8"
                  className={inputCls}
                  style={ltr}
                />
              )}
              <Pressable
                onPress={() => set({ apexLocator: !endo.apexLocator })}
                className="flex-row items-center gap-2 pt-1"
              >
                <View
                  className={cn(
                    "h-5 w-5 items-center justify-center rounded-md border",
                    endo.apexLocator ? "border-primary bg-primary" : "border-slate-300 bg-white",
                  )}
                >
                  {endo.apexLocator && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text className="text-[12px] font-bold text-slate-700">
                  {ar ? "تم القياس بجهاز تحديد الذروة" : "Measured with an apex locator"}
                </Text>
              </Pressable>
            </Section>

            <Section title={ar ? "الغسل" : "Irrigation"}>
              <Chips isLtr>
                {ENDO_IRRIGANTS.map((r) => (
                  <Chip
                    key={r}
                    on={(endo.irrigation ?? []).includes(r)}
                    onPress={() => toggleIrrigant(r)}
                  >
                    {r}
                  </Chip>
                ))}
              </Chips>
              {(endo.irrigation ?? []).includes("NaOCl") && (
                <Chips isLtr>
                  {NAOCL_STRENGTHS.map((s) => (
                    <Chip key={s} on={endo.naocl === s} onPress={() => toggle("naocl", s)}>
                      {`NaOCl ${s}`}
                    </Chip>
                  ))}
                </Chips>
              )}
            </Section>

            <Section title={ar ? "الحشوة الدوائية بين الجلسات" : "Intracanal medicament"}>
              <Chips>
                {ENDO_MEDICAMENTS.map((m) => (
                  <Chip
                    key={m.key}
                    on={endo.medicament === m.key}
                    onPress={() => toggle("medicament", m.key)}
                  >
                    {ar ? m.ar : m.en}
                  </Chip>
                ))}
              </Chips>
            </Section>

            <Section title={ar ? "طريقة حشو القنوات" : "Obturation"}>
              <Chips>
                {ENDO_OBTURATION.map((m) => (
                  <Chip
                    key={m.key}
                    on={endo.obturation === m.key}
                    onPress={() => toggle("obturation", m.key)}
                  >
                    {ar ? m.ar : m.en}
                  </Chip>
                ))}
              </Chips>
            </Section>

            <Section title={ar ? "السيلر" : "Sealer"}>
              <Chips isLtr>
                {ENDO_SEALERS.map((s) => (
                  <Chip key={s} on={endo.sealer === s} onPress={() => toggle("sealer", s)}>
                    {s}
                  </Chip>
                ))}
              </Chips>
              <TextInput
                value={endo.sealer ?? ""}
                onChangeText={(v) => set({ sealer: v })}
                placeholder={ar ? "أو اكتب اسم السيلر" : "Or type the sealer"}
                placeholderTextColor="#94A3B8"
                className={inputCls}
                style={ltr}
              />
            </Section>

            <Section title={ar ? "الترميم بعد الجلسة" : "Restoration"}>
              <Chips>
                {ENDO_RESTORATION.map((m) => (
                  <Chip
                    key={m.key}
                    on={endo.restoration === m.key}
                    onPress={() => toggle("restoration", m.key)}
                  >
                    {ar ? m.ar : m.en}
                  </Chip>
                ))}
              </Chips>
            </Section>
          </>
        ) : (
          <>
            <Section title={ar ? "ما تم عمله" : "What was done"}>
              <TextInput
                multiline
                value={general.done ?? ""}
                onChangeText={(v) => setGeneral({ ...general, done: v })}
                placeholder={
                  ar ? "مثال: تحضير السن وأخذ الطبعة" : "e.g. Tooth prepared, impression taken"
                }
                placeholderTextColor="#94A3B8"
                className={cn(inputCls, "h-20 py-2")}
                style={{ textAlignVertical: "top" }}
              />
            </Section>
            <Section title={ar ? "المواد المستخدمة" : "Materials used"}>
              <TextInput
                value={general.materials ?? ""}
                onChangeText={(v) => setGeneral({ ...general, materials: v })}
                placeholder={ar ? "مثال: كومبوزت A2، لاصق" : "e.g. Composite A2, bonding"}
                placeholderTextColor="#94A3B8"
                className={inputCls}
              />
            </Section>
          </>
        )}

        <Section title={ar ? "ملاحظات الجلسة" : "Session notes"}>
          <TextInput
            multiline
            value={note}
            onChangeText={setNote}
            placeholder={
              ar ? "ألم، مضاعفات، موعد الجلسة القادمة…" : "Pain, complications, next session…"
            }
            placeholderTextColor="#94A3B8"
            className={cn(inputCls, "h-16 py-2")}
            style={{ textAlignVertical: "top" }}
          />
        </Section>
      </KeyboardAwareScrollView>

      <View className="flex-row gap-2 border-t border-slate-100 px-4 py-3">
        <Pressable
          onPress={onCancel}
          className="h-11 flex-1 items-center justify-center rounded-xl bg-slate-100"
        >
          <Text className="text-[12px] font-bold text-slate-700">{ar ? "إلغاء" : "Cancel"}</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          className="h-11 flex-[2] items-center justify-center rounded-xl bg-primary"
        >
          <Text className="text-[12px] font-extrabold text-white">
            {ar ? "حفظ الجلسة" : "Save session"}
          </Text>
        </Pressable>
      </View>

      <CalendarPickerModal
        visible={pickingDate}
        onClose={() => setPickingDate(false)}
        selectedDate={date}
        onSelect={(ds) => {
          setDate(ds);
          setPickingDate(false);
        }}
      />
    </>
  );
}

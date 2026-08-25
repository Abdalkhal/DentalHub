import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Loader2, Phone, Instagram, MapPin, Eraser } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession, useUserRole } from "@/lib/useAuth";
import { submitDentistCase } from "@/lib/ordersStore";
import { createNotification } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { FDI_UPPER, FDI_LOWER, UPPER_POS, LOWER_POS } from "@/components/DentalArch";
import archUpper from "@/assets/arch-upper.png";
import archLower from "@/assets/arch-lower.png";
import { useLabCatalog, type LabCatalog } from "@/lib/catalogStore";
import {
  WORK_TYPES as DENTAL_WORK_TYPES,
  RULES,
  type MaterialId,
  type WorkTypeId,
  type MaterialRules,
} from "@/lib/dentalConfig";

type LabRxFormModalProps = {
  labId: string;
  labName: string;
  labPhone?: string;
  labAddress?: string;
  labInstagram?: string;
  open: boolean;
  onClose: () => void;
};

type WorkTypeKey = "crown" | "bridge" | "veneer" | "inlay";

const WORK_TYPES: Record<WorkTypeKey, { ar: string; en: string; dot: string; soft: string }> = {
  crown: {
    ar: "تاج",
    en: "Crown",
    dot: "bg-blue-500",
    soft: "bg-blue-50 border-blue-400 text-blue-700",
  },
  bridge: {
    ar: "جسر",
    en: "Bridge",
    dot: "bg-green-500",
    soft: "bg-green-50 border-green-400 text-green-700",
  },
  veneer: {
    ar: "فينير",
    en: "Veneer",
    dot: "bg-purple-500",
    soft: "bg-purple-50 border-purple-400 text-purple-700",
  },
  inlay: {
    ar: "حشوة داخلية/خارجية",
    en: "Inlay/Onlay",
    dot: "bg-orange-500",
    soft: "bg-orange-50 border-orange-400 text-orange-700",
  },
};

const WORK_TYPE_ORDER: WorkTypeKey[] = ["crown", "bridge", "veneer", "inlay"];

type CategoryDef = {
  id: string;
  ar: string;
  en: string;
  color: string;
  material: MaterialId;
  items: { ar: string; en: string; wt?: WorkTypeId }[];
};

const MATERIAL_COLORS: Record<string, string> = {
  "material.emax": "bg-sky-500",
  "material.zirconia": "bg-violet-500",
  "material.feldspathic": "bg-rose-500",
  "material.pmma": "bg-amber-500",
  "material.pfm": "bg-slate-500",
  "material.full_cast_metal": "bg-stone-500",
  "material.clear_aligner": "bg-emerald-500",
  "material.titanium_bar": "bg-cyan-600",
};

const DENTAL_WORK_TYPE_BY_ID = Object.fromEntries(
  DENTAL_WORK_TYPES.map((w) => [w.id, w]),
) as Record<string, { ar: string; en: string }>;

/**
 * Builds the dentist-facing categories straight from the lab's catalog
 * (custom services or `DEFAULT_LAB_SERVICES` fallback), so the doctor sees
 * the exact materials and work types the lab actually offers.
 */
function buildCategories(catalog: LabCatalog): CategoryDef[] {
  return catalog.materials.map((m) => {
    const material = m.id as MaterialId;
    const rule = (RULES as Record<string, MaterialRules | undefined>)[material];
    const allowed = rule?.allowedWorkTypes ?? [];
    const color = MATERIAL_COLORS[m.id] ?? "bg-slate-400";

    const items =
      allowed.length > 0
        ? allowed
            .filter((wt) => DENTAL_WORK_TYPE_BY_ID[wt])
            .map((wt) => ({
              ar: `${DENTAL_WORK_TYPE_BY_ID[wt].ar} ${m.ar}`,
              en: `${DENTAL_WORK_TYPE_BY_ID[wt].en} ${m.en}`,
              wt,
            }))
        : [{ ar: m.ar, en: m.en }];

    return { id: m.id, ar: m.ar, en: m.en, color, material, items };
  });
}

const LOWER_OPTIONS = [
  { id: "night_guard", ar: "واقي ليلي", en: "Night guard" },
  { id: "retainer", ar: "مثبّت", en: "Retainer" },
  { id: "temporary", ar: "وحدة مؤقتة", en: "Temporary unit" },
];

const LOWER_SUB = [
  { id: "partial", ar: "جزئي", en: "Partial" },
  { id: "complete", ar: "كامل", en: "Complete" },
  { id: "acrylic", ar: "أكريليك", en: "Acrylic" },
];

type Shade = { code: string; hex: string };

const VITA_CLASSICAL: Shade[] = [
  { code: "A1", hex: "#F5E6D3" },
  { code: "A2", hex: "#E8D5B7" },
  { code: "A3", hex: "#D4B896" },
  { code: "A3.5", hex: "#C4A57A" },
  { code: "A4", hex: "#B08D62" },
  { code: "B1", hex: "#F2E9DC" },
  { code: "B2", hex: "#E1D3B8" },
  { code: "B3", hex: "#CFB88F" },
  { code: "B4", hex: "#BBA071" },
  { code: "C1", hex: "#EBE0D3" },
  { code: "C2", hex: "#D6C5AD" },
  { code: "C3", hex: "#C0A98A" },
  { code: "C4", hex: "#A88D6B" },
  { code: "D2", hex: "#E0D2BB" },
  { code: "D3", hex: "#CCB894" },
  { code: "D4", hex: "#B39A73" },
];

const VITA_3D: Shade[] = [
  { code: "1M1", hex: "#F7F2EA" },
  { code: "1M2", hex: "#F2E7D6" },
  { code: "2M1", hex: "#EFE6D8" },
  { code: "2M2", hex: "#EAD9C2" },
  { code: "2L1.5", hex: "#E7DCC8" },
  { code: "2R1.5", hex: "#EBDDC9" },
  { code: "3M1", hex: "#E4D5BC" },
  { code: "3M2", hex: "#DCC5A6" },
  { code: "3L1.5", hex: "#DDC9A8" },
  { code: "3L2.5", hex: "#D2B68E" },
  { code: "3R1.5", hex: "#E0CFB0" },
  { code: "3R2.5", hex: "#D6BC99" },
  { code: "4M1", hex: "#D6C3A2" },
  { code: "4M2", hex: "#CBB08A" },
  { code: "4L1.5", hex: "#D0B896" },
  { code: "4L2.5", hex: "#C4A477" },
  { code: "4R1.5", hex: "#D3BC9B" },
  { code: "5M1", hex: "#C7AC85" },
  { code: "5M2", hex: "#BB9C72" },
  { code: "5M3", hex: "#AD8C60" },
];

const VITA_BLEACH: Shade[] = [
  { code: "BL1", hex: "#FBF7F1" },
  { code: "BL2", hex: "#F7F1E6" },
  { code: "BL3", hex: "#F3EBDB" },
  { code: "BL4", hex: "#EFE5D1" },
];

type VitaTab = "classical" | "3d" | "bleach" | "others";

const cardCls = "bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)]";

export function LabRxFormModal({
  labId,
  labName,
  labPhone,
  labAddress,
  labInstagram,
  open,
  onClose,
}: LabRxFormModalProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const { catalog } = useLabCatalog(labId);

  const enabledWorkTypes = new Set(catalog.workTypes.map((w) => w.id));
  const categories = useMemo(() => buildCategories(catalog), [catalog]);

  // Reverse lookups used to map the doctor's selection back to clean ids.
  const itemMaterial = useMemo(() => {
    const map = new Map<string, MaterialId>();
    categories.forEach((c) => {
      c.items.forEach((it) => {
        map.set(ar ? it.ar : it.en, c.material);
      });
    });
    return map;
  }, [categories, ar]);

  const itemWorkType = useMemo(() => {
    const map = new Map<string, WorkTypeId>();
    categories.forEach((c) => {
      c.items.forEach((it) => {
        if (it.wt) map.set(ar ? it.ar : it.en, it.wt);
      });
    });
    return map;
  }, [categories, ar]);

  const [patient, setPatient] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState<"male" | "female" | "">("");
  const [patientPhone, setPatientPhone] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");

  const [activeWorkType, setActiveWorkType] = useState<WorkTypeKey | null>(null);
  const [teeth, setTeeth] = useState<Record<number, WorkTypeKey>>({});
  const [activeTooth, setActiveTooth] = useState<number | null>(null);
  const [toothItems, setToothItems] = useState<Record<number, string[]>>({});

  const [lowerSelected, setLowerSelected] = useState<string[]>([]);
  const [lowerSubSelected, setLowerSubSelected] = useState<string[]>([]);

  const [vitaTab, setVitaTab] = useState<VitaTab>("classical");
  const [shade, setShade] = useState("");
  const [customShade, setCustomShade] = useState("");
  const [unitsCount, setUnitsCount] = useState("1");

  const [notes, setNotes] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const docName =
      role?.accountType === "dentist"
        ? `${role.name || ""} ${role.surname || ""}`.trim()
        : user?.displayName || user?.email || "";
    setDoctorName(docName);
  }, [open, role, user]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
    }
  }, [open]);

  if (!open) return null;

  const displayName = (item: { ar: string; en: string }) => (ar ? item.ar : item.en);

  const selectTooth = (n: number) => {
    setActiveTooth(n);
    if (activeWorkType) {
      setTeeth((prev) => {
        const next = { ...prev };
        if (next[n] === activeWorkType) delete next[n];
        else next[n] = activeWorkType;
        return next;
      });
    }
  };

  const toggleItem = (itemLabel: string) => {
    if (activeTooth == null) return;
    setToothItems((prev) => {
      const cur = prev[activeTooth] || [];
      const next = cur.includes(itemLabel)
        ? cur.filter((x) => x !== itemLabel)
        : [...cur, itemLabel];
      return { ...prev, [activeTooth]: next };
    });
  };

  const getItemTeeth = (itemLabel: string): number[] =>
    Object.entries(toothItems)
      .filter(([, items]) => items.includes(itemLabel))
      .map(([n]) => Number(n));

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const onNotesChange = (v: string) => {
    if (v.trim().split(/\s+/).filter(Boolean).length > 200) return;
    setNotes(v);
  };

  const pickShade = (code: string) => {
    setShade(code);
    setCustomShade("");
  };

  const clearSignature = () => {
    setSigDataUrl(null);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) setSigDataUrl(canvas.toDataURL("image/png"));
  };

  const signature = sigDataUrl || doctorName.trim();

  const handleSubmit = async () => {
    setError(null);
    if (!patient.trim()) {
      setError(ar ? "الرجاء إدخال اسم المريض" : "Please enter patient name");
      return;
    }

    const allItems: string[] = [];
    Object.entries(toothItems).forEach(([n, items]) => {
      items.forEach((it) => allItems.push(`${it} #${n}`));
    });
    lowerSelected.forEach((id) => {
      const o = LOWER_OPTIONS.find((x) => x.id === id);
      if (o) allItems.push(o.en);
    });
    lowerSubSelected.forEach((id) => {
      const o = LOWER_SUB.find((x) => x.id === id);
      if (o) allItems.push(o.en);
    });

    const toothSummary = Object.entries(teeth)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([n, t]) => `${WORK_TYPES[t].en} ${n}`);

    const workType =
      [...allItems, ...toothSummary].join(" · ") || (ar ? "غير محدد" : "Unspecified");

    // Determine the doctor's primary material & work type so the lab can
    // pre-select them accurately on confirmation.
    let primaryMaterial: MaterialId | undefined;
    let primaryWorkType: WorkTypeId | undefined;
    for (const items of Object.values(toothItems)) {
      for (const label of items) {
        if (!primaryMaterial) primaryMaterial = itemMaterial.get(label);
        if (!primaryWorkType) primaryWorkType = itemWorkType.get(label);
      }
      if (primaryMaterial && primaryWorkType) break;
    }
    if (!primaryWorkType) {
      const counts: Record<string, number> = {};
      Object.values(teeth).forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as
        | WorkTypeId
        | undefined;
      if (top) primaryWorkType = top;
    }

    setBusy(true);
    try {
      const order = await submitDentistCase(labId, {
        patient: patient.trim(),
        doctor: doctorName || (ar ? "غير محدد" : "Unspecified"),
        workType,
        dueDate: deliveryDate || "",
        unitsCount: parseInt(unitsCount, 10) || 1,
        notes: notes.trim(),
        clinic: role?.clinicName || (ar ? "غير محدد" : "Unspecified"),
        dentistId: user?.uid ?? "unknown",
        dentistName: user?.displayName ?? user?.email ?? (ar ? "طبيب" : "Dentist"),
        shade: shade || undefined,
        material: primaryMaterial,
        patientAge: patientAge || undefined,
        patientGender: patientGender || undefined,
        patientPhone: patientPhone || undefined,
        doctorSignature: signature || undefined,
        rxTeeth: Object.fromEntries(Object.entries(teeth).map(([n, t]) => [n, t])),
        rxItems: allItems,
        rxData: {
          toothItems,
          teeth,
          lowerSelected,
          lowerSubSelected,
          receivedDate,
          vitaTab,
          customShade: customShade || undefined,
          primaryMaterial,
          primaryWorkType,
        },
      });

      try {
        await createNotification({
          userId: labId,
          title: ar ? "وصفة حالة جديدة (Rx)" : "New Rx Case Request",
          body: ar
            ? `قام د. ${order.doctor} بإرسال وصفة حالة للمريض ${order.patient}.`
            : `Dr. ${order.doctor} sent an Rx case for patient ${order.patient}.`,
          type: "order_new",
          orderId: order.id,
        });
      } catch {
        /* notification is non-critical */
      }

      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || (ar ? "فشل الإرسال. حاول مرة أخرى." : "Failed to send. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-[#EBF3FA] rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom">
          <div className="text-center space-y-3">
            <div className="size-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <Send className="size-8 text-emerald-600" />
            </div>
            <p className="font-bold text-lg text-slate-800">
              {ar ? "تم إرسال الوصفة بنجاح!" : "Rx sent successfully!"}
            </p>
            <p className="text-sm text-slate-500">
              {ar
                ? `سيستلم ${labName} الوصفة وسيتم إعلامك بالتحديثات`
                : `${labName} will receive the Rx and update you`}
            </p>
            <button
              onClick={onClose}
              className="mt-2 h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
            >
              {ar ? "حسناً" : "OK"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#EBF3FA] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#EBF3FA]/95 backdrop-blur border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-extrabold text-base text-slate-800 truncate leading-tight">
              {ar ? `مختبر ${labName} لطب الأسنان` : `${labName} Dental Lab`}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
              {labPhone && (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <Phone className="size-3" />
                  {labPhone.replace(/\D/g, "").replace(/^964/, "+964 ")}
                </span>
              )}
              {labInstagram && (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <Instagram className="size-3" />
                  {labInstagram}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-9 shrink-0 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Doctor & Patient */}
          <section className="space-y-3">
            <SectionTitle>{ar ? "بيانات الطبيب والمريض" : "Doctor & Patient"}</SectionTitle>
            <Field label={ar ? "اسم الطبيب" : "Doctor name"}>
              <input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder={ar ? "اسم الطبيب المحوّل" : "Referring doctor"}
                className={inputCls}
              />
            </Field>
            <Field label={ar ? "اسم المريض *" : "Patient name *"}>
              <input
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                placeholder={ar ? "أدخل اسم المريض" : "Enter patient name"}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={ar ? "العمر" : "Age"}>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder={ar ? "العمر" : "Age"}
                  className={inputCls}
                />
              </Field>
              <Field label={ar ? "رقم الهاتف" : "Phone"}>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  dir="ltr"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label={ar ? "الجنس" : "Gender"}>
              <div className="flex gap-2">
                <GenderChip
                  active={patientGender === "male"}
                  onClick={() => setPatientGender(patientGender === "male" ? "" : "male")}
                >
                  {ar ? "ذكر" : "Male"}
                </GenderChip>
                <GenderChip
                  active={patientGender === "female"}
                  onClick={() => setPatientGender(patientGender === "female" ? "" : "female")}
                >
                  {ar ? "أنثى" : "Female"}
                </GenderChip>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={ar ? "تاريخ الاستلام" : "Received date"}>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={ar ? "تاريخ التسليم" : "Delivery date"}>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* Odontogram */}
          <section className="space-y-2">
            <SectionTitle>{ar ? "مخطط الأسنان (Odontogram)" : "Odontogram"}</SectionTitle>
            <div className={cn(cardCls, "p-3")}>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                <div className="space-y-1">
                  <OdontogramArch
                    jaw="upper"
                    teeth={teeth}
                    activeTooth={activeTooth}
                    onTooth={selectTooth}
                  />
                  <OdontogramArch
                    jaw="lower"
                    teeth={teeth}
                    activeTooth={activeTooth}
                    onTooth={selectTooth}
                  />
                </div>
                <div className="space-y-1.5 pt-1">
                  {WORK_TYPE_ORDER.map((k) => {
                    const wt = WORK_TYPES[k];
                    const active = activeWorkType === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setActiveWorkType(active ? null : k)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition w-full text-start",
                          active
                            ? cn("border-2", wt.soft)
                            : "border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        <span className={cn("size-2.5 rounded-full shrink-0", wt.dot)} />
                        <span className="truncate">{ar ? wt.ar : wt.en}</span>
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400">
                    <span className="size-2.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="truncate">{ar ? "غير محدد" : "Not selected"}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {ar
                  ? "اختر نوع العمل (اللون) ثم اضغط على السن، ثم اربط الأعمال أدناه بالسن المحدد"
                  : "Pick a work type (color), tap a tooth, then link work items to that tooth below"}
              </p>
            </div>
          </section>

          {/* Categories */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle>{ar ? "نوع العمل" : "Work type"}</SectionTitle>
              {activeTooth != null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      teeth[activeTooth] ? WORK_TYPES[teeth[activeTooth]].dot : "bg-slate-400",
                    )}
                  />
                  <span dir="ltr">#{activeTooth}</span>
                  {teeth[activeTooth] && <span>{WORK_TYPES[teeth[activeTooth]].ar}</span>}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  {ar ? "اختر سنًا أولاً من المخطط" : "Select a tooth first"}
                </span>
              )}
            </div>

            {categories.map((c) => {
              const items = c.items
                .filter((it) => !it.wt || enabledWorkTypes.has(it.wt))
                .map((it) => displayName(it));
              return (
                <div key={c.id} className={cn(cardCls, "overflow-hidden")}>
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                    <span className={cn("size-2.5 rounded-full", c.color)} />
                    <span className="font-extrabold text-sm text-slate-700">
                      {ar ? c.ar : c.en}
                    </span>
                  </div>
                  <div className="px-3 py-3 flex flex-wrap gap-2">
                    {items.map((it) => {
                      const itemTeeth = getItemTeeth(it);
                      const selected = itemTeeth.length > 0;
                      const colors = itemTeeth
                        .map((n) => teeth[n])
                        .filter((t): t is WorkTypeKey => Boolean(t));
                      const primary = colors[0];
                      return (
                        <button
                          key={it}
                          type="button"
                          onClick={() => toggleItem(it)}
                          className={cn(
                            "h-9 px-3 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1.5 transition",
                            selected
                              ? primary
                                ? cn("border", WORK_TYPES[primary].soft)
                                : "border-slate-400 bg-slate-100 text-slate-700"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                          )}
                        >
                          {selected && (
                            <span
                              className={cn(
                                "size-2.5 rounded-full shrink-0",
                                primary ? WORK_TYPES[primary].dot : "bg-slate-400",
                              )}
                            />
                          )}
                          <span>{it}</span>
                          {selected && (
                            <span className="text-[9px] opacity-70" dir="ltr">
                              #{itemTeeth.join(",")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Lower options */}
          <section className="space-y-2">
            <SectionTitle>{ar ? "خيارات إضافية" : "Additional options"}</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {LOWER_OPTIONS.map((o) => {
                const active = lowerSelected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setLowerSelected((p) => (active ? p.filter((x) => x !== o.id) : [...p, o.id]))
                    }
                    className={cn(
                      "h-9 px-3 rounded-xl border text-[11px] font-semibold transition",
                      active
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    {ar ? o.ar : o.en}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LOWER_SUB.map((o) => {
                const active = lowerSubSelected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setLowerSubSelected((p) =>
                        active ? p.filter((x) => x !== o.id) : [...p, o.id],
                      )
                    }
                    className={cn(
                      "h-8 px-3 rounded-xl border text-[10px] font-semibold transition",
                      active
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    {ar ? o.ar : o.en}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Shade & units */}
          <section className="space-y-3">
            <SectionTitle>{ar ? "اللون وعدد الوحدات" : "Shade & Units"}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label={ar ? "اللون (SHADE)" : "COLOR (SHADE)"}>
                <input
                  value={shade || customShade}
                  onChange={(e) => {
                    setShade(e.target.value);
                    setCustomShade("");
                  }}
                  placeholder={ar ? "اختر من الأسفل" : "Pick below"}
                  className={inputCls}
                />
              </Field>
              <Field label={ar ? "عدد الوحدات" : "Number of units"}>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={unitsCount}
                  onChange={(e) => setUnitsCount(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  ["classical", ar ? "VITA كلاسيكي" : "VITA Classical"],
                  ["3d", "VITA 3D-Master"],
                  ["bleach", "Bleach"],
                  ["others", ar ? "أخرى" : "Others"],
                ] as [VitaTab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setVitaTab(k)}
                  className={cn(
                    "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border-2 transition",
                    vitaTab === k
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {vitaTab === "others" ? (
              <input
                value={customShade}
                onChange={(e) => {
                  setCustomShade(e.target.value);
                  setShade("");
                }}
                placeholder={ar ? "أدخل درجة لون مخصصة..." : "Enter custom shade..."}
                className={inputCls}
              />
            ) : (
              <div className={cn(cardCls, "p-3")}>
                <div className="grid grid-cols-8 gap-1.5">
                  {(vitaTab === "classical"
                    ? VITA_CLASSICAL
                    : vitaTab === "3d"
                      ? VITA_3D
                      : VITA_BLEACH
                  ).map((s) => {
                    const active = shade === s.code;
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => pickShade(s.code)}
                        className={cn(
                          "relative aspect-square rounded-xl border-2 transition flex flex-col items-center justify-center",
                          active
                            ? "border-primary scale-110 shadow-md z-10 ring-2 ring-primary/20"
                            : "border-slate-200 hover:border-slate-400",
                        )}
                      >
                        <span
                          className="size-5 rounded-full border border-slate-300"
                          style={{ background: s.hex }}
                        />
                        <span className="text-[8px] font-bold text-slate-600 mt-0.5">{s.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="space-y-2">
            <SectionTitle>{ar ? "الشرح / الملاحظات" : "Explanation / Notes"}</SectionTitle>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              placeholder={
                ar ? "تعليمات سريرية، ملاحظات خاصة..." : "Clinical instructions, special notes..."
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
            <p
              className={cn(
                "text-[10px] font-semibold text-end",
                wordCount > 180 ? "text-rose-500" : "text-slate-400",
              )}
            >
              {wordCount}/200
            </p>
          </section>

          {/* Signature */}
          <section className="space-y-2">
            <SectionTitle>{ar ? "توقيع الطبيب" : "Doctor signature"}</SectionTitle>
            <div
              className="rounded-2xl border-2 border-dashed border-slate-300 relative h-28 overflow-hidden bg-white"
              style={{ touchAction: "none" }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              {!sigDataUrl && (
                <span className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs pointer-events-none select-none">
                  {ar ? "وقّع هنا بالسحب" : "Sign here by dragging"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSignature}
                className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-1 hover:bg-slate-100"
              >
                <Eraser className="size-3.5" />
                {ar ? "مسح" : "Clear"}
              </button>
              <span className="text-[11px] text-slate-400 truncate">
                {ar ? "أو تأكيد باسم الطبيب:" : "Or confirm with doctor name:"} {doctorName || "—"}
              </span>
            </div>
          </section>

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {ar ? "جارٍ الإرسال..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="size-4" />
                {ar ? "إرسال الوصفة للمختبر" : "Send Rx to Lab"}
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#E2EDF8] border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 truncate" dir="ltr">
            <Phone className="size-3 shrink-0" />
            {labPhone?.replace(/\D/g, "").replace(/^964/, "+964 ") || "—"}
          </span>
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="size-3 shrink-0" />
            {labAddress || (ar ? "الموقع" : "Location")}
          </span>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-extrabold text-slate-800">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function GenderChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 flex-1 rounded-xl border text-sm font-bold transition",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}

function OdontogramArch({
  jaw,
  teeth,
  activeTooth,
  onTooth,
}: {
  jaw: "upper" | "lower";
  teeth: Record<number, WorkTypeKey>;
  activeTooth: number | null;
  onTooth: (n: number) => void;
}) {
  const fdiList = jaw === "upper" ? FDI_UPPER : FDI_LOWER;
  const posMap = jaw === "upper" ? UPPER_POS : LOWER_POS;
  const archSrc = jaw === "upper" ? archUpper : archLower;

  return (
    <div className="relative w-full aspect-[4/3] max-w-sm mx-auto">
      <img
        src={archSrc}
        alt={jaw}
        className="absolute inset-0 w-full h-full object-contain"
        loading="lazy"
      />
      {fdiList.map((n) => {
        const pos = posMap[n];
        if (!pos) return null;
        const lx = 50 + (pos[0] - 50) * 1.22;
        const ly = 50 + (pos[1] - 50) * 1.18;
        const wt = teeth[n];
        const isActive = activeTooth === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onTooth(n)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 w-[8%] max-w-[26px] aspect-square rounded-full border text-[9px] font-bold flex items-center justify-center transition hover:scale-125 hover:z-10",
              wt
                ? cn("text-white border-white shadow", WORK_TYPES[wt].dot)
                : "bg-slate-200 text-slate-500 border-white",
              isActive && "ring-2 ring-slate-900 ring-offset-1",
            )}
            style={{ top: `${ly}%`, left: `${lx}%` }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

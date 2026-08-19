import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  X,
  User,
  Building2,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Hash,
  DollarSign,
  Percent,
  FileText,
  UserCheck,
} from "lucide-react";

export type NewOrder = {
  patient: string;
  dentist: string;
  clinic: string;
  date: string;
  workType: string;
  unitsCount: number;
  unitPrice: number;
  currency: "USD" | "IQD";
  agent: string;
  discount: number;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: NewOrder) => void;
};

const WORK_TYPES = [
  { value: "zircon", ar: "زيركون", en: "Zircon" },
  { value: "inlay_onlay", ar: "إنلاي وأونلاي", en: "Inlay & Onlay" },
  { value: "night_guard", ar: "واقي ليلي", en: "Night Guard" },
  { value: "ceramic", ar: "سيراميك", en: "Ceramic" },
  { value: "implant", ar: "زرعة", en: "Implant" },
  { value: "lumineer", ar: "لومينير", en: "Lumineer" },
  { value: "e_max", ar: "إيماكس", en: "E-Max" },
  { value: "veneer", ar: "فينير", en: "Veneer" },
];

const inputClass =
  "w-full h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition";

const inputErrorClass = "ring-2 ring-destructive/50 border-destructive";

export function NewOrderModal({ open, onClose, onSubmit }: Props) {
  const { lang, t } = useI18n();
  const ar = lang === "ar";

  const [patient, setPatient] = useState("");
  const [dentist, setDentist] = useState("");
  const [clinic, setClinic] = useState("");
  const [date, setDate] = useState("");
  const [workType, setWorkType] = useState("");
  const [unitsCount, setUnitsCount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [agent, setAgent] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState<"USD" | "IQD">("USD");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const totalPrice = useMemo(() => {
    const units = parseFloat(unitsCount) || 0;
    const price = parseFloat(unitPrice) || 0;
    const disc = parseFloat(discount) || 0;
    return Math.max(0, units * price - disc);
  }, [unitsCount, unitPrice, discount]);

  if (!open) return null;

  const validate = () => {
    const errs: Record<string, boolean> = {};
    if (!patient.trim()) errs.patient = true;
    if (!dentist.trim()) errs.dentist = true;
    if (!clinic.trim()) errs.clinic = true;
    if (!date) errs.date = true;
    if (!workType) errs.workType = true;
    if (!unitsCount.trim() || parseFloat(unitsCount) <= 0) errs.unitsCount = true;
    if (!unitPrice.trim() || parseFloat(unitPrice) <= 0) errs.unitPrice = true;
    if (!agent.trim()) errs.agent = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitted(true);
    onSubmit({
      patient: patient.trim(),
      dentist: dentist.trim(),
      clinic: clinic.trim(),
      date,
      workType,
      unitsCount: parseFloat(unitsCount) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      currency,
      agent: agent.trim(),
      discount: parseFloat(discount) || 0,
      notes: notes.trim(),
    });
    setTimeout(() => {
      setSubmitted(false);
      setPatient("");
      setDentist("");
      setClinic("");
      setDate("");
      setWorkType("");
      setUnitsCount("");
      setUnitPrice("");
      setCurrency("USD");
      setAgent("");
      setDiscount("");
      setNotes("");
      setErrors({});
      onClose();
    }, 1200);
  };

  const clearError = (field: string) => {
    setErrors((e) => ({ ...e, [field]: false }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92svh] flex flex-col animate-in slide-in-from-bottom duration-300",
          submitted && "pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wrench className="size-4" />
            </span>
            <h2 className="font-display font-extrabold text-base">{t("new_order_title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-accent flex items-center justify-center text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="size-12 text-emerald-500 mb-3" />
              <p className="font-display font-bold text-lg text-foreground">
                {ar ? "تم إضافة الطلب بنجاح" : "Order created successfully"}
              </p>
            </div>
          ) : (
            <>
              {/* Patient Name */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <User className="size-3.5" />
                  {ar ? "اسم المريض" : "Patient Name"} <span className="text-destructive">*</span>
                </label>
                <input
                  value={patient}
                  onChange={(e) => {
                    setPatient(e.target.value);
                    clearError("patient");
                  }}
                  placeholder={ar ? "أدخل اسم المريض" : "Enter patient name"}
                  className={cn(inputClass, errors.patient && inputErrorClass)}
                />
                {errors.patient && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Dentist Name */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Building2 className="size-3.5" />
                  {ar ? "اسم الطبيب" : "Dentist Name"} <span className="text-destructive">*</span>
                </label>
                <input
                  value={dentist}
                  onChange={(e) => {
                    setDentist(e.target.value);
                    clearError("dentist");
                  }}
                  placeholder={ar ? "أدخل اسم الطبيب" : "Enter dentist name"}
                  className={cn(inputClass, errors.dentist && inputErrorClass)}
                />
                {errors.dentist && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Clinic Name */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Building2 className="size-3.5" />
                  {ar ? "اسم العيادة" : "Clinic Name"} <span className="text-destructive">*</span>
                </label>
                <input value={clinic} onChange={(e) => { setClinic(e.target.value); clearError("clinic"); }} placeholder={ar ? "أدخل اسم العيادة" : "Enter clinic name"} className={cn(inputClass, errors.clinic && inputErrorClass)} />
                {errors.clinic && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertCircle className="size-3" />{t("field_required")}</p>}
              </div>

              {/* Date / Due Date */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Calendar className="size-3.5" />
                  {ar ? "تاريخ الإخراج" : "Due Date"} <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    clearError("date");
                  }}
                  className={cn(inputClass, errors.date && inputErrorClass)}
                />
                {errors.date && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Work Type */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Wrench className="size-3.5" />
                  {t("work_type")} <span className="text-destructive">*</span>
                </label>
                <select
                  value={workType}
                  onChange={(e) => {
                    setWorkType(e.target.value);
                    clearError("workType");
                  }}
                  className={cn(
                    inputClass,
                    "appearance-none",
                    errors.workType && inputErrorClass,
                  )}
                >
                  <option value="">{t("select_work_type")}</option>
                  {WORK_TYPES.map((w) => (
                    <option key={w.value} value={w.value}>
                      {ar ? w.ar : w.en}
                    </option>
                  ))}
                </select>
                {errors.workType && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Units Count + Unit Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                    <Hash className="size-3.5" />
                    {ar ? "عدد الوحدات" : "Units Count"}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={unitsCount}
                    onChange={(e) => {
                      setUnitsCount(e.target.value);
                      clearError("unitsCount");
                    }}
                    placeholder="0"
                    dir="ltr"
                    className={cn(inputClass, errors.unitsCount && inputErrorClass)}
                  />
                  {errors.unitsCount && (
                    <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {t("field_required")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                    <DollarSign className="size-3.5" />
                    {ar ? "سعر الوحدة" : "Unit Price"}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => {
                      setUnitPrice(e.target.value);
                      clearError("unitPrice");
                    }}
                    placeholder="0.00"
                    dir="ltr"
                    className={cn(inputClass, errors.unitPrice && inputErrorClass)}
                  />
                  <div className="flex rounded-xl bg-slate-50 border border-border mt-2 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={cn(
                        "flex-1 h-9 text-xs font-bold transition",
                        currency === "USD"
                          ? "bg-primary text-primary-foreground"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("IQD")}
                      className={cn(
                        "flex-1 h-9 text-xs font-bold transition",
                        currency === "IQD"
                          ? "bg-primary text-primary-foreground"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      IQD (د.ع)
                    </button>
                  </div>
                  {errors.unitPrice && (
                    <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {t("field_required")}
                    </p>
                  )}
                </div>
              </div>

              {/* Agent */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <UserCheck className="size-3.5" />
                  {ar ? "المندوب" : "Agent"} <span className="text-destructive">*</span>
                </label>
                <input
                  value={agent}
                  onChange={(e) => {
                    setAgent(e.target.value);
                    clearError("agent");
                  }}
                  placeholder={ar ? "أدخل اسم المندوب" : "Enter agent name"}
                  className={cn(inputClass, errors.agent && inputErrorClass)}
                />
                {errors.agent && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Discount */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Percent className="size-3.5" />
                  {ar ? "خصم ممنوح" : "Discount"} ({ar ? "اختياري" : "optional"})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  dir="ltr"
                  className={inputClass}
                />
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <FileText className="size-3.5" />
                  {ar ? "السبب / ملاحظات" : "Reason / Notes"}{" "}
                  <span className="text-muted-foreground/50">({ar ? "اختياري" : "optional"})</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-ring/40 resize-none"
                  placeholder={ar ? "أضف تفاصيل إضافية..." : "Add additional details..."}
                />
              </div>

              {/* Auto-calculated Total */}
              <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
                <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wide mb-1">
                  {ar ? "الإجمالي التقديري" : "Estimated Total"}
                </p>
                <p className="font-display font-extrabold text-2xl text-sky-800">
                  {currency === "IQD"
                    ? `${totalPrice.toLocaleString("en-US")} د.ع`
                    : `$${totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
                <p className="text-[10px] text-sky-500 mt-0.5">
                  ({ar ? "عدد الوحدات × سعر الوحدة - الخصم" : "Units × Price - Discount"})
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center gap-2 px-5 py-4 border-t border-border shrink-0">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border bg-card font-display font-bold text-sm hover:bg-accent transition"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition"
            >
              <CheckCircle2 className="size-4" />
              {t("create_order")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

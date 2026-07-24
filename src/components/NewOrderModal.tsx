import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { X, User, Building2, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";

export type NewOrder = {
  patient: string;
  doctor: string;
  workType: string;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: NewOrder) => void;
};

const WORK_TYPES = [
  { value: "crown", ar: "تاج", en: "Crown" },
  { value: "veneer", ar: "قشرة تجميلية", en: "Veneer" },
  { value: "implant", ar: "زرعة", en: "Implant" },
  { value: "clear_aligner", ar: "مصفف شفاف", en: "Clear Aligner" },
];

export function NewOrderModal({ open, onClose, onSubmit }: Props) {
  const { lang, t } = useI18n();
  const ar = lang === "ar";

  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [workType, setWorkType] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const validate = () => {
    const errs: Record<string, boolean> = {};
    if (!patient.trim()) errs.patient = true;
    if (!doctor.trim()) errs.doctor = true;
    if (!workType) errs.workType = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitted(true);
    onSubmit({
      patient: patient.trim(),
      doctor: doctor.trim(),
      workType,
      notes: notes.trim(),
    });
    setTimeout(() => {
      setSubmitted(false);
      setPatient("");
      setDoctor("");
      setWorkType("");
      setNotes("");
      setErrors({});
      onClose();
    }, 1200);
  };

  const inputClass =
    "w-full h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition";

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
          "relative w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92svh] flex flex-col animate-in slide-in-from-bottom duration-300",
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
                  {t("patient_name")} <span className="text-destructive">*</span>
                </label>
                <input
                  value={patient}
                  onChange={(e) => {
                    setPatient(e.target.value);
                    setErrors((e) => ({ ...e, patient: false }));
                  }}
                  placeholder={ar ? "أدخل اسم المريض" : "Enter patient name"}
                  className={cn(
                    inputClass,
                    errors.patient && "ring-2 ring-destructive/50 border-destructive",
                  )}
                />
                {errors.patient && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Doctor Name - Free Text */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Building2 className="size-3.5" />
                  {t("clinic_doctor")} <span className="text-destructive">*</span>
                </label>
                <input
                  value={doctor}
                  onChange={(e) => {
                    setDoctor(e.target.value);
                    setErrors((e) => ({ ...e, doctor: false }));
                  }}
                  placeholder={ar ? "أدخل اسم العيادة أو الطبيب" : "Enter clinic or doctor name"}
                  className={cn(
                    inputClass,
                    errors.doctor && "ring-2 ring-destructive/50 border-destructive",
                  )}
                />
                {errors.doctor && (
                  <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {t("field_required")}
                  </p>
                )}
              </div>

              {/* Work Type Dropdown */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  <Wrench className="size-3.5" />
                  {t("work_type")} <span className="text-destructive">*</span>
                </label>
                <select
                  value={workType}
                  onChange={(e) => {
                    setWorkType(e.target.value);
                    setErrors((e) => ({ ...e, workType: false }));
                  }}
                  className={cn(
                    inputClass,
                    "appearance-none",
                    errors.workType && "ring-2 ring-destructive/50 border-destructive",
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

              {/* Notes - Optional */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
                  {ar ? "ملاحظات" : "Notes"}{" "}
                  <span className="text-muted-foreground/50">({ar ? "اختياري" : "optional"})</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-ring/40 resize-none"
                  placeholder={ar ? "أضف تفاصيل إضافية..." : "Add additional details..."}
                />
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

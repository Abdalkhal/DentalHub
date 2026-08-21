import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  X, User, Building2, Calendar, Wrench, Hash, DollarSign,
  Percent, FileText, CheckCircle2, Loader2, Clock, AlertCircle,
} from "lucide-react";
import type { Order, OrderStatus } from "@/lib/ordersStore";

type Props = {
  order: Order;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Order>) => void;
};

const WORK_TYPES = [
  { value: "crown", ar: "تاج", en: "Crown" },
  { value: "veneer", ar: "قشرة تجميلية", en: "Veneer" },
  { value: "implant", ar: "زرعة", en: "Implant" },
  { value: "clear_aligner", ar: "مصفف شفاف", en: "Clear Aligner" },
];

const STATUS_OPTIONS: { value: OrderStatus; ar: string; en: string }[] = [
  { value: "new", ar: "جديد", en: "New" },
  { value: "in_progress", ar: "قيد التنفيذ", en: "In Progress" },
  { value: "completed", ar: "مكتملة", en: "Completed" },
  { value: "delayed", ar: "متأخرة", en: "Delayed" },
];

const inputClass = "w-full h-11 rounded-xl bg-slate-50 border border-border px-4 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition";

export function EditOrderModal({ order, onClose, onSave }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  const [patient, setPatient] = useState(order.patient);
  const [dentist, setDentist] = useState(order.doctor);
  const [date, setDate] = useState(order.dueDate || order.receivedDate.split("T")[0]);
  const [workType, setWorkType] = useState(order.workType);
  const [unitsCount, setUnitsCount] = useState(String(order.unitsCount || ""));
  const [unitPrice, setUnitPrice] = useState(String(order.unitPrice || ""));
  const [discount, setDiscount] = useState(String(order.discount || ""));
  const [notes, setNotes] = useState(order.notes || "");
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);

  const totalPrice = useMemo(() => {
    const u = parseFloat(unitsCount) || 0;
    const p = parseFloat(unitPrice) || 0;
    const d = parseFloat(discount) || 0;
    return Math.max(0, u * p - d);
  }, [unitsCount, unitPrice, discount]);

  const handleSave = () => {
    if (!patient.trim() || !dentist.trim()) {
      toast.error(ar ? "اسم المريض والطبيب مطلوبان" : "Patient and doctor required");
      return;
    }
    setSaving(true);
    const u = parseFloat(unitsCount) || 0;
    const p = parseFloat(unitPrice) || 0;
    const d = parseFloat(discount) || 0;
    onSave(order.id, {
      patient: patient.trim(),
      doctor: dentist.trim(),
      dueDate: date,
      workType,
      unitsCount: u,
      unitPrice: p,
      discount: d,
      price: Math.max(0, u * p - d),
      notes: notes.trim(),
      status,
    });
    toast.success(ar ? "تم تحديث بيانات الطلب بنجاح" : "Order updated successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92svh] flex flex-col animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Wrench className="size-4" /></span>
            <h2 className="font-display font-extrabold text-base">{ar ? `تعديل الطلب ${order.orderNumber}` : `Edit Order ${order.orderNumber}`}</h2>
          </div>
          <button onClick={onClose} className="size-9 rounded-xl hover:bg-accent flex items-center justify-center text-muted-foreground"><X className="size-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <F icon={User} label={ar ? "اسم المريض" : "Patient Name"} v={patient} onChange={setPatient} ph={ar ? "أدخل اسم المريض" : "Enter patient name"} />
          <F icon={Building2} label={ar ? "اسم الطبيب" : "Dentist Name"} v={dentist} onChange={setDentist} ph={ar ? "أدخل اسم الطبيب" : "Enter dentist name"} />
          <F icon={Calendar} label={ar ? "التاريخ" : "Date"} v={date} onChange={setDate} ph="" type="date" />

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5"><Wrench className="size-3.5" />{ar ? "نوع العمل" : "Work Type"}</label>
            <select value={workType} onChange={(e) => setWorkType(e.target.value)} className={cn(inputClass, "appearance-none")}>
              {WORK_TYPES.map((w) => <option key={w.value} value={w.value}>{ar ? w.ar : w.en}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F icon={Hash} label={ar ? "عدد الوحدات" : "Units"} v={unitsCount} onChange={setUnitsCount} ph="0" type="number" />
            <F icon={DollarSign} label={ar ? "سعر الوحدة" : "Unit Price"} v={unitPrice} onChange={setUnitPrice} ph="0.00" type="number" />
          </div>

          <F icon={Percent} label={ar ? "خصم" : "Discount"} v={discount} onChange={setDiscount} ph="0.00" type="number" optional />
          <F icon={FileText} label={ar ? "السبب / ملاحظات" : "Reason / Notes"} v={notes} onChange={setNotes} ph={ar ? "تفاصيل إضافية..." : "Additional details..."} textarea optional />

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5"><Clock className="size-3.5" />{ar ? "الحالة" : "Status"}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className={cn(inputClass, "appearance-none")}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
            </select>
          </div>

          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wide mb-1">{ar ? "الإجمالي" : "Total"}</p>
            <p className="font-display font-extrabold text-2xl text-sky-800">${totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border bg-card font-display font-bold text-sm hover:bg-accent transition">{ar ? "إلغاء" : "Cancel"}</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {ar ? "حفظ التغييرات" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ icon: Icon, label, v, onChange, ph, type, optional, textarea }: { icon?: typeof User; label: string; v: string; onChange: (v: string) => void; ph: string; type?: string; optional?: boolean; textarea?: boolean }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
        {Icon && <Icon className="size-3.5" />}{label}{optional && <span className="text-muted-foreground/50 font-normal">({optional ? "اختياري" : ""})</span>}
      </label>
      {textarea ? (
        <textarea value={v} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={ph} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-ring/40 resize-none" />
      ) : (
        <input type={type || "text"} value={v} onChange={(e) => onChange(e.target.value)} placeholder={ph} dir={type === "number" ? "ltr" : undefined} className={cn(inputClass, type === "number" && "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")} />
      )}
    </div>
  );
}

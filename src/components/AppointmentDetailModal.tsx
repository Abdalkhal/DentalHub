import { Bell, Calendar, Clock, Phone, User, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Appointment } from "@/lib/appointmentsStore";

// Read-only appointment details, opened by tapping an appointment in the
// clinic calendar — same fields and order as the native app's modal.

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function format12h(time: string, ar: boolean): string {
  const [hStr, mm] = (time || "00:00").split(":");
  const hh = parseInt(hStr || "0", 10);
  const suffix = hh < 12 ? (ar ? "ص" : "AM") : ar ? "م" : "PM";
  let hour = hh % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, "0")}:${mm} ${suffix}`;
}

function Label({ children }: { children: string }) {
  return <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">{children}</p>;
}

function Pill({ icon, value, className }: { icon?: ReactNode; value: string; className?: string }) {
  return (
    <div className={cn("h-11 rounded-xl bg-card border border-border px-3.5 flex items-center gap-2", className)}>
      {icon}
      <span className="flex-1 truncate text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function DarkPill({ value }: { value: string }) {
  return (
    <div className="h-11 rounded-xl bg-[#1E3A5F] px-3.5 flex items-center justify-center">
      <span className="truncate text-sm font-bold text-white">{value}</span>
    </div>
  );
}

export function AppointmentDetailModal({
  appointment,
  onClose,
}: {
  appointment: Appointment | null;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  if (!appointment) return null;

  const dateObj = new Date(appointment.date + "T00:00:00");
  const dateLabel = ar
    ? `${dateObj.getDate()} ${MONTHS_AR[dateObj.getMonth()]} ${dateObj.getFullYear()}`
    : dateObj.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[92vh] flex flex-col rounded-t-3xl bg-background md:max-w-xl md:rounded-3xl md:shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5 border-b border-border">
          <h2 className="font-display font-extrabold text-base">{ar ? "تفاصيل الموعد" : "Appointment Details"}</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-card border border-border flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-2.5">
            <Label>{ar ? "بيانات المريض" : "Patient"}</Label>
            <Pill icon={<User className="size-4 text-amber-600" />} value={appointment.patientName || (ar ? "غير محدد" : "Unspecified")} />
            {appointment.phone && <Pill icon={<Phone className="size-4 text-amber-600" />} value={appointment.phone} />}
          </div>

          <div className="space-y-2.5">
            <Label>{ar ? "التاريخ والوقت" : "Date & Time"}</Label>
            <Pill icon={<Calendar className="size-4 text-blue-600" />} value={dateLabel} className="rounded-full bg-sky-50" />
            <Pill icon={<Clock className="size-4 text-amber-600" />} value={format12h(appointment.time, ar)} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label>{ar ? "نوع الموعد" : "Appointment Type"}</Label>
              <DarkPill value={appointment.appointmentType || "-"} />
            </div>
            <div>
              <Label>{ar ? "العيادة / الغرفة" : "Clinic / Room"}</Label>
              <Pill value={appointment.clinicRoom || (ar ? "غير محدد" : "Unspecified")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label>{ar ? "الطبيب" : "Doctor"}</Label>
              <DarkPill value={appointment.doctor || "-"} />
            </div>
            <div>
              <Label>{ar ? "العلاج / الخدمة" : "Treatment / Service"}</Label>
              <DarkPill value={appointment.treatment || "-"} />
            </div>
          </div>

          {appointment.notes && (
            <div>
              <Label>{ar ? "ملاحظات" : "Notes"}</Label>
              <div className="rounded-xl bg-card border border-border p-3 text-sm text-slate-800 whitespace-pre-wrap">{appointment.notes}</div>
            </div>
          )}

          <div className={cn("h-12 rounded-xl border px-4 flex items-center gap-2", appointment.reminder ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-border")}>
            <Bell className={cn("size-4", appointment.reminder ? "text-amber-600" : "text-slate-400")} />
            <span className="text-sm font-semibold text-slate-800">
              {appointment.reminder
                ? ar ? "التذكير بالموعد مفعّل" : "Appointment reminder is on"
                : ar ? "التذكير بالموعد غير مفعّل" : "Appointment reminder is off"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

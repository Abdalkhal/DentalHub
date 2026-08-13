import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useAppointments, type Appointment } from "@/lib/appointmentsStore";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CalendarCheck,
  Bell,
  Sun,
  Moon,
  Phone,
  Stethoscope,
  DoorOpen,
} from "lucide-react";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

const DAY_LABELS = [
  { key: 0, ar: "الأحد", en: "Sun" },
  { key: 1, ar: "الإثنين", en: "Mon" },
  { key: 2, ar: "الثلاثاء", en: "Tue" },
  { key: 3, ar: "الأربعاء", en: "Wed" },
  { key: 4, ar: "الخميس", en: "Thu" },
  { key: 5, ar: "الجمعة", en: "Fri" },
  { key: 6, ar: "السبت", en: "Sat" },
];

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TREATMENT_ICONS: Record<string, string> = {
  "تنظيف اسنان": "🧹",
  "حشوة": "🦷",
  "علاج جذور": "⚡",
  "خلع": "🔧",
  "زراعة اسنان": "🔩",
  "تركيب تاج": "👑",
  "تقويم": "😬",
  "تبييض": "✨",
};

function treatmentIcon(treatment: string): string {
  return TREATMENT_ICONS[treatment] ?? "🩺";
}

type TypeStyle = { border: string; badge: string; avatar: string };

function typeStyle(type: string): TypeStyle {
  const map: Record<string, TypeStyle> = {
    "استشارة": { border: "border-purple-500", badge: "bg-purple-50 text-purple-700", avatar: "from-purple-100 to-purple-200 text-purple-700" },
    "متابعة": { border: "border-blue-500", badge: "bg-blue-50 text-blue-700", avatar: "from-blue-100 to-sky-200 text-blue-700" },
    "مراجعة بعد العلاج": { border: "border-teal-500", badge: "bg-teal-50 text-teal-700", avatar: "from-teal-100 to-teal-200 text-teal-700" },
    "طوارئ": { border: "border-red-500", badge: "bg-red-50 text-red-700", avatar: "from-red-100 to-rose-200 text-red-700" },
    "فحص دوري": { border: "border-amber-500", badge: "bg-amber-50 text-amber-700", avatar: "from-amber-100 to-orange-200 text-amber-700" },
    "استشارة اونلاين": { border: "border-indigo-500", badge: "bg-indigo-50 text-indigo-700", avatar: "from-indigo-100 to-indigo-200 text-indigo-700" },
  };
  return map[type] ?? { border: "border-blue-500", badge: "bg-blue-50 text-blue-700", avatar: "from-blue-100 to-sky-200 text-blue-700" };
}

function formatMonthYear(date: Date, ar: boolean): string {
  const months = ar ? MONTHS_AR : MONTHS_EN;
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayOfWeek(d: Date): number {
  return d.getDay();
}

function hourSlot(time: string): string {
  const hh = time?.split(":")[0] ?? "08";
  return `${hh}:00`;
}

export const Route = createFileRoute("/clinic/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const appointments = useAppointments();
  const today = new Date();
  const todayStr = toDateStr(today);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const selectedDateObj = useMemo(() => new Date(selectedDate + "T00:00:00"), [selectedDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDateObj]);

  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.date === selectedDate),
    [appointments, selectedDate],
  );

  const sorted = useMemo(
    () => [...dayAppointments].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00")),
    [dayAppointments],
  );

  const stats = useMemo(() => {
    const total = dayAppointments.length;
    const morning = dayAppointments.filter((a) => {
      const h = Number((a.time || "00:00").split(":")[0]);
      return h < 12;
    }).length;
    const evening = total - morning;
    const reminders = dayAppointments.filter((a) => a.reminder).length;
    return { total, morning, evening, reminders };
  }, [dayAppointments]);

  const changeMonth = (dir: -1 | 1) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + "T00:00:00");
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      return toDateStr(d);
    });
  };

  const goToToday = () => {
    setSelectedDate(todayStr);
  };

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  }, [calMonth]);

  const changeCalMonth = (dir: -1 | 1) =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1));

  const jumpToDate = (ds: string) => {
    setSelectedDate(ds);
    setShowCalendar(false);
  };

  const nowHour = new Date().getHours();
  const nowMin = new Date().getMinutes();
  const currentTimePercent = ((nowHour - 8 + nowMin / 60) / 10) * 100;

  return (
    <MobileShell>
      <TopBar title={ar ? "جدول المواعيد" : "Appointments"} showBack />

      <div className="px-4 pt-3 pb-2">
        {/* Month / Year header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="size-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
            {ar ? <ChevronRight className="size-4 text-slate-600" /> : <ChevronLeft className="size-4 text-slate-600" />}
          </button>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-1.5 font-display font-extrabold text-base text-slate-800 px-3 py-1 rounded-xl hover:bg-slate-100 transition"
          >
            {formatMonthYear(selectedDateObj, ar)}
            <CalendarCheck className="size-4 text-[#007AFF]" />
          </button>
          <button onClick={() => changeMonth(1)} className="size-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
            {ar ? <ChevronLeft className="size-4 text-slate-600" /> : <ChevronRight className="size-4 text-slate-600" />}
          </button>
        </div>

        {/* Day picker strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {weekDays.map((d) => {
            const ds = toDateStr(d);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const isCurrentMonth = d.getMonth() === selectedDateObj.getMonth();
            const dow = dayOfWeek(d);
            const dayLabel = DAY_LABELS[dow];
            const apptCount = appointments.filter((a) => a.date === ds).length;

            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex flex-col items-center shrink-0 w-12 py-2 rounded-2xl transition-all text-center ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md"
                    : isToday
                      ? "text-blue-600 hover:bg-gray-100"
                      : "text-gray-600 hover:bg-gray-100"
                } ${!isCurrentMonth ? "opacity-30" : ""}`}
              >
                <span className="text-[10px] font-bold leading-none mb-1">
                  {ar ? dayLabel.ar : dayLabel.en}
                </span>
                <span className="text-sm font-extrabold leading-none">{d.getDate()}</span>
                {apptCount > 0 && (
                  <span className={`mt-1 size-1 rounded-full ${isSelected ? "bg-white" : "bg-[#007AFF]"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* Today button */}
        {selectedDate !== todayStr && (
          <button
            onClick={goToToday}
            className="mx-auto block text-xs font-bold text-[#007AFF] hover:underline"
          >
            {ar ? "🔙 العودة لليوم" : "🔙 Back to today"}
          </button>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard ar={ar} label={{ ar: "الإجمالي", en: "Total" }} value={stats.total} color="bg-sky-50 text-sky-700" icon={Users} />
          <StatCard ar={ar} label={{ ar: "صباحاً", en: "Morning" }} value={stats.morning} color="bg-amber-50 text-amber-700" icon={Sun} />
          <StatCard ar={ar} label={{ ar: "مساءً", en: "Evening" }} value={stats.evening} color="bg-indigo-50 text-indigo-700" icon={Moon} />
          <StatCard ar={ar} label={{ ar: "تذكير", en: "Reminders" }} value={stats.reminders} color="bg-rose-50 text-rose-700" icon={Bell} />
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-display font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5">
            <Clock className="size-4 text-[#007AFF]" />
            {ar ? "الجدول الزمني" : "Timeline"}
          </h3>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {TIME_SLOTS.map((slot) => {
              const slotAppts = sorted.filter((a) => hourSlot(a.time) === slot);
              const isCurrentHour = selectedDate === todayStr && parseInt(slot.split(":")[0]) === nowHour;

              return (
                <div key={slot} className={`flex border-b border-slate-50 last:border-b-0 ${isCurrentHour ? "bg-blue-50/30" : ""}`}>
                  <div className="w-14 shrink-0 py-3 flex flex-col items-center justify-start border-r border-slate-50">
                    <span className={`text-[11px] font-bold ${isCurrentHour ? "text-[#007AFF]" : "text-slate-400"}`}>
                      {slot}
                    </span>
                    {isCurrentHour && (
                      <span className="text-[9px] font-bold text-[#007AFF] mt-0.5">{ar ? "الآن" : "Now"}</span>
                    )}
                  </div>
                  <div className="flex-1 py-2 px-2 space-y-1.5">
                    {slotAppts.length === 0 ? (
                      <div className="h-6" />
                    ) : (
                      slotAppts.map((a) => (
                        <AppointmentCard key={a.id} appt={a} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* Current time indicator */}
            {selectedDate === todayStr && currentTimePercent > 0 && currentTimePercent < 100 && (
              <div
                className="absolute left-14 right-0 border-t border-[#007AFF] z-10"
                style={{ top: `${currentTimePercent}%` }}
              >
                <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-[#007AFF] border-2 border-white" />
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {dayAppointments.length === 0 && (
          <div className="py-10 text-center">
            <CalendarCheck className="size-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">
              {ar ? "لا توجد مواعيد في هذا اليوم" : "No appointments on this day"}
            </p>
          </div>
        )}
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCalendar(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => changeCalMonth(-1)} className="size-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              <p className="font-display font-bold text-sm">
                {ar ? `${MONTHS_AR[calDays.month]} ${calDays.year}` : `${MONTHS_EN[calDays.month]} ${calDays.year}`}
              </p>
              <button type="button" onClick={() => changeCalMonth(1)} className="size-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                {ar ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {(ar ? WEEKDAYS_AR : WEEKDAYS_EN).map((d) => (
                <span key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.cells.map((d, i) => {
                if (d === null) return <span key={`e-${i}`} />;
                const ds = toDateStr(new Date(calDays.year, calDays.month, d));
                const isSelected = ds === selectedDate;
                const hasAppt = appointments.some((a) => a.date === ds);
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => jumpToDate(ds)}
                    className={cn(
                      "h-10 rounded-xl text-sm font-semibold transition flex items-center justify-center relative",
                      isSelected ? "bg-[#007AFF] text-white shadow-sm" : "hover:bg-slate-100",
                    )}
                  >
                    {d}
                    {hasAppt && (
                      <span className={cn("absolute bottom-1 size-1 rounded-full", isSelected ? "bg-white" : "bg-[#007AFF]")} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const style = typeStyle(appt.appointmentType);
  const initial = appt.patientName.trim().charAt(0) || "؟";
  return (
    <div className="relative flex gap-2.5">
      {/* Timeline node + connector */}
      <div className="relative w-4 shrink-0 flex justify-center">
        <span className="absolute top-6 size-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
        <span className="absolute top-0 bottom-0 w-px bg-blue-100" />
      </div>

      {/* Card */}
      <div className={cn(
        "flex-1 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition border border-slate-100 border-s-4",
        style.border,
      )}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className={cn("size-11 rounded-full bg-gradient-to-br flex items-center justify-center font-display font-extrabold text-lg shrink-0 shadow-sm", style.avatar)}>
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-base truncate">{appt.patientName}</p>
            {appt.phone && (
              <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{appt.phone}</p>
            )}
          </div>
          <span className={cn("shrink-0 text-xs px-2.5 py-1 rounded-full font-medium", style.badge)}>
            {appt.appointmentType}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <span className="text-sm leading-none">{treatmentIcon(appt.treatment)}</span>
            {appt.treatment}
          </span>
          {appt.doctor && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Stethoscope className="size-3.5 text-slate-400" />
              {appt.doctor}
            </span>
          )}
          {appt.clinicRoom && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <DoorOpen className="size-3.5 text-slate-400" />
              {appt.clinicRoom}
            </span>
          )}
        </div>

        {/* Notes */}
        {appt.notes && (
          <p className="text-xs text-gray-500 mt-2 leading-snug">{appt.notes}</p>
        )}
      </div>

      {/* Call action */}
      {appt.phone && (
        <a
          href={`tel:${appt.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="self-center shrink-0 size-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition"
          aria-label="Call patient"
        >
          <Phone className="size-4" />
        </a>
      )}
    </div>
  );
}

function StatCard({
  ar,
  label,
  value,
  color,
  icon: Icon,
}: {
  ar: boolean;
  label: { ar: string; en: string };
  value: number;
  color: string;
  icon: typeof Users;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm">
      <span className={`inline-flex size-8 rounded-xl items-center justify-center mb-1.5 ${color}`}>
        <Icon className="size-4" />
      </span>
      <p className="font-display font-extrabold text-lg leading-none text-slate-800">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{ar ? label.ar : label.en}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useAppointments, setAppointmentsStoreUser, type Appointment } from "@/lib/appointmentsStore";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  XCircle,
  Users,
  CalendarCheck,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import {
  ToothIcon,
  CrownToothIcon,
  RootCanalIcon,
  ImplantIcon,
  BracesIcon,
  SparkleToothIcon,
  ExtractionIcon,
} from "@/components/DentalIcons";

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

const TREATMENT_ICONS: Record<string, typeof ToothIcon> = {
  "تنظيف اسنان": SparkleToothIcon,
  "حشوة": ToothIcon,
  "علاج جذور": RootCanalIcon,
  "خلع": ExtractionIcon,
  "زراعة اسنان": ImplantIcon,
  "تركيب تاج": CrownToothIcon,
  "تقويم": BracesIcon,
  "تبييض": SparkleToothIcon,
};

function treatmentIcon(treatment: string): typeof ToothIcon {
  return TREATMENT_ICONS[treatment] ?? ToothIcon;
}

function format12h(slot: string, ar: boolean): string {
  const [hStr, mm] = slot.split(":");
  const hh = parseInt(hStr || "0", 10);
  const suffix = hh < 12 ? "ص" : "م";
  let hour = hh % 12;
  if (hour === 0) hour = 12;
  const hh12 = String(hour).padStart(2, "0");
  if (!ar) return `${hh12}:${mm} ${hh < 12 ? "AM" : "PM"}`;
  return `${hh12}:${mm} ${suffix}`;
}

type Theme = {
  bg: string;
  border: string;
  badge: string;
  icon: typeof Check;
  label: { ar: string; en: string };
};

function statusTheme(appt: Appointment): Theme {
  const status = appt.status ?? "confirmed";
  if (appt.appointmentType === "متابعة" && status === "confirmed") {
    return {
      bg: "bg-purple-50/60",
      border: "border-purple-100",
      badge: "bg-purple-100 text-purple-700",
      icon: Check,
      label: { ar: "متابعة", en: "Follow-up" },
    };
  }
  switch (status) {
    case "completed":
      return {
        bg: "bg-emerald-50/60",
        border: "border-emerald-100",
        badge: "bg-emerald-100 text-emerald-700",
        icon: Check,
        label: { ar: "مكتمل", en: "Completed" },
      };
    case "waiting":
      return {
        bg: "bg-amber-50/60",
        border: "border-amber-100",
        badge: "bg-amber-100 text-amber-700",
        icon: Clock,
        label: { ar: "انتظار", en: "Waiting" },
      };
    case "cancelled":
      return {
        bg: "bg-rose-50/60",
        border: "border-rose-100",
        badge: "bg-rose-100 text-rose-700",
        icon: XCircle,
        label: { ar: "ملغي", en: "Cancelled" },
      };
    default:
      return {
        bg: "bg-blue-50/60",
        border: "border-blue-100",
        badge: "bg-blue-100 text-blue-700",
        icon: Check,
        label: { ar: "مؤكد", en: "Confirmed" },
      };
  }
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
  const { user } = useSession();
  const today = new Date();
  const todayStr = toDateStr(today);

  useEffect(() => {
    setAppointmentsStoreUser(user?.uid || "");
  }, [user?.uid]);

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
  const nowTimeStr = `${String(nowHour).padStart(2, "0")}:${String(nowMin).padStart(2, "0")}`;
  const currentTime12h = format12h(nowTimeStr, ar);

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

          <div className="relative bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {TIME_SLOTS.map((slot) => {
              const slotAppts = sorted.filter((a) => hourSlot(a.time) === slot);
              const isCurrentHour = selectedDate === todayStr && parseInt(slot.split(":")[0]) === nowHour;

              return (
                <div key={slot} className={`flex border-b border-slate-50 last:border-b-0 ${isCurrentHour ? "bg-blue-50/30" : ""}`}>
                  <div className="w-16 shrink-0 py-3 flex flex-col items-center justify-start border-r border-slate-50">
                    <span className={`text-[11px] font-bold ${isCurrentHour ? "text-[#007AFF]" : "text-slate-400"}`}>
                      {format12h(slot, ar)}
                    </span>
                    {isCurrentHour && (
                      <span className="text-[9px] font-bold text-[#007AFF] mt-0.5">{ar ? "الآن" : "Now"}</span>
                    )}
                  </div>
                  <div className="flex-1 py-1.5 px-2 space-y-1.5">
                    {slotAppts.length === 0 ? (
                      <div className="h-6" />
                    ) : (
                      slotAppts.map((a) => (
                        <AppointmentCard key={a.id} appt={a} ar={ar} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* Current time indicator */}
            {selectedDate === todayStr && currentTimePercent > 0 && currentTimePercent < 100 && (
              <div
                className="absolute inset-x-0 z-10 flex items-center pointer-events-none"
                style={{ top: `${currentTimePercent}%` }}
              >
                <span className="bg-[#007AFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0 -translate-y-1/2">
                  {currentTime12h}
                </span>
                <span className="flex-1 h-px bg-[#007AFF]" />
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

function AppointmentCard({ appt, ar }: { appt: Appointment; ar: boolean }) {
  const theme = statusTheme(appt);
  const initial = appt.patientName.trim().charAt(0) || "؟";
  const StatusIcon = theme.icon;
  const TreatmentIcon = treatmentIcon(appt.treatment);
  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-4 rounded-2xl border transition",
      theme.bg,
      theme.border,
    )}>
      {/* Right: avatar */}
      <span className="size-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
        {initial}
      </span>
      {/* Treatment icon box */}
      <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0">
        <TreatmentIcon className="size-5" />
      </span>
      {/* Name + treatment subtitle */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{appt.patientName}</p>
        <p className="text-xs text-gray-500 truncate">{appt.treatment}</p>
      </div>
      {/* Left: status badge */}
      <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1", theme.badge)}>
        <StatusIcon className="size-3.5" />
        {ar ? theme.label.ar : theme.label.en}
      </span>
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

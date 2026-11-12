import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useAppointments, type Appointment } from "@/lib/appointmentsStore";
import { setClinicsStoreUser } from "@/lib/clinicsStore";
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
  Plus,
} from "lucide-react";
import { AddAppointmentModal } from "@/components/AddAppointmentModal";
import { AppointmentDetailModal } from "@/components/AppointmentDetailModal";
import {
  ToothIcon,
  CrownToothIcon,
  RootCanalIcon,
  ImplantIcon,
  BracesIcon,
  SparkleToothIcon,
  ExtractionIcon,
} from "@/components/DentalIcons";

const MORNING_SLOTS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"];
const EVENING_SLOTS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

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

const STRIPE: Record<string, { stripe: string; dot: string }> = {
  "متابعة": { stripe: "border-s-purple-500", dot: "bg-purple-500" },
  "مكتمل": { stripe: "border-s-emerald-500", dot: "bg-emerald-500" },
  "انتظار": { stripe: "border-s-amber-500", dot: "bg-amber-500" },
  "ملغي": { stripe: "border-s-rose-500", dot: "bg-rose-500" },
  "مؤكد": { stripe: "border-s-blue-500", dot: "bg-blue-500" },
};
const stripeOf = (appt: Appointment) => STRIPE[statusTheme(appt).label.ar] ?? STRIPE["مؤكد"];

const LEGEND = [
  { key: "مؤكد", en: "Confirmed" },
  { key: "انتظار", en: "Waiting" },
  { key: "مكتمل", en: "Completed" },
  { key: "متابعة", en: "Follow-up" },
  { key: "ملغي", en: "Cancelled" },
];

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
    // Defensive re-init for landing directly on this route (e.g. a reload)
    // without passing through the home route's effect first — must resolve
    // the full clinic context (list + active clinic), not just re-key this
    // one store, or it could point at the wrong clinic's appointments.
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  // Which half of the day the timeline shows: defaults to whichever half has
  // more of the day's appointments; tapping Morning/Evening overrides it
  // until the selected date changes (same as native).
  const [manualPeriod, setManualPeriod] = useState<"AM" | "PM" | null>(null);
  useEffect(() => {
    setManualPeriod(null);
  }, [selectedDate]);
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

  const defaultPeriod: "AM" | "PM" = stats.evening > stats.morning ? "PM" : "AM";
  const periodFilter = manualPeriod ?? defaultPeriod;
  const activeSlots = periodFilter === "AM" ? MORNING_SLOTS : EVENING_SLOTS;

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

  useEffect(() => {
    const d = new Date(selectedDate + "T00:00:00");
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [selectedDate]);

  const changeCalMonth = (dir: -1 | 1) =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1));

  const jumpToDate = (ds: string) => {
    setSelectedDate(ds);
    setShowCalendar(false);
  };

  const nowHour = new Date().getHours();

  return (
    <MobileShell wide>
      <TopBar title={ar ? "جدول المواعيد" : "Appointments"} showBack wide />
      <AppointmentsDesktop
        ar={ar}
        appointments={appointments}
        sorted={sorted}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        todayStr={todayStr}
        nowHour={nowHour}
        stats={stats}
        periodFilter={periodFilter}
        setPeriod={setManualPeriod}
        calDays={calDays}
        changeCalMonth={changeCalMonth}
        onAdd={() => setShowAdd(true)}
        onOpen={setSelectedAppt}
      />
      <div className="lg:hidden">
      <div className="px-4 pt-3 pb-2 md:px-6 md:pt-6 lg:px-8 lg:max-w-5xl lg:mx-auto">
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide md:gap-3 md:justify-between md:overflow-visible">
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

      <div className="px-4 pb-6 space-y-4 md:px-6 md:pb-12 md:space-y-6 lg:px-8 lg:max-w-5xl lg:mx-auto">
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
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <StatCard ar={ar} label={{ ar: "الإجمالي", en: "Total" }} value={stats.total} color="bg-sky-50 text-sky-700" icon={Users} />
          <StatCard
            ar={ar}
            label={{ ar: "صباحاً", en: "Morning" }}
            value={stats.morning}
            color="bg-amber-50 text-amber-700"
            icon={Sun}
            onClick={() => setManualPeriod("AM")}
            active={periodFilter === "AM"}
          />
          <StatCard
            ar={ar}
            label={{ ar: "مساءً", en: "Evening" }}
            value={stats.evening}
            color="bg-indigo-50 text-indigo-700"
            icon={Moon}
            onClick={() => setManualPeriod("PM")}
            active={periodFilter === "PM"}
          />
          <StatCard ar={ar} label={{ ar: "تذكير", en: "Reminders" }} value={stats.reminders} color="bg-rose-50 text-rose-700" icon={Bell} />
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-display font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5 md:text-lg md:mb-4">
            <Clock className="size-4 text-[#007AFF]" />
            {ar ? "الجدول الزمني" : "Timeline"}
          </h3>

          <div className="relative bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {activeSlots.map((slot) => {
              const slotAppts = sorted.filter((a) => hourSlot(a.time) === slot);
              const isCurrentHour = selectedDate === todayStr && parseInt(slot.split(":")[0]) === nowHour;

              return (
                <div key={slot} className={`flex border-b border-slate-50 last:border-b-0 ${isCurrentHour ? "bg-blue-50/30" : ""}`}>
                  <div className="w-16 shrink-0 py-3 flex flex-col items-center justify-start border-r border-slate-50 md:w-24 md:py-4">
                    <span className={`text-[11px] font-bold ${isCurrentHour ? "text-[#007AFF]" : "text-slate-400"}`}>
                      {format12h(slot, ar)}
                    </span>
                    {isCurrentHour && (
                      <span className="text-[9px] font-bold text-[#007AFF] mt-0.5">{ar ? "الآن" : "Now"}</span>
                    )}
                  </div>
                  <div className="flex-1 py-1.5 px-2 space-y-1.5 md:py-3 md:px-4 md:space-y-2">
                    {slotAppts.length === 0 ? (
                      <div className="h-6" />
                    ) : (
                      slotAppts.map((a) => (
                        <AppointmentCard key={a.id} appt={a} ar={ar} onClick={() => setSelectedAppt(a)} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
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

      {/* Floating add button */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="lg:hidden fixed bottom-24 end-5 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition lg:bottom-8 lg:end-8"
        aria-label={ar ? "إضافة موعد" : "Add appointment"}
      >
        <Plus className="size-6" />
      </button>

      {showAdd && <AddAppointmentModal onClose={() => setShowAdd(false)} />}
      <AppointmentDetailModal appointment={selectedAppt} onClose={() => setSelectedAppt(null)} />
    </MobileShell>
  );
}

function AppointmentCard({ appt, ar, onClick }: { appt: Appointment; ar: boolean; onClick?: () => void }) {
  const theme = statusTheme(appt);
  const initial = appt.patientName.trim().charAt(0) || "؟";
  const StatusIcon = theme.icon;
  const TreatmentIcon = treatmentIcon(appt.treatment);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
      className={cn(
        "flex items-center gap-3 py-2.5 px-4 rounded-2xl border transition cursor-pointer hover:shadow-sm",
        theme.bg,
        theme.border,
      )}
    >
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
  onClick,
  active,
}: {
  ar: boolean;
  label: { ar: string; en: string };
  value: number;
  color: string;
  icon: typeof Users;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-2xl p-3 text-center shadow-sm border transition",
        active ? "border-primary bg-primary/5" : "bg-white border-slate-100",
        onClick && "hover:border-primary/40",
      )}
    >
      <span className={`inline-flex size-8 rounded-xl items-center justify-center mb-1.5 ${color}`}>
        <Icon className="size-4" />
      </span>
      <p className="font-display font-extrabold text-lg leading-none text-slate-800">{value}</p>
      <p className={cn("text-[10px] font-bold mt-0.5", active ? "text-primary" : "text-slate-400")}>{ar ? label.ar : label.en}</p>
    </button>
  );
}

/* ── Large screens ─────────────────────────────────── */

type CalDays = { year: number; month: number; cells: (number | null)[] };

function AppointmentsDesktop({
  ar,
  appointments,
  sorted,
  selectedDate,
  setSelectedDate,
  todayStr,
  nowHour,
  stats,
  periodFilter,
  setPeriod,
  calDays,
  changeCalMonth,
  onAdd,
  onOpen,
}: {
  ar: boolean;
  appointments: Appointment[];
  sorted: Appointment[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  todayStr: string;
  nowHour: number;
  stats: { total: number; morning: number; evening: number; reminders: number };
  periodFilter: "AM" | "PM";
  setPeriod: (p: "AM" | "PM") => void;
  calDays: CalDays;
  changeCalMonth: (dir: -1 | 1) => void;
  onAdd: () => void;
  onOpen: (a: Appointment) => void;
}) {
  const selected = new Date(selectedDate + "T00:00:00");
  const months = ar ? MONTHS_AR : MONTHS_EN;
  const dayName = ar ? DAY_LABELS[selected.getDay()].ar : DAY_LABELS[selected.getDay()].en;
  const slots = periodFilter === "AM" ? MORNING_SLOTS : EVENING_SLOTS;
  const isToday = selectedDate === todayStr;

  const week = (() => {
    const start = new Date(selected);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  })();
  const countOn = (ds: string) => appointments.filter((a) => a.date === ds).length;
  const shiftWeek = (dir: -1 | 1) => {
    const d = new Date(selected);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(toDateStr(d));
  };

  const statCards = [
    { key: "total", label: ar ? "الإجمالي" : "Total", value: stats.total, icon: Users, tint: "from-sky-50 to-white", iconCls: "bg-sky-100 text-sky-600" },
    { key: "AM", label: ar ? "صباحاً" : "Morning", value: stats.morning, icon: Sun, tint: "from-amber-50 to-white", iconCls: "bg-amber-100 text-amber-600" },
    { key: "PM", label: ar ? "مساءً" : "Evening", value: stats.evening, icon: Moon, tint: "from-indigo-50 to-white", iconCls: "bg-indigo-100 text-indigo-600" },
    { key: "rem", label: ar ? "التذكيرات" : "Reminders", value: stats.reminders, icon: Bell, tint: "from-rose-50 to-white", iconCls: "bg-rose-100 text-rose-600" },
  ] as const;

  return (
    <div className="hidden lg:block px-8 pt-6 pb-12 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="space-y-6 min-w-0">
          {/* Day header + week */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary">{isToday ? (ar ? "اليوم" : "Today") : dayName}</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900">
                  {isToday && `${dayName} · `}
                  {selected.getDate()} {months[selected.getMonth()]} {selected.getFullYear()}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {stats.total === 0
                    ? ar ? "لا مواعيد في هذا اليوم" : "No appointments this day"
                    : ar ? `${stats.total} مواعيد في هذا اليوم` : `${stats.total} appointments this day`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    {ar ? "اليوم" : "Today"}
                  </button>
                )}
                <div className="flex h-10 overflow-hidden rounded-xl border border-slate-200">
                  <button type="button" aria-label={ar ? "الأسبوع السابق" : "Previous week"} onClick={() => shiftWeek(-1)} className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                    {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                  </button>
                  <span className="w-px bg-slate-200" />
                  <button type="button" aria-label={ar ? "الأسبوع التالي" : "Next week"} onClick={() => shiftWeek(1)} className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                    {ar ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onAdd}
                  className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 transition flex items-center gap-1.5"
                >
                  <Plus className="size-4" />
                  {ar ? "موعد جديد" : "New appointment"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-3">
              {week.map((d) => {
                const ds = toDateStr(d);
                const sel = ds === selectedDate;
                const today = ds === todayStr;
                const count = countOn(ds);
                const label = DAY_LABELS[d.getDay()];
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => setSelectedDate(ds)}
                    className={cn(
                      "rounded-2xl border px-2 py-3 text-center transition",
                      sel
                        ? "border-transparent bg-gradient-to-b from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200"
                        : today
                          ? "border-blue-200 bg-blue-50/60 text-slate-800 hover:border-blue-300"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn("block text-[11px] font-bold", sel ? "text-white/80" : "text-slate-400")}>{ar ? label.ar : label.en}</span>
                    <span className="mt-1 block font-display text-xl font-extrabold leading-none">{d.getDate()}</span>
                    <span
                      className={cn(
                        "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                        count === 0 ? (sel ? "text-white/60" : "text-slate-300") : sel ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600",
                      )}
                    >
                      {count === 0 ? "—" : ar ? `${count} موعد` : `${count}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {statCards.map((c) => {
              const period = c.key === "AM" || c.key === "PM" ? c.key : null;
              const active = period !== null && periodFilter === period;
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={!period}
                  onClick={() => period && setPeriod(period)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-4 text-start shadow-sm transition",
                    c.tint,
                    active ? "border-primary ring-2 ring-primary/15" : "border-slate-200/80",
                    period && !active && "hover:border-slate-300",
                  )}
                >
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", c.iconCls)}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-2xl font-extrabold leading-none text-slate-900">{c.value}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{c.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-900">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <Clock className="size-4" />
                </span>
                {ar ? "الجدول الزمني" : "Timeline"}
              </h3>
              <div className="flex rounded-xl bg-slate-100 p-1">
                {(["AM", "PM"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition",
                      periodFilter === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {p === "AM" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                    {p === "AM" ? (ar ? "صباحاً" : "Morning") : ar ? "مساءً" : "Evening"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {slots.map((slot) => {
                const inSlot = sorted.filter((a) => hourSlot(a.time) === slot);
                const current = isToday && parseInt(slot.split(":")[0], 10) === nowHour;
                return (
                  <div key={slot} className={cn("group grid grid-cols-[104px_1fr] border-b border-slate-100 last:border-b-0", current && "bg-blue-50/40")}>
                    <div className={cn("relative border-e border-slate-100 px-4 py-4 text-center", current ? "bg-blue-50/70" : "bg-slate-50/50")}>
                      {current && <span className="absolute inset-y-0 start-0 w-1 bg-primary" />}
                      <span className={cn("block text-sm font-bold", current ? "text-primary" : "text-slate-500")}>
                        {format12h(slot, ar)}
                      </span>
                      {current && <span className="mt-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{ar ? "الآن" : "Now"}</span>}
                    </div>
                    <div className="min-h-[76px] px-4 py-3">
                      {inSlot.length === 0 ? (
                        <button
                          type="button"
                          onClick={onAdd}
                          className="flex h-full min-h-[52px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-transparent text-xs font-bold text-transparent transition group-hover:border-slate-200 group-hover:text-slate-400 hover:!border-primary/40 hover:!text-primary"
                        >
                          <Plus className="size-3.5" />
                          {ar ? "إضافة موعد" : "Add appointment"}
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                          {inSlot.map((a) => (
                            <DesktopAppointmentCard key={a.id} appt={a} ar={ar} onClick={() => onOpen(a)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Side column ── */}
        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => changeCalMonth(-1)} className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              <p className="font-display text-sm font-extrabold text-slate-900">
                {months[calDays.month]} {calDays.year}
              </p>
              <button type="button" onClick={() => changeCalMonth(1)} className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                {ar ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {(ar ? WEEKDAYS_AR : WEEKDAYS_EN).map((d) => (
                <span key={d} className="py-1 text-center text-[10px] font-bold text-slate-400">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.cells.map((d, i) => {
                if (d === null) return <span key={`e-${i}`} />;
                const ds = toDateStr(new Date(calDays.year, calDays.month, d));
                const sel = ds === selectedDate;
                const today = ds === todayStr;
                const has = appointments.some((a) => a.date === ds);
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => setSelectedDate(ds)}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition",
                      sel ? "bg-primary text-primary-foreground shadow-sm" : today ? "bg-blue-50 text-primary" : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    {d}
                    {has && <span className={cn("absolute bottom-1 size-1 rounded-full", sel ? "bg-white" : "bg-primary")} />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-extrabold text-slate-900">{ar ? "مواعيد اليوم المختار" : "This day"}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{sorted.length}</span>
            </div>
            {sorted.length === 0 ? (
              <div className="py-6 text-center">
                <CalendarCheck className="mx-auto mb-2 size-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-400">{ar ? "لا توجد مواعيد" : "Nothing booked"}</p>
                <button type="button" onClick={onAdd} className="mt-3 text-xs font-bold text-primary hover:underline">
                  {ar ? "+ إضافة موعد" : "+ Add one"}
                </button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {sorted.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onOpen(a)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-slate-50 transition">
                      <span className={cn("size-2 shrink-0 rounded-full", stripeOf(a).dot)} />
                      <span className="w-[68px] shrink-0 text-xs font-bold text-slate-500">{format12h(hourSlot(a.time).replace(":00", ":" + ((a.time || "00:00").split(":")[1] ?? "00")), ar)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{a.patientName}</span>
                        <span className="block truncate text-[11px] text-slate-400">{a.treatment}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-display text-sm font-extrabold text-slate-900">{ar ? "دليل الألوان" : "Status colours"}</h3>
            <div className="grid grid-cols-2 gap-2">
              {LEGEND.map((l) => (
                <span key={l.key} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className={cn("size-2.5 rounded-full", STRIPE[l.key].dot)} />
                  {ar ? l.key : l.en}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DesktopAppointmentCard({ appt, ar, onClick }: { appt: Appointment; ar: boolean; onClick: () => void }) {
  const theme = statusTheme(appt);
  const StatusIcon = theme.icon;
  const TreatmentIcon = treatmentIcon(appt.treatment);
  const initial = appt.patientName.trim().charAt(0) || "؟";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-s-4 bg-white p-3 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        "border-slate-200/80",
        stripeOf(appt).stripe,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-700">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900">{appt.patientName}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
          <TreatmentIcon className="size-3.5 shrink-0 text-blue-500" />
          <span className="truncate">{appt.treatment}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] font-bold text-slate-400" dir="ltr">{appt.time}</span>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", theme.badge)}>
          <StatusIcon className="size-3" />
          {ar ? theme.label.ar : theme.label.en}
        </span>
      </span>
    </button>
  );
}

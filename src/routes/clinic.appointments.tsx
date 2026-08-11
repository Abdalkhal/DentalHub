import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { usePatients } from "@/lib/patientsStore";
import type { Visit } from "@/lib/patientsStore";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Plus,
  UserPlus,
  Bell,
  Users,
  CalendarCheck,
  Clock3,
  XCircle,
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

const PROCEDURE_ICONS: Record<string, string> = {
  تنظيف: "🧹",
  "تنظيف الأسنان": "🧹",
  cleaning: "🧹",
  حشوة: "🦷",
  حشو: "🦷",
  filling: "🦷",
  "علاج عصب": "⚡",
  "سحب عصب": "⚡",
  rootcanal: "⚡",
  rct: "⚡",
  خلع: "🔧",
  extraction: "🔧",
  تقويم: "😬",
  ortho: "😬",
  زراعة: "🔩",
  implant: "🔩",
  تلبيسة: "👑",
  crown: "👑",
  bridge: "🌉",
  جسر: "🌉",
  فحص: "🔍",
  examination: "🔍",
  checkup: "🔍",
};

function procedureIcon(procedure: string): string {
  const lower = procedure.toLowerCase().trim();
  for (const [key, icon] of Object.entries(PROCEDURE_ICONS)) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  return "🩺";
}

function statusConfig(
  status: Visit["status"],
  upcoming?: boolean,
): { label: { ar: string; en: string }; bg: string; icon: typeof Check } {
  if (status === "completed") return { label: { ar: "مكتمل", en: "Completed" }, bg: "bg-emerald-100 text-emerald-700", icon: Check };
  if (status === "confirmed") return { label: { ar: "مؤكد", en: "Confirmed" }, bg: "bg-sky-100 text-sky-700", icon: Check };
  if (status === "waiting") return { label: { ar: "انتظار", en: "Waiting" }, bg: "bg-amber-100 text-amber-700", icon: Clock3 };
  if (status === "cancelled") return { label: { ar: "ملغي", en: "Cancelled" }, bg: "bg-rose-100 text-rose-700", icon: XCircle };
  if (upcoming) return { label: { ar: "مؤكد", en: "Confirmed" }, bg: "bg-sky-100 text-sky-700", icon: Check };
  return { label: { ar: "مكتمل", en: "Completed" }, bg: "bg-emerald-100 text-emerald-700", icon: Check };
}

function getTimeFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const idx = hash % TIME_SLOTS.length;
  return TIME_SLOTS[idx];
}

function formatMonthYear(date: Date, ar: boolean): string {
  const months = ar
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayOfWeek(d: Date): number {
  let day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

export const Route = createFileRoute("/clinic/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const patients = usePatients();
  const today = new Date();
  const todayStr = toDateStr(today);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(baseDate);
    const dow = dayOfWeek(startOfWeek);
    startOfWeek.setDate(startOfWeek.getDate() - dow);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [monthOffset, baseDate.getMonth(), baseDate.getFullYear()]);

  const appointments = useMemo(() => {
    const result: { patientName: string; patientAvatar?: string; patientId: string; visit: Visit }[] = [];
    for (const p of patients) {
      for (const v of p.visits) {
        if (v.date === selectedDate) {
          if (v.upcoming === false && v.status !== "cancelled") continue;
          result.push({
            patientName: p.name,
            patientAvatar: p.avatar,
            patientId: p.id,
            visit: v,
          });
        }
      }
    }
    result.sort((a, b) => {
      const ta = a.visit.time || getTimeFromId(a.visit.id);
      const tb = b.visit.time || getTimeFromId(b.visit.id);
      return ta.localeCompare(tb);
    });
    return result;
  }, [patients, selectedDate]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => (a.visit.status ?? (a.visit.upcoming ? "confirmed" : "completed")) === "confirmed").length;
    const waiting = appointments.filter((a) => a.visit.status === "waiting").length;
    const cancelled = appointments.filter((a) => a.visit.status === "cancelled").length;
    const completed = appointments.filter((a) => a.visit.status === "completed").length;
    return { total, confirmed, waiting, cancelled, completed };
  }, [appointments]);

  const changeMonth = (dir: -1 | 1) => setMonthOffset((o) => o + dir);

  const goToToday = () => {
    setMonthOffset(0);
    setSelectedDate(todayStr);
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
          <h2 className="font-display font-extrabold text-base text-slate-800">
            {formatMonthYear(baseDate, ar)}
          </h2>
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
            const isCurrentMonth = d.getMonth() === baseDate.getMonth();
            const dow = dayOfWeek(d);
            const dayLabel = DAY_LABELS[dow];
            const apptCount = patients.reduce((count, p) => {
              return count + p.visits.filter((v) => v.date === ds && (v.upcoming !== false || v.status === "cancelled")).length;
            }, 0);

            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex flex-col items-center shrink-0 w-12 py-2 rounded-2xl transition-all text-center ${
                  isSelected
                    ? "bg-gradient-to-b from-[#007AFF] to-[#0056CC] text-white shadow-lg shadow-blue-200"
                    : isToday
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : "bg-white text-slate-500 border border-slate-100 hover:border-slate-200"
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
          <StatCard
            ar={ar}
            label={{ ar: "الإجمالي", en: "Total" }}
            value={stats.total}
            color="bg-sky-50 text-sky-700"
            icon={Users}
          />
          <StatCard
            ar={ar}
            label={{ ar: "مؤكد", en: "Confirmed" }}
            value={stats.confirmed}
            color="bg-indigo-50 text-indigo-700"
            icon={CalendarCheck}
          />
          <StatCard
            ar={ar}
            label={{ ar: "انتظار", en: "Waiting" }}
            value={stats.waiting}
            color="bg-amber-50 text-amber-700"
            icon={Clock3}
          />
          <StatCard
            ar={ar}
            label={{ ar: "ملغي", en: "Cancelled" }}
            value={stats.cancelled}
            color="bg-rose-50 text-rose-700"
            icon={XCircle}
          />
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-display font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5">
            <Clock className="size-4 text-[#007AFF]" />
            {ar ? "الجدول الزمني" : "Timeline"}
          </h3>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {TIME_SLOTS.map((slot) => {
              const slotAppts = appointments.filter((a) => {
                const t = a.visit.time || getTimeFromId(a.visit.id);
                return t === slot;
              });

              const isCurrentHour =
                selectedDate === todayStr && parseInt(slot.split(":")[0]) === nowHour;

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
                      slotAppts.map((a) => {
                        const sCfg = statusConfig(a.visit.status, a.visit.upcoming);
                        const icon = procedureIcon(a.visit.procedure);
                        return (
                          <div
                            key={a.visit.id}
                            className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm hover:shadow-md transition cursor-pointer"
                            onClick={() => navigate({ to: "/patients/$patientId", params: { patientId: a.patientId } })}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                {a.patientAvatar ? (
                                  <img src={a.patientAvatar} alt="" className="size-full object-cover" />
                                ) : (
                                  a.patientName.trim().charAt(0)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {a.patientName}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                  <span>{icon}</span>
                                  {a.visit.procedure}
                                </p>
                              </div>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${sCfg.bg} flex items-center gap-1`}>
                                <sCfg.icon className="size-3" />
                                {ar ? sCfg.label.ar : sCfg.label.en}
                              </span>
                            </div>
                            {a.visit.note && (
                              <p className="text-[10px] text-slate-400 mt-1.5 ml-11">{a.visit.note}</p>
                            )}
                          </div>
                        );
                      })
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
        {appointments.length === 0 && (
          <div className="py-10 text-center">
            <CalendarCheck className="size-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">
              {ar ? "لا توجد مواعيد في هذا اليوم" : "No appointments on this day"}
            </p>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate({ to: "/patients" })}
            className="flex-1 h-11 rounded-2xl bg-[#007AFF] text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-200 hover:bg-blue-600 transition"
          >
            <Plus className="size-4" />
            {ar ? "موعد جديد" : "New Appointment"}
          </button>
          <button
            onClick={() => navigate({ to: "/patients" })}
            className="flex-1 h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 font-display font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
          >
            <UserPlus className="size-4" />
            {ar ? "مريض جديد" : "New Patient"}
          </button>
          <button
            className="h-11 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-display font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
          >
            <Bell className="size-4" />
            {ar ? "تذكير" : "Remind"}
          </button>
        </div>
      </div>
    </MobileShell>
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

import { useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Calendar, Clock, Bell, User, Phone, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { addAppointment } from "@/lib/appointmentsStore";
import { useClinic } from "@/lib/clinicStore";
import { useUserRole } from "@/lib/useAuth";
import { toast } from "sonner";

const APPOINTMENT_TYPES = ["استشارة", "متابعة", "مراجعة بعد العلاج", "طوارئ", "فحص دوري", "استشارة اونلاين"];
const TREATMENTS = ["تنظيف اسنان", "حشوة", "علاج جذور", "خلع", "زراعة اسنان", "تركيب تاج", "تقويم", "تبييض"];

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function maskTime(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 4) digits = digits.slice(0, 4);
  if (digits.length === 0) return "";
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2);
  return mm.length ? `${hh}:${mm}` : hh;
}

export function AddAppointmentModal({ onClose }: { onClose: () => void }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const { doctors } = useClinic();

  const mainDoctor = role?.name || (ar ? "الطبيب الرئيسي" : "Main Doctor");
  const doctorOptions = useMemo(() => {
    const list = [{ id: "main", name: mainDoctor }];
    doctors.forEach((d) => list.push({ id: d.id, name: d.name }));
    return list;
  }, [doctors, mainDoctor]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [appointmentType, setAppointmentType] = useState(APPOINTMENT_TYPES[0]);
  const [room, setRoom] = useState("");
  const [doctor, setDoctor] = useState("main");
  const [treatment, setTreatment] = useState(TREATMENTS[0]);
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(true);

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

  const changeCalMonth = (dir: -1 | 1) => {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1));
  };

  const formatFullTime = (): string => {
    const digits = time.replace(/\D/g, "");
    if (!digits) return "00:00";
    let hh = Number(digits.slice(0, 2)) || 0;
    const mm = digits.slice(2, 4).padEnd(2, "0");
    if (period === "PM" && hh < 12) hh += 12;
    if (period === "AM" && hh === 12) hh = 0;
    return `${String(hh).padStart(2, "0")}:${mm}`;
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error(ar ? "اسم المريض مطلوب" : "Patient name is required");
      return;
    }
    addAppointment({
      patientName: name.trim(),
      phone: phone.replace(/\D/g, ""),
      date,
      time: formatFullTime(),
      appointmentType,
      clinicRoom: room.trim(),
      doctor: doctor === "main" ? mainDoctor : (doctors.find((d) => d.id === doctor)?.name || mainDoctor),
      treatment,
      notes: notes.trim(),
      reminder,
    });
    toast.success(ar ? "تم إضافة الموعد بنجاح" : "Appointment added successfully");
    onClose();
  };

  const dateLabel = ar
    ? `${new Date(date + "T00:00:00").getDate()} ${MONTHS_AR[new Date(date + "T00:00:00").getMonth()]} ${new Date(date + "T00:00:00").getFullYear()}`
    : new Date(date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[92vh] flex flex-col rounded-t-3xl bg-background"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <h2 className="font-display font-extrabold text-base">{ar ? "إضافة موعد" : "Add Appointment"}</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-card border border-border flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">
          {/* Patient */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-muted-foreground">{ar ? "بيانات المريض" : "Patient"}</p>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="relative">
                <User className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ar ? "اسم المريض" : "Patient name"}
                  className="w-full h-11 rounded-xl bg-card border border-border ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
                />
              </div>
              <div className="relative">
                <Phone className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder={ar ? "رقم الهاتف" : "Phone number"}
                  className="w-full h-11 rounded-xl bg-card border border-border ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Date + Time */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-muted-foreground">{ar ? "التاريخ والوقت" : "Date & Time"}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className="h-11 rounded-xl bg-card border border-border px-3 flex items-center gap-2 text-sm hover:border-primary/40 transition"
              >
                <Calendar className="size-4 text-primary shrink-0" />
                <span className="truncate text-start">{dateLabel}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Clock className="size-4 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={time}
                    onChange={(e) => setTime(maskTime(e.target.value))}
                    inputMode="numeric"
                    placeholder="00:00"
                    className="w-full h-11 rounded-xl bg-card border border-border ps-8 pe-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
                  />
                </div>
                <div className="flex rounded-xl bg-card border border-border overflow-hidden shrink-0">
                  <button type="button" onClick={() => setPeriod("AM")} className={cn("px-2.5 h-11 text-[11px] font-bold transition", period === "AM" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{ar ? "صباحاً" : "AM"}</button>
                  <button type="button" onClick={() => setPeriod("PM")} className={cn("px-2.5 h-11 text-[11px] font-bold transition", period === "PM" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{ar ? "مساءً" : "PM"}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Type + Room */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5">{ar ? "نوع الموعد" : "Appointment Type"}</p>
              <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)} className="w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary">
                {APPOINTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5">{ar ? "العيادة / الغرفة" : "Clinic / Room"}</p>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder={ar ? "العيادة الرئيسية - غرفة 1" : "Main clinic - Room 1"}
                className="w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
              />
            </div>
          </div>

          {/* Doctor + Treatment */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5">{ar ? "الطبيب" : "Doctor"}</p>
              <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className="w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary">
                {doctorOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5">{ar ? "العلاج / الخدمة" : "Treatment / Service"}</p>
              <select value={treatment} onChange={(e) => setTreatment(e.target.value)} className="w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary">
                {TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-muted-foreground">{ar ? "ملاحظات" : "Notes"}</p>
              <span className="text-[10px] text-muted-foreground">{notes.length}/200</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              rows={3}
              placeholder={ar ? "أضف أي ملاحظات..." : "Add any notes..."}
              className="w-full h-auto py-2.5 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary resize-none"
            />
          </div>

          {/* Reminder */}
          <button
            type="button"
            onClick={() => setReminder((v) => !v)}
            className={cn(
              "w-full h-12 rounded-xl border px-4 flex items-center justify-between transition",
              reminder ? "bg-primary/5 border-primary/30" : "bg-card border-border",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Bell className={cn("size-4", reminder ? "text-primary" : "text-muted-foreground")} />
              {ar ? "تذكير بالموعد" : "Appointment reminder"}
            </span>
            <span className={cn("relative inline-flex h-6 w-11 rounded-full transition-colors", reminder ? "bg-primary" : "bg-muted")}>
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", reminder ? "start-[22px]" : "start-0.5")} />
            </span>
          </button>
        </div>

        <div className="p-4 border-t border-border bg-background shrink-0">
          <button
            onClick={submit}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-1.5"
          >
            <Check className="size-4" />
            {ar ? "حفظ الموعد" : "Save Appointment"}
          </button>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCalendar(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-background p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => changeCalMonth(-1)} className="size-9 rounded-xl bg-card border border-border flex items-center justify-center">
                {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              <p className="font-display font-bold text-sm">
                {ar ? `${MONTHS_AR[calDays.month]} ${calDays.year}` : `${MONTHS_EN[calDays.month]} ${calDays.year}`}
              </p>
              <button type="button" onClick={() => changeCalMonth(1)} className="size-9 rounded-xl bg-card border border-border flex items-center justify-center">
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
                const isSelected = ds === date;
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => { setDate(ds); setShowCalendar(false); }}
                    className={cn(
                      "h-10 rounded-xl text-sm font-semibold transition flex items-center justify-center",
                      isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Public booking page — what a patient sees after tapping the dentist's link
// (Instagram bio, a WhatsApp message, the QR code at the clinic). No account,
// no app: pick a day and a free time, leave a name and number, send. The
// request waits for the dentist's confirmation (see src/lib/booking.ts).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarX2,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Ticket,
  User,
} from "lucide-react";
import { app } from "@/integrations/firebase/config";
import {
  BOOKING_REASONS,
  bookableDates,
  DEMO_SLUG,
  DAY_NAMES_AR,
  formatDateAr,
  formatTime12,
  freeSlots,
  getBookingPage,
  getBusyTimes,
  MONTHS_AR,
  normalizeIraqiPhone,
  toMinutes,
  whatsappLink,
  type BookingClinic,
  type BookingPage,
} from "@/lib/booking";
import {
  BookingFrame,
  Card,
  DoctorAvatar,
  PoweredBy,
  readSavedBookings,
  readSavedDetails,
  saveBooking,
  saveDetails,
  SectionTitle,
  statusLink,
  type SavedBooking,
} from "@/components/booking/BookingUi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$slug")({
  component: BookPage,
  head: () => ({
    meta: [
      { title: "احجز موعدك — Dent Hub" },
      { name: "description", content: "احجز موعدك في العيادة بخطوات بسيطة، بدون تسجيل." },
      { name: "theme-color", content: "#0E6E66" },
    ],
  }),
});

type Done = { id: string; token: string; code: string };

const ERRORS: Record<string, string> = {
  "slot-taken": "هذا الوقت حُجز للتو، اختر وقتاً آخر.",
  "phone-limit": "لديك طلبان بانتظار تأكيد العيادة. انتظر الرد أو ألغِ أحدهما.",
  "too-many": "طلبات كثيرة من هذا الجهاز. حاول بعد ساعة.",
  closed: "الحجز متوقف حالياً لدى هذه العيادة.",
  phone: "رقم الهاتف غير صحيح. اكتب رقماً عراقياً يبدأ بـ 07.",
  name: "اكتب اسمك الكامل.",
};

function BookPage() {
  const { slug } = Route.useParams();
  const [page, setPage] = useState<BookingPage | null | undefined>(undefined);
  const [clinicId, setClinicId] = useState("");
  const [busy, setBusy] = useState<Record<string, string[]>>({});
  const [busyLoading, setBusyLoading] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("checkup");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [mine, setMine] = useState<SavedBooking[]>([]);
  const detailsRef = useRef<HTMLDivElement>(null);
  const timesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getBookingPage(slug)
      .then((p) => {
        if (!alive) return;
        setPage(p);
        const clinics = (p?.clinics ?? []).filter((c) => c.enabled);
        if (clinics.length === 1) setClinicId(clinics[0].id);
      })
      .catch(() => alive && setPage(null));
    const d = readSavedDetails();
    setName(d.name);
    setPhone(d.phone);
    setMine(
      readSavedBookings().filter(
        (b) => b.slug === slug && b.date >= new Date().toISOString().slice(0, 10),
      ),
    );
    return () => {
      alive = false;
    };
  }, [slug]);

  const clinics = useMemo(() => (page?.clinics ?? []).filter((c) => c.enabled), [page]);
  const clinic = clinics.find((c) => c.id === clinicId);
  const dates = useMemo(() => (page ? bookableDates(page) : []), [page]);

  // Taken times for every bookable day of the chosen clinic, so full days
  // can be marked before the patient taps them.
  const loadBusy = (p: BookingPage, c: BookingClinic) => {
    setBusyLoading(true);
    Promise.all(
      dates.map(async (d) => [d, await getBusyTimes(p.ownerId, c.id, d).catch(() => [])] as const),
    )
      .then((rows) => setBusy(Object.fromEntries(rows)))
      .finally(() => setBusyLoading(false));
  };

  useEffect(() => {
    if (!page || !clinic) return;
    setTime("");
    loadBusy(page, clinic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, clinicId]);

  const slotsByDate = useMemo(() => {
    const out: Record<string, string[]> = {};
    if (!page || !clinic) return out;
    for (const d of dates) out[d] = freeSlots(page, clinic, d, busy[d] ?? []);
    return out;
  }, [page, clinic, dates, busy]);

  // First day with a free slot is pre-selected.
  useEffect(() => {
    if (busyLoading || !clinic) return;
    if (date && slotsByDate[date]?.length) return;
    setDate(dates.find((d) => slotsByDate[d]?.length) ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsByDate, busyLoading]);

  const slots = slotsByDate[date] ?? [];
  const groups = useMemo(
    () =>
      [
        { id: "am", label: "صباحاً", Icon: Sun, list: slots.filter((s) => toMinutes(s) < 12 * 60) },
        {
          id: "noon",
          label: "بعد الظهر",
          Icon: Sunset,
          list: slots.filter((s) => toMinutes(s) >= 12 * 60 && toMinutes(s) < 17 * 60),
        },
        {
          id: "pm",
          label: "مساءً",
          Icon: Moon,
          list: slots.filter((s) => toMinutes(s) >= 17 * 60),
        },
      ].filter((g) => g.list.length),
    [slots],
  );

  const phoneOk = !!normalizeIraqiPhone(phone);
  const canSend = !!(clinic && date && time && name.trim().length >= 2 && phoneOk && !sending);

  const pickTime = (t: string) => {
    setTime(t);
    setError("");
    setTimeout(
      () => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      120,
    );
  };

  const send = async () => {
    if (!page || !clinic || !canSend) return;
    setSending(true);
    setError("");
    if (slug === DEMO_SLUG) {
      setTimeout(() => {
        setDone({ id: "", token: "", code: "DH-0000" });
        setSending(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 700);
      return;
    }
    try {
      const call = httpsCallable<Record<string, string>, Done>(
        getFunctions(app, "us-central1"),
        "createBookingRequest",
      );
      const { data } = await call({
        slug,
        clinicId: clinic.id,
        date,
        time,
        name: name.trim(),
        phone,
        reason,
        note: note.trim(),
        website,
      });
      saveDetails(name.trim(), phone);
      saveBooking({
        id: data.id,
        token: data.token,
        slug,
        date,
        time,
        doctorName: page.doctorName,
      });
      setDone(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const key = (err as { message?: string }).message ?? "";
      setError(ERRORS[key] ?? "تعذّر إرسال الطلب. تحقق من الإنترنت وحاول مرة أخرى.");
      if (key === "slot-taken") {
        setTime("");
        loadBusy(page, clinic);
        timesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } finally {
      setSending(false);
    }
  };

  if (page === undefined) return <LoadingView />;
  if (page === null)
    return (
      <Unavailable title="الرابط غير صحيح" text="تأكد من الرابط أو اطلبه من العيادة مرة أخرى." />
    );
  if (!page.enabled || clinics.length === 0)
    return (
      <Unavailable
        page={page}
        title="الحجز متوقف حالياً"
        text="لا تستقبل العيادة حجوزات عبر الرابط في الوقت الحالي. يمكنك التواصل معها مباشرة."
      />
    );
  if (done && clinic)
    return (
      <SuccessView
        page={page}
        clinic={clinic}
        date={date}
        time={time}
        done={done}
        name={name.trim()}
      />
    );

  return (
    <BookingFrame hero={<DoctorHeader page={page} />}>
      {mine.length > 0 && (
        <Link
          to="/book/r/$requestId"
          params={{ requestId: mine[0].id }}
          search={{ t: mine[0].token }}
          className="mb-4 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-sm shadow-[0_10px_30px_-20px_rgba(6,60,55,0.6)]"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#E3F4F1] text-[#0E6E66]">
            <Ticket className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">لديك حجز سابق</span>
            <span className="block text-xs text-[#5B7774]">
              {formatDateAr(mine[0].date)} · {formatTime12(mine[0].time)}
            </span>
          </span>
          <ChevronLeft className="size-4 text-[#7C9592]" />
        </Link>
      )}

      <div className="space-y-4">
        {clinics.length > 1 && (
          <Card>
            <SectionTitle step={1} title="اختر العيادة" />
            <div className="space-y-2.5">
              {clinics.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClinicId(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-right transition",
                    c.id === clinicId
                      ? "border-[#14A08F] bg-[#F0FAF8]"
                      : "border-[#E7EFEE] hover:border-[#BFE3DD]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      c.id === clinicId
                        ? "border-[#14A08F] bg-[#14A08F] text-white"
                        : "border-[#C9D9D7]",
                    )}
                  >
                    {c.id === clinicId && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold">{c.name}</span>
                    {c.address && (
                      <span className="mt-0.5 block text-xs text-[#5B7774]">{c.address}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {clinic && (
          <Card>
            <SectionTitle
              step={clinics.length > 1 ? 2 : 1}
              title="اختر اليوم"
              hint={date ? formatDateAr(date) : undefined}
            />
            <DayStrip
              dates={dates}
              slotsByDate={slotsByDate}
              loading={busyLoading}
              value={date}
              onChange={(d) => {
                setDate(d);
                setTime("");
              }}
            />

            <div ref={timesRef} className="scroll-mt-4 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#36514E]">الأوقات المتاحة</h3>
                {page.slotMinutes > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-[#7C9592]">
                    <Clock3 className="size-3.5" /> مدة الموعد {page.slotMinutes} دقيقة
                  </span>
                )}
              </div>
              {busyLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-11 animate-pulse rounded-xl bg-[#EEF4F3]" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#F6F9F9] py-8 text-center">
                  <CalendarX2 className="size-7 text-[#9DB3B0]" />
                  <p className="text-sm font-semibold text-[#5B7774]">
                    لا توجد أوقات متاحة في هذا اليوم
                  </p>
                  <p className="text-xs text-[#7C9592]">اختر يوماً آخر من الأعلى</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map(({ id, label, Icon, list }) => (
                    <div key={id}>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#5B7774]">
                        <Icon className="size-3.5" /> {label}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {list.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => pickTime(s)}
                            className={cn(
                              "h-11 rounded-xl border text-sm font-bold tabular-nums transition active:scale-[0.97]",
                              s === time
                                ? "border-transparent bg-gradient-to-b from-[#16A894] to-[#0E6E66] text-white shadow-[0_8px_18px_-8px_rgba(14,110,102,0.8)]"
                                : "border-[#E2ECEB] bg-white text-[#10302D] hover:border-[#9ED6CD] hover:bg-[#F3FBF9]",
                            )}
                          >
                            {formatTime12(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {clinic && time && (
          <div ref={detailsRef} className="scroll-mt-4">
            <Card>
              <SectionTitle
                step={clinics.length > 1 ? 3 : 2}
                title="بياناتك"
                hint="تصل للعيادة فقط لتأكيد موعدك"
              />
              <div className="space-y-3.5">
                <Field icon={<User className="size-[18px]" />} label="الاسم الكامل">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={60}
                    placeholder="مثال: سارة علي"
                    className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#A9BCB9]"
                  />
                </Field>
                <Field
                  icon={<Phone className="size-[18px]" />}
                  label="رقم الهاتف"
                  error={
                    phone.length >= 11 && !phoneOk ? "اكتب رقماً عراقياً يبدأ بـ 07" : undefined
                  }
                >
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    maxLength={16}
                    placeholder="07XX XXX XXXX"
                    className="w-full bg-transparent text-right text-[15px] tabular-nums outline-none placeholder:text-[#A9BCB9]"
                  />
                  {phoneOk && <Check className="size-4 shrink-0 text-[#14A08F]" strokeWidth={3} />}
                </Field>

                <div>
                  <p className="mb-2 text-xs font-semibold text-[#5B7774]">سبب الزيارة</p>
                  <div className="flex flex-wrap gap-2">
                    {BOOKING_REASONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReason(r.id)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition",
                          reason === r.id
                            ? "border-[#14A08F] bg-[#E3F4F1] text-[#0B5B54]"
                            : "border-[#E2ECEB] bg-white text-[#36514E]",
                        )}
                      >
                        {r.ar}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="ملاحظة للطبيب (اختياري)"
                  className="w-full resize-none rounded-2xl border border-[#E2ECEB] bg-[#FAFCFC] px-4 py-3 text-sm outline-none transition placeholder:text-[#A9BCB9] focus:border-[#14A08F] focus:bg-white"
                />

                {/* Honeypot — hidden from people, filled by bots. */}
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  name="website"
                />
              </div>
              <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[#7C9592]">
                <ShieldCheck className="mt-px size-3.5 shrink-0 text-[#14A08F]" />
                بياناتك لا يراها أحد غير عيادة {page.doctorName}، ولا تُستخدم لأي غرض آخر.
              </p>
            </Card>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-[#F6D2CC] bg-[#FFF5F3] px-4 py-3 text-sm font-semibold text-[#A1352A]"
          >
            {error}
          </div>
        )}
      </div>

      <PoweredBy />

      {/* Sticky summary + send */}
      {clinic && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E2ECEB] bg-white/95 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)]">
          <div className="mx-auto flex w-full max-w-[520px] items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              {time ? (
                <>
                  <p className="truncate text-[13px] font-bold">{formatDateAr(date)}</p>
                  <p className="text-xs text-[#5B7774]">
                    {formatTime12(time)} · {clinic.name}
                  </p>
                </>
              ) : (
                <p className="text-[13px] font-semibold text-[#7C9592]">اختر وقتاً مناسباً لك</p>
              )}
            </div>
            <button
              type="button"
              onClick={time ? send : () => timesRef.current?.scrollIntoView({ behavior: "smooth" })}
              disabled={!!time && !canSend}
              className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-b from-[#16A894] to-[#0E6E66] px-5 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(14,110,102,0.9)] transition active:scale-[0.98] disabled:from-[#B9CFCC] disabled:to-[#A3BDB9] disabled:shadow-none"
            >
              {sending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : time ? (
                <>
                  إرسال الطلب <ArrowLeft className="size-4" />
                </>
              ) : (
                "اختر الوقت"
              )}
            </button>
          </div>
        </div>
      )}
    </BookingFrame>
  );
}

/* ── Pieces ─────────────────────────────────────────────────── */

function DoctorHeader({ page }: { page: BookingPage }) {
  const single = page.clinics.filter((c) => c.enabled);
  const c = single.length === 1 ? single[0] : undefined;
  return (
    <header>
      <div className="mb-6 flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold backdrop-blur">
          <CalendarCheck2 className="size-3.5" /> حجز موعد
        </span>
        <span className="text-[11px] font-bold tracking-wide opacity-80">Dent Hub</span>
      </div>
      <div className="flex items-center gap-4">
        <DoctorAvatar name={page.doctorName} photoURL={page.photoURL} />
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight">{page.doctorName}</h1>
          {page.specialty && <p className="mt-1 text-sm text-white/80">{page.specialty}</p>}
          {c?.address && (
            <a
              href={
                c.mapUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs text-white/90"
            >
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{c.address}</span>
            </a>
          )}
        </div>
      </div>
      {page.about && <p className="mt-4 text-[13px] leading-relaxed text-white/80">{page.about}</p>}
      <div className="mt-5 flex gap-2 text-[11px] font-semibold">
        {["بدون تسجيل", "خلال دقيقة", "تأكيد من العيادة"].map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
            <Sparkles className="size-3" /> {t}
          </span>
        ))}
      </div>
    </header>
  );
}

function DayStrip({
  dates,
  slotsByDate,
  loading,
  value,
  onChange,
}: {
  dates: string[];
  slotsByDate: Record<string, string[]>;
  loading: boolean;
  value: string;
  onChange: (d: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>("[data-active=true]")
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [value]);
  let lastMonth = -1;
  return (
    <div
      ref={ref}
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {dates.map((d, i) => {
        const dt = new Date(`${d}T00:00:00`);
        const free = slotsByDate[d]?.length ?? 0;
        const off = !loading && free === 0;
        const active = d === value;
        const month = dt.getMonth();
        const showMonth = month !== lastMonth;
        lastMonth = month;
        return (
          <div key={d} className="flex shrink-0 flex-col items-center">
            <span
              className={cn(
                "mb-1 h-4 text-[10px] font-bold text-[#7C9592]",
                !showMonth && "invisible",
              )}
            >
              {MONTHS_AR[month]}
            </span>
            <button
              type="button"
              data-active={active}
              disabled={off}
              onClick={() => onChange(d)}
              className={cn(
                "flex h-[78px] w-[62px] flex-col items-center justify-center rounded-2xl border transition",
                active
                  ? "border-transparent bg-gradient-to-b from-[#16A894] to-[#0E6E66] text-white shadow-[0_10px_20px_-10px_rgba(14,110,102,0.9)]"
                  : off
                    ? "border-dashed border-[#E2ECEB] bg-[#F7FAFA] text-[#B4C6C3]"
                    : "border-[#E2ECEB] bg-white hover:border-[#9ED6CD]",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  active ? "text-white/85" : "text-[#5B7774]",
                  off && "text-[#B4C6C3]",
                )}
              >
                {i === 0 ? "اليوم" : i === 1 ? "غداً" : DAY_NAMES_AR[String(dt.getDay())]}
              </span>
              <span className="mt-0.5 text-xl font-extrabold tabular-nums">{dt.getDate()}</span>
              <span
                className={cn(
                  "mt-0.5 text-[9px] font-bold",
                  active ? "text-white/80" : off ? "text-[#C3D2D0]" : "text-[#14A08F]",
                )}
              >
                {loading ? "…" : off ? "مغلق" : `${free} متاح`}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  icon,
  label,
  error,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#5B7774]">{label}</span>
      <span
        className={cn(
          "flex h-[52px] items-center gap-3 rounded-2xl border bg-[#FAFCFC] px-4 transition focus-within:bg-white",
          error ? "border-[#E8A99F]" : "border-[#E2ECEB] focus-within:border-[#14A08F]",
        )}
      >
        <span className="text-[#8CA6A2]">{icon}</span>
        {children}
      </span>
      {error && (
        <span className="mt-1 block text-[11px] font-semibold text-[#B4473B]">{error}</span>
      )}
    </label>
  );
}

function BrandHero() {
  return (
    <div className="flex items-center justify-between pb-10">
      <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold">
        <CalendarCheck2 className="size-3.5" /> حجز موعد
      </span>
      <span className="text-[11px] font-bold tracking-wide opacity-80">Dent Hub</span>
    </div>
  );
}

function LoadingView() {
  return (
    <BookingFrame
      hero={
        <div className="flex items-center gap-4 pt-10 pb-6">
          <div className="size-[84px] animate-pulse rounded-[28px] bg-white/25" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/25" />
            <div className="h-3.5 w-24 animate-pulse rounded-full bg-white/20" />
          </div>
        </div>
      }
    >
      <Card className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[#EEF4F3]" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[78px] w-[62px] animate-pulse rounded-2xl bg-[#EEF4F3]" />
          ))}
        </div>
      </Card>
    </BookingFrame>
  );
}

function Unavailable({ page, title, text }: { page?: BookingPage; title: string; text: string }) {
  return (
    <BookingFrame hero={page ? <DoctorHeader page={page} /> : <BrandHero />}>
      <Card className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-[#FFF4E8] text-[#C46A10]">
          <CalendarX2 className="size-8" />
        </div>
        <h1 className="text-lg font-extrabold">{title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#5B7774]">{text}</p>
        {page?.whatsapp && (
          <a
            href={whatsappLink(page.whatsapp, "مرحباً، أود حجز موعد.")}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#25D366] px-5 font-bold text-white"
          >
            <MessageCircle className="size-5" /> تواصل عبر واتساب
          </a>
        )}
      </Card>
      <PoweredBy />
    </BookingFrame>
  );
}

function SuccessView({
  page,
  clinic,
  date,
  time,
  done,
  name,
}: {
  page: BookingPage;
  clinic: BookingClinic;
  date: string;
  time: string;
  done: Done;
  name: string;
}) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}${statusLink(done.id, done.token)}`
      : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <BookingFrame
      hero={
        <div className="pt-4 text-center">
          <div className="relative mx-auto mb-5 size-24">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/25 [animation-duration:2s]" />
            <span className="relative flex size-24 items-center justify-center rounded-full bg-white text-[#0E6E66] shadow-[0_16px_40px_-14px_rgba(0,0,0,0.45)] animate-in zoom-in-50 duration-500">
              <Check className="size-12" strokeWidth={3} />
            </span>
          </div>
          <h1 className="text-2xl font-extrabold">تم إرسال طلبك</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/85">
            شكراً {name.split(" ")[0]}، ستتواصل معك العيادة قريباً لتأكيد الموعد.
          </p>
        </div>
      }
    >
      {/* Ticket */}
      <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="p-0">
          <div className="flex items-center gap-3 p-5">
            <DoctorAvatar name={page.doctorName} photoURL={page.photoURL} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{page.doctorName}</p>
              <p className="truncate text-xs text-[#5B7774]">{clinic.name}</p>
            </div>
            <span className="rounded-full bg-[#FFF4E2] px-2.5 py-1 text-[11px] font-bold text-[#B26A00]">
              بانتظار التأكيد
            </span>
          </div>
          <div className="relative border-t-2 border-dashed border-[#E2ECEB]">
            <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[#F3F7F7]" />
            <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[#F3F7F7]" />
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
            <Info label="اليوم" value={formatDateAr(date)} />
            <Info label="الوقت" value={formatTime12(time)} />
            <Info label="رقم الطلب" value={done.code} mono />
            <Info label="العيادة" value={clinic.address || clinic.name} />
          </div>
        </Card>
      </div>

      <div className="mt-4 space-y-2.5">
        <Link
          to="/book/r/$requestId"
          params={{ requestId: done.id }}
          search={{ t: done.token }}
          disabled={!done.id}
          className="flex h-[52px] aria-disabled:opacity-50 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#16A894] to-[#0E6E66] font-bold text-white shadow-[0_10px_22px_-10px_rgba(14,110,102,0.9)]"
        >
          <Ticket className="size-5" /> متابعة حجزي
        </Link>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copy}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E2ECEB] bg-white text-sm font-bold"
          >
            {copied ? <Check className="size-4 text-[#14A08F]" /> : <Copy className="size-4" />}
            {copied ? "تم النسخ" : "نسخ رابط الحجز"}
          </button>
          {page.whatsapp ? (
            <a
              href={whatsappLink(
                page.whatsapp,
                `مرحباً، أرسلت طلب حجز رقم ${done.code} يوم ${formatDateAr(date)} الساعة ${formatTime12(time)}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-bold text-white"
            >
              <MessageCircle className="size-4" /> واتساب العيادة
            </a>
          ) : (
            <a
              href={
                clinic.mapUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address || clinic.name)}`
              }
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E2ECEB] bg-white text-sm font-bold"
            >
              <MapPin className="size-4" /> موقع العيادة
            </a>
          )}
        </div>
        <p className="pt-2 text-center text-[11px] leading-relaxed text-[#7C9592]">
          احتفظ برابط «متابعة حجزي» أو صوّر الشاشة — منه تعرف تأكيد العيادة ويمكنك إلغاء الموعد.
        </p>
      </div>
      <PoweredBy />
    </BookingFrame>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-[#7C9592]">{label}</p>
      <p
        className={cn("mt-0.5 line-clamp-2 text-[15px] font-extrabold leading-snug", mono && "tracking-wider")}
        dir={mono ? "ltr" : undefined}
      >
        {value}
      </p>
    </div>
  );
}

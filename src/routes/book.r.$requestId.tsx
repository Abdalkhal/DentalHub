// "متابعة حجزي" — the patient's private page for one booking request. The
// link carries a secret token (?t=…) returned when the request was sent; the
// page reads the request through a Cloud Function that checks it, so nobody
// else can see or cancel the booking.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  Clock3,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { app } from "@/integrations/firebase/config";
import {
  effectiveStatus,
  formatDateAr,
  formatTime12,
  reasonLabel,
  whatsappLink,
  type BookingStatus,
} from "@/lib/booking";
import { BookingFrame, Card, DoctorAvatar, PoweredBy } from "@/components/booking/BookingUi";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ t: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/book/r/$requestId")({
  validateSearch: searchSchema,
  component: BookingStatusPage,
  head: () => ({
    meta: [
      { title: "متابعة حجزي — Dent Hub" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0E6E66" },
    ],
  }),
});

type Status = {
  id: string;
  code: string;
  status: BookingStatus;
  date: string;
  time: string;
  patientName: string;
  reason: string;
  rejectReason: string;
  clinicName: string;
  clinicAddress: string;
  mapUrl: string;
  doctorName: string;
  photoURL: string;
  whatsapp: string;
  slug: string;
};

const STATUS_UI: Record<
  BookingStatus,
  { label: string; tone: string; title: string; text: string }
> = {
  pending: {
    label: "بانتظار التأكيد",
    tone: "bg-[#FFF4E2] text-[#B26A00]",
    title: "طلبك وصل للعيادة",
    text: "ستراجع العيادة الطلب وتتواصل معك لتأكيده.",
  },
  accepted: {
    label: "مؤكد",
    tone: "bg-[#E3F6EC] text-[#167A45]",
    title: "موعدك مؤكد",
    text: "ننتظرك في الموعد. احضر قبل الموعد ببضع دقائق.",
  },
  rejected: {
    label: "معتذر عنه",
    tone: "bg-[#FDECEA] text-[#B4473B]",
    title: "اعتذرت العيادة عن الموعد",
    text: "يمكنك اختيار وقت آخر يناسبك.",
  },
  cancelled: {
    label: "ملغى",
    tone: "bg-[#EEF2F2] text-[#5B7774]",
    title: "تم إلغاء الموعد",
    text: "ألغيت هذا الموعد. يمكنك حجز موعد جديد متى شئت.",
  },
  expired: {
    label: "منتهي",
    tone: "bg-[#EEF2F2] text-[#5B7774]",
    title: "انتهى وقت هذا الطلب",
    text: "مرّ وقت الموعد قبل أن تؤكده العيادة. احجز وقتاً جديداً.",
  },
};

function BookingStatusPage() {
  const { requestId } = Route.useParams();
  const { t } = Route.useSearch();
  const [data, setData] = useState<Status | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!t) return setData(null);
    setRefreshing(true);
    try {
      const call = httpsCallable<{ id: string; token: string }, Status>(
        getFunctions(app, "us-central1"),
        "getBookingRequest",
      );
      setData((await call({ id: requestId, token: t })).data);
    } catch {
      setData((d) => (d === undefined ? null : d));
    } finally {
      setRefreshing(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const cancel = async () => {
    if (!t) return;
    setCancelling(true);
    try {
      const call = httpsCallable<{ id: string; token: string }, { status: BookingStatus }>(
        getFunctions(app, "us-central1"),
        "cancelBookingRequest",
      );
      await call({ id: requestId, token: t });
      setConfirmCancel(false);
      await load();
    } finally {
      setCancelling(false);
    }
  };

  if (data === undefined)
    return (
      <BookingFrame
        hero={
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin" />
          </div>
        }
      />
    );

  if (data === null)
    return (
      <BookingFrame hero={<p className="pb-8 text-sm font-bold">متابعة حجزي</p>}>
        <Card className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-[#FFF4E8] text-[#C46A10]">
            <CalendarX2 className="size-8" />
          </div>
          <h1 className="text-lg font-extrabold">لم نجد هذا الحجز</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#5B7774]">
            تأكد أنك فتحت الرابط كاملاً كما وصلك بعد الحجز.
          </p>
        </Card>
        <PoweredBy />
      </BookingFrame>
    );

  const status = effectiveStatus(data);
  const ui = STATUS_UI[status];
  const open = status === "pending" || status === "accepted";
  const steps = [
    { label: "أُرسل الطلب", done: true },
    {
      label: "تأكيد العيادة",
      done: status === "accepted",
      failed: status === "rejected" || status === "cancelled" || status === "expired",
    },
    { label: "يوم الموعد", done: false },
  ];
  const mapHref =
    data.mapUrl ||
    (data.clinicAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.clinicAddress)}`
      : "");

  return (
    <BookingFrame
      hero={
        <>
          <header className="mb-5 flex items-center justify-between">
            <span className="text-sm font-bold">متابعة حجزي</span>
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> تحديث
            </button>
          </header>

          <div>
            <h1 className="text-2xl font-extrabold">{ui.title}</h1>
            <p className="mt-1.5 text-sm text-white/85">{ui.text}</p>
            {status === "rejected" && data.rejectReason && (
              <p className="mt-3 rounded-2xl bg-white/12 px-4 py-2.5 text-sm">
                سبب العيادة: {data.rejectReason}
              </p>
            )}
          </div>
        </>
      }
    >
      <Card className="p-0">
        <div className="flex items-center gap-3 p-5">
          <DoctorAvatar name={data.doctorName} photoURL={data.photoURL} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{data.doctorName}</p>
            <p className="truncate text-xs text-[#5B7774]">{data.clinicName}</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", ui.tone)}>
            {ui.label}
          </span>
        </div>

        <div className="relative border-t-2 border-dashed border-[#E2ECEB]">
          <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[#F3F7F7]" />
          <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[#F3F7F7]" />
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          <Info
            icon={<CalendarClock className="size-4" />}
            label="اليوم"
            value={formatDateAr(data.date)}
          />
          <Info
            icon={<Clock3 className="size-4" />}
            label="الوقت"
            value={formatTime12(data.time)}
          />
          <Info label="رقم الطلب" value={data.code} ltr />
          <Info label="سبب الزيارة" value={reasonLabel(data.reason)} />
        </div>

        {/* Progress */}
        <div className="border-t border-[#EEF3F2] px-5 py-4">
          <ol className="flex items-center">
            {steps.map((s, i) => (
              <li key={s.label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                      s.done
                        ? "border-[#14A08F] bg-[#14A08F] text-white"
                        : s.failed
                          ? "border-[#E8A99F] bg-[#FDECEA] text-[#B4473B]"
                          : "border-[#D7E3E1] bg-white text-[#9DB3B0]",
                    )}
                  >
                    {s.done ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : s.failed ? (
                      <X className="size-3.5" strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="whitespace-nowrap text-[10px] font-semibold text-[#5B7774]">
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      "mx-1.5 mb-5 h-0.5 flex-1 rounded-full",
                      s.done && steps[i + 1].done
                        ? "bg-[#14A08F]"
                        : s.done
                          ? "bg-gradient-to-l from-[#D7E3E1] to-[#14A08F]"
                          : "bg-[#E2ECEB]",
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </Card>

      <div className="mt-4 space-y-2.5">
        {(data.whatsapp || mapHref) && (
          <div className="grid grid-cols-2 gap-2.5">
            {data.whatsapp && (
              <a
                href={whatsappLink(data.whatsapp, `مرحباً، بخصوص طلب الحجز رقم ${data.code}.`)}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-bold text-white",
                  !mapHref && "col-span-2",
                )}
              >
                <MessageCircle className="size-4" /> واتساب العيادة
              </a>
            )}
            {mapHref && (
              <a
                href={mapHref}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E2ECEB] bg-white text-sm font-bold",
                  !data.whatsapp && "col-span-2",
                )}
              >
                <MapPin className="size-4" /> موقع العيادة
              </a>
            )}
          </div>
        )}

        {!open && (
          <Link
            to="/book/$slug"
            params={{ slug: data.slug }}
            className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#16A894] to-[#0E6E66] font-bold text-white shadow-[0_10px_22px_-10px_rgba(14,110,102,0.9)]"
          >
            <CalendarPlus className="size-5" /> احجز موعداً جديداً
          </Link>
        )}

        {open &&
          (confirmCancel ? (
            <Card className="border-[#F6D2CC]">
              <p className="text-center font-bold">هل تريد إلغاء الموعد؟</p>
              <p className="mt-1 text-center text-xs text-[#5B7774]">
                سيتم إبلاغ العيادة ويصبح الوقت متاحاً لغيرك.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="h-11 rounded-2xl border border-[#E2ECEB] bg-white text-sm font-bold"
                >
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={cancelling}
                  className="flex h-11 items-center justify-center rounded-2xl bg-[#D2483A] text-sm font-bold text-white disabled:opacity-60"
                >
                  {cancelling ? <Loader2 className="size-4 animate-spin" /> : "نعم، ألغِ الموعد"}
                </button>
              </div>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-[#B4473B]"
            >
              <X className="size-4" /> إلغاء الموعد
            </button>
          ))}

        <Link
          to="/book/$slug"
          params={{ slug: data.slug }}
          className={cn(
            "flex items-center justify-center gap-1.5 pt-1 text-xs font-semibold text-[#5B7774]",
            !open && "hidden",
          )}
        >
          <Send className="size-3.5" /> صفحة الحجز
        </Link>
      </div>
      <PoweredBy />
    </BookingFrame>
  );
}

function Info({
  icon,
  label,
  value,
  ltr,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-semibold text-[#7C9592]">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[15px] font-extrabold leading-snug" dir={ltr ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}

// Dentist's booking link: incoming requests, the page's settings, sharing
// (link / WhatsApp / QR) and tomorrow's reminder list. See src/lib/booking.ts.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  Inbox,
  Link2,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  Settings2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { Switch } from "@/components/ui/switch";
import { useUserRole } from "@/lib/useAuth";
import { setClinicsStoreUser, useClinics } from "@/lib/clinicsStore";
import { useAppointments } from "@/lib/appointmentsStore";
import { usePatients } from "@/lib/patientsStore";
import {
  BOOKING_BASE_URL,
  DAY_NAMES_AR,
  WEEK_ORDER,
  dateStr,
  effectiveStatus,
  formatDateAr,
  formatTime12,
  qrPath,
  reasonLabel,
  rejectBookingRequest,
  saveBookingPage,
  statusLabel,
  whatsappLink,
  type BookingPage,
  type BookingRequest,
  type BookingStatus,
} from "@/lib/booking";
import {
  acceptRequest,
  draftBookingPage,
  isOpenRequest,
  matchPatient,
  useBookingRequests,
  useMyBookingPage,
  whatsappTexts,
  withCurrentClinics,
} from "@/lib/bookingInbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic/booking")({
  component: ClinicBookingPage,
});

type Tab = "requests" | "settings" | "share" | "tomorrow";

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
  expired: "bg-slate-100 text-slate-500",
};

function ClinicBookingPage() {
  const { user, role } = useUserRole();
  const uid = user?.uid;
  const { clinics } = useClinics();
  const { page, setPage } = useMyBookingPage(uid);
  const requests = useBookingRequests(uid);
  const pending = (requests ?? []).filter(isOpenRequest);
  const [tab, setTab] = useState<Tab>("requests");

  useEffect(() => {
    setClinicsStoreUser(uid || "");
  }, [uid]);

  // No page yet → straight to the settings to create one.
  useEffect(() => {
    if (page === null) setTab("settings");
  }, [page]);

  const tabs: { id: Tab; label: string; Icon: typeof Inbox; badge?: number }[] = [
    { id: "requests", label: "الطلبات", Icon: Inbox, badge: pending.length },
    { id: "tomorrow", label: "تذكير الغد", Icon: BellRing },
    { id: "share", label: "المشاركة", Icon: QrCode },
    { id: "settings", label: "الإعدادات", Icon: Settings2 },
  ];

  return (
    <MobileShell wide>
      <TopBar title="رابط الحجز" showBack wide />
      <div className="px-4 pb-10 pt-4 md:px-6 lg:mx-auto lg:max-w-4xl">
        <LinkHero page={page} pending={pending.length} onOpenSettings={() => setTab("settings")} />

        <div className="sticky top-0 z-10 -mx-4 mb-4 bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
            {tabs.map(({ id, label, Icon, badge }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                disabled={!page && id !== "settings"}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition disabled:opacity-40 md:text-sm",
                  tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
                {!!badge && (
                  <span className="absolute -top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {page === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : tab === "settings" ? (
          <SettingsTab
            key={role ? "profile" : "blank"}
            uid={uid!}
            page={page ? withCurrentClinics(page, clinics) : draftBookingPage(uid!, role, clinics)}
            isNew={!page}
            onSaved={(p) => {
              setPage(p);
              if (!page) setTab("share");
            }}
          />
        ) : !page ? null : tab === "requests" ? (
          <RequestsTab uid={uid!} page={page} requests={requests} />
        ) : tab === "share" ? (
          <ShareTab page={page} />
        ) : (
          <TomorrowTab page={page} />
        )}
      </div>
    </MobileShell>
  );
}

/* ── Hero ──────────────────────────────────────────────────── */

function LinkHero({
  page,
  pending,
  onOpenSettings,
}: {
  page: BookingPage | null | undefined;
  pending: number;
  onOpenSettings: () => void;
}) {
  const url = page ? BOOKING_BASE_URL + page.slug : "";
  return (
    <div className="relative mb-4 overflow-hidden rounded-3xl bg-[radial-gradient(120%_120%_at_90%_0%,#1FB5A1_0%,#0E6E66_55%,#0A4F4A_100%)] p-5 text-white md:p-7">
      <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-white/10" />
      <div className="relative flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <CalendarCheck2 className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold md:text-2xl">حجز المرضى عبر رابط</h2>
          {page ? (
            <>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    page.enabled ? "bg-emerald-300" : "bg-amber-300",
                  )}
                />
                {page.enabled ? "الرابط يستقبل الحجوزات" : "الرابط متوقف"}
                {pending > 0 && ` · ${pending} طلب بانتظارك`}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2">
                <Link2 className="size-4 shrink-0 text-white/70" />
                <span dir="ltr" className="truncate text-xs font-semibold">
                  {url.replace("https://", "")}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-white/85">
                رابط واحد تضعه في إنستغرام وواتساب، يحجز منه المرضى دون تطبيق أو تسجيل، ويصلك الطلب
                هنا.
              </p>
              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0E6E66]"
              >
                إنشاء رابط الحجز
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Requests ──────────────────────────────────────────────── */

function RequestsTab({
  uid,
  page,
  requests,
}: {
  uid: string;
  page: BookingPage;
  requests: BookingRequest[] | undefined;
}) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  usePatients(); // re-render when patient files load, for the "existing patient" match
  if (requests === undefined)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  const list = filter === "open" ? requests.filter(isOpenRequest) : requests;
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(
          [
            ["open", "بانتظار الرد"],
            ["all", "الكل"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold",
              filter === id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Inbox className="mb-3 size-9 text-slate-300" />
          <p className="font-bold text-slate-700">
            {filter === "open" ? "لا توجد طلبات جديدة" : "لا توجد طلبات بعد"}
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            شارك رابط الحجز مع مرضاك، وستظهر طلباتهم هنا فوراً مع إشعار.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((r) => (
            <RequestCard key={r.id} uid={uid} page={page} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ uid, page, r }: { uid: string; page: BookingPage; r: BookingRequest }) {
  const status = effectiveStatus(r);
  const existing = matchPatient(r);
  const [busy, setBusy] = useState<"" | "accept" | "reject">("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [linkPatient, setLinkPatient] = useState(true);
  const when = `${formatDateAr(r.date)} الساعة ${formatTime12(r.time)}`;

  const accept = async () => {
    setBusy("accept");
    try {
      await acceptRequest(uid, r, { linkPatient });
      toast.success("تم تأكيد الموعد وإضافته إلى التقويم");
    } catch {
      toast.error("تعذّر تأكيد الطلب، حاول مرة أخرى");
    } finally {
      setBusy("");
    }
  };
  const reject = async () => {
    setBusy("reject");
    try {
      await rejectBookingRequest(r.id, reason.trim());
      toast.success("تم رفض الطلب وأصبح الوقت متاحاً");
      setRejecting(false);
    } catch {
      toast.error("تعذّر رفض الطلب، حاول مرة أخرى");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#E3F4F1] text-base font-extrabold text-[#0E6E66]">
          {r.patientName.trim()[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-slate-900">{r.patientName}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                STATUS_TONE[status],
              )}
            >
              {statusLabel[status]}
            </span>
          </div>
          <p dir="ltr" className="text-right text-xs text-slate-500 tabular-nums">
            {r.phone}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-slate-400" dir="ltr">
          {r.code}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs">
        <p className="flex items-center gap-1.5 font-bold text-slate-700">
          <CalendarClock className="size-3.5 text-slate-400" /> {formatDateAr(r.date)}
        </p>
        <p className="font-bold text-slate-700 tabular-nums">{formatTime12(r.time)}</p>
        <p className="text-slate-500">{reasonLabel(r.reason)}</p>
        {page.clinics.filter((c) => c.enabled).length > 1 && (
          <p className="truncate text-slate-500">{r.clinicName}</p>
        )}
        {r.note && <p className="col-span-2 text-slate-600">«{r.note}»</p>}
      </div>

      {status === "pending" && (
        <>
          <p
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs font-semibold",
              existing ? "text-emerald-700" : "text-slate-500",
            )}
          >
            {existing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
            {existing ? `مريض مسجّل: ملف ${existing.fileNo}` : "مريض جديد"}
          </p>
          {!existing && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={linkPatient}
                onChange={(e) => setLinkPatient(e.target.checked)}
                className="size-4 accent-[#0E6E66]"
              />
              فتح ملف مريض له عند التأكيد
            </label>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={whatsappLink(r.phone, whatsappTexts.ask(r, when))}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366]/10 text-xs font-bold text-[#128C4B]"
            >
              <MessageCircle className="size-4" /> واتساب
            </a>
            <a
              href={`tel:${r.phone}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
            >
              <Phone className="size-4" /> اتصال
            </a>
          </div>

          {rejecting ? (
            <div className="mt-3 space-y-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={120}
                placeholder="سبب الرفض (اختياري، يراه المريض)"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="h-10 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={reject}
                  disabled={!!busy}
                  className="flex h-10 items-center justify-center rounded-xl bg-rose-600 text-xs font-bold text-white disabled:opacity-60"
                >
                  {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : "تأكيد الرفض"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-600"
              >
                <X className="size-4" /> رفض
              </button>
              <button
                type="button"
                onClick={accept}
                disabled={!!busy}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#16A894] to-[#0E6E66] text-sm font-bold text-white disabled:opacity-60"
              >
                {busy === "accept" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Check className="size-4" /> قبول وإضافة للتقويم
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {status === "accepted" && (
        <a
          href={whatsappLink(r.phone, whatsappTexts.confirm(r, r.clinicName, when))}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-xs font-bold text-white"
        >
          <MessageCircle className="size-4" /> إرسال التأكيد عبر واتساب
        </a>
      )}
      {status === "rejected" && (
        <a
          href={whatsappLink(r.phone, whatsappTexts.reject(r, when))}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
        >
          <MessageCircle className="size-4" /> إبلاغ المريض عبر واتساب
        </a>
      )}
    </div>
  );
}

/* ── Tomorrow ──────────────────────────────────────────────── */

function TomorrowTab({ page }: { page: BookingPage }) {
  const appointments = useAppointments();
  const { clinics, activeClinicId } = useClinics();
  const clinicName = clinics.find((c) => c.id === activeClinicId)?.name ?? "";
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateStr(d);
  }, []);
  const list = appointments
    .filter((a) => a.date === tomorrow && a.status !== "cancelled" && a.phone)
    .sort((a, b) => a.time.localeCompare(b.time));
  const [sent, setSent] = useState<Record<string, boolean>>({});
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        مواعيد <b>{formatDateAr(tomorrow)}</b> في {clinicName}. اضغط «تذكير» ليفتح واتساب برسالة
        جاهزة.
      </p>
      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <BellRing className="mb-3 size-9 text-slate-300" />
          <p className="font-bold text-slate-700">لا توجد مواعيد غداً</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {list.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-4">
              <span className="w-16 shrink-0 text-sm font-extrabold tabular-nums text-slate-800">
                {formatTime12(a.time)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-800">{a.patientName}</p>
                <p className="truncate text-xs text-slate-500">
                  {a.treatment || a.appointmentType}
                </p>
              </div>
              <a
                href={whatsappLink(
                  a.phone,
                  whatsappTexts.reminder(
                    a.patientName,
                    clinicName || page.doctorName,
                    `غداً الساعة ${formatTime12(a.time)}`,
                  ),
                )}
                target="_blank"
                rel="noreferrer"
                onClick={() => setSent((s) => ({ ...s, [a.id]: true }))}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold",
                  sent[a.id] ? "bg-emerald-50 text-emerald-700" : "bg-[#25D366] text-white",
                )}
              >
                {sent[a.id] ? (
                  <Check className="size-3.5" />
                ) : (
                  <MessageCircle className="size-3.5" />
                )}
                {sent[a.id] ? "أُرسل" : "تذكير"}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Share ─────────────────────────────────────────────────── */

function ShareTab({ page }: { page: BookingPage }) {
  const url = BOOKING_BASE_URL + page.slug;
  const qr = useMemo(() => qrPath(url), [url]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذّر النسخ");
    }
  };
  const downloadQr = () => {
    const pad = 4;
    const n = qr.size + pad * 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="1024" height="1024"><rect width="${n}" height="${n}" fill="#fff"/><path transform="translate(${pad} ${pad})" d="${qr.d}" fill="#0A4F4A"/></svg>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = `booking-${page.slug}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const shareText = `احجز موعدك في عيادة ${page.doctorName} بسهولة ومن دون تسجيل:\n${url}`;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <p className="mb-2 text-xs font-bold text-slate-500">رابط الحجز</p>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
            {url.replace("https://", "")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-sm font-bold text-white"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{" "}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-bold text-white"
          >
            <MessageCircle className="size-4" /> واتساب
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
          >
            <ExternalLink className="size-4" /> معاينة الصفحة كما يراها المريض
          </a>
        </div>
        <div className="mt-5 rounded-2xl bg-[#F0FAF8] p-4 text-xs leading-relaxed text-[#0B5B54]">
          <p className="mb-1 font-bold">نصيحة لإنستغرام</p>
          ضع الرابط في البايو، وأضفه في الستوري عبر ملصق «رابط» مع جملة مثل «احجز موعدك الآن».
        </div>
      </div>

      <div className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-5 text-center">
        <p className="mb-3 text-xs font-bold text-slate-500">رمز QR للعيادة</p>
        <div className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_-18px_rgba(10,79,74,0.6)] ring-1 ring-slate-100">
          <svg
            viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
            className="size-52"
            shapeRendering="crispEdges"
          >
            <path d={qr.d} fill="#0A4F4A" />
          </svg>
        </div>
        <p className="mt-3 font-bold text-slate-800">{page.doctorName}</p>
        <p className="text-xs text-slate-500">امسح الرمز لحجز موعدك</p>
        <button
          type="button"
          onClick={downloadQr}
          className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
        >
          <Download className="size-4" /> تنزيل الرمز للطباعة
        </button>
      </div>
    </div>
  );
}

/* ── Settings ──────────────────────────────────────────────── */

function SettingsTab({
  uid,
  page: initial,
  isNew,
  onSaved,
}: {
  uid: string;
  page: BookingPage;
  isNew: boolean;
  onSaved: (p: BookingPage) => void;
}) {
  const [p, setP] = useState<BookingPage>(initial);
  const [saving, setSaving] = useState(false);
  const [closedInput, setClosedInput] = useState("");
  const set = (patch: Partial<BookingPage>) => setP((x) => ({ ...x, ...patch }));
  const setClinic = (id: string, patch: Partial<BookingPage["clinics"][number]>) =>
    set({ clinics: p.clinics.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const save = async () => {
    if (!p.doctorName.trim()) return toast.error("اكتب اسم الطبيب كما يظهر للمرضى");
    if (!p.clinics.some((c) => c.enabled)) return toast.error("فعّل عيادة واحدة على الأقل");
    setSaving(true);
    try {
      const next = { ...p, ownerId: uid, slug: p.slug.trim().toLowerCase() };
      const res = await saveBookingPage(next, isNew ? undefined : initial.slug);
      if (!res.ok) {
        toast.error(
          res.error === "slug-taken"
            ? "هذا الرابط مستخدم، اختر اسماً آخر"
            : "الرابط: أحرف إنجليزية صغيرة وأرقام وشرطة فقط (3 أحرف على الأقل)",
        );
        return;
      }
      toast.success(isNew ? "تم إنشاء رابط الحجز 🎉" : "تم حفظ الإعدادات");
      onSaved(next);
    } catch {
      toast.error("تعذّر الحفظ، تحقق من الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="حالة الرابط">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-800">{p.enabled ? "يستقبل الحجوزات" : "متوقف"}</p>
            <p className="text-xs text-slate-500">
              عند الإيقاف تظهر للمريض رسالة «الحجز متوقف حالياً».
            </p>
          </div>
          <Switch checked={p.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </Section>

      <Section title="الرابط">
        <div
          className="flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#14A08F]"
          dir="ltr"
        >
          <span className="shrink-0 bg-slate-50 px-3 text-xs text-slate-500">…/book/</span>
          <input
            value={p.slug}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            maxLength={32}
            className="h-full min-w-0 flex-1 px-2 text-sm font-semibold outline-none"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          أحرف إنجليزية صغيرة وأرقام وشرطة، مثل dr-ahmed. تغييره يوقف الرابط القديم.
        </p>
      </Section>

      <Section title="ما يراه المريض">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label="اسم الطبيب"
            value={p.doctorName}
            onChange={(v) => set({ doctorName: v })}
            placeholder="د. أحمد علي"
          />
          <TextField
            label="الاختصاص"
            value={p.specialty ?? ""}
            onChange={(v) => set({ specialty: v })}
            placeholder="طب وجراحة الفم والأسنان"
          />
          <TextField
            label="رقم واتساب العيادة"
            value={p.whatsapp ?? ""}
            onChange={(v) => set({ whatsapp: v })}
            placeholder="07XX XXX XXXX"
            ltr
          />
          <TextField
            label="نبذة قصيرة (اختياري)"
            value={p.about ?? ""}
            onChange={(v) => set({ about: v })}
            placeholder="خبرة 10 سنوات في التجميل والزراعة"
          />
        </div>
      </Section>

      <Section title="المواعيد">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="مدة الموعد"
            value={String(p.slotMinutes)}
            onChange={(v) => set({ slotMinutes: Number(v) })}
            options={[15, 20, 30, 45, 60].map((n) => [String(n), `${n} دقيقة`])}
          />
          <SelectField
            label="الحجز مقدماً حتى"
            value={String(p.daysAhead)}
            onChange={(v) => set({ daysAhead: Number(v) })}
            options={[7, 14, 21, 30].map((n) => [String(n), `${n} يوماً`])}
          />
        </div>
      </Section>

      {p.clinics.map((c) => (
        <Section
          key={c.id}
          title={c.name}
          action={
            <Switch checked={c.enabled} onCheckedChange={(v) => setClinic(c.id, { enabled: v })} />
          }
        >
          {!c.enabled ? (
            <p className="text-xs text-slate-500">هذه العيادة لا تظهر في صفحة الحجز.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="العنوان"
                  value={c.address}
                  onChange={(v) => setClinic(c.id, { address: v })}
                  placeholder="بغداد، المنصور، شارع 14 رمضان"
                />
                <TextField
                  label="رابط الموقع على الخريطة (اختياري)"
                  value={c.mapUrl ?? ""}
                  onChange={(v) => setClinic(c.id, { mapUrl: v })}
                  placeholder="https://maps.google.com/…"
                  ltr
                />
              </div>
              <p className="pt-1 text-xs font-bold text-slate-500">أيام وساعات الدوام</p>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                {WEEK_ORDER.map((d) => {
                  const h = c.hours[d] ?? { open: false, from: "16:00", to: "21:00" };
                  const setH = (patch: Partial<typeof h>) =>
                    setClinic(c.id, { hours: { ...c.hours, [d]: { ...h, ...patch } } });
                  return (
                    <div
                      key={d}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
                    >
                      <Switch checked={h.open} onCheckedChange={(v) => setH({ open: v })} />
                      <span
                        className={cn(
                          "w-16 text-sm font-bold",
                          h.open ? "text-slate-800" : "text-slate-400",
                        )}
                      >
                        {DAY_NAMES_AR[d]}
                      </span>
                      {h.open ? (
                        <div
                          className="flex flex-1 flex-wrap items-center gap-2 text-xs text-slate-500"
                          dir="ltr"
                        >
                          <TimeInput value={h.from} onChange={(v) => setH({ from: v })} />
                          <span>—</span>
                          <TimeInput value={h.to} onChange={(v) => setH({ to: v })} />
                          {h.breakFrom !== undefined ? (
                            <span className="flex items-center gap-1.5" dir="rtl">
                              <span>استراحة</span>
                              <span dir="ltr" className="flex items-center gap-1">
                                <TimeInput
                                  value={h.breakFrom}
                                  onChange={(v) => setH({ breakFrom: v })}
                                />
                                <span>—</span>
                                <TimeInput
                                  value={h.breakTo ?? ""}
                                  onChange={(v) => setH({ breakTo: v })}
                                />
                              </span>
                              <button
                                type="button"
                                onClick={() => setH({ breakFrom: undefined, breakTo: undefined })}
                                className="text-slate-400"
                              >
                                <X className="size-3.5" />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setH({ breakFrom: "18:00", breakTo: "18:30" })}
                              className="text-[11px] font-bold text-[#0E6E66]"
                            >
                              + استراحة
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">عطلة</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      ))}

      <Section title="أيام إغلاق (سفر، عطلة رسمية)">
        <div className="flex gap-2">
          <input
            type="date"
            value={closedInput}
            min={dateStr(new Date())}
            onChange={(e) => setClosedInput(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            disabled={!closedInput}
            onClick={() => {
              if (!p.closedDates.includes(closedInput))
                set({ closedDates: [...p.closedDates, closedInput].sort() });
              setClosedInput("");
            }}
            className="flex h-11 items-center gap-1 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            <Plus className="size-4" /> إضافة
          </button>
        </div>
        {p.closedDates.filter((d) => d >= dateStr(new Date())).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.closedDates
              .filter((d) => d >= dateStr(new Date()))
              .map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pe-1.5 ps-3 text-xs font-bold text-slate-700"
                >
                  {formatDateAr(d)}
                  <button
                    type="button"
                    onClick={() => set({ closedDates: p.closedDates.filter((x) => x !== d) })}
                    className="text-slate-400"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </Section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="sticky bottom-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#16A894] to-[#0E6E66] py-3.5 text-base font-bold text-white shadow-[0_12px_26px_-12px_rgba(14,110,102,0.9)] disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="size-5 animate-spin" />
        ) : isNew ? (
          "إنشاء رابط الحجز"
        ) : (
          "حفظ الإعدادات"
        )}
      </button>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#14A08F]",
          ltr && "text-right",
        )}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#14A08F]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      step={900}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold tabular-nums text-slate-700"
    />
  );
}

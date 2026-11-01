// Dentist's booking link (native): incoming requests, tomorrow's reminders,
// sharing (link / WhatsApp / QR) and the page's settings. Mirrors the web's
// src/routes/clinic.booking.tsx; the logic lives in lib/booking.ts and
// lib/bookingInbox.ts (identical in both apps).
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Switch, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  Check,
  ExternalLink,
  Inbox,
  Link2,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  Settings2,
  Share2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { SINGLE_LINE_INPUT } from '@/components/ui/singleLineInput';
import { CalendarPickerModal } from '@/components/CalendarPickerModal';
import { useUserRole } from '@/lib/useAuth';
import { setClinicsStoreUser, useClinics } from '@/lib/clinicsStore';
import { useAppointments } from '@/lib/appointmentsStore';
import { usePatients } from '@/lib/patientsStore';
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
  type DayHours,
} from '@/lib/booking';
import {
  acceptRequest,
  draftBookingPage,
  isOpenRequest,
  matchPatient,
  useBookingRequests,
  useMyBookingPage,
  whatsappTexts,
  withCurrentClinics,
} from '@/lib/bookingInbox';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TEAL = '#0E6E66';
type Tab = 'requests' | 'tomorrow' | 'share' | 'settings';

const STATUS_TONE: Record<BookingStatus, { bg: string; fg: string }> = {
  pending: { bg: 'bg-amber-50', fg: 'text-amber-700' },
  accepted: { bg: 'bg-emerald-50', fg: 'text-emerald-700' },
  rejected: { bg: 'bg-rose-50', fg: 'text-rose-700' },
  cancelled: { bg: 'bg-slate-100', fg: 'text-slate-500' },
  expired: { bg: 'bg-slate-100', fg: 'text-slate-500' },
};

const open = (url: string) => Linking.openURL(url).catch(() => toast.error('تعذّر فتح الرابط'));

export default function ClinicBookingScreen() {
  const { user, role } = useUserRole();
  const uid = user?.uid;
  const { clinics } = useClinics();
  const { page, setPage } = useMyBookingPage(uid);
  const requests = useBookingRequests(uid);
  const pending = (requests ?? []).filter(isOpenRequest);
  const [tab, setTab] = useState<Tab>('requests');

  useEffect(() => {
    setClinicsStoreUser(uid || '');
  }, [uid]);

  useEffect(() => {
    if (page === null) setTab('settings');
  }, [page]);

  const tabs: { id: Tab; label: string; Icon: LucideIcon; badge?: number }[] = [
    { id: 'requests', label: 'الطلبات', Icon: Inbox, badge: pending.length },
    { id: 'tomorrow', label: 'الغد', Icon: BellRing },
    { id: 'share', label: 'المشاركة', Icon: QrCode },
    { id: 'settings', label: 'الإعدادات', Icon: Settings2 },
  ];

  return (
    <Screen>
      <Hero page={page} pending={pending.length} onCreate={() => setTab('settings')} />

      <View className="mb-4 flex-row gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ id, label, Icon, badge }) => {
          const disabled = !page && id !== 'settings';
          const active = tab === id;
          return (
            <Pressable
              key={id}
              disabled={disabled}
              onPress={() => setTab(id)}
              className={cn('h-11 flex-1 items-center justify-center rounded-xl', active && 'bg-white', disabled && 'opacity-40')}
            >
              <Icon size={16} color={active ? '#0F172A' : '#64748B'} />
              <Text className={cn('mt-0.5 text-[10px] font-bold', active ? 'text-slate-900' : 'text-slate-500')}>{label}</Text>
              {!!badge && (
                <View className="absolute left-1 top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
                  <Text className="text-[9px] font-bold text-white">{badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {page === undefined || !uid ? (
        <ActivityIndicator className="py-16" color={TEAL} />
      ) : tab === 'settings' ? (
        <SettingsTab
          key={role ? 'profile' : 'blank'}
          uid={uid}
          page={page ? withCurrentClinics(page, clinics) : draftBookingPage(uid, role, clinics)}
          isNew={!page}
          onSaved={(p) => {
            setPage(p);
            if (!page) setTab('share');
          }}
        />
      ) : !page ? null : tab === 'requests' ? (
        <RequestsTab uid={uid} page={page} requests={requests} />
      ) : tab === 'share' ? (
        <ShareTab page={page} />
      ) : (
        <TomorrowTab page={page} />
      )}
    </Screen>
  );
}

/* ── Hero ──────────────────────────────────────────────────── */

function Hero({ page, pending, onCreate }: { page: BookingPage | null | undefined; pending: number; onCreate: () => void }) {
  return (
    <View className="mb-4 overflow-hidden rounded-3xl p-5" style={{ backgroundColor: TEAL }}>
      <View className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10" />
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <CalendarCheck2 size={24} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-white">حجز المرضى عبر رابط</Text>
          {page ? (
            <>
              <View className="mt-1 flex-row items-center gap-1.5">
                <View className={cn('h-2 w-2 rounded-full', page.enabled ? 'bg-emerald-300' : 'bg-amber-300')} />
                <Text className="text-xs text-white/80">
                  {page.enabled ? 'الرابط يستقبل الحجوزات' : 'الرابط متوقف'}
                  {pending > 0 ? ` · ${pending} طلب بانتظارك` : ''}
                </Text>
              </View>
              <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-black/15 px-3 py-2">
                <Link2 size={15} color="rgba(255,255,255,0.7)" />
                <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-white" style={{ writingDirection: 'ltr' }}>
                  {(BOOKING_BASE_URL + page.slug).replace('https://', '')}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text className="mt-1 text-sm leading-5 text-white/85">
                رابط واحد تضعه في إنستغرام وواتساب، يحجز منه المرضى دون تطبيق أو تسجيل، ويصلك الطلب هنا.
              </Text>
              <Pressable onPress={onCreate} className="mt-4 self-start rounded-xl bg-white px-4 py-2.5">
                <Text className="text-sm font-bold" style={{ color: TEAL }}>
                  إنشاء رابط الحجز
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/* ── Requests ──────────────────────────────────────────────── */

function RequestsTab({ uid, page, requests }: { uid: string; page: BookingPage; requests: BookingRequest[] | undefined }) {
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  usePatients(); // re-render when patient files load, for the "existing patient" match
  if (requests === undefined) return <ActivityIndicator className="py-16" color={TEAL} />;
  const list = filter === 'open' ? requests.filter(isOpenRequest) : requests;
  return (
    <View>
      <View className="mb-3 flex-row gap-2">
        {(
          [
            ['open', 'بانتظار الرد'],
            ['all', 'الكل'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setFilter(id)}
            className={cn('rounded-full border px-4 py-1.5', filter === id ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white')}
          >
            <Text className={cn('text-xs font-bold', filter === id ? 'text-white' : 'text-slate-600')}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {list.length === 0 ? (
        <Empty
          Icon={Inbox}
          title={filter === 'open' ? 'لا توجد طلبات جديدة' : 'لا توجد طلبات بعد'}
          text="شارك رابط الحجز مع مرضاك، وستظهر طلباتهم هنا فوراً مع إشعار."
        />
      ) : (
        <View className="gap-3">
          {list.map((r) => (
            <RequestCard key={r.id} uid={uid} page={page} r={r} />
          ))}
        </View>
      )}
    </View>
  );
}

function RequestCard({ uid, page, r }: { uid: string; page: BookingPage; r: BookingRequest }) {
  const status = effectiveStatus(r);
  const existing = matchPatient(r);
  const [busy, setBusy] = useState<'' | 'accept' | 'reject'>('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [linkPatient, setLinkPatient] = useState(true);
  const when = `${formatDateAr(r.date)} الساعة ${formatTime12(r.time)}`;
  const tone = STATUS_TONE[status];

  const accept = async () => {
    setBusy('accept');
    try {
      await acceptRequest(uid, r, { linkPatient });
      toast.success('تم تأكيد الموعد وإضافته إلى التقويم');
    } catch {
      toast.error('تعذّر تأكيد الطلب، حاول مرة أخرى');
    } finally {
      setBusy('');
    }
  };
  const reject = async () => {
    setBusy('reject');
    try {
      await rejectBookingRequest(r.id, reason.trim());
      toast.success('تم رفض الطلب وأصبح الوقت متاحاً');
      setRejecting(false);
    } catch {
      toast.error('تعذّر رفض الطلب، حاول مرة أخرى');
    } finally {
      setBusy('');
    }
  };

  return (
    <View className="rounded-3xl border border-slate-100 bg-white p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: '#E3F4F1' }}>
          <Text className="text-base font-extrabold" style={{ color: TEAL }}>
            {r.patientName.trim()[0]}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="flex-shrink font-bold text-slate-900">
              {r.patientName}
            </Text>
            <View className={cn('rounded-full px-2 py-0.5', tone.bg)}>
              <Text className={cn('text-[10px] font-bold', tone.fg)}>{statusLabel[status]}</Text>
            </View>
          </View>
          <Text className="text-xs text-slate-500">{r.phone}</Text>
        </View>
        <Text className="text-[10px] font-semibold text-slate-400">{r.code}</Text>
      </View>

      <View className="mt-3 gap-1.5 rounded-2xl bg-slate-50 p-3">
        <View className="flex-row items-center gap-1.5">
          <CalendarClock size={14} color="#94A3B8" />
          <Text className="text-xs font-bold text-slate-700">
            {formatDateAr(r.date)} · {formatTime12(r.time)}
          </Text>
        </View>
        <Text className="text-xs text-slate-500">
          {reasonLabel(r.reason)}
          {page.clinics.filter((c) => c.enabled).length > 1 ? ` · ${r.clinicName}` : ''}
        </Text>
        {!!r.note && <Text className="text-xs text-slate-600">«{r.note}»</Text>}
      </View>

      {status === 'pending' && (
        <>
          <View className="mt-3 flex-row items-center gap-1.5">
            {existing ? <UserCheck size={16} color="#047857" /> : <UserPlus size={16} color="#64748B" />}
            <Text className={cn('text-xs font-semibold', existing ? 'text-emerald-700' : 'text-slate-500')}>
              {existing ? `مريض مسجّل: ملف ${existing.fileNo}` : 'مريض جديد'}
            </Text>
          </View>
          {!existing && (
            <Pressable onPress={() => setLinkPatient((v) => !v)} className="mt-2 flex-row items-center gap-2">
              <View
                className={cn('h-5 w-5 items-center justify-center rounded-md border', linkPatient ? 'border-transparent' : 'border-slate-300')}
                style={linkPatient ? { backgroundColor: TEAL } : undefined}
              >
                {linkPatient && <Check size={13} color="#fff" strokeWidth={3} />}
              </View>
              <Text className="text-xs text-slate-600">فتح ملف مريض له عند التأكيد</Text>
            </Pressable>
          )}

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => open(whatsappLink(r.phone, whatsappTexts.ask(r, when)))}
              className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl"
              style={{ backgroundColor: 'rgba(37,211,102,0.12)' }}
            >
              <MessageCircle size={16} color="#128C4B" />
              <Text className="text-xs font-bold" style={{ color: '#128C4B' }}>
                واتساب
              </Text>
            </Pressable>
            <Pressable onPress={() => open(`tel:${r.phone}`)} className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-100">
              <Phone size={16} color="#334155" />
              <Text className="text-xs font-bold text-slate-700">اتصال</Text>
            </Pressable>
          </View>

          {rejecting ? (
            <View className="mt-3 gap-2">
              <TextInput
                value={reason}
                onChangeText={setReason}
                maxLength={120}
                placeholder="سبب الرفض (اختياري، يراه المريض)"
                placeholderTextColor="#94A3B8"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
                style={[SINGLE_LINE_INPUT, { textAlign: 'right' }]}
              />
              <View className="flex-row gap-2">
                <Pressable onPress={() => setRejecting(false)} className="h-10 flex-1 items-center justify-center rounded-xl border border-slate-200">
                  <Text className="text-xs font-bold text-slate-700">رجوع</Text>
                </Pressable>
                <Pressable onPress={reject} disabled={!!busy} className="h-10 flex-1 items-center justify-center rounded-xl bg-rose-600">
                  {busy === 'reject' ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-bold text-white">تأكيد الرفض</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="mt-2 flex-row gap-2">
              <Pressable
                onPress={() => setRejecting(true)}
                className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-rose-200"
              >
                <X size={16} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-600">رفض</Text>
              </Pressable>
              <Pressable
                onPress={accept}
                disabled={!!busy}
                className="h-11 flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl"
                style={{ backgroundColor: TEAL }}
              >
                {busy === 'accept' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#fff" />
                    <Text className="text-sm font-bold text-white">قبول وإضافة للتقويم</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}

      {status === 'accepted' && (
        <Pressable
          onPress={() => open(whatsappLink(r.phone, whatsappTexts.confirm(r, r.clinicName, when)))}
          className="mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-xl"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle size={16} color="#fff" />
          <Text className="text-xs font-bold text-white">إرسال التأكيد عبر واتساب</Text>
        </Pressable>
      )}
      {status === 'rejected' && (
        <Pressable
          onPress={() => open(whatsappLink(r.phone, whatsappTexts.reject(r, when)))}
          className="mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-100"
        >
          <MessageCircle size={16} color="#334155" />
          <Text className="text-xs font-bold text-slate-700">إبلاغ المريض عبر واتساب</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ── Tomorrow ──────────────────────────────────────────────── */

function TomorrowTab({ page }: { page: BookingPage }) {
  const appointments = useAppointments();
  const { clinics, activeClinicId } = useClinics();
  const clinicName = clinics.find((c) => c.id === activeClinicId)?.name ?? '';
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateStr(d);
  }, []);
  const list = appointments
    .filter((a) => a.date === tomorrow && a.status !== 'cancelled' && a.phone)
    .sort((a, b) => a.time.localeCompare(b.time));
  const [sent, setSent] = useState<Record<string, boolean>>({});
  return (
    <View>
      <Text className="mb-3 text-sm leading-5 text-slate-600">
        مواعيد {formatDateAr(tomorrow)} في {clinicName}. اضغط «تذكير» ليفتح واتساب برسالة جاهزة.
      </Text>
      {list.length === 0 ? (
        <Empty Icon={BellRing} title="لا توجد مواعيد غداً" />
      ) : (
        <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {list.map((a, i) => (
            <View key={a.id} className={cn('flex-row items-center gap-3 p-4', i > 0 && 'border-t border-slate-100')}>
              <Text className="w-16 text-sm font-extrabold text-slate-800">{formatTime12(a.time)}</Text>
              <View className="flex-1">
                <Text numberOfLines={1} className="font-bold text-slate-800">
                  {a.patientName}
                </Text>
                <Text numberOfLines={1} className="text-xs text-slate-500">
                  {a.treatment || a.appointmentType}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setSent((s) => ({ ...s, [a.id]: true }));
                  open(
                    whatsappLink(
                      a.phone,
                      whatsappTexts.reminder(a.patientName, clinicName || page.doctorName, `غداً الساعة ${formatTime12(a.time)}`),
                    ),
                  );
                }}
                className={cn('h-9 flex-row items-center gap-1.5 rounded-xl px-3', sent[a.id] ? 'bg-emerald-50' : '')}
                style={sent[a.id] ? undefined : { backgroundColor: '#25D366' }}
              >
                {sent[a.id] ? <Check size={14} color="#047857" /> : <MessageCircle size={14} color="#fff" />}
                <Text className={cn('text-xs font-bold', sent[a.id] ? 'text-emerald-700' : 'text-white')}>{sent[a.id] ? 'أُرسل' : 'تذكير'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── Share ─────────────────────────────────────────────────── */

function ShareTab({ page }: { page: BookingPage }) {
  const url = BOOKING_BASE_URL + page.slug;
  const qr = useMemo(() => qrPath(url), [url]);
  const shareText = `احجز موعدك في عيادة ${page.doctorName} بسهولة ومن دون تسجيل:\n${url}`;
  return (
    <View className="gap-4">
      <View className="rounded-3xl border border-slate-100 bg-white p-5">
        <Text className="mb-2 text-xs font-bold text-slate-500">رابط الحجز</Text>
        <View className="rounded-2xl bg-slate-50 p-3">
          <Text numberOfLines={1} className="text-sm font-semibold text-slate-800" style={{ writingDirection: 'ltr', textAlign: 'left' }}>
            {url.replace('https://', '')}
          </Text>
        </View>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => Share.share({ message: shareText }).catch(() => {})}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-900"
          >
            <Share2 size={16} color="#fff" />
            <Text className="text-sm font-bold text-white">مشاركة / نسخ</Text>
          </Pressable>
          <Pressable
            onPress={() => open(`https://wa.me/?text=${encodeURIComponent(shareText)}`)}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle size={16} color="#fff" />
            <Text className="text-sm font-bold text-white">واتساب</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => open(url)} className="mt-2 h-11 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200">
          <ExternalLink size={16} color="#334155" />
          <Text className="text-sm font-bold text-slate-700">معاينة الصفحة كما يراها المريض</Text>
        </Pressable>
        <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: '#F0FAF8' }}>
          <Text className="mb-1 text-xs font-bold" style={{ color: '#0B5B54' }}>
            نصيحة لإنستغرام
          </Text>
          <Text className="text-xs leading-5" style={{ color: '#0B5B54' }}>
            ضع الرابط في البايو، وأضفه في الستوري عبر ملصق «رابط» مع جملة مثل «احجز موعدك الآن».
          </Text>
        </View>
      </View>

      <View className="items-center rounded-3xl border border-slate-100 bg-white p-5">
        <Text className="mb-3 text-xs font-bold text-slate-500">رمز QR للعيادة</Text>
        <View className="rounded-3xl border border-slate-100 bg-white p-4">
          <Svg width={200} height={200} viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}>
            <Path d={qr.d} fill="#0A4F4A" />
          </Svg>
        </View>
        <Text className="mt-3 font-bold text-slate-800">{page.doctorName}</Text>
        <Text className="text-xs text-slate-500">امسح الرمز لحجز موعدك</Text>
        <Text className="mt-3 text-center text-[11px] leading-4 text-slate-400">
          صوّر الشاشة واطبع الرمز، أو نزّله بجودة عالية من نسخة الويب.
        </Text>
      </View>
    </View>
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
  const [pickClosed, setPickClosed] = useState(false);
  const set = (patch: Partial<BookingPage>) => setP((x) => ({ ...x, ...patch }));
  const setClinic = (id: string, patch: Partial<BookingPage['clinics'][number]>) =>
    set({ clinics: p.clinics.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const today = dateStr(new Date());

  const save = async () => {
    if (!p.doctorName.trim()) return toast.error('اكتب اسم الطبيب كما يظهر للمرضى');
    if (!p.clinics.some((c) => c.enabled)) return toast.error('فعّل عيادة واحدة على الأقل');
    setSaving(true);
    try {
      const next = { ...p, ownerId: uid, slug: p.slug.trim().toLowerCase() };
      const res = await saveBookingPage(next, isNew ? undefined : initial.slug);
      if (!res.ok) {
        toast.error(
          res.error === 'slug-taken' ? 'هذا الرابط مستخدم، اختر اسماً آخر' : 'الرابط: أحرف إنجليزية صغيرة وأرقام وشرطة فقط (3 أحرف على الأقل)',
        );
        return;
      }
      toast.success(isNew ? 'تم إنشاء رابط الحجز 🎉' : 'تم حفظ الإعدادات');
      onSaved(next);
    } catch {
      toast.error('تعذّر الحفظ، تحقق من الاتصال');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-4">
      <Section title="حالة الرابط" action={<Switch value={p.enabled} onValueChange={(v) => set({ enabled: v })} trackColor={{ true: TEAL }} />}>
        <Text className="text-xs leading-5 text-slate-500">
          {p.enabled ? 'يستقبل الحجوزات.' : 'متوقف.'} عند الإيقاف تظهر للمريض رسالة «الحجز متوقف حالياً».
        </Text>
      </Section>

      <Section title="الرابط">
        <View className="h-12 flex-row items-center overflow-hidden rounded-xl border border-slate-200" style={{ direction: 'ltr' }}>
          <Text className="bg-slate-50 px-3 py-3.5 text-xs text-slate-500">…/book/</Text>
          <TextInput
            value={p.slug}
            onChangeText={(v) => set({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            className="h-full flex-1 px-2 text-sm font-semibold text-slate-900"
            style={[SINGLE_LINE_INPUT, { textAlign: 'left' }]}
          />
        </View>
        <Text className="mt-1.5 text-[11px] leading-4 text-slate-500">أحرف إنجليزية صغيرة وأرقام وشرطة، مثل dr-ahmed. تغييره يوقف الرابط القديم.</Text>
      </Section>

      <Section title="ما يراه المريض">
        <View className="gap-3">
          <Field label="اسم الطبيب" value={p.doctorName} onChange={(v) => set({ doctorName: v })} placeholder="د. أحمد علي" />
          <Field label="الاختصاص" value={p.specialty ?? ''} onChange={(v) => set({ specialty: v })} placeholder="طب وجراحة الفم والأسنان" />
          <Field label="رقم واتساب العيادة" value={p.whatsapp ?? ''} onChange={(v) => set({ whatsapp: v })} placeholder="07XX XXX XXXX" phone />
          <Field label="نبذة قصيرة (اختياري)" value={p.about ?? ''} onChange={(v) => set({ about: v })} placeholder="خبرة 10 سنوات في التجميل والزراعة" />
        </View>
      </Section>

      <Section title="المواعيد">
        <Text className="mb-2 text-xs font-semibold text-slate-500">مدة الموعد</Text>
        <Chips options={[15, 20, 30, 45, 60]} value={p.slotMinutes} format={(n) => `${n} د`} onChange={(n) => set({ slotMinutes: n })} />
        <Text className="mb-2 mt-4 text-xs font-semibold text-slate-500">الحجز مقدماً حتى</Text>
        <Chips options={[7, 14, 21, 30]} value={p.daysAhead} format={(n) => `${n} يوماً`} onChange={(n) => set({ daysAhead: n })} />
      </Section>

      {p.clinics.map((c) => (
        <Section
          key={c.id}
          title={c.name}
          action={<Switch value={c.enabled} onValueChange={(v) => setClinic(c.id, { enabled: v })} trackColor={{ true: TEAL }} />}
        >
          {!c.enabled ? (
            <Text className="text-xs text-slate-500">هذه العيادة لا تظهر في صفحة الحجز.</Text>
          ) : (
            <View className="gap-3">
              <Field label="العنوان" value={c.address} onChange={(v) => setClinic(c.id, { address: v })} placeholder="بغداد، المنصور، شارع 14 رمضان" />
              <Field
                label="رابط الموقع على الخريطة (اختياري)"
                value={c.mapUrl ?? ''}
                onChange={(v) => setClinic(c.id, { mapUrl: v })}
                placeholder="https://maps.google.com/…"
                ltr
              />
              <Text className="pt-1 text-xs font-bold text-slate-500">أيام وساعات الدوام</Text>
              <View className="overflow-hidden rounded-2xl border border-slate-100">
                {WEEK_ORDER.map((d, i) => {
                  const h: DayHours = c.hours[d] ?? { open: false, from: '16:00', to: '21:00' };
                  const setH = (patch: Partial<DayHours>) => setClinic(c.id, { hours: { ...c.hours, [d]: { ...h, ...patch } } });
                  return (
                    <View key={d} className={cn('px-3 py-2.5', i > 0 && 'border-t border-slate-100')}>
                      <View className="flex-row items-center gap-3">
                        <Switch value={h.open} onValueChange={(v) => setH({ open: v })} trackColor={{ true: TEAL }} />
                        <Text className={cn('w-16 text-sm font-bold', h.open ? 'text-slate-800' : 'text-slate-400')}>{DAY_NAMES_AR[d]}</Text>
                        {h.open ? (
                          <View className="flex-1 flex-row items-center justify-end gap-1.5" style={{ direction: 'ltr' }}>
                            <TimeField value={h.from} onChange={(v) => setH({ from: v })} />
                            <Text className="text-xs text-slate-400">—</Text>
                            <TimeField value={h.to} onChange={(v) => setH({ to: v })} />
                          </View>
                        ) : (
                          <Text className="text-xs text-slate-400">عطلة</Text>
                        )}
                      </View>
                      {h.open &&
                        (h.breakFrom !== undefined ? (
                          <View className="mt-2 flex-row items-center justify-end gap-1.5">
                            <Text className="text-xs text-slate-500">استراحة</Text>
                            <View className="flex-row items-center gap-1.5" style={{ direction: 'ltr' }}>
                              <TimeField value={h.breakFrom} onChange={(v) => setH({ breakFrom: v })} />
                              <Text className="text-xs text-slate-400">—</Text>
                              <TimeField value={h.breakTo ?? ''} onChange={(v) => setH({ breakTo: v })} />
                            </View>
                            <Pressable onPress={() => setH({ breakFrom: undefined, breakTo: undefined })} hitSlop={8}>
                              <X size={14} color="#94A3B8" />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable onPress={() => setH({ breakFrom: '18:00', breakTo: '18:30' })} className="mt-1.5 self-end">
                            <Text className="text-[11px] font-bold" style={{ color: TEAL }}>
                              + استراحة
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Section>
      ))}

      <Section
        title="أيام إغلاق (سفر، عطلة رسمية)"
        action={
          <Pressable onPress={() => setPickClosed(true)} className="flex-row items-center gap-1 rounded-xl bg-slate-900 px-3 py-2">
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-bold text-white">إضافة</Text>
          </Pressable>
        }
      >
        {p.closedDates.filter((d) => d >= today).length === 0 ? (
          <Text className="text-xs text-slate-500">لا توجد أيام إغلاق.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {p.closedDates
              .filter((d) => d >= today)
              .map((d) => (
                <View key={d} className="flex-row items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1.5 pr-3">
                  <Text className="text-xs font-bold text-slate-700">{formatDateAr(d)}</Text>
                  <Pressable onPress={() => set({ closedDates: p.closedDates.filter((x) => x !== d) })} hitSlop={8}>
                    <X size={14} color="#94A3B8" />
                  </Pressable>
                </View>
              ))}
          </View>
        )}
      </Section>
      <CalendarPickerModal
        visible={pickClosed}
        onClose={() => setPickClosed(false)}
        selectedDate={today}
        minDate={today}
        onSelect={(d) => {
          if (!p.closedDates.includes(d)) set({ closedDates: [...p.closedDates, d].sort() });
          setPickClosed(false);
        }}
      />

      <Pressable onPress={save} disabled={saving} className="h-14 items-center justify-center rounded-2xl" style={{ backgroundColor: TEAL, opacity: saving ? 0.6 : 1 }}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">{isNew ? 'إنشاء رابط الحجز' : 'حفظ الإعدادات'}</Text>}
      </Pressable>
    </View>
  );
}

/* ── Small pieces ──────────────────────────────────────────── */

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="rounded-3xl border border-slate-100 bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-bold text-slate-800">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  ltr,
  phone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
  phone?: boolean;
}) {
  return (
    <View>
      <Text className="mb-1 text-xs font-semibold text-slate-500">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={phone ? 'phone-pad' : 'default'}
        autoCapitalize={ltr ? 'none' : 'sentences'}
        className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
        style={[SINGLE_LINE_INPUT, { textAlign: 'right' }]}
      />
    </View>
  );
}

function Chips({ options, value, format, onChange }: { options: number[]; value: number; format: (n: number) => string; onChange: (n: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          className={cn('rounded-full border px-4 py-2', n === value ? 'border-transparent' : 'border-slate-200 bg-white')}
          style={n === value ? { backgroundColor: '#E3F4F1', borderColor: '#14A08F' } : undefined}
        >
          <Text className={cn('text-xs font-bold', n === value ? '' : 'text-slate-600')} style={n === value ? { color: '#0B5B54' } : undefined}>
            {format(n)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** "HH:MM" typed as digits; normalised on blur. */
function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const d = text.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g, '');
    const h = Math.min(23, Number(d.length <= 2 ? d : d.slice(0, d.length - 2)) || 0);
    const m = Math.min(59, d.length > 2 ? Number(d.slice(-2)) || 0 : 0);
    const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setText(v);
    onChange(v);
  };
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onBlur={commit}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      selectTextOnFocus
      className="h-9 w-16 rounded-lg border border-slate-200 text-center text-xs font-semibold text-slate-700"
      style={[SINGLE_LINE_INPUT, { textAlign: 'center' }]}
    />
  );
}

function Empty({ Icon, title, text }: { Icon: LucideIcon; title: string; text?: string }) {
  return (
    <View className="items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14">
      <Icon size={36} color="#CBD5E1" />
      <Text className="mt-3 font-bold text-slate-700">{title}</Text>
      {!!text && <Text className="mt-1 text-center text-xs leading-5 text-slate-500">{text}</Text>}
    </View>
  );
}

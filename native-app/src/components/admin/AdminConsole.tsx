import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { signOutDevice } from '@/lib/push';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { collection, orderBy, query, type Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity, AlertTriangle, BadgePercent, CalendarClock, Check, ChevronDown, ChevronLeft, ClipboardList, FlaskConical, LayoutDashboard, LogOut,
  Mail, Megaphone, Package, Phone, Search, ShieldCheck, ShoppingBag, Stethoscope, Users, Wallet, Wrench, X, type LucideIcon,
} from 'lucide-react-native';

import { Text } from '@/components/ui';
import { auth, db, storage } from '@/integrations/firebase/client';
import { app } from '@/integrations/firebase/config';
import {
  adActionCall,
  adminErrorMessage,
  dayOf,
  extendSubscriptionAction,
  formatBoth,
  formatMoney,
  getAccountFile,
  getBusinessData,
  inPeriod,
  officeRows,
  orderLines,
  periodsOf,
  resolveReportAction,
  revokeSessionsAction,
  setAccountStatusAction,
  setCommissionRate,
  sumLines,
  type AccountFile,
  type BusinessData,
  type LabStats,
  type OrderLine,
  type SupplierType,
} from '@/lib/adminBusiness';
import { useAdminAccounts, useAdminLogs, useAdminOffers, type AdminAccount, type AdminLog } from '@/lib/adminPanel';
import { useAllAds } from '@/lib/adsStore';
import type { Offer } from '@/lib/offers';
import { useRealtimeQuery } from '@/lib/realtime';
import { cn } from '@/lib/utils';

type Page = 'home' | 'earnings' | 'labs' | 'accounts' | 'ads' | 'reports' | 'audit' | 'tools';
type Tone = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate';
type Report = { id: string; reason?: string; reporterId?: string; reportedId?: string; status?: string; createdAt?: string };

const TONES: Record<Tone, { bg: string; fg: string; text: string }> = {
  blue: { bg: 'bg-blue-50', fg: '#1D4ED8', text: 'text-blue-700' },
  green: { bg: 'bg-emerald-50', fg: '#047857', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', fg: '#B45309', text: 'text-amber-700' },
  rose: { bg: 'bg-rose-50', fg: '#BE123C', text: 'text-rose-700' },
  violet: { bg: 'bg-violet-50', fg: '#6D28D9', text: 'text-violet-700' },
  slate: { bg: 'bg-slate-100', fg: '#475569', text: 'text-slate-600' },
};
const TYPE_LABEL: Record<string, string> = { secretary: 'سكرتارية', dentist: 'طبيب أسنان', lab: 'مختبر', supply: 'مكتب مستلزمات', implant: 'شركة زراعة' };
const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
};
const CASE_STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'جديدة', tone: 'blue' },
  in_progress: { label: 'قيد العمل', tone: 'violet' },
  delayed: { label: 'متأخرة', tone: 'amber' },
  completed: { label: 'مكتملة', tone: 'green' },
};
const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: 'مكتملة', tone: 'green' },
  pending: { label: 'بانتظار المكتب', tone: 'amber' },
  rejected: { label: 'مرفوضة', tone: 'rose' },
};
const REPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: 'جديد', tone: 'rose' },
  reviewing: { label: 'قيد المراجعة', tone: 'amber' },
  resolved: { label: 'تم الحل', tone: 'green' },
};
const accountLabel = (a: AdminAccount) => a.name || a.clinicName || a.email || 'حساب';
const isSuspended = (a: { accountStatus?: string }) => a.accountStatus === 'suspended';
const shortDate = (days: number) => dayOf(Date.now() + days * 86400000);

/* ── Pieces ───────────────────────────────────────────────────── */

function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-0.5', TONES[tone].bg)}>
      <Text className={cn('text-[11px] font-bold', TONES[tone].text)}>{children}</Text>
    </View>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-1">
      <Text className="text-2xl font-extrabold text-slate-900">{title}</Text>
      {!!subtitle && <Text className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</Text>}
    </View>
  );
}

function Panel({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {!!title && (
        <View className="border-b border-slate-100 px-4 py-3.5">
          <Text className="text-sm font-extrabold text-slate-900">{title}</Text>
          {!!hint && <Text className="mt-0.5 text-xs text-slate-500">{hint}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

function Stat({ label, value, sub, icon: Icon, tone = 'blue' }: { label: string; value: ReactNode; sub?: string; icon: LucideIcon; tone?: Tone }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-xs font-semibold text-slate-500">{label}</Text>
        <View className={cn('h-9 w-9 items-center justify-center rounded-xl', TONES[tone].bg)}>
          <Icon size={18} color={TONES[tone].fg} />
        </View>
      </View>
      <Text className="mt-1.5 text-2xl font-extrabold text-slate-900">{value}</Text>
      {!!sub && <Text className="mt-0.5 text-xs text-slate-500">{sub}</Text>}
    </View>
  );
}

function Btn({ label, onPress, variant = 'primary', busy, disabled, icon: Icon, small }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; busy?: boolean; disabled?: boolean; icon?: LucideIcon; small?: boolean }) {
  const cls = { primary: 'bg-blue-600', secondary: 'border border-slate-200 bg-white', danger: 'bg-rose-600' }[variant];
  const fg = variant === 'secondary' ? '#334155' : '#FFFFFF';
  return (
    <Pressable disabled={busy || disabled} onPress={onPress} className={cn('flex-row items-center justify-center gap-1.5 rounded-xl px-4', small ? 'h-9' : 'h-11', cls)} style={{ opacity: busy || disabled ? 0.5 : 1 }}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon && <Icon size={15} color={fg} />}
      <Text className="text-xs font-bold" style={{ color: fg }}>{label}</Text>
    </Pressable>
  );
}

function Segments<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} className={cn('h-9 flex-row items-center gap-1.5 rounded-lg px-3', value === o.value && 'bg-white')}>
          <Text className={cn('text-xs font-bold', value === o.value ? 'text-slate-900' : 'text-slate-500')}>{o.label}</Text>
          {o.count !== undefined && <Text className={cn('text-[11px] font-bold', value === o.value ? 'text-blue-700' : 'text-slate-400')}>{o.count}</Text>}
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Chips({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5">
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} className={cn('h-8 justify-center rounded-full border px-3', value === o.value ? 'border-slate-800 bg-slate-800' : 'border-slate-200 bg-white')}>
          <Text className={cn('text-[11px] font-bold', value === o.value ? 'text-white' : 'text-slate-500')}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View className="h-11 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
      <Search size={16} color="#94A3B8" />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94A3B8" autoCapitalize="none" className="flex-1 text-sm text-slate-800" />
    </View>
  );
}

function Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <View className="items-center px-6 py-12">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Icon size={24} color="#94A3B8" />
      </View>
      <Text className="mt-3 text-sm font-bold text-slate-700">{title}</Text>
      {!!hint && <Text className="mt-1 text-center text-xs text-slate-500">{hint}</Text>}
    </View>
  );
}

function ErrorText({ children }: { children: string }) {
  if (!children) return null;
  return (
    <View className="rounded-xl bg-rose-50 px-3 py-2">
      <Text className="text-xs font-semibold text-rose-700">{children}</Text>
    </View>
  );
}

function ExpandRow({ header, children, last }: { header: ReactNode; children: ReactNode; last?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View className={cn(!last && 'border-b border-slate-100', open && 'bg-slate-50')}>
      <Pressable onPress={() => setOpen((v) => !v)} className="flex-row items-center gap-2 px-4 py-3.5">
        <View className="min-w-0 flex-1">{header}</View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color="#94A3B8" />
        </View>
      </Pressable>
      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  );
}

function Figure({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={{ width: '50%' }} className="mt-2">
      <Text className="text-[11px] font-semibold text-slate-400">{label}</Text>
      <Text className={cn('text-sm font-extrabold', strong ? 'text-emerald-700' : 'text-slate-800')}>{value}</Text>
    </View>
  );
}

function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-slate-50" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          <View className="flex-row items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-5 py-4">
            <Text numberOfLines={1} className="flex-1 text-sm font-extrabold text-slate-900">{title}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <X size={16} color="#475569" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 p-4">{children}</ScrollView>
          {footer && <View className="flex-row justify-end gap-2 border-t border-slate-200 bg-white p-3">{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

const fieldCls = 'rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800';

/* ── Console ──────────────────────────────────────────────────── */

export function AdminConsole({ adminName }: { adminName: string }) {
  const insets = useSafeAreaInsets();
  const { data: accounts = [] } = useAdminAccounts();
  const { data: offers = [] } = useAdminOffers();
  const { data: generalAds = [] } = useAllAds();
  const { data: logs = [] } = useAdminLogs(200);
  const reportsQuery = useMemo(() => query(collection(db, 'reports'), orderBy('createdAt', 'desc')), []);
  const { data: reports = [] } = useRealtimeQuery<Report>(reportsQuery, (d) => {
    const x = d.data() as Record<string, unknown>;
    return { ...(x as Report), id: d.id, createdAt: (x.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? '' };
  });
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [businessError, setBusinessError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [openAccount, setOpenAccount] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusinessError('');
    try {
      setBusiness(await getBusinessData());
    } catch (err) {
      console.warn('Admin business data not loaded:', err);
      setBusinessError('تعذر تحميل بيانات الأرباح والمختبرات. اسحب الصفحة للأسفل للتحديث.');
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pendingAds = offers.filter((o) => o.status === 'pending').length + generalAds.filter((a) => a.status === 'pending').length;
  const openReports = reports.filter((r) => (r.status ?? 'open') !== 'resolved').length;

  const nav: { key: Page; label: string; icon: LucideIcon; count?: number }[] = [
    { key: 'home', label: 'الرئيسية', icon: LayoutDashboard },
    { key: 'earnings', label: 'الأرباح والمكاتب', icon: Wallet },
    { key: 'labs', label: 'المختبرات', icon: FlaskConical },
    { key: 'accounts', label: 'الحسابات', icon: Users },
    { key: 'ads', label: 'الإعلانات', icon: Megaphone, count: pendingAds },
    { key: 'reports', label: 'البلاغات', icon: AlertTriangle, count: openReports },
    { key: 'audit', label: 'سجل الإجراءات', icon: Activity },
    { key: 'tools', label: 'أدوات', icon: Wrench },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <View className="border-b border-slate-200 bg-white" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-3 px-4 pb-2 pt-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
            <ShieldCheck size={18} color="#FFFFFF" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-extrabold text-slate-900">Dent Hub</Text>
            <Text numberOfLines={1} className="text-[11px] text-slate-500">لوحة الإدارة · {adminName}</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert('تسجيل الخروج', 'الخروج من لوحة الإدارة؟', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'خروج', style: 'destructive', onPress: () => void signOutDevice() },
              ])
            }
            className="h-9 w-9 items-center justify-center rounded-lg"
          >
            <LogOut size={18} color="#94A3B8" />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1 px-3 pb-2">
          {nav.map((n) => (
            <Pressable key={n.key} onPress={() => setPage(n.key)} className={cn('h-9 flex-row items-center gap-1.5 rounded-xl px-3', page === n.key && 'bg-blue-50')}>
              <n.icon size={15} color={page === n.key ? '#1D4ED8' : '#64748B'} />
              <Text className={cn('text-xs font-bold', page === n.key ? 'text-blue-700' : 'text-slate-600')}>{n.label}</Text>
              {!!n.count && (
                <View className="min-w-4 items-center rounded-full bg-rose-500 px-1">
                  <Text className="text-[10px] font-bold text-white">{n.count}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        {(page === 'home' || page === 'earnings' || page === 'labs') && <ErrorText>{businessError}</ErrorText>}
        {page === 'home' && <HomePage adminName={adminName} business={business} accounts={accounts} pendingAds={pendingAds} openReports={openReports} go={setPage} />}
        {page === 'earnings' && <EarningsPage business={business} refresh={refresh} />}
        {page === 'labs' && <LabsPage business={business} />}
        {page === 'accounts' && <AccountsPage accounts={accounts} onOpen={setOpenAccount} />}
        {page === 'ads' && <AdsPage offers={offers} generalAds={generalAds} accounts={accounts} />}
        {page === 'reports' && <ReportsPage reports={reports} accounts={accounts} onOpen={setOpenAccount} />}
        {page === 'audit' && <AuditPage logs={logs} />}
        {page === 'tools' && <ToolsPage />}
      </ScrollView>

      {openAccount && <AccountSheet uid={openAccount} onClose={() => setOpenAccount(null)} />}
    </View>
  );
}

/* ── Home ─────────────────────────────────────────────────────── */

function HomePage({ adminName, business, accounts, pendingAds, openReports, go }: { adminName: string; business: BusinessData | null; accounts: AdminAccount[]; pendingAds: number; openReports: number; go: (p: Page) => void }) {
  const thisMonth = dayOf(Date.now()).slice(0, 7);
  const lines = useMemo(() => (business ? orderLines(business) : []), [business]);
  const month = sumLines(lines.filter((l) => inPeriod(l.createdAt, thisMonth)));
  const all = sumLines(lines);
  const cases = (business?.labs ?? []).reduce((n, l) => n + l.total, 0);
  const soon = Date.now() + 14 * 86400000;
  const expiring = accounts.filter((a) => {
    const t = a.subscriptionExpiry ? Date.parse(String(a.subscriptionExpiry)) : 0;
    return t > Date.now() && t < soon;
  }).length;
  const suspended = accounts.filter(isSuspended).length;
  const decisions: { label: string; hint: string; count: number; page: Page; icon: LucideIcon; tone: Tone }[] = [
    { label: 'إعلانات بانتظار الموافقة', hint: 'راجعها لتظهر للمستخدمين', count: pendingAds, page: 'ads', icon: Megaphone, tone: 'amber' },
    { label: 'بلاغات مفتوحة', hint: 'تحتاج مراجعة وقرار', count: openReports, page: 'reports', icon: AlertTriangle, tone: 'rose' },
    { label: 'اشتراكات تنتهي خلال 14 يوماً', hint: 'مدّدها أو تواصل مع أصحابها', count: expiring, page: 'accounts', icon: CalendarClock, tone: 'violet' },
  ];
  const active = decisions.filter((d) => d.count > 0);
  const types: [string, LucideIcon][] = [['dentist', Stethoscope], ['lab', FlaskConical], ['supply', Package], ['implant', ShieldCheck]];
  return (
    <>
      <PageTitle title={`أهلاً، ${adminName}`} subtitle="ملخص المنصة وما يحتاج قرارك اليوم" />
      <Stat label="أرباحي هذا الشهر" value={business ? formatBoth(month.earnIQD, month.earnUSD) : '…'} sub={`${month.lists} قائمة مكتملة`} icon={Wallet} tone="green" />
      <Stat label="إجمالي أرباحي" value={business ? formatBoth(all.earnIQD, all.earnUSD) : '…'} sub={`من ${all.lists} قائمة مكتملة`} icon={BadgePercent} tone="blue" />
      <View className="flex-row gap-3">
        <View className="flex-1"><Stat label="حالات المختبرات" value={business ? cases : '…'} sub={`في ${business?.labs.length ?? 0} مختبر`} icon={FlaskConical} tone="violet" /></View>
        <View className="flex-1"><Stat label="الحسابات" value={accounts.length} sub={suspended ? `${suspended} موقوف` : 'لا يوجد موقوف'} icon={Users} tone="slate" /></View>
      </View>
      <Panel title="يحتاج قرارك">
        {active.length === 0 ? (
          <Empty icon={Check} title="لا يوجد ما يحتاج قرارك الآن" />
        ) : (
          active.map((d, i) => (
            <Pressable key={d.label} onPress={() => go(d.page)} className={cn('flex-row items-center gap-3 px-4 py-3.5', i < active.length - 1 && 'border-b border-slate-100')}>
              <View className={cn('h-10 w-10 items-center justify-center rounded-xl', TONES[d.tone].bg)}>
                <d.icon size={20} color={TONES[d.tone].fg} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-slate-900">{d.label}</Text>
                <Text className="text-xs text-slate-500">{d.hint}</Text>
              </View>
              <Text className="text-xl font-extrabold text-slate-900">{d.count}</Text>
              <ChevronLeft size={16} color="#94A3B8" />
            </Pressable>
          ))
        )}
      </Panel>
      <Panel title="الحسابات حسب النوع">
        {types.map(([t, Icon], i) => (
          <View key={t} className={cn('flex-row items-center gap-3 px-4 py-3', i < types.length - 1 && 'border-b border-slate-100')}>
            <Icon size={16} color="#94A3B8" />
            <Text className="flex-1 text-sm text-slate-600">{TYPE_LABEL[t]}</Text>
            <Text className="text-sm font-extrabold text-slate-900">{accounts.filter((a) => a.accountType === t).length}</Text>
          </View>
        ))}
      </Panel>
    </>
  );
}

/* ── Earnings and offices ─────────────────────────────────────── */

function ListRow({ line, showOffice, last }: { line: OrderLine; showOffice?: boolean; last?: boolean }) {
  const s = ORDER_STATUS[line.status] ?? { label: line.status, tone: 'slate' as Tone };
  return (
    <ExpandRow
      last={last}
      header={
        <View>
          <View className="flex-row items-center justify-between gap-2">
            <Text numberOfLines={1} className="flex-1 text-sm font-bold text-slate-900">{showOffice ? line.supplierName : line.dentistName || '—'}</Text>
            <Badge tone={s.tone}>{s.label}</Badge>
          </View>
          <Text className="mt-0.5 text-xs text-slate-500">{dayOf(line.createdAt) || '—'} · {line.itemCount} منتج · {formatBoth(line.totalIQD, line.totalUSD)}</Text>
          {line.completed && <Text className="mt-0.5 text-xs font-bold text-emerald-700">ربحي: {formatBoth(line.earnIQD, line.earnUSD)}</Text>}
        </View>
      }
    >
      <View className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <View className="gap-0.5 border-b border-slate-100 px-3 py-2.5">
          <Text className="text-xs text-slate-500">رقم القائمة: <Text className="text-xs font-bold text-slate-700">{line.orderNumber || '—'}</Text></Text>
          <Text className="text-xs text-slate-500">الطبيب: <Text className="text-xs font-bold text-slate-700">{line.dentistName || '—'}</Text></Text>
          {!!line.clinicName && line.clinicName !== line.dentistName && <Text className="text-xs text-slate-500">العيادة: <Text className="text-xs font-bold text-slate-700">{line.clinicName}</Text></Text>}
        </View>
        {line.items.map((i, n) => (
          <View key={n} className="flex-row items-center gap-2 border-b border-slate-100 px-3 py-2.5" style={{ opacity: i.available ? 1 : 0.45 }}>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={2} className={cn('text-xs font-semibold text-slate-800', !i.available && 'line-through')}>{i.name || '—'}</Text>
              <Text className="text-[11px] text-slate-500">{i.quantity} × {formatMoney(i.price, i.currency)}</Text>
            </View>
            <Text className="text-xs font-bold text-slate-800">{formatMoney(i.price * i.quantity, i.currency)}</Text>
          </View>
        ))}
        <View className="gap-1 bg-slate-50 px-3 py-2.5">
          <Text className="text-xs text-slate-500">مجموع القائمة: <Text className="text-xs font-bold text-slate-900">{formatBoth(line.totalIQD, line.totalUSD)}</Text></Text>
          {line.completed && <Text className="text-xs text-emerald-700">ربحي ({line.rate}%): <Text className="text-xs font-bold text-emerald-700">{formatBoth(line.earnIQD, line.earnUSD)}</Text></Text>}
        </View>
      </View>
    </ExpandRow>
  );
}

function RateDialog({ type, current, onClose, onSaved }: { type: SupplierType; current: number; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await setCommissionRate(type, Number(value));
      onSaved();
      onClose();
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={`نسبة الربح: ${type === 'supply' ? 'مكاتب المستلزمات' : 'شركات الزراعة'}`}
      onClose={onClose}
      footer={
        <>
          <Btn label="إلغاء" variant="secondary" onPress={onClose} />
          <Btn label="حفظ" busy={busy} onPress={() => void save()} />
        </>
      }
    >
      <Text className="text-xs font-bold text-slate-600">النسبة (%)</Text>
      <TextInput value={value} onChangeText={(v) => setValue(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" autoFocus className={cn(fieldCls, 'h-11')} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
      <Text className="text-xs leading-5 text-slate-500">تسري النسبة الجديدة على القوائم من اليوم فصاعداً، ولا تتغير أرباح القوائم السابقة.</Text>
      <ErrorText>{error}</ErrorText>
    </Sheet>
  );
}

function EarningsPage({ business, refresh }: { business: BusinessData | null; refresh: () => Promise<void> }) {
  const [view, setView] = useState<'offices' | 'earnings'>('offices');
  const [period, setPeriod] = useState('all');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [editing, setEditing] = useState<SupplierType | null>(null);
  const lines = useMemo(() => (business ? orderLines(business) : []), [business]);
  if (!business) {
    return (
      <>
        <PageTitle title="الأرباح والمكاتب" />
        <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
      </>
    );
  }
  const visible = lines.filter((l) => inPeriod(l.createdAt, period));
  const totals = sumLines(visible);
  const needle = q.trim().toLowerCase();
  const rows = officeRows(business, visible)
    .filter((r) => type === 'all' || r.type === type)
    .filter((r) => !needle || r.name.toLowerCase().includes(needle));
  const completed = visible.filter((l) => l.completed);
  return (
    <>
      <PageTitle title="الأرباح والمكاتب" subtitle="ربحك من كل قائمة مكتملة، وما اشتراه الأطباء من كل مكتب" />
      <Stat label="أرباحي" value={formatBoth(totals.earnIQD, totals.earnUSD)} sub={period === 'all' ? 'كل الفترات' : monthLabel(period)} icon={Wallet} tone="green" />
      <Stat label="قيمة المشتريات" value={formatBoth(totals.salesIQD, totals.salesUSD)} sub="القوائم المكتملة فقط" icon={ShoppingBag} tone="blue" />
      <Stat label="القوائم والمنتجات" value={totals.lists} sub={`${totals.items} منتج مباع`} icon={ClipboardList} tone="violet" />

      <View className="flex-row gap-2">
        {(['supply', 'implant'] as const).map((t) => (
          <Pressable key={t} onPress={() => setEditing(t)} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white">
            <BadgePercent size={15} color="#2563EB" />
            <Text className="text-[11px] font-semibold text-slate-600">{t === 'supply' ? 'المكاتب' : 'الزراعة'}:</Text>
            <Text className="text-sm font-extrabold text-slate-900">{business.settings.rates[t] ?? 0}%</Text>
          </Pressable>
        ))}
      </View>

      <Segments value={view} onChange={setView} options={[{ value: 'offices', label: 'المكاتب', count: rows.length }, { value: 'earnings', label: 'قائمة أرباحي', count: completed.length }]} />
      <Chips value={period} onChange={setPeriod} options={[{ value: 'all', label: 'كل الفترات' }, ...periodsOf(business.orders).map((p) => ({ value: p, label: monthLabel(p) }))]} />

      {view === 'offices' ? (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المكتب" />
          <Chips value={type} onChange={setType} options={[{ value: 'all', label: 'كل الأنواع' }, { value: 'supply', label: 'مكاتب المستلزمات' }, { value: 'implant', label: 'شركات الزراعة' }]} />
          <Panel title="المكاتب" hint="اضغط مكتباً لعرض قوائمه، ثم قائمة لعرض منتجاتها">
            {rows.length === 0 ? (
              <Empty icon={Package} title="لا توجد مكاتب مطابقة" />
            ) : (
              rows.map((r, i) => (
                <ExpandRow
                  key={r.id}
                  last={i === rows.length - 1}
                  header={
                    <View>
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                          <Text className="text-sm font-extrabold text-blue-700">{r.name.trim().charAt(0) || '?'}</Text>
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">{r.name}</Text>
                          <Text className="text-xs text-slate-500">{r.lastAt ? `آخر قائمة: ${dayOf(r.lastAt)}` : 'لا توجد قوائم'}</Text>
                        </View>
                      </View>
                      <View className="flex-row flex-wrap">
                        <Figure label="القوائم" value={r.totals.lists} />
                        <Figure label="المنتجات" value={r.totals.items} />
                        <Figure label="المشتريات" value={formatBoth(r.totals.salesIQD, r.totals.salesUSD)} />
                        <Figure label="ربحي" value={formatBoth(r.totals.earnIQD, r.totals.earnUSD)} strong />
                      </View>
                    </View>
                  }
                >
                  {r.lines.length === 0 ? (
                    <Text className="py-4 text-center text-xs text-slate-500">لا توجد قوائم في هذه الفترة</Text>
                  ) : (
                    <View className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {r.lines.map((l, n) => <ListRow key={l.id} line={l} last={n === r.lines.length - 1} />)}
                    </View>
                  )}
                </ExpandRow>
              ))
            )}
          </Panel>
        </>
      ) : (
        <Panel title="قائمة أرباحي" hint="كل قائمة مكتملة والربح المقتطع منها، الأحدث أولاً">
          {completed.length === 0 ? <Empty icon={Wallet} title="لا توجد أرباح في هذه الفترة" /> : completed.map((l, n) => <ListRow key={l.id} line={l} showOffice last={n === completed.length - 1} />)}
        </Panel>
      )}
      {editing && <RateDialog type={editing} current={business.settings.rates[editing] ?? 0} onClose={() => setEditing(null)} onSaved={() => void refresh()} />}
    </>
  );
}

/* ── Labs ─────────────────────────────────────────────────────── */

function LabRow({ lab, last }: { lab: LabStats; last?: boolean }) {
  const months = Object.keys(lab.months).sort().reverse().slice(0, 6);
  return (
    <ExpandRow
      last={last}
      header={
        <View>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <FlaskConical size={20} color="#6D28D9" />
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">{lab.name}</Text>
              <Text className="text-xs text-slate-500">{lab.doctors.length} طبيب أرسل حالات</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-extrabold text-slate-900">{lab.total}</Text>
              <Text className="text-[11px] font-semibold text-slate-400">حالة</Text>
            </View>
          </View>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {Object.keys(CASE_STATUS).filter((s) => lab.byStatus[s]).map((s) => (
              <Badge key={s} tone={CASE_STATUS[s].tone}>{CASE_STATUS[s].label}: {lab.byStatus[s]}</Badge>
            ))}
          </View>
        </View>
      }
    >
      {lab.total === 0 ? (
        <Text className="py-4 text-center text-xs text-slate-500">لم تصل إلى هذا المختبر أي حالة بعد</Text>
      ) : (
        <View className="gap-3">
          <View className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Text className="border-b border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500">الحالات حسب الطبيب</Text>
            {lab.doctors.map((d, i) => (
              <View key={i} className="flex-row items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-slate-700">{d.name}</Text>
                <Text className="text-sm font-bold text-slate-900">{d.count}</Text>
              </View>
            ))}
          </View>
          {months.length > 0 && (
            <View className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Text className="border-b border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500">الحالات حسب الشهر</Text>
              {months.map((m) => (
                <View key={m} className="flex-row items-center justify-between border-b border-slate-100 px-3 py-2.5">
                  <Text className="text-sm font-semibold text-slate-700">{monthLabel(m)}</Text>
                  <Text className="text-sm font-bold text-slate-900">{lab.months[m]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ExpandRow>
  );
}

function LabsPage({ business }: { business: BusinessData | null }) {
  const [q, setQ] = useState('');
  if (!business) {
    return (
      <>
        <PageTitle title="المختبرات" />
        <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
      </>
    );
  }
  const needle = q.trim().toLowerCase();
  const labs = business.labs.filter((l) => !needle || l.name.toLowerCase().includes(needle)).sort((a, b) => b.total - a.total);
  const count = (s: string) => business.labs.reduce((n, l) => n + (l.byStatus[s] || 0), 0);
  return (
    <>
      <PageTitle title="المختبرات" subtitle="عدد الحالات التي أرسلها الأطباء إلى كل مختبر. تفاصيل المرضى لا تظهر هنا." />
      <View className="flex-row gap-3">
        <View className="flex-1"><Stat label="كل الحالات" value={business.labs.reduce((n, l) => n + l.total, 0)} icon={ClipboardList} tone="blue" /></View>
        <View className="flex-1"><Stat label="قيد العمل" value={count('in_progress') + count('new')} icon={Activity} tone="violet" /></View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><Stat label="متأخرة" value={count('delayed')} icon={CalendarClock} tone="amber" /></View>
        <View className="flex-1"><Stat label="مكتملة" value={count('completed')} icon={Check} tone="green" /></View>
      </View>
      <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المختبر" />
      <Panel title="الحالات لكل مختبر" hint="اضغط مختبراً لعرض الأطباء والأشهر">
        {labs.length === 0 ? <Empty icon={FlaskConical} title="لا توجد مختبرات مطابقة" /> : labs.map((l, i) => <LabRow key={l.id} lab={l} last={i === labs.length - 1} />)}
      </Panel>
    </>
  );
}

/* ── Accounts ─────────────────────────────────────────────────── */

function AccountsPage({ accounts, onOpen }: { accounts: AdminAccount[]; onOpen: (uid: string) => void }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const needle = q.trim().toLowerCase();
  const list = accounts.filter((a) => {
    if (type !== 'all' && a.accountType !== type) return false;
    if (status === 'suspended' && !isSuspended(a)) return false;
    if (status === 'active' && isSuspended(a)) return false;
    if (!needle) return true;
    return [a.name, a.clinicName, a.email, a.phone].some((v) => String(v ?? '').toLowerCase().includes(needle));
  });
  return (
    <>
      <PageTitle title="الحسابات" subtitle={`${accounts.length} حساب على المنصة`} />
      <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو البريد أو الهاتف" />
      <Chips value={type} onChange={setType} options={[{ value: 'all', label: 'كل الأنواع' }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))]} />
      <Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'كل الحالات' }, { value: 'active', label: 'نشط' }, { value: 'suspended', label: 'موقوف' }]} />
      <Panel>
        {list.length === 0 ? (
          <Empty icon={Users} title="لا توجد حسابات مطابقة" />
        ) : (
          list.map((a, i) => (
            <Pressable key={a.docId} onPress={() => onOpen(a.docId)} className={cn('flex-row items-center gap-3 px-4 py-3', i < list.length - 1 && 'border-b border-slate-100')}>
              <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {a.photoURL ? <Image source={{ uri: a.photoURL }} className="h-full w-full" /> : <Text className="text-sm font-extrabold text-slate-600">{accountLabel(a).trim().charAt(0)}</Text>}
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-bold text-slate-900">{accountLabel(a)}</Text>
                <Text numberOfLines={1} className="text-xs text-slate-500">{TYPE_LABEL[a.accountType ?? ''] ?? '—'}</Text>
              </View>
              <Badge tone={isSuspended(a) ? 'rose' : 'green'}>{isSuspended(a) ? 'موقوف' : 'نشط'}</Badge>
              <ChevronLeft size={16} color="#94A3B8" />
            </Pressable>
          ))
        )}
      </Panel>
    </>
  );
}

function Info({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={15} color="#94A3B8" />
      <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-slate-600">{children}</Text>
    </View>
  );
}

function AccountSheet({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [file, setFile] = useState<AccountFile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');
  const load = useCallback(() => getAccountFile(uid).then(setFile).catch((err) => setError(adminErrorMessage(err))), [uid]);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      setSuspending(false);
      setReason('');
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const seller = file?.accountType === 'supply' || file?.accountType === 'implant';
  const figures: [string, number, boolean][] = file
    ? [
        ['طلبات اشتراها', file.counts.asDentist, file.accountType === 'dentist'],
        ['مرضى (عدد فقط)', file.counts.patients, file.accountType === 'dentist'],
        ['طلبات باعها', file.counts.asSupplier, !!seller],
        ['منتجات', file.counts.products, !!seller],
        ['عروض', file.counts.offers, !!seller],
        ['حالات', file.counts.cases, file.accountType === 'lab'],
        ['بلاغات عليه', file.counts.reports, true],
      ]
    : [];
  return (
    <Sheet title={file?.name ?? 'ملف الحساب'} onClose={onClose}>
      {!file && !error && <ActivityIndicator color="#2563EB" style={{ marginVertical: 32 }} />}
      <ErrorText>{error}</ErrorText>
      {file && (
        <>
          <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                {file.photoURL ? <Image source={{ uri: file.photoURL }} className="h-full w-full" /> : <Text className="text-xl font-extrabold text-slate-600">{file.name.trim().charAt(0)}</Text>}
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text numberOfLines={1} className="text-base font-extrabold text-slate-900">{file.name}</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <Badge>{TYPE_LABEL[file.accountType] ?? file.role ?? '—'}</Badge>
                  <Badge tone={file.status === 'suspended' ? 'rose' : 'green'}>{file.status === 'suspended' ? 'موقوف' : 'نشط'}</Badge>
                  <Badge tone={file.emailVerified ? 'blue' : 'amber'}>{file.emailVerified ? 'البريد مؤكد' : 'غير مؤكد'}</Badge>
                </View>
              </View>
            </View>
            <View className="gap-2">
              {!!file.email && <Info icon={Mail}>{file.email}</Info>}
              {!!file.phone && <Info icon={Phone}>{file.phone}</Info>}
              <Info icon={CalendarClock}>سجّل {dayOf(file.createdAt) || '—'} · آخر دخول {dayOf(file.lastSignIn) || '—'}</Info>
              <Info icon={BadgePercent}>الاشتراك: {file.subscriptionExpiry ? `حتى ${String(file.subscriptionExpiry).slice(0, 10)}` : 'غير محدد'}</Info>
            </View>
            {file.status === 'suspended' && !!file.suspendedReason && <ErrorText>{`سبب الإيقاف: ${file.suspendedReason}`}</ErrorText>}
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-2">
            {figures.filter((f) => f[2]).map(([label, value]) => (
              <View key={label} className="rounded-xl border border-slate-200 bg-white p-3" style={{ width: '48.5%' }}>
                <Text className="text-[11px] font-semibold text-slate-400">{label}</Text>
                <Text className="text-lg font-extrabold text-slate-900">{value}</Text>
              </View>
            ))}
          </View>

          {file.role !== 'admin' && (
            <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-xs font-bold text-slate-500">الإجراءات</Text>
              {file.status === 'suspended' ? (
                <Btn label="إعادة تفعيل الحساب" icon={Check} busy={busy} onPress={() => void act(() => setAccountStatusAction(uid, 'active'))} />
              ) : (
                <Btn label="إيقاف الحساب" variant="danger" icon={X} onPress={() => setSuspending(true)} />
              )}
              <View className="flex-row gap-2">
                <View className="flex-1"><Btn label="تمديد شهر" variant="secondary" busy={busy} onPress={() => void act(() => extendSubscriptionAction(uid, 1))} /></View>
                <View className="flex-1"><Btn label="تمديد سنة" variant="secondary" busy={busy} onPress={() => void act(() => extendSubscriptionAction(uid, 12))} /></View>
              </View>
              <Btn label="إنهاء جلسات الدخول" variant="secondary" busy={busy} onPress={() => void act(() => revokeSessionsAction(uid))} />
            </View>
          )}

          <View className="gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-xs font-bold text-slate-500">سجل قرارات الإدارة</Text>
            {file.history.length === 0 ? (
              <Text className="text-xs text-slate-400">لا توجد قرارات بعد</Text>
            ) : (
              file.history.map((h) => (
                <View key={h.id}>
                  <Text className="text-xs font-semibold text-slate-700">{h.message}</Text>
                  <Text className="text-[11px] text-slate-400">{dayOf(h.at)} · {h.adminName}{h.reason ? ` · ${h.reason}` : ''}</Text>
                </View>
              ))
            )}
          </View>
          <Text className="px-1 text-[11px] leading-5 text-slate-400">سجلات المرضى لا تظهر للإدارة؛ يظهر عددها فقط.</Text>

          {suspending && (
            <Sheet
              title={`إيقاف ${file.name}`}
              onClose={() => setSuspending(false)}
              footer={
                <>
                  <Btn label="إلغاء" variant="secondary" onPress={() => setSuspending(false)} />
                  <Btn label="إيقاف الحساب" variant="danger" busy={busy} disabled={!reason.trim()} onPress={() => void act(() => setAccountStatusAction(uid, 'suspended', reason))} />
                </>
              }
            >
              <Text className="text-xs leading-5 text-slate-500">لن يستطيع الدخول، وتُخفى منتجاته وعروضه وإعلاناته، ولا يستقبل طلبات. لا تُحذف أي بيانات، وعند إعادة التفعيل يعود كل شيء.</Text>
              <Text className="text-xs font-bold text-slate-600">السبب (يظهر لصاحب الحساب)</Text>
              <TextInput value={reason} onChangeText={setReason} multiline autoFocus textAlignVertical="top" className={cn(fieldCls, 'min-h-[80px] py-2')} />
              <ErrorText>{error}</ErrorText>
            </Sheet>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ── Ads ──────────────────────────────────────────────────────── */

type AdItem = { id: string; collection: 'offers' | 'ads'; title: string; owner: string; description: string; image?: string; storagePath?: string; status: string; expiryDate?: string; rejectReason?: string };

function AdImage({ item }: { item: AdItem }) {
  const [url, setUrl] = useState(item.image ?? '');
  useEffect(() => {
    if (!item.storagePath) return;
    let live = true;
    getDownloadURL(ref(storage, item.storagePath)).then((u) => live && setUrl(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [item.storagePath]);
  return (
    <View className="items-center justify-center bg-slate-100" style={{ aspectRatio: 16 / 9 }}>
      {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} /> : <Megaphone size={30} color="#CBD5E1" />}
    </View>
  );
}

function AdsPage({ offers, generalAds, accounts }: { offers: Offer[]; generalAds: ReturnType<typeof useAllAds>['data']; accounts: AdminAccount[] }) {
  const [filter, setFilter] = useState('pending');
  const [dialog, setDialog] = useState<{ kind: 'approve' | 'reject'; item: AdItem } | null>(null);
  const [date, setDate] = useState(() => shortDate(30));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = new Map(accounts.map((a) => [a.docId, accountLabel(a)]));
  const items: AdItem[] = [
    ...offers.map((o): AdItem => ({ id: o.id, collection: 'offers', title: o.title, owner: names.get(o.supplierId) ?? '—', description: o.description, image: o.imageUrl, status: o.status ?? 'active', expiryDate: o.expiryDate, rejectReason: o.rejectReason })),
    ...(generalAds ?? []).map((a): AdItem => ({ id: a.id, collection: 'ads', title: a.title, owner: a.accountName || (names.get(a.accountId) ?? '—'), description: a.description, storagePath: a.images?.[0], status: a.status, expiryDate: a.expiryDate, rejectReason: a.rejectReason })),
  ];
  const count = (s: string) => items.filter((i) => i.status === s).length;
  const list = items.filter((i) => i.status === filter);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setDialog(null);
      setReason('');
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle title="الإعلانات" subtitle="العروض وإعلانات الحسابات قبل ظهورها للمستخدمين" />
      <Segments
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: 'بانتظار الموافقة', count: count('pending') },
          { value: 'active', label: 'نشطة', count: count('active') },
          { value: 'rejected', label: 'مرفوضة', count: count('rejected') },
          { value: 'expired', label: 'منتهية', count: count('expired') },
        ]}
      />
      {!dialog && <ErrorText>{error}</ErrorText>}
      {list.length === 0 ? (
        <Panel><Empty icon={Megaphone} title="لا توجد إعلانات هنا" /></Panel>
      ) : (
        list.map((o) => (
          <View key={`${o.collection}-${o.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <AdImage item={o} />
            <View className="p-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text numberOfLines={1} className="flex-1 text-sm font-extrabold text-slate-900">{o.title || 'بدون عنوان'}</Text>
                <Badge tone={o.collection === 'ads' ? 'violet' : 'blue'}>{o.collection === 'ads' ? 'إعلان' : 'عرض'}</Badge>
              </View>
              <Text numberOfLines={1} className="mt-0.5 text-xs text-slate-500">{o.owner}</Text>
              {!!o.description && <Text numberOfLines={2} className="mt-2 text-xs leading-5 text-slate-600">{o.description}</Text>}
              {!!o.expiryDate && o.status === 'active' && <Text className="mt-2 text-[11px] text-slate-400">حتى {o.expiryDate.slice(0, 10)}</Text>}
              {!!o.rejectReason && <View className="mt-2"><ErrorText>{o.rejectReason}</ErrorText></View>}
              <View className="mt-3 flex-row gap-2">
                {o.status === 'pending' && (
                  <>
                    <View className="flex-1"><Btn label="موافقة" icon={Check} onPress={() => { setError(''); setDialog({ kind: 'approve', item: o }); }} /></View>
                    <View className="flex-1"><Btn label="رفض" variant="secondary" icon={X} onPress={() => { setError(''); setDialog({ kind: 'reject', item: o }); }} /></View>
                  </>
                )}
                {o.status === 'active' && (
                  <View className="flex-1">
                    <Btn label="إيقاف الإعلان" variant="secondary" busy={busy} onPress={() => void run(() => adActionCall({ collection: o.collection, id: o.id, action: 'stop' }))} />
                  </View>
                )}
              </View>
            </View>
          </View>
        ))
      )}
      {dialog && (
        <Sheet
          title={dialog.kind === 'approve' ? 'الموافقة على الإعلان' : 'رفض الإعلان'}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Btn label="إلغاء" variant="secondary" onPress={() => setDialog(null)} />
              {dialog.kind === 'approve' ? (
                <Btn label="موافقة" busy={busy} onPress={() => void run(() => adActionCall({ collection: dialog.item.collection, id: dialog.item.id, action: 'approve', expiryDate: date }))} />
              ) : (
                <Btn label="رفض" variant="danger" busy={busy} disabled={!reason.trim()} onPress={() => void run(() => adActionCall({ collection: dialog.item.collection, id: dialog.item.id, action: 'reject', reason }))} />
              )}
            </>
          }
        >
          {dialog.kind === 'approve' ? (
            <>
              <Text className="text-xs font-bold text-slate-600">يظهر الإعلان حتى</Text>
              <Chips value={date} onChange={setDate} options={[{ value: shortDate(7), label: 'أسبوع' }, { value: shortDate(30), label: 'شهر' }, { value: shortDate(90), label: '3 أشهر' }]} />
              <TextInput value={date} onChangeText={(v) => setDate(v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="2027-01-31" placeholderTextColor="#94A3B8" className={cn(fieldCls, 'h-11')} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
            </>
          ) : (
            <>
              <Text className="text-xs font-bold text-slate-600">سبب الرفض (يظهر لصاحب الإعلان)</Text>
              <TextInput value={reason} onChangeText={setReason} multiline autoFocus textAlignVertical="top" className={cn(fieldCls, 'min-h-[80px] py-2')} />
            </>
          )}
          <ErrorText>{error}</ErrorText>
        </Sheet>
      )}
    </>
  );
}

/* ── Reports, audit, tools ────────────────────────────────────── */

function ReportsPage({ reports, accounts, onOpen }: { reports: Report[]; accounts: AdminAccount[]; onOpen: (uid: string) => void }) {
  const [filter, setFilter] = useState('open');
  const [error, setError] = useState('');
  const names = new Map(accounts.map((a) => [a.docId, accountLabel(a)]));
  const state = (r: Report) => r.status ?? 'open';
  const list = reports.filter((r) => state(r) === filter);
  const set = (id: string, status: 'reviewing' | 'resolved') => resolveReportAction(id, status).catch((err) => setError(adminErrorMessage(err)));
  return (
    <>
      <PageTitle title="البلاغات" subtitle="بلاغات المستخدمين من الرسائل" />
      <Segments value={filter} onChange={setFilter} options={Object.entries(REPORT_STATUS).map(([value, s]) => ({ value, label: s.label, count: reports.filter((r) => state(r) === value).length }))} />
      <ErrorText>{error}</ErrorText>
      <Panel>
        {list.length === 0 ? (
          <Empty icon={AlertTriangle} title="لا توجد بلاغات هنا" />
        ) : (
          list.map((r, i) => (
            <View key={r.id} className={cn('gap-2 px-4 py-4', i < list.length - 1 && 'border-b border-slate-100')}>
              <View className="flex-row items-center gap-2">
                <Badge tone={REPORT_STATUS[state(r)]?.tone}>{REPORT_STATUS[state(r)]?.label}</Badge>
                {!!r.createdAt && <Text className="text-xs text-slate-400">{r.createdAt.slice(0, 10)}</Text>}
              </View>
              <Text className="text-sm leading-6 text-slate-800">{r.reason || 'بدون تفاصيل'}</Text>
              <View className="flex-row flex-wrap items-center gap-1">
                <Text className="text-xs text-slate-500">من {names.get(r.reporterId ?? '') ?? '—'} على</Text>
                {r.reportedId ? (
                  <Pressable onPress={() => onOpen(r.reportedId as string)}>
                    <Text className="text-xs font-bold text-blue-700">{names.get(r.reportedId) ?? 'الحساب'}</Text>
                  </Pressable>
                ) : (
                  <Text className="text-xs text-slate-500">—</Text>
                )}
              </View>
              {state(r) !== 'resolved' && (
                <View className="flex-row gap-2">
                  {state(r) === 'open' && <View className="flex-1"><Btn small label="بدء المراجعة" variant="secondary" onPress={() => void set(r.id, 'reviewing')} /></View>}
                  <View className="flex-1"><Btn small label="تم الحل" icon={Check} onPress={() => void set(r.id, 'resolved')} /></View>
                </View>
              )}
            </View>
          ))
        )}
      </Panel>
    </>
  );
}

function AuditPage({ logs }: { logs: AdminLog[] }) {
  return (
    <>
      <PageTitle title="سجل الإجراءات" subtitle="كل إجراء إداري يكتبه السيرفر، ولا يمكن تعديله أو حذفه من اللوحة" />
      <Panel>
        {logs.length === 0 ? (
          <Empty icon={Activity} title="لا توجد إجراءات مسجلة بعد" />
        ) : (
          logs.map((l, i) => (
            <View key={l.id} className={cn('flex-row items-start gap-3 px-4 py-3.5', i < logs.length - 1 && 'border-b border-slate-100')}>
              <View className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-slate-800">{l.message}</Text>
                <Text className="mt-0.5 text-xs text-slate-500">{[l.adminName, l.targetName, l.reason, l.createdAt.slice(0, 10)].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
          ))
        )}
      </Panel>
    </>
  );
}

function ToolButton({ label, hint, fn, confirm, result }: { label: string; hint: string; fn: string; confirm?: string; result: (d: Record<string, number>) => string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error' | string>('idle');
  const run = async () => {
    setState('busy');
    try {
      const { data } = await httpsCallable<Record<string, never>, Record<string, number>>(getFunctions(app), fn)({});
      setState(result(data));
    } catch {
      setState('error');
    }
  };
  const press = () =>
    confirm
      ? Alert.alert(label, confirm, [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تنفيذ', style: 'destructive', onPress: () => void run() },
        ])
      : void run();
  return (
    <View className="gap-2 px-4 py-4">
      <Text className="text-sm font-bold text-slate-900">{label}</Text>
      <Text className="text-xs leading-5 text-slate-500">{hint}</Text>
      <Btn small variant="secondary" label={state === 'idle' || state === 'busy' ? 'تشغيل' : state === 'error' ? 'فشل، أعد المحاولة' : state} busy={state === 'busy'} onPress={press} />
    </View>
  );
}

function ToolsPage() {
  return (
    <>
      <PageTitle title="أدوات" subtitle="صيانة بيانات المنصة. إدارة المنتجات والفروع والمكاتب من لوحة الويب." />
      <Panel>
        <ToolButton
          label="مزامنة الملفات العامة"
          hint="تنشئ نسخة الملف العامة لكل حساب، ليظهر زر «زيارة الملف الشخصي» على منتجاته."
          fn="backfillPublicProfiles"
          result={(d) => `تمت مزامنة ${d.copied ?? 0} حساب`}
        />
        <View className="h-px bg-slate-100" />
        <ToolButton
          label="حذف بيانات الحسابات المحذوفة"
          hint="تحذف المنتجات والعروض والإعلانات التابعة لحسابات لم تعد موجودة."
          fn="cleanupOrphanedContent"
          confirm="حذف المنتجات والعروض والإعلانات التابعة لحسابات محذوفة؟ لا يمكن التراجع."
          result={(d) => `تم حذف ${d.removed ?? 0}`}
        />
      </Panel>
    </>
  );
}

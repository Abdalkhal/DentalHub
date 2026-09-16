import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { signOut } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage';
import { ShieldAlert } from 'lucide-react-native';

import { Screen, Card, Button, Spinner, Text } from '@/components/ui';
import {
  useAdminAccounts,
  useAdminOffers,
  approveAd,
  deactivateAd,
  approveGeneralAd,
  rejectGeneralAd,
  deactivateGeneralAd,
  setAccountStatus,
  extendSubscription,
} from '@/lib/adminPanel';
import { useAllAds } from '@/lib/adsStore';
import { useUserRole, useIsAdmin } from '@/lib/useAuth';
import { auth, storage } from '@/integrations/firebase/client';
import { CalendarPickerModal, toDateStr } from '@/components/CalendarPickerModal';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function AdThumb({ path }: { path?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    getDownloadURL(ref(storage, path))
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!url) return <View className="h-12 w-12 rounded-lg bg-slate-100" />;
  return <Image source={{ uri: url }} className="h-12 w-12 rounded-lg bg-slate-100" />;
}

export default function AdminScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { role } = useUserRole();
  // `role?.role === 'admin'` used to be the only gate on this screen — a
  // plain Firestore document field, self-writable until the rules fix, and
  // never actually cryptographically tied to the signed-in identity. This
  // checks the signed ID token's custom claim instead (same as the web
  // app's /admin-standalone), so the screen protects itself regardless of
  // how someone lands on it, not just when reached through the intended
  // path.
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { data: accounts = [] } = useAdminAccounts();
  const { data: offers = [] } = useAdminOffers();
  const { data: ads = [] } = useAllAds();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acctBusy, setAcctBusy] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  // Expiry date chosen per pending general ad, defaulting to +30 days —
  // picked before approval so the ad doesn't just run forever.
  const [expiryByAd, setExpiryByAd] = useState<Record<string, string>>({});
  const [pickingExpiryFor, setPickingExpiryFor] = useState<string | null>(null);
  const defaultExpiry = () => toDateStr(new Date(Date.now() + 30 * 24 * 3600 * 1000));
  const expiryFor = (adId: string) => expiryByAd[adId] ?? defaultExpiry();

  // All hooks above this line must run on every render — the two early
  // returns below (loading / not-authorized) have to come after them, not
  // before, or a render that takes one branch calls fewer hooks than one
  // that takes another.
  const filteredAccounts = useMemo(
    () => (typeFilter === 'all' ? accounts : accounts.filter((a) => a.accountType === typeFilter)),
    [accounts, typeFilter],
  );

  if (adminLoading) return <Spinner />;

  if (!isAdmin) {
    return (
      <Screen>
        <View className="items-center py-20">
          <ShieldAlert size={48} color="#F43F5E" strokeWidth={1.5} />
          <Text className="mt-4 text-base font-extrabold text-slate-800">
            {ar ? 'لا تملك صلاحية المدير' : 'You are not authorized as admin'}
          </Text>
          <Text className="mt-1.5 text-center text-xs text-slate-500">
            {ar ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم' : 'This account is not permitted to access the admin panel'}
          </Text>
          <Pressable
            onPress={() => signOut(auth)}
            className="mt-6 h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6"
          >
            <Text className="text-sm font-bold text-rose-600">{ar ? 'تسجيل الخروج' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const byType: Record<string, number> = {};
  for (const a of accounts) byType[a.accountType] = (byType[a.accountType] ?? 0) + 1;

  const pending = offers.filter((o) => o.status === 'pending');
  const active = offers.filter((o) => o.status === 'active');

  const generalPending = ads.filter((a) => a.status === 'pending');
  const generalActive = ads.filter((a) => a.status === 'active');

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const expiry = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      await approveAd(id, expiry, role?.name ?? 'admin');
    } finally {
      setBusyId(null);
    }
  };

  const deactivate = async (id: string) => {
    setBusyId(id);
    try {
      await deactivateAd(id, role?.name ?? 'admin');
    } finally {
      setBusyId(null);
    }
  };

  const approveGeneral = async (id: string) => {
    setBusyId(id);
    try {
      await approveGeneralAd(id, expiryFor(id), role?.name ?? 'admin');
    } finally {
      setBusyId(null);
    }
  };

  const rejectGeneral = async (id: string) => {
    setBusyId(id);
    try {
      await rejectGeneralAd(id, ar ? 'لا يتوافق مع سياسات المحتوى' : "Doesn't meet content policy", role?.name ?? 'admin');
    } finally {
      setBusyId(null);
    }
  };

  const deactivateGeneral = async (id: string) => {
    setBusyId(id);
    try {
      await deactivateGeneralAd(id, role?.name ?? 'admin');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">{ar ? 'لوحة الإدارة' : 'Admin'}</Text>

      <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
        <Card className="w-[48%] items-center py-5">
          <Text className="text-2xl font-extrabold text-primary">{accounts.length}</Text>
          <Text className="mt-1 text-xs text-slate-500">{ar ? 'الحسابات' : 'Accounts'}</Text>
        </Card>
        <Card className="w-[48%] items-center py-5">
          <Text className="text-2xl font-extrabold text-primary">{offers.length}</Text>
          <Text className="mt-1 text-xs text-slate-500">{ar ? 'الإعلانات' : 'Ads'}</Text>
        </Card>
      </View>

      <Card className="mt-4">
        <Text className="text-xs font-bold text-slate-500">{ar ? 'الحسابات حسب الفئة' : 'By type'}</Text>
        <View className="mt-2 space-y-1.5">
          {Object.entries(byType).map(([type, n]) => (
            <View key={type} className="flex-row items-center justify-between">
              <Text className="text-sm text-slate-700">{type}</Text>
              <Text className="text-sm font-bold">{n}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text className="mt-5 text-sm font-bold text-slate-600">
        {ar ? 'الإعلانات قيد المراجعة' : 'Pending ads'} ({pending.length})
      </Text>
      {pending.map((o) => (
        <Card key={o.id} className="mt-2 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-sm font-bold" numberOfLines={1}>{o.title || '—'}</Text>
            <Text className="text-[11px] text-slate-400">{o.supplierId.slice(0, 8)}…</Text>
          </View>
          <Button
            size="sm"
            title={ar ? 'اعتماد' : 'Approve'}
            loading={busyId === o.id}
            onPress={() => approve(o.id)}
          />
        </Card>
      ))}

      <Text className="mt-5 text-sm font-bold text-slate-600">
        {ar ? 'الإعلانات النشطة' : 'Active ads'} ({active.length})
      </Text>
      {active.map((o) => (
        <Card key={o.id} className="mt-2 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-sm font-bold" numberOfLines={1}>{o.title || '—'}</Text>
            <Text className="text-[11px] text-slate-400">{o.supplierId.slice(0, 8)}…</Text>
          </View>
          <Button
            size="sm"
            variant="outline"
            title={ar ? 'إيقاف' : 'Stop'}
            loading={busyId === o.id}
            onPress={() => deactivate(o.id)}
          />
        </Card>
      ))}

      {/* General "إعلاناتي" ads — separate feature from the dentist-only
          `offers` above; shown to all account types on the dentist home banner. */}
      <Text className="mt-5 text-sm font-bold text-slate-600">
        {ar ? 'إعلانات عامة قيد المراجعة' : 'General ads pending review'} ({generalPending.length})
      </Text>
      {generalPending.map((a) => (
        <Card key={a.id} className="mt-2 gap-3">
          <View className="flex-row items-center gap-3">
            <AdThumb path={a.images[0]} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold" numberOfLines={1}>{a.title || '—'}</Text>
              <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                {a.accountName} · {a.accountType}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setPickingExpiryFor(a.id)}
            className="h-10 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3"
          >
            <Text className="text-xs text-slate-500">{ar ? 'ينتهي الإعلان في' : 'Ad ends on'}</Text>
            <Text className="text-xs font-bold text-primary">{expiryFor(a.id)}</Text>
          </Pressable>
          <View className="flex-row gap-2">
            <Button size="sm" className="flex-1" title={ar ? 'اعتماد' : 'Approve'} loading={busyId === a.id} onPress={() => approveGeneral(a.id)} />
            <Button size="sm" variant="outline" className="flex-1" title={ar ? 'رفض' : 'Reject'} loading={busyId === a.id} onPress={() => rejectGeneral(a.id)} />
          </View>
        </Card>
      ))}

      <Text className="mt-5 text-sm font-bold text-slate-600">
        {ar ? 'إعلانات عامة نشطة' : 'General ads active'} ({generalActive.length})
      </Text>
      {generalActive.map((a) => (
        <Card key={a.id} className="mt-2 flex-row items-center gap-3">
          <AdThumb path={a.images[0]} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold" numberOfLines={1}>{a.title || '—'}</Text>
            <Text className="text-[11px] text-slate-400" numberOfLines={1}>
              {a.accountName} · {a.accountType}
            </Text>
            {!!a.expiryDate && (
              <Text className="text-[10px] text-slate-400">{ar ? 'ينتهي' : 'Ends'}: {a.expiryDate}</Text>
            )}
          </View>
          <Button
            size="sm"
            variant="outline"
            title={ar ? 'إيقاف' : 'Stop'}
            loading={busyId === a.id}
            onPress={() => deactivateGeneral(a.id)}
          />
        </Card>
      ))}

      {/* Accounts management */}
      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-600">
          {ar ? 'إدارة الحسابات' : 'Account management'} ({filteredAccounts.length})
        </Text>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {['all', 'dentist', 'supply', 'implant', 'lab'].map((t) => (
          <Pressable
            key={t}
            onPress={() => setTypeFilter(t)}
            className={cn(
              'h-8 items-center justify-center rounded-full border px-3',
              typeFilter === t ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
            )}
          >
            <Text className={cn('text-[11px] font-bold', typeFilter === t ? 'text-primary-foreground' : 'text-slate-600')}>
              {t === 'all' ? (ar ? 'الكل' : 'All') : t}
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredAccounts.length === 0 ? (
        <Text className="mt-8 text-center text-slate-400">{ar ? 'لا توجد حسابات' : 'No accounts'}</Text>
      ) : (
        <View className="mt-3 gap-2.5">
          {filteredAccounts.map((a) => {
            const suspended = a.accountStatus === 'suspended';
            const name = [a.name, a.surname].filter(Boolean).join(' ').trim() || '—';
            return (
              <Card key={a.docId} className="flex-row items-center gap-3">
                <View className={cn('h-10 w-10 items-center justify-center rounded-xl', suspended ? 'bg-slate-200' : 'bg-sky-100')}>
                  <Text className={cn('text-sm font-extrabold', suspended ? 'text-slate-400' : 'text-sky-700')}>
                    {name.charAt(0)}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>{name}</Text>
                  <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                    {a.accountType} · {a.city || '—'}
                    {suspended ? ' · ' + (ar ? 'موقوف' : 'suspended') : ''}
                  </Text>
                </View>
                <Button
                  size="sm"
                  variant={suspended ? 'primary' : 'outline'}
                  title={suspended ? (ar ? 'تفعيل' : 'Activate') : ar ? 'إيقاف' : 'Suspend'}
                  loading={acctBusy === a.docId}
                  onPress={() => {
                    setAcctBusy(a.docId);
                    setAccountStatus(a.docId, suspended ? 'active' : 'suspended', role?.name ?? 'admin')
                      .catch(() => {})
                      .finally(() => setAcctBusy(null));
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  title={ar ? '+3 شهور' : '+3 mo'}
                  onPress={() =>
                    Alert.alert(
                      ar ? 'تمديد الاشتراك' : 'Extend subscription',
                      ar ? `تمديد اشتراك ${name} لـ 3 أشهر؟` : `Extend ${name}'s subscription by 3 months?`,
                      [
                        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
                        {
                          text: ar ? 'تمديد' : 'Extend',
                          onPress: () =>
                            extendSubscription(a.docId, 3, role?.name ?? 'admin').catch(() => {}),
                        },
                      ],
                    )
                  }
                />
              </Card>
            );
          })}
        </View>
      )}

      <CalendarPickerModal
        visible={!!pickingExpiryFor}
        onClose={() => setPickingExpiryFor(null)}
        selectedDate={pickingExpiryFor ? expiryFor(pickingExpiryFor) : defaultExpiry()}
        onSelect={(ds) => {
          if (pickingExpiryFor) setExpiryByAd((prev) => ({ ...prev, [pickingExpiryFor]: ds }));
          setPickingExpiryFor(null);
        }}
      />
    </Screen>
  );
}

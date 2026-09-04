import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Screen, Card, Button, Text } from '@/components/ui';
import {
  useAdminAccounts,
  useAdminOffers,
  approveAd,
  deactivateAd,
  setAccountStatus,
  extendSubscription,
} from '@/lib/adminPanel';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function AdminScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { role } = useUserRole();
  const { data: accounts = [] } = useAdminAccounts();
  const { data: offers = [] } = useAdminOffers();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acctBusy, setAcctBusy] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredAccounts = useMemo(
    () => (typeFilter === 'all' ? accounts : accounts.filter((a) => a.accountType === typeFilter)),
    [accounts, typeFilter],
  );

  const byType: Record<string, number> = {};
  for (const a of accounts) byType[a.accountType] = (byType[a.accountType] ?? 0) + 1;

  const pending = offers.filter((o) => o.status === 'pending');
  const active = offers.filter((o) => o.status === 'active');

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
    </Screen>
  );
}

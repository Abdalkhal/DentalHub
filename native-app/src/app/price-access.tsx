import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Lock, UserPlus, Users, X } from 'lucide-react-native';

import { Input, Screen, Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useSession, useUserRole } from '@/lib/useAuth';
import { useOrders } from '@/lib/orders';
import { officeDoctors } from '@/lib/promo';
import { productsQueryKey } from '@/lib/products';
import {
  decidePriceAccess,
  grantPriceAccess,
  officePriceAccessKey,
  revokePriceAccess,
  setPricesHidden,
  useOfficePriceAccess,
  type PriceAccess,
} from '@/lib/priceAccess';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TEAL = '#0E6E66';

export default function PriceAccessScreen() {
  const { role, loading } = useUserRole();
  if (loading) return <Screen><ActivityIndicator className="py-12" color={TEAL} /></Screen>;
  if (role?.accountType !== 'supply' && role?.accountType !== 'implant') return <Redirect href="/" />;
  return <PriceAccessManager />;
}

function PriceAccessManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const uid = user?.uid;
  const qc = useQueryClient();
  const officeName = role?.name || '';
  const hidden = role?.pricesHidden === true;
  const [switching, setSwitching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { data: list = [], isLoading } = useOfficePriceAccess(uid);
  const { data: orders = [] } = useOrders(uid);

  const pending = list.filter((a) => a.status === 'pending');
  const approved = list.filter((a) => a.status === 'approved');
  const known = useMemo(() => new Set(list.filter((a) => a.status !== 'declined').map((a) => a.doctorId)), [list]);
  const q = search.trim().toLowerCase();
  const others = officeDoctors(orders)
    .filter((d) => !known.has(d.id))
    .filter((d) => !q || d.name.toLowerCase().includes(q));

  const refresh = () => qc.invalidateQueries({ queryKey: officePriceAccessKey(uid) });

  const toggle = (next: boolean) => {
    Alert.alert(
      next ? (ar ? 'إخفاء الأسعار' : 'Hide prices') : ar ? 'إظهار الأسعار للجميع' : 'Show prices to everyone',
      next
        ? ar
          ? 'لن يرى أسعارك إلا الأطباء الذين تعتمدهم. باقي الأطباء يرون زر «اطلب السعر».'
          : 'Only doctors you approve will see your prices. Others see "Request price".'
        : ar
          ? 'ستظهر أسعارك لكل الأطباء مرة أخرى.'
          : 'Your prices will show to every doctor again.',
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: ar ? 'تأكيد' : 'Confirm',
          onPress: async () => {
            setSwitching(true);
            try {
              await setPricesHidden(next);
              await qc.invalidateQueries({ queryKey: productsQueryKey });
              toast.success(next ? (ar ? 'أصبحت أسعارك للمعتمدين فقط' : 'Prices are now for approved doctors') : ar ? 'أسعارك ظاهرة للجميع' : 'Prices show to everyone');
            } catch {
              toast.error(ar ? 'تعذّر تغيير الإعداد' : "Couldn't change the setting");
            } finally {
              setSwitching(false);
            }
          },
        },
      ],
    );
  };

  const act = async (key: string, run: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await run();
      await refresh();
      toast.success(done);
    } catch {
      toast.error(ar ? 'تعذّر الحفظ' : "Couldn't save");
    } finally {
      setBusy(null);
    }
  };

  const nameOf = (a: Pick<PriceAccess, 'doctorName'>) => a.doctorName || (ar ? 'طبيب' : 'Doctor');

  return (
    <Screen>
      <View className="rounded-2xl border border-slate-100 bg-white p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Lock size={18} color={TEAL} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-extrabold text-slate-800">
              {ar ? 'الأسعار للأطباء المعتمدين فقط' : 'Prices for approved doctors only'}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {hidden
                ? ar ? 'مفعّل: باقي الأطباء يرون «اطلب السعر»' : 'On: other doctors see "Request price"'
                : ar ? 'متوقف: أسعارك ظاهرة لكل الأطباء' : 'Off: every doctor sees your prices'}
            </Text>
          </View>
          {switching ? (
            <ActivityIndicator color={TEAL} />
          ) : (
            <Switch
              accessibilityLabel={ar ? 'الأسعار للأطباء المعتمدين فقط' : 'Prices for approved doctors only'}
              value={hidden}
              onValueChange={toggle}
              trackColor={{ true: TEAL }}
            />
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator className="py-12" color={TEAL} />
      ) : (
        <>
          {pending.length > 0 && (
            <Section title={ar ? `طلبات جديدة (${pending.length})` : `New requests (${pending.length})`}>
              {pending.map((a) => (
                <Row key={a.id} name={nameOf(a)} hint={ar ? 'يطلب رؤية أسعارك' : 'Asks to see your prices'}>
                  <IconButton
                    label={ar ? 'رفض' : 'Decline'}
                    busy={busy === `d${a.doctorId}`}
                    tone="plain"
                    onPress={() => act(`d${a.doctorId}`, () => decidePriceAccess(a.doctorId, false, officeName, ar), ar ? 'تم الرفض' : 'Declined')}
                  >
                    <X size={16} color="#64748B" />
                  </IconButton>
                  <IconButton
                    label={ar ? 'اعتماد' : 'Approve'}
                    busy={busy === `a${a.doctorId}`}
                    onPress={() => act(`a${a.doctorId}`, () => decidePriceAccess(a.doctorId, true, officeName, ar), ar ? 'تم الاعتماد' : 'Approved')}
                  >
                    <Check size={16} color="#FFFFFF" />
                  </IconButton>
                </Row>
              ))}
            </Section>
          )}

          <Section title={ar ? `الأطباء المعتمدون (${approved.length})` : `Approved doctors (${approved.length})`}>
            {approved.length === 0 ? (
              <Text className="py-2 text-xs text-slate-400">
                {ar ? 'لا يوجد أطباء معتمدون بعد.' : 'No approved doctors yet.'}
              </Text>
            ) : (
              approved.map((a) => (
                <Row key={a.id} name={nameOf(a)} hint={ar ? 'يرى أسعارك' : 'Sees your prices'}>
                  <Pressable
                    disabled={busy === `r${a.doctorId}`}
                    onPress={() =>
                      Alert.alert(ar ? 'سحب الاعتماد' : 'Remove approval', nameOf(a), [
                        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
                        {
                          text: ar ? 'سحب' : 'Remove',
                          style: 'destructive',
                          onPress: () => act(`r${a.doctorId}`, () => revokePriceAccess(a.doctorId), ar ? 'تم سحب الاعتماد' : 'Removed'),
                        },
                      ])
                    }
                    className="rounded-xl px-3 py-2 active:opacity-60"
                  >
                    <Text className="text-xs font-bold text-rose-600">{ar ? 'سحب' : 'Remove'}</Text>
                  </Pressable>
                </Row>
              ))
            )}
          </Section>

          <Section title={ar ? 'اعتماد طبيب تعرفه' : 'Approve a doctor you know'}>
            <Text className="mb-2 text-xs text-slate-400">
              {ar ? 'الأطباء الذين طلبوا من مكتبك سابقاً.' : 'Doctors who have ordered from you.'}
            </Text>
            <Input value={search} onChangeText={setSearch} placeholder={ar ? 'ابحث عن طبيب' : 'Search doctors'} />
            {others.length === 0 ? (
              <View className="items-center py-6">
                <Users size={32} color="#CBD5E1" />
                <Text className="mt-2 text-xs text-slate-400">{ar ? 'لا يوجد أطباء آخرون' : 'No other doctors'}</Text>
              </View>
            ) : (
              others.map((d) => (
                <Row key={d.id} name={d.name || (ar ? 'طبيب' : 'Doctor')}>
                  <IconButton
                    label={ar ? 'اعتماد' : 'Approve'}
                    busy={busy === `g${d.id}`}
                    onPress={() => act(`g${d.id}`, () => grantPriceAccess(d.id, d.name, officeName, ar), ar ? 'تم الاعتماد' : 'Approved')}
                  >
                    <UserPlus size={16} color="#FFFFFF" />
                  </IconButton>
                </Row>
              ))
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm font-extrabold text-slate-700">{title}</Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function Row({ name, hint, children }: { name: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-bold text-slate-800">{name}</Text>
        {!!hint && <Text className="mt-0.5 text-[11px] text-slate-400">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function IconButton({
  label,
  busy,
  tone = 'primary',
  onPress,
  children,
}: {
  label: string;
  busy: boolean;
  tone?: 'primary' | 'plain';
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      className={cn('h-10 w-10 items-center justify-center rounded-xl active:opacity-70', tone === 'plain' && 'bg-slate-100')}
      style={tone === 'primary' ? { backgroundColor: TEAL } : undefined}
    >
      {busy ? <ActivityIndicator color={tone === 'primary' ? '#FFFFFF' : TEAL} /> : children}
    </Pressable>
  );
}

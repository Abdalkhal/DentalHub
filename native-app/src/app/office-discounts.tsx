import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CheckSquare, Pencil, Plus, RefreshCw, Share2, Square, TicketPercent, Trash2, Users, X } from 'lucide-react-native';

import { Input, Screen, Select, Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useSession, useUserRole } from '@/lib/useAuth';
import { useProductsByCompany } from '@/lib/products';
import { useOrders } from '@/lib/orders';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  deletePromoCode,
  discountErrorMessage,
  doctorDiscountsKey,
  emptyPromoForm,
  generatePromoCode,
  officeDoctors,
  promoCodesKey,
  promoFormError,
  promoReport,
  promoShareText,
  promoState,
  promoSummary,
  promoToForm,
  savePromoCode,
  setDoctorDiscount,
  useOfficeDoctorDiscounts,
  useOfficePromoCodes,
  type PromoCode,
  type PromoForm,
} from '@/lib/promo';

const TEAL = '#0E6E66';

function warnBelowCost(names: string[], ar: boolean) {
  if (names.length === 0) return;
  Alert.alert(
    ar ? 'تنبيه' : 'Heads up',
    ar
      ? `هذا الخصم يجعل البيع أقل من سعر الشراء في: ${names.join('، ')}`
      : `This sells below cost on: ${names.join(', ')}`,
  );
}

export default function OfficeDiscountsScreen() {
  const { role, loading } = useUserRole();
  if (loading) return <Screen><ActivityIndicator className="py-12" color={TEAL} /></Screen>;
  if (role?.accountType !== 'supply' && role?.accountType !== 'implant') return <Redirect href="/" />;
  return <OfficeDiscounts />;
}

function OfficeDiscounts() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [tab, setTab] = useState<'codes' | 'doctors'>('codes');
  return (
    <Screen>
      <View className="flex-row gap-1 rounded-2xl bg-slate-100 p-1">
        {(
          [
            { key: 'codes', label: ar ? 'أكواد الخصم' : 'Codes', Icon: TicketPercent },
            { key: 'doctors', label: ar ? 'خصم الأطباء' : 'Doctors', Icon: Users },
          ] as const
        ).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={cn('h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', tab === t.key && 'bg-white')}
          >
            <t.Icon size={16} color={tab === t.key ? TEAL : '#64748B'} />
            <Text className={cn('text-sm font-bold', tab === t.key ? 'text-[#0E6E66]' : 'text-slate-500')}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text className="mt-3 text-xs leading-5 text-slate-500">
        {ar
          ? 'خصم الكمية يُضبط من صفحة كل منتج ويُطبق تلقائياً. بعده يطبَّق الأكبر من خصم الطبيب أو الكود، ولا يجتمعان.'
          : "Quantity discounts are set on each product and apply by themselves. After that the larger of the doctor's discount or the code applies, never both."}
      </Text>
      <View className="mt-4">{tab === 'codes' ? <CodesTab /> : <DoctorsTab />}</View>
    </Screen>
  );
}

function CodesTab() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const { data: codes = [], isLoading } = useOfficePromoCodes(uid);
  const [editing, setEditing] = useState<{ form: PromoForm; isNew: boolean } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: promoCodesKey(uid) });

  const toggle = async (p: PromoCode) => {
    try {
      await savePromoCode({ ...promoToForm(p), active: !p.active }, true);
      refresh();
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    }
  };
  const remove = (p: PromoCode) => {
    Alert.alert(
      ar ? `حذف الكود ${p.code}؟` : `Delete ${p.code}?`,
      ar ? 'الطلبات السابقة تبقى كما هي.' : 'Past orders stay as they are.',
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: ar ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePromoCode(p.id);
              refresh();
            } catch (e) {
              toast.error(discountErrorMessage(e, ar));
            }
          },
        },
      ],
    );
  };

  if (editing) {
    return (
      <PromoFormView
        initial={editing.form}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => setEditing({ form: { ...emptyPromoForm(), code: generatePromoCode() }, isNew: true })}
        className="h-12 flex-row items-center justify-center gap-2 rounded-2xl"
        style={{ backgroundColor: TEAL }}
      >
        <Plus size={16} color="#FFFFFF" />
        <Text className="text-sm font-bold text-white">{ar ? 'كود خصم جديد' : 'New code'}</Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator className="py-12" color={TEAL} />
      ) : codes.length === 0 ? (
        <View className="items-center py-12">
          <TicketPercent size={40} color="#CBD5E1" />
          <Text className="mt-2 text-sm font-bold text-slate-500">{ar ? 'لا توجد أكواد بعد' : 'No codes yet'}</Text>
        </View>
      ) : (
        codes.map((p) => {
          const state = promoState(p, ar);
          return (
            <View key={p.id} className="rounded-2xl border border-slate-100 bg-white p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-extrabold text-slate-800" style={{ writingDirection: 'ltr', textAlign: 'auto' }}>
                    {p.code}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">{promoSummary(p, ar)}</Text>
                  <Text className="mt-1 text-[11px] text-slate-400">{promoReport(p, ar)}</Text>
                </View>
                <View className={cn('shrink-0 rounded-full px-2.5 py-1', state.live ? 'bg-emerald-50' : 'bg-slate-100')}>
                  <Text className={cn('text-[10px] font-bold', state.live ? 'text-emerald-700' : 'text-slate-500')}>{state.label}</Text>
                </View>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2 border-t border-slate-50 pt-3">
                <SmallButton
                  Icon={Share2}
                  label={ar ? 'مشاركة' : 'Share'}
                  onPress={() => Share.share({ message: promoShareText(p, role?.name || '', ar) }).catch(() => {})}
                />
                <SmallButton Icon={Pencil} label={ar ? 'تعديل' : 'Edit'} onPress={() => setEditing({ form: promoToForm(p), isNew: false })} />
                <SmallButton
                  Icon={p.active ? X : Check}
                  label={p.active ? (ar ? 'تعطيل' : 'Turn off') : ar ? 'تفعيل' : 'Turn on'}
                  onPress={() => toggle(p)}
                />
                <SmallButton Icon={Trash2} label={ar ? 'حذف' : 'Delete'} danger onPress={() => remove(p)} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function SmallButton({ Icon, label, onPress, danger }: { Icon: typeof Share2; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('h-8 flex-row items-center gap-1 rounded-lg border px-2.5', danger ? 'border-rose-100' : 'border-slate-200')}
    >
      <Icon size={14} color={danger ? '#E11D48' : '#475569'} />
      <Text className={cn('text-xs font-bold', danger ? 'text-rose-600' : 'text-slate-600')}>{label}</Text>
    </Pressable>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('h-9 justify-center rounded-xl border px-3', active ? 'border-[#0E6E66] bg-[#0E6E66]' : 'border-slate-200 bg-white')}
    >
      <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-600')}>{label}</Text>
    </Pressable>
  );
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <View className="mb-1.5">
      <Text className="text-xs font-bold text-slate-600">{text}</Text>
      {!!hint && <Text className="mt-0.5 text-[11px] text-slate-400">{hint}</Text>}
    </View>
  );
}

function CheckRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-2.5 border-b border-slate-50 px-3 py-2.5">
      {checked ? <CheckSquare size={18} color={TEAL} /> : <Square size={18} color="#94A3B8" />}
      <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-slate-700">
        {label}
      </Text>
    </Pressable>
  );
}

const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function PromoFormView({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: PromoForm;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const uid = user?.uid;
  const [f, setF] = useState<PromoForm>(initial);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const set = (patch: Partial<PromoForm>) => setF((x) => ({ ...x, ...patch }));

  const { data: mine = [] } = useProductsByCompany(uid);
  const branches = useMemo(() => [...new Set(mine.map((p) => p.branch).filter(Boolean))], [mine]);
  const shownProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mine.filter((p) => !q || `${p.ar} ${p.en}`.toLowerCase().includes(q)).slice(0, 30);
  }, [mine, search]);
  const { data: orders = [] } = useOrders(uid);
  const { data: discounts = [] } = useOfficeDoctorDiscounts(uid);
  const doctors = useMemo(() => officeDoctors(orders, discounts), [orders, discounts]);
  const [forSome, setForSome] = useState(initial.doctorIds.length > 0);

  const submit = async () => {
    const payload = { ...f, doctorIds: forSome ? f.doctorIds : [] };
    const problem = promoFormError(payload, ar);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const res = await savePromoCode(payload, !isNew);
      toast.success(ar ? 'تم حفظ الكود' : 'Code saved');
      warnBelowCost(res.belowCost, ar);
      onSaved();
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    } finally {
      setSaving(false);
    }
  };

  const numberField = (key: 'minSubtotal' | 'minQuantity' | 'maxUses' | 'maxUsesPerDoctor', label: string, hint?: string) => (
    <View className="min-w-[45%] flex-1">
      <Label text={label} hint={hint} />
      <Input keyboardType="numeric" value={f[key]} onChangeText={(v) => set({ [key]: v } as Partial<PromoForm>)} />
    </View>
  );

  return (
    <View className="gap-4 rounded-2xl border border-slate-100 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-slate-800">{isNew ? (ar ? 'كود خصم جديد' : 'New code') : ar ? 'تعديل الكود' : 'Edit code'}</Text>
        <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <X size={16} color="#64748B" />
        </Pressable>
      </View>

      <View>
        <Label text={ar ? 'الكود' : 'Code'} />
        <View className="flex-row gap-2">
          <Input
            className="flex-1"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={isNew}
            value={f.code}
            onChangeText={(v) => set({ code: v.toUpperCase() })}
          />
          {isNew && (
            <Pressable
              accessibilityLabel={ar ? 'توليد كود' : 'Generate'}
              onPress={() => set({ code: generatePromoCode() })}
              className="h-11 w-11 items-center justify-center rounded-xl border border-slate-200"
            >
              <RefreshCw size={16} color="#64748B" />
            </Pressable>
          )}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Label text={ar ? 'نوع الخصم' : 'Type'} />
          <Select
            value={f.type}
            onChange={(v) => set({ type: v as PromoForm['type'] })}
            options={[
              { value: 'percent', label: ar ? 'نسبة مئوية' : 'Percentage' },
              { value: 'fixed', label: ar ? 'مبلغ ثابت' : 'Fixed amount' },
            ]}
          />
        </View>
        <View className="flex-1">
          <Label text={f.type === 'percent' ? (ar ? 'النسبة %' : 'Percent') : ar ? 'المبلغ' : 'Amount'} />
          <Input keyboardType="numeric" value={f.value} onChangeText={(v) => set({ value: v })} />
        </View>
      </View>

      <View>
        <Label
          text={ar ? 'العملة' : 'Currency'}
          hint={
            f.type === 'percent'
              ? ar
                ? 'النسبة تُطبق على الدولار والدينار. العملة هنا للحد الأدنى للشراء فقط.'
                : 'A percentage applies to both currencies; this is only for the minimum purchase.'
              : undefined
          }
        />
        <Select
          value={f.currency}
          onChange={(v) => set({ currency: v as PromoForm['currency'] })}
          options={[
            { value: 'USD', label: ar ? 'دولار' : 'USD' },
            { value: 'IQD', label: ar ? 'دينار' : 'IQD' },
          ]}
        />
      </View>

      <View>
        <Label text={ar ? 'يشمل' : 'Covers'} />
        <View className="flex-row flex-wrap gap-2">
          <Chip active={f.scope === 'office'} label={ar ? 'كل منتجاتي' : 'All my products'} onPress={() => set({ scope: 'office' })} />
          <Chip active={f.scope === 'products'} label={ar ? 'منتجات محددة' : 'Some products'} onPress={() => set({ scope: 'products' })} />
          <Chip active={f.scope === 'branch'} label={ar ? 'قسم معين' : 'A section'} onPress={() => set({ scope: 'branch' })} />
        </View>
        {f.scope === 'products' && (
          <View className="mt-3 gap-2">
            <Input value={search} onChangeText={setSearch} placeholder={ar ? 'ابحث عن منتج' : 'Search products'} />
            <View className="overflow-hidden rounded-xl border border-slate-100">
              {shownProducts.map((p) => (
                <CheckRow
                  key={p.id}
                  checked={f.productIds.includes(p.id)}
                  label={ar ? p.ar || p.en : p.en || p.ar}
                  onPress={() => set({ productIds: toggled(f.productIds, p.id) })}
                />
              ))}
              {shownProducts.length === 0 && (
                <Text className="px-3 py-4 text-center text-xs text-slate-400">{ar ? 'لا توجد منتجات' : 'No products'}</Text>
              )}
            </View>
          </View>
        )}
        {f.scope === 'branch' && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {branches.map((b) => (
              <Chip key={b} active={f.branches.includes(b)} label={b} onPress={() => set({ branches: toggled(f.branches, b) })} />
            ))}
            {branches.length === 0 && <Text className="text-xs text-slate-400">{ar ? 'لا توجد أقسام' : 'No sections'}</Text>}
          </View>
        )}
      </View>

      <View>
        <Label text={ar ? 'لمن' : 'For'} />
        <View className="flex-row flex-wrap gap-2">
          <Chip active={!forSome} label={ar ? 'كل الأطباء' : 'All doctors'} onPress={() => setForSome(false)} />
          <Chip active={forSome} label={ar ? 'أطباء محددون' : 'Some doctors'} onPress={() => setForSome(true)} />
        </View>
        {forSome && (
          <View className="mt-3">
            <View className="overflow-hidden rounded-xl border border-slate-100">
              {doctors.map((d) => (
                <CheckRow
                  key={d.id}
                  checked={f.doctorIds.includes(d.id)}
                  label={d.name || (ar ? 'طبيب' : 'Doctor')}
                  onPress={() => set({ doctorIds: toggled(f.doctorIds, d.id) })}
                />
              ))}
              {doctors.length === 0 && (
                <Text className="px-3 py-4 text-center text-xs text-slate-400">
                  {ar ? 'يظهر هنا الأطباء الذين طلبوا من مكتبك' : 'Doctors who have ordered from you appear here'}
                </Text>
              )}
            </View>
            <Text className="mt-1 text-[11px] text-slate-400">{ar ? 'يصلهم إشعار بالكود عند الحفظ.' : 'They get a notification when you save.'}</Text>
          </View>
        )}
      </View>

      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[45%] flex-1">
          <Label text={ar ? 'من تاريخ (اختياري)' : 'From (optional)'} />
          <Input value={f.startDate} placeholder="2026-12-01" keyboardType="numbers-and-punctuation" onChangeText={(v) => set({ startDate: v.trim() })} />
        </View>
        <View className="min-w-[45%] flex-1">
          <Label text={ar ? 'إلى تاريخ (اختياري)' : 'Until (optional)'} />
          <Input value={f.endDate} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" onChangeText={(v) => set({ endDate: v.trim() })} />
        </View>
        {numberField('minSubtotal', ar ? 'حد أدنى للشراء' : 'Min. purchase')}
        {numberField('minQuantity', ar ? 'حد أدنى للكمية' : 'Min. quantity')}
        {numberField('maxUses', ar ? 'عدد الاستخدامات الكلي' : 'Total uses', ar ? 'فارغ يعني بلا حد' : 'Empty means no limit')}
        {numberField('maxUsesPerDoctor', ar ? 'استخدامات لكل طبيب' : 'Uses per doctor', ar ? 'فارغ يعني بلا حد' : 'Empty means no limit')}
      </View>

      <Pressable
        onPress={submit}
        disabled={saving}
        className={cn('h-12 flex-row items-center justify-center gap-2 rounded-2xl', saving && 'opacity-60')}
        style={{ backgroundColor: TEAL }}
      >
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Check size={16} color="#FFFFFF" />}
        <Text className="text-sm font-bold text-white">{ar ? 'حفظ الكود' : 'Save code'}</Text>
      </Pressable>
    </View>
  );
}

function DoctorsTab() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const { data: discounts = [], isLoading } = useOfficeDoctorDiscounts(uid);
  const { data: orders = [] } = useOrders(uid);
  const doctors = useMemo(() => officeDoctors(orders, discounts), [orders, discounts]);
  const pctOf = useMemo(() => new Map(discounts.map((d) => [d.doctorId, d.pct])), [discounts]);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (doctorId: string, pct: number) => {
    if (!(pct >= 0 && pct <= 100)) {
      toast.error(ar ? 'النسبة بين 0 و100' : 'Between 0 and 100');
      return;
    }
    setBusy(doctorId);
    try {
      const res = await setDoctorDiscount(doctorId, pct);
      toast.success(pct === 0 ? (ar ? 'أُزيل الخصم' : 'Removed') : ar ? 'تم حفظ الخصم' : 'Saved');
      warnBelowCost(res.belowCost, ar);
      setDrafts((d) => {
        const next = { ...d };
        delete next[doctorId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: doctorDiscountsKey(uid) });
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <ActivityIndicator className="py-12" color={TEAL} />;
  if (doctors.length === 0) {
    return (
      <View className="items-center px-6 py-12">
        <Users size={40} color="#CBD5E1" />
        <Text className="mt-2 text-sm font-bold text-slate-500">{ar ? 'لا يوجد أطباء بعد' : 'No doctors yet'}</Text>
        <Text className="mt-1 text-center text-xs text-slate-400">
          {ar ? 'يظهر هنا الأطباء الذين طلبوا من مكتبك.' : 'Doctors who have ordered from you appear here.'}
        </Text>
      </View>
    );
  }

  const q = search.trim().toLowerCase();
  const shown = doctors.filter((d) => !q || d.name.toLowerCase().includes(q));

  return (
    <View className="gap-3">
      <Input value={search} onChangeText={setSearch} placeholder={ar ? 'ابحث عن طبيب' : 'Search doctors'} />
      {shown.map((d) => {
        const current = pctOf.get(d.id) ?? 0;
        const draft = drafts[d.id];
        const value = draft ?? (current ? String(current) : '');
        const dirty = draft !== undefined && Number(draft || 0) !== current;
        return (
          <View key={d.id} className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                {d.name || (ar ? 'طبيب' : 'Doctor')}
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-400">
                {current ? (ar ? `خصم خاص ${current}%` : `Own discount ${current}%`) : ar ? 'بلا خصم خاص' : 'No own discount'}
              </Text>
            </View>
            <View className="h-10 w-20 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5">
              <TextInput
                accessibilityLabel={ar ? 'نسبة الخصم' : 'Discount percent'}
                keyboardType="numeric"
                value={value}
                onChangeText={(v) => setDrafts((x) => ({ ...x, [d.id]: v }))}
                className="min-w-0 flex-1 text-sm text-slate-800"
                style={{ writingDirection: 'ltr' }}
              />
              <Text className="text-xs text-slate-400">%</Text>
            </View>
            <Pressable
              disabled={!dirty || busy === d.id}
              accessibilityLabel={ar ? 'حفظ' : 'Save'}
              onPress={() => save(d.id, Number(draft || 0))}
              className={cn('h-10 w-10 items-center justify-center rounded-xl', (!dirty || busy === d.id) && 'opacity-30')}
              style={{ backgroundColor: TEAL }}
            >
              {busy === d.id ? <ActivityIndicator color="#FFFFFF" /> : <Check size={16} color="#FFFFFF" />}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

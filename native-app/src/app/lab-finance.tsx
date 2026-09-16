import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  Cog,
  DollarSign,
  FlaskConical,
  Lightbulb,
  Microscope,
  Pencil,
  Plus,
  ScrollText,
  Stethoscope,
  Syringe,
  Wallet,
  Wifi,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text, Input, Button } from '@/components/ui';
import { CalendarPickerModal, toDateStr } from '@/components/CalendarPickerModal';
import { db } from '@/integrations/firebase/client';
import { useOrders, connectLabOrders, disconnectLabOrders, formatOrderId, type Order } from '@/lib/ordersStore';
import { getStatusLabel, getStatusColor } from '@/lib/caseTracking';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn, normalizeName } from '@/lib/utils';

// Ported from the web app's finance.tsx — same `lab_finances/{labId}`
// document (payments + editable expense categories), and the same
// per-clinic billed/collected/remaining derived from completed orders.

type PaymentRecord = { id: string; clinic: string; amount: number; currency: 'USD' | 'IQD'; date: string };
type ExpenseItem = { label: string; amount: number };
type ExpenseCategory = { id: string; category: string; icon: string; items: ExpenseItem[] };
type LabFinanceDoc = { payments: PaymentRecord[]; expenses: ExpenseCategory[] };
type ClinicSummary = { name: string; billed: number; collected: number; remaining: number; orders: Order[] };

const DEFAULT_EXPENSES: ExpenseCategory[] = [
  {
    id: 'clinical',
    category: 'المواد السريرية',
    icon: 'Stethoscope',
    items: [
      { label: 'حشوات تجميلية', amount: 0 },
      { label: 'مواد تبييض', amount: 0 },
      { label: 'أدوات تعقيم', amount: 0 },
    ],
  },
  { id: 'cosmetic', category: 'مواد تجميلية', icon: 'FlaskConical', items: [{ label: 'مواد تجميلية عامة', amount: 0 }] },
  { id: 'whitening', category: 'مواد تبيض', icon: 'Lightbulb', items: [{ label: 'مواد تبييض الأسنان', amount: 0 }] },
  { id: 'sterilization', category: 'أدوات تعقيم', icon: 'Syringe', items: [{ label: 'مستلزمات تعقيم', amount: 0 }] },
  {
    id: 'lab',
    category: 'مواد المختبر',
    icon: 'Microscope',
    items: [
      { label: 'انطباعات رقمية', amount: 0 },
      { label: 'تيجان مؤقتة', amount: 0 },
    ],
  },
  {
    id: 'utilities',
    category: 'كهرباء / خدمات',
    icon: 'Cog',
    items: [
      { label: 'كهرباء', amount: 0 },
      { label: 'ماء', amount: 0 },
      { label: 'إنترنت', amount: 0 },
    ],
  },
];

const ICON_MAP: Record<string, LucideIcon> = { Stethoscope, FlaskConical, Syringe, Microscope, Cog, Lightbulb, Wifi, ScrollText, Wallet };

function fmt(n: number, ar: boolean): string {
  return `${n.toLocaleString()} ${ar ? 'د.ع' : 'IQD'}`;
}

function parseAmount(val: unknown): number {
  const n = Number(String(val ?? 0).replace(/[^0-9.-]+/g, ''));
  return isNaN(n) ? 0 : n;
}

export default function LabFinanceScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const userId = user?.uid ?? '';
  const orders = useOrders();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    connectLabOrders(userId);
    return () => disconnectLabOrders();
  }, [userId]);

  const { data: finDoc, isLoading: finLoading } = useQuery({
    queryKey: ['lab-finances', userId],
    queryFn: async (): Promise<LabFinanceDoc> => {
      if (!userId) return { payments: [], expenses: [] };
      const snap = await getDoc(doc(db, 'lab_finances', userId));
      if (snap.exists()) {
        const data = snap.data() as LabFinanceDoc;
        return {
          payments: data.payments ?? [],
          expenses: data.expenses?.length ? data.expenses : DEFAULT_EXPENSES.map((e) => ({ ...e, items: e.items.map((i) => ({ ...i })) })),
        };
      }
      return { payments: [], expenses: DEFAULT_EXPENSES.map((e) => ({ ...e, items: e.items.map((i) => ({ ...i })) })) };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const payments = useMemo(() => finDoc?.payments ?? [], [finDoc]);
  const expenses = useMemo(() => finDoc?.expenses ?? [], [finDoc]);

  const saveMutation = useMutation({
    mutationFn: async (data: LabFinanceDoc) => {
      if (!userId) return;
      await setDoc(doc(db, 'lab_finances', userId), data, { merge: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-finances', userId] }),
  });

  // Grouped (and payments matched) by `normalizeName`, not a raw string
  // comparison — the doctor name on a case is hand-typed at order time
  // (new-lab-order.tsx) and the clinic name on a logged payment is hand-typed
  // separately, so two entries meant for the same doctor can differ in
  // spacing/case/diacritics. A card is built from either side: a doctor can
  // have a payment logged before their first case exists (e.g. an advance),
  // so the list isn't limited to names seen on a case.
  const clinicSummaries: ClinicSummary[] = useMemo(() => {
    const byClinic = new Map<string, { name: string; orders: Order[] }>();
    for (const o of orders) {
      const key = normalizeName(o.doctor || '');
      if (!key) continue;
      const bucket = byClinic.get(key);
      if (bucket) bucket.orders.push(o);
      else byClinic.set(key, { name: o.doctor.trim(), orders: [o] });
    }
    for (const p of payments) {
      const key = normalizeName(p.clinic || '');
      if (!key || byClinic.has(key)) continue;
      byClinic.set(key, { name: p.clinic.trim(), orders: [] });
    }
    const results: ClinicSummary[] = [];
    for (const [key, { name, orders: clinicOrders }] of byClinic) {
      // Invoiced as soon as a case is placed and priced, regardless of
      // production status — a lab bills for work taken on, not just work
      // that has since been marked complete.
      const billed = clinicOrders.reduce((s, o) => s + parseAmount(o.totalAmount), 0);
      const collected = payments.filter((p) => normalizeName(p.clinic) === key).reduce((s, p) => s + parseAmount(p.amount), 0);
      results.push({ name, billed, collected, remaining: billed - collected, orders: clinicOrders });
    }
    return results;
  }, [orders, payments]);

  const totalInvoiced = useMemo(() => orders.reduce((s, o) => s + parseAmount(o.totalAmount), 0), [orders]);
  const totalCollected = useMemo(() => payments.reduce((s, p) => s + parseAmount(p.amount), 0), [payments]);
  const totalRemaining = totalInvoiced - totalCollected;
  const totalExpenses = useMemo(() => expenses.reduce((s, cat) => s + cat.items.reduce((a, i) => a + i.amount, 0), 0), [expenses]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [paymentClinic, setPaymentClinic] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'IQD'>('IQD');
  const [paymentDate, setPaymentDate] = useState(toDateStr(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [detailClinic, setDetailClinic] = useState<ClinicSummary | null>(null);

  const openPaymentModal = (clinic?: string) => {
    setPaymentClinic(clinic ?? '');
    setShowPaymentModal(true);
  };

  const handleAddPayment = () => {
    const amt = parseFloat(paymentAmount);
    if (!paymentClinic.trim() || !amt || amt <= 0) return;
    const newPayment: PaymentRecord = {
      id: Math.random().toString(36).slice(2, 10),
      clinic: paymentClinic.trim(),
      amount: amt,
      currency: paymentCurrency,
      date: paymentDate,
    };
    saveMutation.mutate({ payments: [...payments, newPayment], expenses });
    setPaymentClinic('');
    setPaymentAmount('');
    setPaymentCurrency('IQD');
    setPaymentDate(toDateStr(new Date()));
    setShowPaymentModal(false);
  };

  const handleExpenseItemChange = (catId: string, itemIdx: number, amount: number) => {
    const updated = expenses.map((cat) =>
      cat.id !== catId ? cat : { ...cat, items: cat.items.map((it, i) => (i === itemIdx ? { ...it, amount } : it)) },
    );
    saveMutation.mutate({ payments, expenses: updated });
  };

  return (
    <Screen>
      <View className="gap-4 pb-4">
        {/* Account summary */}
        <View className="gap-4 rounded-3xl border border-primary/10 bg-primary/5 p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <DollarSign size={18} color="#2563EB" />
              </View>
              <Text className="text-xs font-bold text-slate-500">{ar ? 'ملخص الحساب' : 'Account summary'}</Text>
            </View>
            <Pressable onPress={() => openPaymentModal()} className="flex-row items-center gap-1.5 rounded-xl bg-primary px-3 py-2">
              <Plus size={13} color="#FFFFFF" />
              <Text className="text-[11px] font-bold text-white">{ar ? 'تسجيل دفعة' : 'Log payment'}</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1 items-center rounded-2xl bg-white/80 p-3">
              <Text className="mb-1 text-center text-[11px] font-bold text-slate-700">{ar ? 'المبالغ المفوترة' : 'Total invoiced'}</Text>
              <Text className="text-center text-xs font-extrabold text-slate-900">{fmt(totalInvoiced, ar)}</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl bg-emerald-50/80 p-3">
              <Text className="mb-1 text-center text-[11px] font-bold text-slate-700">{ar ? 'المستحصلة' : 'Collected'}</Text>
              <Text className="text-center text-xs font-extrabold text-emerald-700">{fmt(totalCollected, ar)}</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl bg-amber-50/80 p-3">
              <Text className="mb-1 text-center text-[11px] font-bold text-slate-700">{ar ? 'المتبقي' : 'Outstanding'}</Text>
              <Text className="text-center text-xs font-extrabold text-amber-700">{fmt(totalRemaining, ar)}</Text>
            </View>
          </View>
        </View>

        {/* Clinic billing */}
        <View>
          <Text className="mb-3 text-base font-extrabold text-slate-800">{ar ? 'فواتير العيادات' : 'Clinic billing'}</Text>
          {finLoading ? null : clinicSummaries.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-card py-8">
              <Text className="text-sm text-slate-400">
                {orders.length === 0
                  ? ar
                    ? 'لا توجد طلبات بعد — أضف طلبات لعرض فواتير العيادات'
                    : 'No orders yet — add orders to see clinic invoices'
                  : ar
                    ? 'لا توجد فواتير بعد'
                    : 'No invoices yet'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {clinicSummaries.map((clinic) => (
                <View key={clinic.name} className="rounded-2xl border border-slate-200 bg-card p-4">
                  <View className="mb-3 flex-row items-center gap-3">
                    <Pressable onPress={() => setDetailClinic(clinic)} className="min-w-0 flex-1 flex-row items-center gap-3">
                      <View className={cn('h-10 w-10 items-center justify-center rounded-xl', clinic.remaining <= 0 ? 'bg-emerald-50' : 'bg-amber-50')}>
                        {clinic.remaining <= 0 ? <CheckCircle2 size={18} color="#059669" /> : <Clock size={18} color="#D97706" />}
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-bold text-slate-800">{clinic.name}</Text>
                        <Text className="text-[10px] text-slate-400">
                          {ar ? `${clinic.orders.length} حالة · باقي: ${fmt(clinic.remaining, ar)}` : `${clinic.orders.length} cases · Remaining: ${fmt(clinic.remaining, ar)}`}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable onPress={() => openPaymentModal(clinic.name)} className="rounded-lg bg-primary/10 px-3 py-1.5">
                      <Text className="text-[11px] font-bold text-primary">{ar ? 'تسجيل دفعة' : 'Log payment'}</Text>
                    </Pressable>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1 items-center rounded-xl bg-slate-50 p-2">
                      <Text className="text-[11px] font-bold text-slate-700">{ar ? 'مفوترة' : 'Invoiced'}</Text>
                      <Text className="text-[11px] font-bold text-slate-800">{fmt(clinic.billed, ar)}</Text>
                    </View>
                    <View className="flex-1 items-center rounded-xl bg-emerald-50 p-2">
                      <Text className="text-[11px] font-bold text-slate-700">{ar ? 'مستحصلة' : 'Collected'}</Text>
                      <Text className="text-[11px] font-bold text-emerald-700">{fmt(clinic.collected, ar)}</Text>
                    </View>
                    <View className="flex-1 items-center rounded-xl bg-amber-50 p-2">
                      <Text className="text-[11px] font-bold text-slate-700">{ar ? 'متبقي' : 'Outstanding'}</Text>
                      <Text className="text-[11px] font-bold text-amber-700">{fmt(clinic.remaining, ar)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Operating expenses */}
        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-slate-800">{ar ? 'مصروفات تشغيلية' : 'Operating expenses'}</Text>
            <View className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-xs font-bold text-slate-500">
                {ar ? 'الإجمالي' : 'Total'}: {fmt(totalExpenses, ar)}
              </Text>
            </View>
          </View>
          <View className="gap-3">
            {expenses.map((cat) => {
              const catTotal = cat.items.reduce((s, i) => s + i.amount, 0);
              const Icon = ICON_MAP[cat.icon] ?? DollarSign;
              const isEditing = editingCat === cat.id;
              return (
                <View key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-card">
                  <Pressable
                    onPress={() => setEditingCat(isEditing ? null : cat.id)}
                    className="flex-row items-center gap-3 border-b border-slate-100 p-4"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <Icon size={16} color="#64748B" />
                    </View>
                    <Text className="flex-1 text-sm font-bold text-slate-800">{cat.category}</Text>
                    <Text className="text-sm font-extrabold text-slate-800">{fmt(catTotal, ar)}</Text>
                    <Pencil size={13} color={isEditing ? '#2563EB' : '#94A3B8'} />
                  </Pressable>
                  {isEditing && (
                    <View className="divide-y divide-slate-100">
                      {cat.items.map((item, idx) => (
                        <View key={idx} className="flex-row items-center justify-between gap-3 px-4 py-2.5">
                          <Text className="shrink-0 text-sm text-slate-500">{item.label}</Text>
                          <Input
                            value={item.amount ? String(item.amount) : ''}
                            onChangeText={(v) => handleExpenseItemChange(cat.id, idx, parseFloat(v) || 0)}
                            placeholder="0"
                            keyboardType="number-pad"
                            className="h-9 w-28"
                            style={{ writingDirection: 'ltr', textAlign: 'right', height: 36 }}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <View className="w-full gap-4 rounded-t-3xl bg-white p-5 pb-8">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-slate-900">{ar ? 'تسجيل دفعة جديدة' : 'Log new payment'}</Text>
              <Pressable onPress={() => setShowPaymentModal(false)} className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <X size={15} color="#64748B" />
              </Pressable>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-slate-500">{ar ? 'العيادة / الطبيب' : 'Clinic / Doctor'}</Text>
              <View className="flex-row flex-wrap gap-2">
                {clinicSummaries.map((c) => (
                  <Pressable
                    key={c.name}
                    onPress={() => setPaymentClinic(c.name)}
                    className={cn('rounded-xl border px-3 py-2', paymentClinic === c.name ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}
                  >
                    <Text className={cn('text-xs font-bold', paymentClinic === c.name ? 'text-primary' : 'text-slate-700')}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Input value={paymentClinic} onChangeText={setPaymentClinic} placeholder={ar ? 'أو أدخل اسم العيادة' : 'Or type a clinic name'} className="mt-1" />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-slate-500">{ar ? 'المبلغ' : 'Amount'}</Text>
              <View className="flex-row gap-2">
                <Input
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0"
                  keyboardType="number-pad"
                  className="flex-1"
                  style={{ writingDirection: 'ltr' }}
                />
                <View className="flex-row overflow-hidden rounded-xl border border-slate-200">
                  <Pressable onPress={() => setPaymentCurrency('USD')} className={cn('px-3.5 items-center justify-center', paymentCurrency === 'USD' ? 'bg-primary' : 'bg-white')}>
                    <Text className={cn('text-sm font-semibold', paymentCurrency === 'USD' ? 'text-white' : 'text-slate-500')}>$</Text>
                  </Pressable>
                  <Pressable onPress={() => setPaymentCurrency('IQD')} className={cn('px-3.5 items-center justify-center', paymentCurrency === 'IQD' ? 'bg-primary' : 'bg-white')}>
                    <Text className={cn('text-sm font-semibold', paymentCurrency === 'IQD' ? 'text-white' : 'text-slate-500')}>{ar ? 'د.ع' : 'IQD'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-slate-500">{ar ? 'التاريخ' : 'Date'}</Text>
              <Pressable onPress={() => setShowDatePicker(true)} className="h-11 justify-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                <Text className="text-sm font-medium text-slate-800">{paymentDate}</Text>
              </Pressable>
            </View>

            <Button title={ar ? 'حفظ الدفعة' : 'Save payment'} loading={saveMutation.isPending} onPress={handleAddPayment} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailClinic} transparent animationType="fade" onRequestClose={() => setDetailClinic(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[80%] w-full gap-3 rounded-t-3xl bg-white p-5 pb-8">
            <View className="flex-row items-center justify-between">
              <Text numberOfLines={1} className="flex-1 text-base font-extrabold text-slate-900">{detailClinic?.name}</Text>
              <Pressable onPress={() => setDetailClinic(null)} className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <X size={15} color="#64748B" />
              </Pressable>
            </View>
            <Text className="text-xs text-slate-400">
              {ar
                ? 'المفوترة والمستحصلة والمتبقي أعلاه هي مجموع كل حالات هذا الطبيب. الدفعات مسجَّلة للطبيب ككل وليست مربوطة بحالة معينة.'
                : "The invoiced/collected/remaining above are the sum of this doctor's cases. Payments are logged for the doctor as a whole, not tied to one specific case."}
            </Text>
            <ScrollView className="gap-2" contentContainerStyle={{ gap: 8 }}>
              {detailClinic?.orders.map((o) => (
                <View key={o.id} className="flex-row items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <View className={cn('h-2 w-2 rounded-full', getStatusColor(o.status))} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-xs font-bold text-slate-800">{o.patient || '—'}</Text>
                    <Text className="text-[10px] text-slate-400">
                      {formatOrderId(o)} · {getStatusLabel(o.status, ar ? 'ar' : 'en')}
                    </Text>
                  </View>
                  <Text className="text-xs font-extrabold text-slate-800">{fmt(parseAmount(o.totalAmount), ar)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CalendarPickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={paymentDate}
        onSelect={(ds) => {
          setPaymentDate(ds);
          setShowDatePicker(false);
        }}
      />
    </Screen>
  );
}

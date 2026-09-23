import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, View } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { Bone, FlaskConical, Hash, Package, ReceiptText, Share2 } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { CaseDetailModal } from '@/components/CaseDetailModal';
import { OfficialInvoiceView } from '@/components/OfficialInvoiceView';
import { db } from '@/integrations/firebase/client';
import { useSession } from '@/lib/useAuth';
import { useDentistCases, isCompletedStatus } from '@/lib/caseTracking';
import { useDentistInvoices } from '@/lib/invoices';
import { resolveOrderTotal } from '@/lib/orderLines';
import type { Order } from '@/lib/ordersStore';
import type { UserRoleDoc, InvoiceDoc } from '@/integrations/firebase/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Faithful port of the web dentist "الفواتير" page (src/routes/invoices.
// index.tsx): completed lab cases + confirmed supply/implant invoices, all
// in one filterable list. Lab invoices open the existing CaseDetailModal
// (already the native port of OrderInvoiceModal); office invoices open a
// small modal around OfficialInvoiceView (already used for فواتير الأطباء)
// with a Share action — no Print button, matching this app's established
// simplification for web's window.print() elsewhere (cart.tsx).

type Tab = 'all' | 'supplies' | 'implants' | 'labs';

const TEAL = '#0E6E66';

function fmtOrderTotal(order: Order): string {
  const n = resolveOrderTotal(order);
  return order.currency === 'USD'
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${n.toLocaleString('en-US')} د.ع`;
}

function fmtOfficeTotal(inv: InvoiceDoc): string {
  const usd = Number(inv.totalUSD) || 0;
  const iqd = Number(inv.totalIQD) || 0;
  if (iqd > 0 && usd > 0) return `${iqd.toLocaleString('en-US')} د.ع + $${usd.toFixed(2)}`;
  if (iqd > 0) return `${iqd.toLocaleString('en-US')} د.ع`;
  return `$${(Number(inv.total) || usd).toFixed(2)}`;
}

/** Fetches `user_roles` profiles for a set of ids (labs / offices). */
function useProfiles(ids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, UserRoleDoc>>({});
  const [loading, setLoading] = useState(true);
  const key = [...ids].sort().join(',');

  useEffect(() => {
    if (ids.length === 0) {
      setProfiles({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const map: Record<string, UserRoleDoc> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'public_profiles', id));
            if (snap.exists()) map[id] = snap.data() as UserRoleDoc;
          } catch {
            /* ignore missing profiles */
          }
        }),
      );
      if (!cancelled) {
        setProfiles(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { profiles, loading };
}

export default function InvoicesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>('all');
  const [selectedLab, setSelectedLab] = useState<{ labId: string; order: Order } | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<InvoiceDoc | null>(null);

  const { cases: labCases, loading: labLoading } = useDentistCases(user?.uid ?? '');
  const { invoices: officeInvoices, loading: officeLoading } = useDentistInvoices(user?.uid);

  const completedLab = useMemo(() => labCases.filter((c) => isCompletedStatus(c.order.status)), [labCases]);

  const labIds = useMemo(() => [...new Set(completedLab.map((c) => c.labId).filter(Boolean))], [completedLab]);
  const officeIds = useMemo(() => [...new Set(officeInvoices.map((i) => i.officeId).filter(Boolean))], [officeInvoices]);
  const { profiles, loading: profilesLoading } = useProfiles([...labIds, ...officeIds]);

  const supplies = useMemo(
    () => officeInvoices.filter((i) => profiles[i.officeId]?.accountType === 'supply'),
    [officeInvoices, profiles],
  );
  const implants = useMemo(
    () => officeInvoices.filter((i) => profiles[i.officeId]?.accountType === 'implant'),
    [officeInvoices, profiles],
  );

  const loading = labLoading || officeLoading || profilesLoading;

  const tabs: { id: Tab; ar: string; en: string }[] = [
    { id: 'all', ar: 'الكل', en: 'All' },
    { id: 'supplies', ar: 'فواتير المستلزمات', en: 'Supplies' },
    { id: 'implants', ar: 'فواتير شركات الزرعات', en: 'Implants' },
    { id: 'labs', ar: 'فواتير المختبرات', en: 'Labs' },
  ];

  type Card = { key: string; name: string; orderNumber: string; total: string; icon: typeof ReceiptText; iconColor: string; iconTone: string; onPress: () => void };

  const labCardsList: Card[] = completedLab.map((c) => {
    const profile = profiles[c.labId];
    return {
      key: `lab-${c.order.id}`,
      name: profile?.name || (ar ? 'مختبر' : 'Lab'),
      orderNumber: c.order.orderNumber || `#${c.order.caseId ?? ''}`,
      total: fmtOrderTotal(c.order),
      icon: FlaskConical,
      iconColor: '#7C3AED',
      iconTone: 'bg-violet-50',
      onPress: () => setSelectedLab({ labId: c.labId, order: c.order }),
    };
  });

  const supplyCardsList: Card[] = supplies.map((inv) => ({
    key: `sup-${inv.id}`,
    name: profiles[inv.officeId]?.name || (ar ? 'مكتب مستلزمات' : 'Supplies Office'),
    orderNumber: inv.orderNumber,
    total: fmtOfficeTotal(inv),
    icon: Package,
    iconColor: '#0284C7',
    iconTone: 'bg-sky-50',
    onPress: () => setSelectedOffice(inv),
  }));

  const implantCardsList: Card[] = implants.map((inv) => ({
    key: `imp-${inv.id}`,
    name: profiles[inv.officeId]?.name || (ar ? 'شركة زرعات' : 'Implant Company'),
    orderNumber: inv.orderNumber,
    total: fmtOfficeTotal(inv),
    icon: Bone,
    iconColor: '#D97706',
    iconTone: 'bg-amber-50',
    onPress: () => setSelectedOffice(inv),
  }));

  const list =
    tab === 'labs' ? labCardsList : tab === 'supplies' ? supplyCardsList : tab === 'implants' ? implantCardsList : [...labCardsList, ...supplyCardsList, ...implantCardsList];

  const activeLabProfile = selectedLab ? profiles[selectedLab.labId] : null;

  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
        <View className="flex-row gap-1.5 pb-1">
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              className={cn('h-9 items-center justify-center rounded-full border px-3.5', tab === t.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
            >
              <Text className={cn('text-xs font-bold', tab === t.id ? 'text-primary-foreground' : 'text-slate-600')}>{ar ? t.ar : t.en}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text className="mb-3 mt-2 text-xs text-slate-400">
        {list.length} {ar ? 'فواتير' : 'invoices'}
      </Text>

      {loading ? (
        <Spinner size="small" />
      ) : list.length === 0 ? (
        <View className="items-center py-20">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <ReceiptText size={32} color="#CBD5E1" strokeWidth={1.5} />
          </View>
          <Text className="text-sm font-bold text-slate-400">{ar ? 'لا توجد فواتير بعد' : 'No invoices yet'}</Text>
        </View>
      ) : (
        <View className="gap-3 pb-6">
          {list.map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm"
            >
              <View className={cn('h-11 w-11 shrink-0 items-center justify-center rounded-2xl', item.iconTone)}>
                <item.icon size={20} color={item.iconColor} strokeWidth={2} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                  {item.name}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Hash size={11} color="#94A3B8" />
                  <Text className="text-[11px] text-slate-400" style={{ writingDirection: 'ltr' }}>
                    {item.orderNumber}
                  </Text>
                </View>
              </View>
              <Text className="shrink-0 text-base font-extrabold text-emerald-700" style={{ writingDirection: 'ltr' }}>
                {item.total}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!!selectedLab && (
        <CaseDetailModal ar={ar} order={selectedLab.order} labName={activeLabProfile?.name} onClose={() => setSelectedLab(null)} />
      )}

      {!!selectedOffice && (
        <OfficeInvoiceModal
          invoice={selectedOffice}
          officeName={profiles[selectedOffice.officeId]?.name}
          officeType={
            profiles[selectedOffice.officeId]?.accountType === 'implant'
              ? ar ? 'شركة زرعات' : 'Implant Company'
              : undefined
          }
          officePhone={profiles[selectedOffice.officeId]?.phone}
          officeAddress={[profiles[selectedOffice.officeId]?.city, profiles[selectedOffice.officeId]?.address].filter(Boolean).join('، ')}
          ar={ar}
          onClose={() => setSelectedOffice(null)}
        />
      )}
    </Screen>
  );
}

function OfficeInvoiceModal({
  invoice,
  officeName,
  officeType,
  officePhone,
  officeAddress,
  ar,
  onClose,
}: {
  invoice: InvoiceDoc;
  officeName?: string;
  officeType?: string;
  officePhone?: string;
  officeAddress?: string;
  ar: boolean;
  onClose: () => void;
}) {
  const handleShare = () => {
    const lines = invoice.items.map((i) => {
      const total = i.currency === 'IQD' ? `${(i.price * i.quantity).toLocaleString('en-US')} د.ع` : `$${(i.price * i.quantity).toFixed(2)}`;
      return `• ${i.name} ×${i.quantity} — ${total}`;
    });
    const usd = Number(invoice.totalUSD) || 0;
    const iqd = Number(invoice.totalIQD) || 0;
    const text = [
      ar ? 'فاتورة' : 'Invoice',
      invoice.orderNumber,
      invoice.doctorName,
      ...lines,
      ...(iqd > 0 ? [ar ? `الإجمالي بالدينار: ${iqd.toLocaleString('en-US')} د.ع` : `IQD total: ${iqd.toLocaleString('en-US')} IQD`] : []),
      ...(usd > 0 ? [ar ? `الإجمالي بالدولار: $${usd.toFixed(2)}` : `USD total: $${usd.toFixed(2)}`] : []),
    ].join('\n');
    Share.share({ message: text }).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-end bg-black/40">
        <View className="w-full rounded-t-3xl bg-white" style={{ maxHeight: '90%' }}>
          <View className="flex-row gap-2 border-b border-slate-100 p-4">
            <Pressable onPress={handleShare} className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl" style={{ backgroundColor: TEAL }}>
              <Share2 size={15} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">{ar ? 'مشاركة' : 'Share'}</Text>
            </Pressable>
            <Pressable onPress={onClose} className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 px-4">
              <Text className="text-sm font-bold text-slate-500">{ar ? 'إغلاق' : 'Close'}</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <OfficialInvoiceView
              invoice={invoice}
              storeName={officeName || (ar ? 'مكتب المستلزمات الطبية' : 'Medical Supplies Store')}
              storeType={officeType}
              storePhone={officePhone || ''}
              storeAddress={officeAddress || ''}
              ar={ar}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

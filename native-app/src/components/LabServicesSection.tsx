import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { Clock, Crown, ShoppingCart, Stethoscope } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { cn } from '@/lib/utils';

// A lab's services live in `lab_services/{labId}` (edited on the lab's own
// "my services" screen), not in `products` — so the public profile, which
// only listed products, showed a lab as empty to every visitor. Same layout
// as the web's /labs/$labId page.

type Service = {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  turnaroundAr: string;
  turnaroundEn: string;
  price: number;
  currency: 'USD' | 'IQD';
  imageUrl?: string;
};

const PILL_COLORS = ['#0EA5E9', '#8B5CF6', '#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4', '#D946EF'];

export function useLabServices(labId: string | undefined, enabled: boolean) {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    if (!labId || !enabled) return;
    return onSnapshot(
      doc(db, 'lab_services', labId),
      (snap) => setServices(snap.exists() ? ((snap.data().services as Service[] | undefined) ?? []) : []),
      () => setServices([]),
    );
  }, [labId, enabled]);
  return services;
}

export function LabServicesSection({
  services,
  ar,
  onOrder,
}: {
  services: Service[];
  ar: boolean;
  onOrder?: () => void;
}) {
  const [filter, setFilter] = useState('all');

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; color: string }[] = [];
    for (const s of services) {
      const c = (s.category || '').trim();
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push({ id: c, color: PILL_COLORS[out.length % PILL_COLORS.length] });
      }
    }
    return out;
  }, [services]);

  const filtered = filter === 'all' ? services : services.filter((s) => s.category === filter);

  if (services.length === 0) return null;

  return (
    <View className="mt-5 pb-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-slate-800">{ar ? 'خدمات المختبر' : 'Lab services'}</Text>
        <Text className="text-xs text-slate-400">
          {services.length} {ar ? 'خدمة' : 'services'}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5 pb-3">
        {[{ id: 'all', color: '#0EA5E9' }, ...categories].map((c) => {
          const active = filter === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setFilter(c.id)}
              className="h-9 items-center justify-center rounded-full border-2 px-4"
              style={active ? { backgroundColor: c.color, borderColor: c.color } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-600')}>
                {c.id === 'all' ? (ar ? 'الكل' : 'All') : c.id}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View className="items-center py-10">
          <Stethoscope size={36} color="#CBD5E1" />
          <Text className="mt-2 text-sm text-slate-400">{ar ? 'لا توجد خدمات بعد' : 'No services yet'}</Text>
        </View>
      ) : (
        <View className="gap-3">
          {filtered.map((s) => {
            const color = categories.find((c) => c.id === s.category)?.color ?? '#CBD5E1';
            const price =
              s.currency === 'IQD'
                ? `${(Number(s.price) || 0).toLocaleString('en-US')} د.ع`
                : `$${(Number(s.price) || 0).toFixed(2)}`;
            return (
              <View key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <View style={{ height: 4, backgroundColor: color }} />
                {s.imageUrl ? (
                  <View className="h-40 items-center justify-center bg-slate-50 p-2">
                    <Image source={{ uri: s.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  </View>
                ) : (
                  <View className="h-20 items-center justify-center bg-slate-50">
                    <Crown size={28} color="#CBD5E1" />
                  </View>
                )}
                <View className="p-3.5">
                  <Text numberOfLines={2} className="text-[15px] font-bold text-slate-800">
                    {ar ? s.titleAr || s.titleEn : s.titleEn || s.titleAr}
                  </Text>
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    {!!(ar ? s.turnaroundAr : s.turnaroundEn) && (
                      <View className="flex-row items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
                        <Clock size={12} color="#475569" />
                        <Text className="text-[11px] font-semibold text-slate-600">{ar ? s.turnaroundAr : s.turnaroundEn}</Text>
                      </View>
                    )}
                    <Text className="text-[15px] font-extrabold text-blue-600">{price}</Text>
                  </View>
                  {!!s.category && (
                    <Text className="mt-1.5 text-[11px] text-slate-400">{ar ? `الفئة: ${s.category}` : `Category: ${s.category}`}</Text>
                  )}
                  {onOrder && (
                    <Pressable
                      onPress={onOrder}
                      className="mt-2.5 h-9 flex-row items-center justify-center gap-1.5 rounded-xl"
                      style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}
                    >
                      <ShoppingCart size={14} color="#2563EB" />
                      <Text className="text-xs font-bold text-primary">{ar ? 'طلب' : 'Order'}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

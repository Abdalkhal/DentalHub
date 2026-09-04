import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Button, Input, Text } from '@/components/ui';
import { useOffers, useUpsertOffer, useDeleteOffer, type Offer } from '@/lib/offers';
import { randomUUID } from '@/lib/randomId';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-rose-50 text-rose-700',
  expired: 'bg-slate-100 text-slate-500',
};

function money(n: number, cur?: string): string {
  return cur === 'IQD' ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

function statusLabel(status: string | undefined, ar: boolean): string {
  switch (status) {
    case 'active':
      return ar ? 'نشط' : 'Active';
    case 'pending':
      return ar ? 'قيد المراجعة' : 'Pending';
    case 'rejected':
      return ar ? 'مرفوض' : 'Rejected';
    default:
      return ar ? 'منتهي' : 'Expired';
  }
}

export function OfficeOffers({ supplierId }: { supplierId: string }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { data: offers = [] } = useOffers(supplierId);
  const [editing, setEditing] = useState<Offer | 'new' | null>(null);
  const del = useDeleteOffer();

  const confirmDelete = (o: Offer) => {
    Alert.alert(
      ar ? 'حذف العرض' : 'Delete offer',
      o.title,
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: ar ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => {
            del.mutate(o.id);
            toast.success(ar ? 'تم حذف العرض' : 'Offer deleted');
          },
        },
      ],
    );
  };

  return (
    <View className="mt-6 pb-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-600">
          {ar ? 'عروضك' : 'Your offers'} ({offers.length})
        </Text>
        <Button size="sm" title={ar ? '+ عرض' : '+ Offer'} onPress={() => setEditing('new')} />
      </View>

      {offers.length === 0 ? (
        <Text className="mt-4 text-center text-xs text-slate-400">
          {ar ? 'لا توجد عروض بعد — أضف عرضاً ليظهر للجميع' : 'No offers yet — add one to show it publicly'}
        </Text>
      ) : (
        <View className="mt-3 gap-2.5">
          {offers.map((o) => {
            const tone = STATUS_TONE[o.status ?? 'active'] ?? STATUS_TONE.active;
            return (
              <Pressable
                key={o.id}
                onPress={() => setEditing(o)}
                className="rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-800">{o.title}</Text>
                    {!!o.description && (
                      <Text numberOfLines={2} className="mt-0.5 text-[11px] text-slate-500">
                        {o.description}
                      </Text>
                    )}
                    {o.price != null && (
                      <Text className="mt-1 text-sm font-extrabold text-primary">
                        {money(o.price, o.currency)}
                      </Text>
                    )}
                    {!!o.expiryDate && (
                      <Text className="mt-0.5 text-[10px] text-slate-400">
                        {ar ? 'ينتهي' : 'Expires'}: {o.expiryDate}
                      </Text>
                    )}
                  </View>
                  <View className="items-end gap-2">
                    <View className={cn('rounded-full px-2 py-0.5', tone)}>
                      <Text className="text-[10px] font-bold">{statusLabel(o.status, ar)}</Text>
                    </View>
                    <Pressable
                      onPress={() => confirmDelete(o)}
                      className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50"
                    >
                      <Trash2 size={15} color="#E11D48" />
                    </Pressable>
                  </View>
                </View>
                {o.status === 'rejected' && !!o.rejectReason && (
                  <Text className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-600">
                    {ar ? 'السبب' : 'Reason'}: {o.rejectReason}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {editing !== null && (
        <OfferFormModal
          ar={ar}
          supplierId={supplierId}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

function OfferFormModal({
  ar,
  supplierId,
  initial,
  onClose,
}: {
  ar: boolean;
  supplierId: string;
  initial: Offer | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [currency, setCurrency] = useState<'USD' | 'IQD'>(initial?.currency === 'IQD' ? 'IQD' : 'USD');
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upsert = useUpsertOffer();

  const save = async () => {
    if (!title.trim()) {
      setError(ar ? 'أدخل عنوان العرض' : 'Enter an offer title');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await upsert.mutateAsync({
        id: initial?.id ?? randomUUID(),
        supplierId,
        title: title.trim(),
        description: description.trim(),
        imageUrl: initial?.imageUrl ?? '',
        expiryDate: expiryDate.trim(),
        price: price.trim() ? Number(price) : undefined,
        currency: price.trim() ? currency : undefined,
        discountPct: initial?.discountPct,
        status: initial?.status ?? 'active',
        rejectReason: initial?.rejectReason,
        createdAt: initial?.createdAt,
      });
      toast.success(ar ? 'تم حفظ العرض' : 'Offer saved');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <ScrollView
          className="max-h-[85%] rounded-t-3xl bg-white p-5 pb-8"
          contentContainerClassName="gap-3"
        >
          <Text className="text-lg font-extrabold">
            {initial ? (ar ? 'تعديل العرض' : 'Edit offer') : ar ? 'إضافة عرض' : 'Add offer'}
          </Text>

          <Input value={title} onChangeText={setTitle} placeholder={ar ? 'عنوان العرض' : 'Offer title'} />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder={ar ? 'الوصف (اختياري)' : 'Description (optional)'}
            multiline
          />
          <View className="flex-row gap-2">
            <Input
              value={price}
              onChangeText={setPrice}
              placeholder={ar ? 'السعر (اختياري)' : 'Price (optional)'}
              keyboardType="numeric"
              className="flex-1"
            />
            <View className="flex-row gap-1.5">
              <Button size="sm" variant={currency === 'USD' ? 'primary' : 'outline'} title="$" onPress={() => setCurrency('USD')} />
              <Button size="sm" variant={currency === 'IQD' ? 'primary' : 'outline'} title="د.ع" onPress={() => setCurrency('IQD')} />
            </View>
          </View>
          <Input
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder={ar ? 'تاريخ الانتهاء YYYY-MM-DD (اختياري)' : 'Expiry YYYY-MM-DD (optional)'}
            autoCapitalize="none"
          />

          {!!error && (
            <Text className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {error}
            </Text>
          )}

          <View className="flex-row gap-2">
            <Button variant="outline" title={ar ? 'إلغاء' : 'Cancel'} onPress={onClose} className="flex-1" />
            <Button title={ar ? 'حفظ' : 'Save'} onPress={save} loading={busy} className="flex-1" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Clock, Pencil, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react-native';

import { Screen, Text, Input, Button, Spinner } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { randomUUID } from '@/lib/randomId';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// Ported from the web app's lab.my-services.tsx — same `lab_services/{labId}`
// document. Images are stored as a base64 data URI (like web's own
// `FileReader.readAsDataURL`), not uploaded to Storage: this field is read
// by both platforms, and a Storage *path* written here would be meaningless
// to web's plain `<img src>`, while a self-contained data URI renders
// correctly on both without needing a signed-URL resolution step.

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

const EMPTY_FORM = { titleAr: '', titleEn: '', category: '', turnaroundAr: '', turnaroundEn: '', price: '', currency: 'USD' as 'USD' | 'IQD' };

export default function LabServicesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const labId = user?.uid ?? '';
  const qc = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['lab-services', labId],
    queryFn: async (): Promise<Service[]> => {
      if (!labId) return [];
      const snap = await getDoc(doc(db, 'lab_services', labId));
      return snap.exists() ? ((snap.data().services as Service[]) ?? []) : [];
    },
    enabled: !!labId,
  });

  const saveMutation = useMutation({
    mutationFn: async (next: Service[]) => {
      await setDoc(doc(db, 'lab_services', labId), { services: next }, { merge: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-services', labId] }),
  });

  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [imgUri, setImgUri] = useState('');

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; color: string }[] = [];
    for (const s of services) {
      const c = s.category.trim();
      if (c && !seen.has(c)) {
        seen.add(c);
        list.push({ id: c, color: PILL_COLORS[list.length % PILL_COLORS.length] });
      }
    }
    return list;
  }, [services]);

  const filtered = useMemo(() => (filter === 'all' ? services : services.filter((s) => s.category === filter)), [services, filter]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setImgUri('');
    setShowForm(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ titleAr: s.titleAr, titleEn: s.titleEn, category: s.category, turnaroundAr: s.turnaroundAr, turnaroundEn: s.turnaroundEn, price: s.price ? String(s.price) : '', currency: s.currency || 'USD' });
    setImgUri(s.imageUrl ?? '');
    setShowForm(true);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.4, base64: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    if (asset.base64) setImgUri(`data:image/jpeg;base64,${asset.base64}`);
  };

  const save = async () => {
    if (!form.titleAr.trim()) {
      toast.error(ar ? 'اسم الخدمة مطلوب' : 'Service name required');
      return;
    }
    const svc: Service = {
      id: editingId ?? randomUUID(),
      titleAr: form.titleAr.trim(),
      titleEn: form.titleEn.trim() || form.titleAr.trim(),
      category: form.category.trim(),
      turnaroundAr: form.turnaroundAr.trim(),
      turnaroundEn: form.turnaroundEn.trim(),
      price: parseFloat(form.price) || 0,
      currency: form.currency,
      imageUrl: imgUri || undefined,
    };
    const next = editingId ? services.map((s) => (s.id === editingId ? svc : s)) : [svc, ...services];
    try {
      await saveMutation.mutateAsync(next);
      toast.success(ar ? 'تمت إضافة الخدمة بنجاح' : 'Service added successfully');
      setShowForm(false);
    } catch (e) {
      toast.error(ar ? `فشل: ${e instanceof Error ? e.message : String(e)}` : `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const remove = (id: string) => {
    saveMutation.mutate(services.filter((s) => s.id !== id));
  };

  if (isLoading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <View className="mb-3 flex-row flex-wrap gap-1.5">
        <Pressable onPress={() => setFilter('all')} className={cn('h-9 items-center justify-center rounded-full border-2 px-3.5', filter === 'all' ? 'border-transparent bg-sky-500' : 'border-slate-200 bg-white')}>
          <Text className={cn('text-xs font-bold', filter === 'all' ? 'text-white' : 'text-slate-600')}>{ar ? 'الكل' : 'All'}</Text>
        </Pressable>
        {categories.map((c) => {
          const active = filter === c.id;
          return (
            <Pressable key={c.id} onPress={() => setFilter(c.id)} className="h-9 items-center justify-center rounded-full border-2 px-3.5" style={{ backgroundColor: active ? c.color : '#FFFFFF', borderColor: active ? 'transparent' : '#E2E8F0' }}>
              <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-600')}>{c.id}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={openAdd} className="mb-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary">
        <Plus size={18} color="#FFFFFF" />
        <Text className="text-sm font-extrabold text-white">{ar ? 'إضافة خدمة / نوع عمل' : 'Add Service / Work Type'}</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        {filtered.length === 0 ? (
          <View className="items-center py-16">
            <Sparkles size={40} color="#CBD5E1" />
            <Text className="mt-3 text-sm font-semibold text-slate-400">{ar ? 'لا توجد خدمات' : 'No services yet'}</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {filtered.map((s) => {
              const cat = categories.find((c) => c.id === s.category);
              const price = s.currency === 'IQD' ? `${s.price.toLocaleString()} د.ع` : `$${s.price.toFixed(2)}`;
              return (
                <View key={s.id} className="w-[48.5%] overflow-hidden rounded-2xl border border-slate-100 bg-card shadow-sm">
                  <View className="h-1" style={{ backgroundColor: cat?.color ?? '#CBD5E1' }} />
                  {s.imageUrl ? (
                    <Image source={{ uri: s.imageUrl }} className="h-24 w-full bg-slate-50" resizeMode="contain" />
                  ) : (
                    <View className="h-20 items-center justify-center bg-slate-50">
                      <Sparkles size={26} color="#CBD5E1" />
                    </View>
                  )}
                  <View className="p-3">
                    <Text numberOfLines={2} className="text-xs font-bold text-slate-800">{ar ? s.titleAr : s.titleEn}</Text>
                    <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
                      {!!(ar ? s.turnaroundAr : s.turnaroundEn) && (
                        <View className="flex-row items-center gap-1 rounded-lg bg-slate-50 px-1.5 py-1">
                          <Clock size={10} color="#64748B" />
                          <Text className="text-[10px] font-semibold text-slate-600">{ar ? s.turnaroundAr : s.turnaroundEn}</Text>
                        </View>
                      )}
                      <Text className="text-xs font-bold text-primary">{price}</Text>
                    </View>
                    <View className="mt-2 flex-row gap-1.5">
                      <Pressable onPress={() => openEdit(s)} className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-sky-50 py-1.5">
                        <Pencil size={12} color="#0284C7" />
                        <Text className="text-[11px] font-bold text-sky-600">{ar ? 'تعديل' : 'Edit'}</Text>
                      </Pressable>
                      <Pressable onPress={() => remove(s.id)} className="w-9 items-center justify-center rounded-lg bg-rose-50">
                        <Trash2 size={13} color="#F43F5E" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="max-h-[90%] rounded-t-3xl bg-white p-5" contentContainerClassName="gap-3 pb-8">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-slate-900">{editingId ? (ar ? 'تعديل' : 'Edit') : ar ? 'إضافة خدمة' : 'Add Service'}</Text>
              <Pressable onPress={() => setShowForm(false)} className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <X size={15} color="#64748B" />
              </Pressable>
            </View>

            <Input value={form.titleAr} onChangeText={(v) => setForm((d) => ({ ...d, titleAr: v }))} placeholder={ar ? 'اسم الخدمة (عربي)' : 'Service name (Arabic)'} />
            <Input value={form.titleEn} onChangeText={(v) => setForm((d) => ({ ...d, titleEn: v }))} placeholder={ar ? 'اسم الخدمة (إنكليزي) — اختياري' : 'Service name (English) — optional'} />
            <Input value={form.category} onChangeText={(v) => setForm((d) => ({ ...d, category: v }))} placeholder={ar ? 'الفئة (مثال: زيركون)' : 'Category (e.g. Zirconia)'} />
            <Input value={form.turnaroundAr} onChangeText={(v) => setForm((d) => ({ ...d, turnaroundAr: v }))} placeholder={ar ? 'وقت الإنجاز (عربي، مثال: 3-4 أيام)' : 'Turnaround (Arabic)'} />
            <Input value={form.turnaroundEn} onChangeText={(v) => setForm((d) => ({ ...d, turnaroundEn: v }))} placeholder={ar ? 'وقت الإنجاز (إنكليزي) — اختياري' : 'Turnaround (English) — optional'} />

            <View className="flex-row gap-2">
              <Input value={form.price} onChangeText={(v) => setForm((d) => ({ ...d, price: v }))} placeholder={ar ? 'السعر' : 'Price'} keyboardType="number-pad" className="flex-1" style={{ writingDirection: 'ltr' }} />
              <View className="flex-row overflow-hidden rounded-xl border border-slate-200">
                <Pressable onPress={() => setForm((d) => ({ ...d, currency: 'USD' }))} className={cn('px-3.5 items-center justify-center', form.currency === 'USD' ? 'bg-primary' : 'bg-white')}>
                  <Text className={cn('text-sm font-semibold', form.currency === 'USD' ? 'text-white' : 'text-slate-500')}>$</Text>
                </Pressable>
                <Pressable onPress={() => setForm((d) => ({ ...d, currency: 'IQD' }))} className={cn('px-3.5 items-center justify-center', form.currency === 'IQD' ? 'bg-primary' : 'bg-white')}>
                  <Text className={cn('text-sm font-semibold', form.currency === 'IQD' ? 'text-white' : 'text-slate-500')}>{ar ? 'د.ع' : 'IQD'}</Text>
                </Pressable>
              </View>
            </View>

            <Text className="text-xs font-bold text-slate-500">{ar ? 'صورة (اختياري)' : 'Image (optional)'}</Text>
            {imgUri ? (
              <View className="relative h-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <Image source={{ uri: imgUri }} className="h-full w-full" resizeMode="contain" />
                <Pressable onPress={() => setImgUri('')} className="absolute end-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/50">
                  <X size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={pickImage} className="h-24 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                <Upload size={20} color="#94A3B8" />
                <Text className="text-xs text-slate-400">{ar ? 'اضغط لرفع صورة' : 'Tap to upload'}</Text>
              </Pressable>
            )}

            <Button
              title={editingId ? (ar ? 'حفظ' : 'Save') : ar ? 'إضافة الخدمة' : 'Add Service'}
              loading={saveMutation.isPending}
              disabled={!form.titleAr.trim()}
              onPress={save}
            />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Building2, Check, Image as ImageIcon, Layers, Package, Phone, Plus, Printer, Trash2, Upload, X } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { GradientFill } from '@/components/appointmentTheme';
import { auth } from '@/integrations/firebase/client';
import {
  SURGICAL_GUIDE_MATERIALS,
  SURGICAL_GUIDE_SOFTWARE,
  SURGICAL_GUIDE_SYSTEMS,
  uploadGuideImage,
  useUpsertSurgicalGuideCompany,
  type SurgicalGuideCompany,
} from '@/lib/surgicalGuides';
import { randomUUID } from '@/lib/randomId';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const MAX_GALLERY = 30;
const GREEN = '#059669';
const inputCls = 'h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900';
const ltr = { writingDirection: 'ltr' as const, textAlign: 'left' as const };

type Picked = { uri: string; name?: string | null; type?: string | null };

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-sm font-bold text-slate-800">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="mb-1.5 text-[11px] font-bold text-slate-500">
      {children}
      {required ? <Text className="text-rose-500"> *</Text> : null}
    </Text>
  );
}

export default function SurgicalGuideCreateScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const upsert = useUpsertSurgicalGuideCompany();

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [city, setCity] = useState('');
  const [software, setSoftware] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<Picked | null>(null);
  const [systems, setSystems] = useState<string[]>(['Conventional']);
  const [material, setMaterial] = useState('Medical Grade Resin');
  const [gallery, setGallery] = useState<(Picked & { caption: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setLogo({ uri: a.uri, name: a.fileName, type: a.mimeType });
  };

  const pickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_GALLERY - gallery.length,
    });
    if (res.canceled || !res.assets?.length) return;
    setGallery((prev) =>
      [...prev, ...res.assets.map((a) => ({ uri: a.uri, name: a.fileName, type: a.mimeType, caption: '' }))].slice(0, MAX_GALLERY),
    );
  };

  const toggleSystem = (en: string) => setSystems((prev) => (prev.includes(en) ? prev.filter((x) => x !== en) : [...prev, en]));

  const submit = async () => {
    setError('');
    if (!nameAr.trim()) return setError(ar ? 'الرجاء إدخال اسم الشركة بالعربية' : 'Please enter the Arabic company name');
    if (!nameEn.trim()) return setError(ar ? 'الرجاء إدخال اسم الشركة بالإنجليزية' : 'Please enter the English company name');
    if (!software.trim()) return setError(ar ? 'الرجاء اختيار برنامج التصميم' : 'Please select a design software');
    const uid = auth.currentUser?.uid;
    if (!uid) return setError(ar ? 'سجّل الدخول أولاً' : 'Please sign in first');

    setBusy(true);
    try {
      const logoUrl = logo ? await uploadGuideImage(uid, logo) : undefined;
      const galleryData: { url: string; caption: string }[] = [];
      for (const g of gallery) galleryData.push({ url: await uploadGuideImage(uid, g), caption: g.caption.trim() });

      const payload: SurgicalGuideCompany = {
        id: randomUUID(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        city: city.trim(),
        software: software.trim(),
        phone: phone.trim(),
        description: description.trim(),
        ...(logoUrl ? { logoUrl } : {}),
        systems,
        printingMaterial: material,
        gallery: galleryData,
        companyId: uid,
        createdAt: Date.now(),
      };
      await upsert.mutateAsync(payload);
      toast.success(ar ? 'تم حفظ الشركة بنجاح' : 'Company saved successfully');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'إضافة شركة دليل جراحي' : 'Add Surgical Guide Company'}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          {ar ? 'سجّل شركتك واعرض أعمالك لأطباء Dent Hub' : 'Register your company and show your work to Dent Hub doctors'}
        </Text>
      </View>

      <Card icon={<Building2 size={16} color={GREEN} />} title={ar ? 'معلومات الشركة الأساسية' : 'Basic Information'}>
        <View>
          <Label>{ar ? 'شعار الشركة' : 'Company Logo'}</Label>
          {logo ? (
            <View className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image source={{ uri: logo.uri }} className="h-full w-full" resizeMode="contain" />
              <Pressable onPress={() => setLogo(null)} className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60">
                <X size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickLogo} className="h-24 w-24 items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
              <Upload size={22} color="#94A3B8" />
              <Text className="text-[9px] font-bold text-slate-400">{ar ? 'رفع الشعار' : 'Upload'}</Text>
            </Pressable>
          )}
        </View>
        <View>
          <Label required>{ar ? 'اسم الشركة بالعربية' : 'Arabic Company Name'}</Label>
          <TextInput value={nameAr} onChangeText={setNameAr} placeholder={ar ? 'مثال: شركة دليل المستقبل' : 'e.g. Future Guide Co.'} placeholderTextColor="#94A3B8" className={inputCls} />
        </View>
        <View>
          <Label required>{ar ? 'اسم الشركة بالإنجليزية' : 'English Company Name'}</Label>
          <TextInput value={nameEn} onChangeText={setNameEn} placeholder="e.g. Future Guide Co." placeholderTextColor="#94A3B8" className={inputCls} style={ltr} />
        </View>
        <View>
          <Label>{ar ? 'المدينة' : 'City'}</Label>
          <TextInput value={city} onChangeText={setCity} placeholder={ar ? 'مثال: الموصل' : 'e.g. Mosul'} placeholderTextColor="#94A3B8" className={inputCls} />
        </View>
        <View>
          <Label required>{ar ? 'برنامج التصميم' : 'Design Software'}</Label>
          <TextInput value={software} onChangeText={setSoftware} placeholder="exocad, 3Shape, RealGUIDE…" placeholderTextColor="#94A3B8" className={inputCls} style={ltr} />
          <View className="mt-2 flex-row flex-wrap gap-1.5" style={{ direction: 'ltr' }}>
            {SURGICAL_GUIDE_SOFTWARE.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSoftware(s)}
                className={cn('h-8 justify-center rounded-full border px-3', software === s ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')}
              >
                <Text className={cn('text-[11px] font-bold', software === s ? 'text-emerald-700' : 'text-slate-500')}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <Label>{ar ? 'رقم الهاتف' : 'Phone Number'}</Label>
          <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4" style={{ direction: 'ltr' }}>
            <Phone size={16} color="#94A3B8" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+964 7XX XXX XXXX"
              placeholderTextColor="#94A3B8"
              className="h-12 flex-1 px-2 text-sm text-slate-900"
              style={ltr}
            />
          </View>
        </View>
        <View>
          <Label>{ar ? 'وصف الشركة' : 'Company Description'}</Label>
          <TextInput
            multiline
            value={description}
            onChangeText={(v) => setDescription(v.slice(0, 1000))}
            placeholder={ar ? 'اكتب نبذة عن الشركة وخدماتها...' : 'Describe the company and its services...'}
            placeholderTextColor="#94A3B8"
            className="h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            style={{ textAlignVertical: 'top' }}
          />
          <Text className="mt-1 text-right text-[10px] font-semibold text-slate-400">{description.trim().length}/1000</Text>
        </View>
      </Card>

      <Card icon={<Layers size={16} color={GREEN} />} title={ar ? 'الأنظمة الجراحية المدعومة' : 'Supported Systems'}>
        <View className="gap-2">
          {SURGICAL_GUIDE_SYSTEMS.map((s) => {
            const on = systems.includes(s.en);
            return (
              <Pressable
                key={s.en}
                onPress={() => toggleSystem(s.en)}
                className={cn('flex-row items-center gap-2 rounded-xl border px-3 py-2.5', on ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white')}
              >
                <View className={cn('h-4 w-4 items-center justify-center rounded border', on ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300')}>
                  {on && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text className={cn('flex-1 text-sm font-semibold', on ? 'text-emerald-700' : 'text-slate-700')}>{ar ? s.ar : s.en}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card icon={<Printer size={16} color={GREEN} />} title={ar ? 'مادة طباعة الدليل الجراحي' : 'Printing Material'}>
        <View className="gap-2">
          {SURGICAL_GUIDE_MATERIALS.map((m) => {
            const on = material === m.en;
            return (
              <Pressable
                key={m.en}
                onPress={() => setMaterial(m.en)}
                className={cn('flex-row items-center gap-3 rounded-xl border px-3 py-3', on ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white')}
              >
                <View className={cn('h-4 w-4 items-center justify-center rounded-full border-2', on ? 'border-emerald-600' : 'border-slate-300')}>
                  {on && <View className="h-2 w-2 rounded-full bg-emerald-600" />}
                </View>
                <Text className={cn('flex-1 text-sm font-semibold', on ? 'text-emerald-700' : 'text-slate-700')}>{ar ? m.ar : m.en}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card icon={<ImageIcon size={16} color={GREEN} />} title={ar ? 'معرض صور الحالات' : 'Clinical Cases Gallery'}>
        <View className="flex-row flex-wrap gap-2">
          {gallery.map((g, idx) => (
            <View key={`${g.uri}-${idx}`} className="gap-1.5" style={{ width: '31.5%' }}>
              <View className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <Image source={{ uri: g.uri }} className="h-full w-full" resizeMode="cover" />
                <Pressable
                  onPress={() => setGallery((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                >
                  <Trash2 size={13} color="#FFFFFF" />
                </Pressable>
              </View>
              <TextInput
                value={g.caption}
                onChangeText={(v) => setGallery((prev) => prev.map((x, i) => (i === idx ? { ...x, caption: v } : x)))}
                placeholder={ar ? 'وصف الصورة' : 'Caption'}
                placeholderTextColor="#94A3B8"
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-700"
              />
            </View>
          ))}
          {gallery.length < MAX_GALLERY && (
            <Pressable
              onPress={pickGallery}
              className="aspect-square items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
              style={{ width: '31.5%' }}
            >
              <Plus size={22} color="#94A3B8" />
              <Text className="text-[10px] font-bold text-slate-400">{ar ? 'إضافة' : 'Add'}</Text>
            </Pressable>
          )}
        </View>
        <Text className="text-[10px] text-slate-400">
          {gallery.length}/{MAX_GALLERY} · {ar ? 'صور' : 'photos'}
        </Text>
      </Card>

      {!!error && (
        <View className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
          <Text className="text-center text-sm font-semibold text-rose-600">{error}</Text>
        </View>
      )}

      <Pressable onPress={submit} disabled={busy} className="overflow-hidden rounded-2xl" style={{ opacity: busy ? 0.6 : 1 }}>
        <GradientFill colors={['#10B981', '#059669']} />
        <View className="h-14 flex-row items-center justify-center gap-2">
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Package size={16} color="#FFFFFF" />}
          <Text className="text-sm font-extrabold text-white">{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'حفظ الشركة' : 'Save Company'}</Text>
        </View>
      </Pressable>
    </Screen>
  );
}

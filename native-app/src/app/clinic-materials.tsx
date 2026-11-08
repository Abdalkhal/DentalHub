import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, BellRing, Boxes, Check, ChevronDown, ClipboardCheck, Minus, PackagePlus, Plus, Search, Settings2, ShoppingBag, Trash2, X } from 'lucide-react-native';

import { Screen, Select, Text } from '@/components/ui';
import { subcategoriesOf } from '@/data/subcategories';
import { setClinicsStoreUser } from '@/lib/clinicsStore';
import { useI18n } from '@/lib/i18n';
import {
  addMaterial,
  adjustMaterialQty,
  attentionOf,
  confirmMaterial,
  ignoreLines,
  importMaterials,
  markMaterialsSeen,
  MATERIAL_SECTIONS,
  needsReview,
  removeMaterial,
  setMaterialMeta,
  setMaterialStatus,
  statusLine,
  updateMaterial,
  useMaterialImports,
  useMaterialMeta,
  useMaterials,
  type ImportLine,
  type Material,
  type MaterialMeta,
  type MaterialStatus,
} from '@/lib/materialsStore';
import { useSignedImageUrls } from '@/lib/products';
import { useUserRole } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

const inp = 'h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800';
const ltr = { writingDirection: 'ltr' as const, textAlign: 'left' as const };
const sectionName = (id: string, ar: boolean) => {
  const s = MATERIAL_SECTIONS.find((x) => x.id === id);
  return s ? (ar ? s.ar : s.en) : id;
};
const STATUSES: { id: MaterialStatus; ar: string; en: string; on: string }[] = [
  { id: 'available', ar: 'متوفرة', en: 'In stock', on: '#059669' },
  { id: 'half', ar: 'نصفها', en: 'About half', on: '#0284C7' },
  { id: 'low', ar: 'قاربت', en: 'Running low', on: '#F59E0B' },
  { id: 'out', ar: 'نفدت', en: 'Out', on: '#E11D48' },
];
const TONE = { bad: 'text-rose-600', warn: 'text-amber-600', ok: 'text-emerald-700', muted: 'text-slate-500' };

function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text className="text-base font-extrabold text-slate-900">{title}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <X size={16} color="#475569" />
            </Pressable>
          </View>
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 p-5">
            {children}
          </KeyboardAwareScrollView>
          {footer && <View className="border-t border-slate-100 p-4">{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

function Thumb({ image, urls, name, size = 44 }: { image?: string; urls: Record<string, string>; name: string; size?: number }) {
  const url = image ? urls[image] : undefined;
  return (
    <View className="items-center justify-center overflow-hidden rounded-xl bg-slate-100" style={{ width: size, height: size }}>
      {url ? <Image source={{ uri: url }} style={{ width: size, height: size }} /> : <Text className="text-sm font-extrabold text-slate-500">{name.trim().charAt(0) || '?'}</Text>}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} className="h-12 flex-1 items-center justify-center rounded-2xl bg-primary" style={{ opacity: disabled ? 0.5 : 1 }}>
      <Text className="text-sm font-extrabold text-primary-foreground">{label}</Text>
    </Pressable>
  );
}

export default function ClinicMaterialsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  useEffect(() => {
    if (user?.uid) setClinicsStoreUser(user.uid);
  }, [user?.uid]);

  const list = useMaterials();
  const meta = useMaterialMeta();
  const { lines } = useMaterialImports(user?.uid);
  const [section, setSection] = useState('all');
  const [sub, setSub] = useState('all');
  const [q, setQ] = useState('');
  const [panel, setPanel] = useState<'import' | 'add' | 'settings' | 'review' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const now = Date.now();

  // A visit clears the number on the icons; the rows here stay marked.
  useEffect(() => {
    markMaterialsSeen();
  }, [list]);

  const paths = useMemo(() => [...new Set([...list.map((m) => m.image), ...lines.map((l) => l.image)].filter(Boolean) as string[])], [list, lines]);
  const { data: urls = {} } = useSignedImageUrls(paths);

  const attention = list.filter((m) => attentionOf(m, meta, now));
  const review = list.filter((m) => needsReview(m, meta.reviewDays, now) && !attentionOf(m, meta, now));
  const counts = (id: string) => list.filter((m) => m.category === id).length;
  const usedSections = MATERIAL_SECTIONS.filter((s) => counts(s.id) > 0);
  const inSection = section === 'all' ? list : list.filter((m) => m.category === section);
  const subs = section === 'all' ? [] : [...new Set(inSection.map((m) => m.subCategory).filter(Boolean) as string[])];
  const needle = q.trim().toLowerCase();
  const shown = inSection
    .filter((m) => sub === 'all' || m.subCategory === sub)
    .filter((m) => !needle || m.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(!!attentionOf(b, meta, now)) - Number(!!attentionOf(a, meta, now)) || a.name.localeCompare(b.name));

  return (
    <Screen>
      <View className="gap-3.5">
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-xs font-semibold text-slate-500">{ar ? 'في المخزن' : 'In stock'}</Text>
            <Text className="mt-1 text-2xl font-extrabold text-slate-900">{list.length} <Text className="text-sm font-bold text-slate-400">{ar ? 'مادة' : 'items'}</Text></Text>
          </View>
          <View className={cn('flex-1 rounded-2xl border p-4', attention.length ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white')}>
            <Text className={cn('text-xs font-semibold', attention.length ? 'text-rose-700' : 'text-slate-500')}>{ar ? 'تحتاج انتباهك' : 'Need attention'}</Text>
            <Text className={cn('mt-1 text-2xl font-extrabold', attention.length ? 'text-rose-700' : 'text-slate-900')}>{attention.length} <Text className="text-sm font-bold">{ar ? 'مادة' : 'items'}</Text></Text>
          </View>
        </View>

        {lines.length > 0 && (
          <Pressable onPress={() => setPanel('import')} className="flex-row items-center gap-3 rounded-2xl bg-blue-600 p-4">
            <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <ShoppingBag size={20} color="#FFFFFF" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-white">{ar ? (lines.length === 1 ? 'منتج واحد من مشترياتك' : `${lines.length} منتج من مشترياتك`) : `${lines.length} products you bought`}</Text>
              <Text className="text-xs text-white">{ar ? 'حدد ما تريد وأضفه إلى المخزن بضغطة' : 'Choose and add them in one tap'}</Text>
            </View>
            <View className="rounded-lg bg-white px-3 py-1.5">
              <Text className="text-xs font-extrabold text-blue-700">{ar ? 'مراجعة' : 'Review'}</Text>
            </View>
          </Pressable>
        )}

        {review.length > 0 && (
          <Pressable onPress={() => setPanel('review')} className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <ClipboardCheck size={18} color="#7C3AED" />
            </View>
            <Text className="min-w-0 flex-1 text-sm font-bold text-slate-800">{ar ? (review.length === 1 ? 'مادة واحدة لم تُحدَّث منذ مدة' : `${review.length} مواد لم تُحدَّث منذ مدة`) : `${review.length} items not updated lately`}</Text>
            <Text className="text-xs font-bold text-primary">{ar ? 'مراجعة سريعة' : 'Quick check'}</Text>
          </Pressable>
        )}

        <View className="flex-row gap-2">
          <View className="h-11 min-w-0 flex-1 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={16} color="#94A3B8" />
            <TextInput value={q} onChangeText={setQ} placeholder={ar ? 'ابحث عن مادة' : 'Search materials'} placeholderTextColor="#94A3B8" className="flex-1 text-sm text-slate-800" />
          </View>
          <Pressable onPress={() => setPanel('settings')} className="h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Settings2 size={20} color="#64748B" />
          </Pressable>
          <Pressable onPress={() => setPanel('add')} className="h-11 flex-row items-center gap-1.5 rounded-xl bg-primary px-4">
            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
            <Text className="text-sm font-bold text-primary-foreground">{ar ? 'مادة' : 'Item'}</Text>
          </Pressable>
        </View>

        {usedSections.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2">
            {[{ id: 'all', ar: 'الكل', en: 'All' }, ...usedSections].map((s) => (
              <Pressable
                key={s.id}
                onPress={() => { setSection(s.id); setSub('all'); }}
                className={cn('h-9 flex-row items-center gap-1.5 rounded-full border px-3.5', section === s.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
              >
                <Text className={cn('text-xs font-bold', section === s.id ? 'text-primary-foreground' : 'text-slate-500')}>{ar ? s.ar : s.en}</Text>
                {s.id !== 'all' && <Text className={cn('text-xs', section === s.id ? 'text-primary-foreground' : 'text-slate-400')}>{counts(s.id)}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        )}
        {subs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5">
            {['all', ...subs].map((s) => (
              <Pressable key={s} onPress={() => setSub(s)} className={cn('h-7 justify-center rounded-full px-3', sub === s ? 'bg-slate-800' : 'bg-slate-100')}>
                <Text className={cn('text-[11px] font-bold', sub === s ? 'text-white' : 'text-slate-500')}>{s === 'all' ? (ar ? 'الكل' : 'All') : s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {shown.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Boxes size={28} color="#94A3B8" />
            </View>
            <Text className="mt-3 text-sm font-extrabold text-slate-800">{list.length === 0 ? (ar ? 'مخزنك جاهز' : 'Your stock is ready') : ar ? 'لا توجد مواد مطابقة' : 'No matching items'}</Text>
            {list.length === 0 && (
              <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
                {ar ? 'ما تطلبه من المستلزمات يظهر هنا لتضيفه بضغطة، أو أضف مادة بنفسك.' : 'What you order from supplies appears here to add in one tap, or add an item yourself.'}
              </Text>
            )}
          </View>
        ) : (
          <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {shown.map((m) => (
              <MaterialRow key={m.id} m={m} meta={meta} now={now} ar={ar} urls={urls} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
            ))}
          </View>
        )}
      </View>

      {panel === 'import' && <ImportSheet ar={ar} lines={lines} urls={urls} onClose={() => setPanel(null)} />}
      {panel === 'add' && <AddSheet ar={ar} onClose={() => setPanel(null)} />}
      {panel === 'settings' && <SettingsSheet ar={ar} meta={meta} onClose={() => setPanel(null)} />}
      {panel === 'review' && <ReviewSheet ar={ar} items={review} urls={urls} onClose={() => setPanel(null)} />}
    </Screen>
  );
}

function StatusPicker({ m, ar }: { m: Material; ar: boolean }) {
  return (
    <View className="flex-row gap-1.5">
      {STATUSES.map((s) => {
        const on = m.status === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => setMaterialStatus(m.id, s.id)}
            className="h-10 flex-1 items-center justify-center rounded-xl border"
            style={on ? { backgroundColor: s.on, borderColor: s.on } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <Text className="text-[11px] font-bold" style={{ color: on ? '#FFFFFF' : '#64748B' }}>{ar ? s.ar : s.en}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MaterialRow({ m, meta, now, ar, urls, open, onToggle }: { m: Material; meta: MaterialMeta; now: number; ar: boolean; urls: Record<string, string>; open: boolean; onToggle: () => void }) {
  const line = statusLine(m, meta, now, ar);
  const details = ([
    [ar ? 'القسم' : 'Section', [sectionName(m.category, ar), m.subCategory].filter(Boolean).join(' · ')],
    [ar ? 'المكتب' : 'Supplier', m.supplierName],
    [ar ? 'مكان التخزين' : 'Stored in', m.storageLocation],
    [ar ? 'رقم التشغيلة' : 'Batch', m.batchNumber],
  ] as [string, string][]).filter(([, v]) => v);
  const confirmRemove = () =>
    Alert.alert(ar ? 'حذف المادة' : 'Remove item', ar ? `حذف «${m.name}» من المخزن؟` : `Remove "${m.name}"?`, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'حذف' : 'Remove', style: 'destructive', onPress: () => removeMaterial(m.id) },
    ]);
  return (
    <View className={cn('border-b border-slate-100', open && 'bg-slate-50')}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 px-4 py-3">
        <Thumb image={m.image} urls={urls} name={m.name} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-bold text-slate-900">{m.name}</Text>
          <Text numberOfLines={1} className={cn('text-xs font-semibold', TONE[line.tone])}>{line.text}</Text>
        </View>
        <Text className="text-lg font-extrabold text-slate-900">{m.qty}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color="#94A3B8" />
        </View>
      </Pressable>
      {open && (
        <View className="gap-3 px-4 pb-4">
          <View>
            <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'كيف أصبحت؟' : 'How is it now?'}</Text>
            <StatusPicker m={m} ar={ar} />
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[11px] font-bold text-slate-500">{ar ? 'الكمية بالضبط (اختياري)' : 'Exact quantity (optional)'}</Text>
            <Pressable onPress={() => adjustMaterialQty(m.id, -1)} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"><Minus size={16} color="#334155" /></Pressable>
            <Text className="w-8 text-center text-sm font-extrabold text-slate-900">{m.qty}</Text>
            <Pressable onPress={() => adjustMaterialQty(m.id, 1)} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"><Plus size={16} color="#334155" /></Pressable>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-slate-500">{ar ? 'الصلاحية (سنة-شهر-يوم)' : 'Expiry (YYYY-MM-DD)'}</Text>
              <TextInput value={m.expiryDate} onChangeText={(v) => updateMaterial(m.id, { expiryDate: v.replace(/[^\d-]/g, '').slice(0, 10) })} placeholder="2027-05-01" placeholderTextColor="#94A3B8" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800" style={ltr} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-slate-500">{ar ? 'نبّهني عند كمية' : 'Alert at quantity'}</Text>
              <TextInput value={String(m.minQty)} onChangeText={(v) => updateMaterial(m.id, { minQty: Number(v.replace(/\D/g, '')) || 0 })} keyboardType="number-pad" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800" style={ltr} />
            </View>
          </View>
          {details.length > 0 && (
            <View className="flex-row flex-wrap gap-y-2">
              {details.map(([k, v]) => (
                <View key={k} style={{ width: '50%' }}>
                  <Text className="text-xs text-slate-500">{k}</Text>
                  <Text className="text-xs font-semibold text-slate-800">{v}</Text>
                </View>
              ))}
            </View>
          )}
          <View className="flex-row gap-2">
            {!!m.productId && (
              <Pressable onPress={() => router.push({ pathname: '/product-detail/[productId]', params: { productId: m.productId as string } })} className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                <PackagePlus size={16} color="#2563EB" />
                <Text className="text-xs font-bold text-primary">{ar ? 'إعادة الطلب' : 'Reorder'}</Text>
              </Pressable>
            )}
            <Pressable onPress={confirmRemove} className="h-10 flex-row items-center justify-center gap-1.5 rounded-xl px-3">
              <Trash2 size={16} color="#E11D48" />
              <Text className="text-xs font-bold text-rose-600">{ar ? 'حذف' : 'Remove'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function ImportSheet({ ar, lines, urls, onClose }: { ar: boolean; lines: ImportLine[]; urls: Record<string, string>; onClose: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(lines.map((l) => l.key)));
  const [edits, setEdits] = useState<Record<string, { category?: string; qty?: number; finished?: boolean; expiryDate?: string }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const set = (k: string, p: (typeof edits)[string]) => setEdits((e) => ({ ...e, [k]: { ...e[k], ...p } }));
  const line = (l: ImportLine) => ({ ...l, ...edits[l.key] });
  const chosen = lines.filter((l) => picked.has(l.key));
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const ignore = () =>
    Alert.alert(ar ? 'تجاهل المنتجات' : 'Ignore products', ar ? 'إخفاء المنتجات المحددة من هذه القائمة؟' : 'Hide the selected products from this list?', [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'تجاهل' : 'Ignore', onPress: () => { ignoreLines(chosen.map((l) => l.key)); onClose(); } },
    ]);
  return (
    <Sheet
      title={ar ? 'إضافة من مشترياتك' : 'Add from your purchases'}
      onClose={onClose}
      footer={
        <View className="flex-row gap-2">
          <PrimaryButton label={ar ? `إضافة ${chosen.length} إلى المخزن` : `Add ${chosen.length} to stock`} disabled={chosen.length === 0} onPress={() => { importMaterials(chosen.map(line)); onClose(); }} />
          <Pressable disabled={chosen.length === 0} onPress={ignore} className="h-12 items-center justify-center rounded-2xl border border-slate-200 px-4" style={{ opacity: chosen.length === 0 ? 0.5 : 1 }}>
            <Text className="text-xs font-bold text-slate-500">{ar ? 'تجاهل' : 'Ignore'}</Text>
          </Pressable>
        </View>
      }
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-xs text-slate-500">{ar ? 'كل منتج يذهب إلى قسمه تلقائياً.' : 'Each product goes to its own section.'}</Text>
        <Pressable onPress={() => setPicked(picked.size === lines.length ? new Set() : new Set(lines.map((l) => l.key)))}>
          <Text className="text-xs font-bold text-primary">{picked.size === lines.length ? (ar ? 'إلغاء الكل' : 'Clear all') : ar ? 'تحديد الكل' : 'Select all'}</Text>
        </Pressable>
      </View>
      {lines.map((raw) => {
        const l = line(raw);
        const on = picked.has(l.key);
        const open = editing === l.key;
        return (
          <View key={l.key} className={cn('rounded-2xl border p-3', on ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white')}>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => toggle(l.key)} className={cn('h-7 w-7 items-center justify-center rounded-lg border-2', on ? 'border-primary bg-primary' : 'border-slate-300')}>
                {on && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
              </Pressable>
              <Thumb image={l.image} urls={urls} name={l.name} />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-bold text-slate-900">{l.name}</Text>
                <Text numberOfLines={1} className="text-xs text-slate-500">{[sectionName(l.category, ar), l.subCategory].filter(Boolean).join(' · ')} · {l.qty} {ar ? 'قطعة' : 'pcs'}</Text>
              </View>
              <Pressable onPress={() => setEditing(open ? null : l.key)}>
                <Text className="text-xs font-bold text-primary">{ar ? 'تعديل' : 'Edit'}</Text>
              </Pressable>
            </View>
            {!!l.existing && l.existing.status !== 'out' && (
              <View className="mt-2.5 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
                <Text className="flex-1 text-xs font-semibold text-amber-900">{ar ? `عندك ${l.existing.qty} في المخزن. هل نفدت الكمية السابقة؟` : `You have ${l.existing.qty} in stock. Did the previous quantity run out?`}</Text>
                <Switch value={!!l.finished} onValueChange={(v) => set(l.key, { finished: v })} />
              </View>
            )}
            {open && (
              <View className="mt-2.5 gap-2">
                <View>
                  <Text className="mb-1 text-[11px] font-bold text-slate-500">{ar ? 'القسم' : 'Section'}</Text>
                  <Select value={l.category} onChange={(v) => set(l.key, { category: v })} options={MATERIAL_SECTIONS.map((s) => ({ value: s.id, label: ar ? s.ar : s.en }))} />
                </View>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="mb-1 text-[11px] font-bold text-slate-500">{ar ? 'الكمية' : 'Quantity'}</Text>
                    <TextInput value={String(l.qty)} onChangeText={(v) => set(l.key, { qty: Number(v.replace(/\D/g, '')) || 0 })} keyboardType="number-pad" className={inp} style={ltr} />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-[11px] font-bold text-slate-500">{ar ? 'الصلاحية (اختياري)' : 'Expiry (optional)'}</Text>
                    <TextInput value={l.expiryDate ?? ''} onChangeText={(v) => set(l.key, { expiryDate: v.replace(/[^\d-]/g, '').slice(0, 10) })} placeholder="2027-05-01" placeholderTextColor="#94A3B8" className={inp} style={ltr} />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </Sheet>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[11px] font-bold text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

function AddSheet({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: '', category: 'general', subCategory: '', qty: '1', minQty: '1', expiryDate: '', storageLocation: '' });
  const subs = subcategoriesOf(f.category);
  const save = () => {
    if (!f.name.trim()) return;
    addMaterial({ ...f, name: f.name.trim(), subCategory: f.subCategory || undefined, qty: Number(f.qty) || 0, minQty: Number(f.minQty) || 0 });
    onClose();
  };
  return (
    <Sheet title={ar ? 'إضافة مادة' : 'Add an item'} onClose={onClose} footer={<View className="flex-row"><PrimaryButton label={ar ? 'حفظ' : 'Save'} disabled={!f.name.trim()} onPress={save} /></View>}>
      <Labeled label={ar ? 'اسم المادة' : 'Name'}>
        <TextInput autoFocus value={f.name} onChangeText={(v) => setF({ ...f, name: v })} className={inp} />
      </Labeled>
      <Labeled label={ar ? 'القسم' : 'Section'}>
        <Select value={f.category} onChange={(v) => setF({ ...f, category: v, subCategory: '' })} options={MATERIAL_SECTIONS.map((s) => ({ value: s.id, label: ar ? s.ar : s.en }))} />
      </Labeled>
      {subs.length > 0 && (
        <Labeled label={ar ? 'القسم الفرعي' : 'Subsection'}>
          <Select value={f.subCategory} onChange={(v) => setF({ ...f, subCategory: v })} options={[{ value: '', label: '—' }, ...subs.map((s) => ({ value: s.ar, label: ar ? s.ar : s.en }))]} />
        </Labeled>
      )}
      <View className="flex-row gap-2.5">
        <Labeled label={ar ? 'الكمية' : 'Quantity'}>
          <TextInput value={f.qty} onChangeText={(v) => setF({ ...f, qty: v.replace(/\D/g, '') })} keyboardType="number-pad" className={inp} style={ltr} />
        </Labeled>
        <Labeled label={ar ? 'نبّهني عند كمية' : 'Alert at quantity'}>
          <TextInput value={f.minQty} onChangeText={(v) => setF({ ...f, minQty: v.replace(/\D/g, '') })} keyboardType="number-pad" className={inp} style={ltr} />
        </Labeled>
      </View>
      <Labeled label={ar ? 'الصلاحية، سنة-شهر-يوم (اختياري)' : 'Expiry, YYYY-MM-DD (optional)'}>
        <TextInput value={f.expiryDate} onChangeText={(v) => setF({ ...f, expiryDate: v.replace(/[^\d-]/g, '').slice(0, 10) })} placeholder="2027-05-01" placeholderTextColor="#94A3B8" className={inp} style={ltr} />
      </Labeled>
      <Labeled label={ar ? 'مكان التخزين (اختياري)' : 'Stored in (optional)'}>
        <TextInput value={f.storageLocation} onChangeText={(v) => setF({ ...f, storageLocation: v })} className={inp} />
      </Labeled>
    </Sheet>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: number; options: { v: number; t: string }[]; onChange: (v: number) => void }) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-bold text-slate-800">{label}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {options.map((o) => (
          <Pressable key={o.v} onPress={() => onChange(o.v)} className={cn('h-9 justify-center rounded-full border px-3.5', value === o.v ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
            <Text className={cn('text-xs font-bold', value === o.v ? 'text-primary-foreground' : 'text-slate-500')}>{o.t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SettingsSheet({ ar, meta, onClose }: { ar: boolean; meta: MaterialMeta; onClose: () => void }) {
  return (
    <Sheet title={ar ? 'إعدادات التنبيه' : 'Alert settings'} onClose={onClose}>
      <View className="flex-row items-start gap-2 rounded-xl bg-slate-100 p-3">
        <BellRing size={16} color="#64748B" />
        <Text className="flex-1 text-xs leading-5 text-slate-600">{ar ? 'لا تصلك إشعارات. يظهر رقم أحمر على أيقونة المواد ويختفي عند فتحها.' : 'No notifications. A red number appears on the materials icon and clears when you open it.'}</Text>
      </View>
      <Choice label={ar ? 'نبّهني قبل نفاد المادة بـ' : 'Warn before it runs out'} value={meta.leadDays} onChange={(leadDays) => setMaterialMeta({ leadDays })} options={[{ v: 14, t: ar ? 'أسبوعين' : '2 weeks' }, { v: 30, t: ar ? 'شهر' : '1 month' }, { v: 60, t: ar ? 'شهرين' : '2 months' }]} />
      <Choice label={ar ? 'نبّهني قبل انتهاء الصلاحية بـ' : 'Warn before expiry'} value={meta.expiryDays} onChange={(expiryDays) => setMaterialMeta({ expiryDays })} options={[{ v: 30, t: ar ? 'شهر' : '1 month' }, { v: 60, t: ar ? 'شهرين' : '2 months' }, { v: 90, t: ar ? '3 أشهر' : '3 months' }]} />
      <Choice label={ar ? 'اسألني عن المواد غير المحدَّثة كل' : 'Ask about stale items every'} value={meta.reviewDays} onChange={(reviewDays) => setMaterialMeta({ reviewDays })} options={[{ v: 14, t: ar ? 'أسبوعين' : '2 weeks' }, { v: 30, t: ar ? 'شهر' : '1 month' }, { v: 60, t: ar ? 'شهرين' : '2 months' }, { v: 0, t: ar ? 'إيقاف' : 'Off' }]} />
      <View className="flex-row items-start gap-2">
        <AlertTriangle size={14} color="#94A3B8" />
        <Text className="flex-1 text-[11px] leading-5 text-slate-500">{ar ? 'وقت النفاد تقدير يتعلمه التطبيق كلما سجلت أن مادة نفدت. قبل ذلك يعتمد على الكمية التي تحددها لكل مادة.' : 'Run-out time is an estimate learned each time you mark an item out. Until then it uses the alert quantity.'}</Text>
      </View>
    </Sheet>
  );
}

function ReviewSheet({ ar, items, urls, onClose }: { ar: boolean; items: Material[]; urls: Record<string, string>; onClose: () => void }) {
  const [ids] = useState(() => items.map((m) => m.id));
  const list = useMaterials().filter((m) => ids.includes(m.id));
  return (
    <Sheet title={ar ? 'مراجعة سريعة' : 'Quick check'} onClose={onClose} footer={<View className="flex-row"><PrimaryButton label={ar ? 'تم' : 'Done'} onPress={() => { list.forEach((m) => confirmMaterial(m.id)); onClose(); }} /></View>}>
      <Text className="text-xs text-slate-500">{ar ? 'اضغط الحالة لكل مادة.' : 'Tap the status of each item.'}</Text>
      {list.map((m) => (
        <View key={m.id} className="rounded-2xl border border-slate-200 bg-white p-3">
          <View className="mb-2.5 flex-row items-center gap-3">
            <Thumb image={m.image} urls={urls} name={m.name} size={36} />
            <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-bold text-slate-900">{m.name}</Text>
          </View>
          <StatusPicker m={m} ar={ar} />
        </View>
      ))}
    </Sheet>
  );
}

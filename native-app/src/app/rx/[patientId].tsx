import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Building2,
  FilePenLine,
  MapPin,
  NotebookPen,
  Phone,
  Pill,
  Printer,
  Search,
  Send,
  Star,
  Stethoscope,
  Trash2,
  X,
  Plus,
} from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { usePatients } from '@/lib/patientsStore';
import { RX_CATALOG, RX_CATEGORIES, type RxCatalogItem, type RxCompany } from '@/data/rx-catalog';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { sharePdf, invoiceHtml } from '@/lib/print';

const COMPANY_LOGOS: Record<string, number> = {
  KIN: require('../../../assets/rx/kin.jpg'),
  LACALUT: require('../../../assets/rx/lacalut.jpg'),
  WISDOM: require('../../../assets/rx/wisdom.jpg'),
};

const COMPANIES: { key: RxCompany | 'ALL'; label: string; ar: string }[] = [
  { key: 'ALL', label: 'All', ar: 'جميع الشركات' },
  { key: 'LACALUT', label: 'LACALUT', ar: 'LACALUT' },
  { key: 'WISDOM', label: 'WISDOM', ar: 'WISDOM' },
  { key: 'KIN', label: 'KIN', ar: 'KIN' },
];

const FAV_KEY = 'dh:rx:favs:v1';
const HIDDEN_KEY = 'dh:rx:hidden:v1';
const HEADER_KEY = 'dh:rx:header:v1';

// Dedicated array loader for the hidden-medicines list — `loadJSON` below
// merges its fallback as an *object* (`{ ...fallback, ...parsed }`), which
// silently turns an array fallback into `{0: "a", 1: "b"}` instead of a real
// array. Kept separate rather than reusing it for this new feature.
function loadIdList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type RxHeader = {
  clinicName: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicPhone: string;
  clinicAddress: string;
};

const DEFAULT_HEADER: RxHeader = {
  clinicName: '',
  doctorName: '',
  doctorSpecialty: '',
  clinicPhone: '',
  clinicAddress: '',
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...(fallback as object), ...JSON.parse(raw) } as T : fallback;
  } catch {
    return fallback;
  }
}

export default function RxScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);

  const [header, setHeader] = useState<RxHeader>(DEFAULT_HEADER);
  const [editHeader, setEditHeader] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [items, setItems] = useState<RxCatalogItem[]>([]);

  useEffect(() => {
    setHeader(loadJSON(HEADER_KEY, DEFAULT_HEADER));
  }, []);

  const saveHeader = (h: RxHeader) => {
    setHeader(h);
    try {
      localStorage.setItem(HEADER_KEY, JSON.stringify(h));
    } catch {
      /* ignore */
    }
  };

  const today = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  }, []);

  if (!p) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-slate-500">{ar ? 'المريض غير موجود' : 'Patient not found'}</Text>
      </Screen>
    );
  }

  const rxText = () => {
    let msg = '';
    if (header.clinicName) msg += `*${header.clinicName}*\n`;
    if (header.doctorName) {
      msg += `*الطبيب:* ${header.doctorName}${header.doctorSpecialty ? ` (${header.doctorSpecialty})` : ''}\n`;
    }
    msg += `*المريض:* ${p.name}\n`;
    msg += '-----------------------------------\n';
    msg += '*الوصفة الطبية (Rx):*\n\n';
    items.forEach((m, i) => {
      msg += `${i + 1}. *${m.name}*\n   - الجرعة: ${m.dosage} — ${m.instruction}\n   - المدة: ${m.duration}\n\n`;
    });
    msg += '-----------------------------------\n';
    if (header.clinicAddress) msg += `📍 ${header.clinicAddress}\n`;
    if (header.clinicPhone) msg += `📞 ${header.clinicPhone}\n`;
    msg += 'مع تمنياتنا لكم بالشفاء العاجل.';
    return msg;
  };

  const sendWhatsApp = async () => {
    if (!items.length) return;
    const phone = (p.phone || '').replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(rxText())}`;
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else Share.share({ message: rxText() });
  };

  const printPdf = async () => {
    if (!items.length) return;
    const ok = await sharePdf(
      `Rx-${p.name}.pdf`,
      invoiceHtml({
        ar,
        title: ar ? 'الوصفة الطبية الإلكترونية (Rx)' : 'e-Prescription (Rx)',
        meta: [
          { label: ar ? 'الطبيب' : 'Doctor', value: header.doctorName || '—' },
          { label: ar ? 'الاختصاص' : 'Specialty', value: header.doctorSpecialty || '—' },
          { label: ar ? 'العيادة' : 'Clinic', value: header.clinicName || '—' },
          { label: ar ? 'المريض' : 'Patient', value: p.name },
          { label: ar ? 'العمر' : 'Age', value: String(p.age || '—') },
          { label: ar ? 'التاريخ' : 'Date', value: today },
        ],
        rows: items.map((m) => ({ name: m.nameAr || m.name, detail: `${m.instruction} — ${m.duration}` })),
      }),
    );
    if (!ok) toast.error(ar ? 'تعذر إنشاء PDF' : 'Could not create PDF');
  };

  return (
    <Screen>
      <Pressable
        onPress={() => setEditHeader(true)}
        className="h-11 flex-row items-center justify-center gap-1.5 rounded-xl border px-3"
        style={{ borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.05)' }}
      >
        <FilePenLine size={15} color="#3B82F6" />
        <Text className="text-xs font-bold text-primary">
          {ar ? 'تعديل معلومات العيادة والطبيب' : 'Edit clinic & doctor info'}
        </Text>
      </Pressable>

      {/* Prescription sheet */}
      <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-5" style={{ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[15px] font-extrabold text-primary">
              {header.doctorName || (ar ? 'اسم الطبيب' : 'Doctor name')}
            </Text>
            <Text className="mt-0.5 text-[11px] text-slate-400">
              {header.doctorSpecialty || (ar ? 'الاختصاص' : 'Specialty')}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-slate-600">
              {header.clinicName || (ar ? 'اسم العيادة' : 'Clinic name')}
            </Text>
          </View>
          <View
            className="h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}
          >
            <Stethoscope size={26} color="#3B82F6" />
          </View>
        </View>

        <View className="my-3 h-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.7)' }} />

        {/* Patient bar */}
        <View className="flex-row items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2">
          <Text numberOfLines={1} className="text-xs font-bold text-slate-800">
            {ar ? 'المريض' : 'Patient'}: {p.name}
          </Text>
          <Text className="shrink-0 text-[11px] text-slate-400">
            {ar ? 'العمر' : 'Age'}: {p.age || '—'}
          </Text>
          <Text className="shrink-0 text-[11px] text-slate-400">{today}</Text>
        </View>

        {/* Rx symbol */}
        <Text className="mt-4 text-3xl font-extrabold italic text-primary">Rx</Text>

        {/* Items */}
        <View className="mt-3">
          {items.length === 0 ? (
            <View className="items-center py-8">
              <NotebookPen size={34} color="#CBD5E1" />
              <Text className="mt-2 text-xs text-slate-400">
                {ar ? 'الورقة فارغة.. اضغط "إضافة دواء" في الأسفل' : 'Empty sheet — tap "Add medicine"'}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {items.map((m, i) => (
                <View key={`${m.id}-${i}`} className="flex-row items-start gap-2">
                  <Text className="text-sm font-bold text-slate-800">{i + 1}.</Text>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-bold text-slate-900">{m.name}</Text>
                    <Text className="mt-0.5 text-[11px] text-slate-400">
                      {ar ? 'التعليمات' : 'Instructions'}: {m.instruction} ({m.duration})
                    </Text>
                  </View>
                  <Pressable onPress={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 p-1">
                    <X size={16} color="#E11D48" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="my-4 h-px bg-slate-100" />

        {/* Footer */}
        <View className="flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-center gap-1">
              <MapPin size={11} color="#94A3B8" />
              <Text numberOfLines={1} className="text-[10px] text-slate-400">
                {header.clinicAddress || '—'}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Phone size={11} color="#94A3B8" />
              <Text className="text-[10px] text-slate-400">{header.clinicPhone || '—'}</Text>
            </View>
          </View>
          <View className="shrink-0 items-center">
            <Text className="text-[10px] text-slate-400">{ar ? 'توقيع الطبيب' : 'Signature'}</Text>
            <Text className="mt-3 text-xs text-slate-300">.........................</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <Pressable
        onPress={() => setAddOpen(true)}
        className="mt-3 h-12 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary"
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
        <Text className="text-[13px] font-bold text-primary-foreground">
          {ar ? 'إضافة دواء للورقة' : 'Add medicine'}
        </Text>
      </Pressable>

      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={printPdf}
          disabled={!items.length}
          className={cn('h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-primary bg-white', !items.length && 'opacity-50')}
        >
          <Printer size={15} color="#3B82F6" />
          <Text className="text-xs font-bold text-primary">{ar ? 'طباعة PDF' : 'Print PDF'}</Text>
        </Pressable>
        <Pressable
          onPress={sendWhatsApp}
          disabled={!items.length}
          className={cn('h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', !items.length && 'opacity-50')}
          style={{ backgroundColor: '#25D366' }}
        >
          <Send size={15} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">{ar ? 'إرسال WhatsApp' : 'WhatsApp'}</Text>
        </Pressable>
      </View>

      {editHeader && <HeaderDialog header={header} onClose={() => setEditHeader(false)} onSave={saveHeader} ar={ar} />}
      {addOpen && (
        <AddMedicineSheet
          ar={ar}
          onClose={() => setAddOpen(false)}
          onPick={(m) => {
            setItems((prev) => [...prev, m]);
            setAddOpen(false);
          }}
        />
      )}
    </Screen>
  );
}

function HeaderDialog({
  header,
  onClose,
  onSave,
  ar,
}: {
  header: RxHeader;
  onClose: () => void;
  onSave: (h: RxHeader) => void;
  ar: boolean;
}) {
  const [form, setForm] = useState<RxHeader>(header);

  const field = (key: keyof RxHeader, label: string) => (
    <View>
      <Text className="text-[11px] font-semibold text-slate-500">{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        placeholderTextColor="#94A3B8"
        className="mt-1 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-800"
      />
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-sm gap-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-extrabold text-slate-900">
            {ar ? 'تعديل معلومات ورقة الوصفة' : 'Edit prescription header'}
          </Text>
          {field('doctorName', ar ? 'اسم الطبيب' : 'Doctor name')}
          {field('doctorSpecialty', ar ? 'الاختصاص' : 'Specialty')}
          {field('clinicName', ar ? 'اسم العيادة' : 'Clinic name')}
          {field('clinicPhone', ar ? 'هاتف العيادة' : 'Clinic phone')}
          {field('clinicAddress', ar ? 'عنوان العيادة' : 'Clinic address')}
          <View className="flex-row gap-2 pt-1">
            <Pressable onPress={onClose} className="h-10 flex-1 items-center justify-center rounded-xl border border-slate-200">
              <Text className="text-xs font-bold text-slate-700">{ar ? 'إلغاء' : 'Cancel'}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onSave(form);
                onClose();
              }}
              className="h-10 flex-1 items-center justify-center rounded-xl bg-primary"
            >
              <Text className="text-xs font-bold text-primary-foreground">{ar ? 'حفظ التعديلات' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddMedicineSheet({
  onClose,
  onPick,
  ar,
}: {
  onClose: () => void;
  onPick: (m: RxCatalogItem) => void;
  ar: boolean;
}) {
  const [cat, setCat] = useState('الكل');
  const [company, setCompany] = useState<RxCompany | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    setFavs(loadJSON<string[]>(FAV_KEY, []));
    setHidden(loadIdList(HIDDEN_KEY));
  }, []);

  // Not every doctor uses every medicine in the catalog — let them permanently
  // hide the ones they never prescribe, after an explicit confirmation, so
  // their own list stays short instead of scrolling past irrelevant items.
  const confirmDelete = (m: RxCatalogItem) => {
    Alert.alert(
      ar ? 'حذف الدواء' : 'Delete medicine',
      ar
        ? `هل تريد حذف "${m.nameAr || m.name}" وصورته من هذه القائمة؟`
        : `Delete "${m.name}" and its image from this list?`,
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: ar ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => {
            setHidden((prev) => {
              if (prev.includes(m.id)) return prev;
              const next = [...prev, m.id];
              try {
                localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
              } catch {
                /* ignore */
              }
              return next;
            });
          },
        },
      ],
    );
  };

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return RX_CATALOG.filter(
      (m) =>
        !hidden.includes(m.id) &&
        (cat === 'الكل' || m.category === cat) &&
        (company === 'ALL' || m.company === company) &&
        `${m.name} ${m.nameAr ?? ''}`.toLowerCase().includes(needle),
    ).sort((a, b) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)));
  }, [cat, company, q, favs, hidden]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-white px-4 pb-4 pt-3">
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-slate-200" />
          <Text className="mb-3 text-[17px] font-extrabold text-slate-900">
            {ar ? 'اختر دواء لإضافته للورقة' : 'Pick a medicine'}
          </Text>

          <View className="relative mb-3">
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={ar ? 'ابحث عن دواء...' : 'Search medicine...'}
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-full border border-slate-200 bg-slate-50 pl-4 pr-11 text-[13px] text-slate-800"
            />
            <View className="absolute bottom-0 right-4 top-0 justify-center">
              <Search size={15} color="#94A3B8" />
            </View>
          </View>

          {/* Company cards */}
          <View className="mb-2 flex-row gap-2">
            {COMPANIES.map((c) => {
              const active = company === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCompany(c.key)}
                  className="flex-1 items-center justify-center gap-1 overflow-hidden rounded-2xl border bg-white px-1 py-2.5"
                  style={active ? { borderColor: '#3B82F6', borderWidth: 2 } : { borderColor: '#E2E8F0' }}
                >
                  {c.key === 'ALL' ? (
                    <Building2 size={22} color="#3B82F6" />
                  ) : (
                    <Image source={COMPANY_LOGOS[c.key]} style={{ width: '100%', height: 28 }} resizeMode="contain" />
                  )}
                  <Text numberOfLines={1} className="text-center text-[9px] font-bold text-slate-500">
                    {ar ? c.ar : c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5 py-1">
            {RX_CATEGORIES.map((c) => {
              const active = cat === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCat(c)}
                  className={cn('h-9 items-center justify-center rounded-full border px-4', active ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
                >
                  <Text className={cn('text-[12px] font-bold', active ? 'text-primary-foreground' : 'text-slate-500')}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView className="mt-2" contentContainerClassName="gap-2.5 pb-2">
            {list.map((m) => {
              const fav = favs.includes(m.id);
              return (
                <View
                  key={m.id}
                  className="flex-row items-center gap-2 rounded-2xl border bg-white p-3"
                  style={fav ? { borderColor: 'rgba(59,130,246,0.4)' } : { borderColor: '#E2E8F0' }}
                >
                  <View
                    className="h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                    style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
                  >
                    {m.image ? (
                      <Image source={{ uri: m.image }} className="h-full w-full bg-white" resizeMode="contain" />
                    ) : (
                      <Pill size={18} color="#3B82F6" />
                    )}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-bold text-slate-900">
                      {m.name}
                    </Text>
                    {!!m.nameAr && (
                      <Text numberOfLines={1} className="text-[11px] font-semibold text-slate-500">
                        {m.nameAr}
                      </Text>
                    )}
                    <Text numberOfLines={2} className="mt-0.5 text-[11px] text-slate-400">
                      {m.instruction} ({m.duration})
                    </Text>
                  </View>
                  <Pressable onPress={() => toggleFav(m.id)} className="shrink-0 p-1">
                    <Star size={20} color={fav ? '#FBBF24' : '#CBD5E1'} fill={fav ? '#FBBF24' : 'transparent'} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(m)} className="shrink-0 p-1">
                    <Trash2 size={18} color="#CBD5E1" />
                  </Pressable>
                  <Pressable
                    onPress={() => onPick(m)}
                    className="h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
                  >
                    <Plus size={18} color="#3B82F6" />
                  </Pressable>
                </View>
              );
            })}
            {list.length === 0 && (
              <Text className="py-6 text-center text-xs text-slate-400">{ar ? 'لا نتائج' : 'No results'}</Text>
            )}
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

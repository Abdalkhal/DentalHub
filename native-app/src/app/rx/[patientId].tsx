import { useState } from 'react';
import { Modal, Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen, Card, Button, Text } from '@/components/ui';
import { usePatients } from '@/lib/patientsStore';
import { RX_CATALOG, RX_CATEGORIES, type RxCatalogItem } from '@/data/rx-catalog';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { sharePdf, invoiceHtml } from '@/lib/print';

export default function RxScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);

  const [items, setItems] = useState<RxCatalogItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cat, setCat] = useState('all');

  if (!p) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-slate-500">{ar ? 'المريض غير موجود' : 'Patient not found'}</Text>
      </Screen>
    );
  }

  const filtered = RX_CATALOG.filter((m) => cat === 'all' || m.category === cat);
  const today = new Date().toLocaleDateString();

  const share = async () => {
    const lines = items.map((m, i) => `${i + 1}. ${m.name} — ${m.instruction} (${m.duration})`);
    const text = [
      ar ? `وصفة طبية — ${p.name}` : `Prescription — ${p.name}`,
      ar ? `التاريخ: ${today}` : `Date: ${today}`,
      ...lines,
    ].join('\n');
    await Share.share({ message: text });
  };

  const sharePdfRx = async () => {
    if (items.length === 0) {
      toast.info(ar ? 'الورقة فارغة — أضف دواء أولاً' : 'Empty — add medicines first');
      return;
    }
    const ok = await sharePdf(
      `Rx-${p.name}.pdf`,
      invoiceHtml({
        title: ar ? 'وصفة طبية' : 'Prescription',
        meta: [
          { label: ar ? 'المريض' : 'Patient', value: p.name },
          { label: ar ? 'التاريخ' : 'Date', value: today },
        ],
        rows: items.map((m) => ({ name: m.nameAr || m.name, detail: m.instruction, price: m.duration })),
      }),
    );
    if (!ok) toast.error(ar ? 'تعذر إنشاء PDF' : 'Could not create PDF');
  };

  return (
    <Screen>
      <Card>
        <Text className="text-lg font-extrabold text-primary">Rx</Text>
        <Text className="mt-1 text-sm font-bold text-slate-800">
          {ar ? 'وصفة طبية' : 'Prescription'} — {p.name}
        </Text>
        <Text className="text-[11px] text-slate-400">{today}</Text>
      </Card>

      {items.length === 0 ? (
        <Text className="mt-8 text-center text-slate-400">
          {ar ? 'الورقة فارغة — أضف دواء' : 'Empty — add a medicine'}
        </Text>
      ) : (
        <View className="mt-4 space-y-2">
          {items.map((m, i) => (
            <Card key={`${m.id}-${i}`} className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">{m.name}</Text>
                <Text className="text-[11px] text-slate-500">
                  {m.instruction} ({m.duration})
                </Text>
              </View>
              <Button variant="ghost" title="✕" onPress={() => setItems((prev) => prev.filter((_, x) => x !== i))} />
            </Card>
          ))}
        </View>
      )}

      <View className="mt-5 flex-row gap-2">
        <Button variant="outline" title={ar ? 'مشاركة' : 'Share'} onPress={share} className="flex-1" />
        <Button variant="outline" title="PDF" onPress={sharePdfRx} className="flex-1" />
        <Button title={ar ? '+ دواء' : '+ Medicine'} onPress={() => setPickerOpen(true)} className="flex-1" />
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[85%] rounded-t-3xl bg-white p-4 pb-8">
            <Text className="text-lg font-extrabold">{ar ? 'اختر دواء' : 'Pick a medicine'}</Text>
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={cat === 'all' ? 'primary' : 'outline'}
                title={ar ? 'الكل' : 'All'}
                onPress={() => setCat('all')}
              />
              {RX_CATEGORIES.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cat === c ? 'primary' : 'outline'}
                  title={c}
                  onPress={() => setCat(c)}
                />
              ))}
            </View>
            <View className="mt-3 space-y-2">
              {filtered.map((m) => (
                <PressableRow
                  key={m.id}
                  title={m.nameAr || m.name}
                  sub={`${m.instruction} (${m.duration})`}
                  onPress={() => {
                    setItems((prev) => [...prev, m]);
                  }}
                />
              ))}
            </View>
            <Button title={ar ? 'تم' : 'Done'} onPress={() => setPickerOpen(false)} className="mt-4" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function PressableRow({
  title,
  sub,
  onPress,
}: {
  title: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Button variant="outline" title={`${title}${sub ? ` — ${sub}` : ''}`} onPress={onPress} className="border-border" />
  );
}

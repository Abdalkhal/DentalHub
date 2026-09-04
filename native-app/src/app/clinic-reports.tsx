import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Screen, Card, Text } from '@/components/ui';
import { useUserRole } from '@/lib/useAuth';
import { setAppointmentsStoreUser, useAppointments } from '@/lib/appointmentsStore';
import { setClinicStoreUser, useClinic, clinicTotals } from '@/lib/clinicStore';
import { usePatients } from '@/lib/patientsStore';
import { useI18n } from '@/lib/i18n';

export default function ClinicReportsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    if (user?.uid) {
      setAppointmentsStoreUser(user.uid);
      setClinicStoreUser(user.uid);
    }
  }, [user?.uid]);

  const patients = usePatients();
  const appointments = useAppointments();
  const clinic = useClinic();
  const totals = clinicTotals(clinic);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = appointments.filter((a) => a.date === today).length;

  const cards: { label: string; value: string; tone: string }[] = [
    { label: ar ? 'المرضى' : 'Patients', value: String(patients.length), tone: 'text-sky-600' },
    { label: ar ? 'مواعيد اليوم' : "Today's visits", value: String(todayCount), tone: 'text-amber-600' },
    { label: ar ? 'إجمالي المواعيد' : 'Appointments', value: String(appointments.length), tone: 'text-violet-600' },
    { label: ar ? 'الصافي' : 'Net', value: totals.net.toLocaleString(), tone: 'text-emerald-600' },
  ];

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'التقارير والإحصائيات' : 'Reports & Statistics'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'نظرة عامة على عيادتك' : 'An overview of your clinic'}
      </Text>

      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
        {cards.map((c) => (
          <Card key={c.label} className="w-[48.5%] items-center py-5">
            <Text className={'text-2xl font-extrabold ' + c.tone}>{c.value}</Text>
            <Text className="mt-1 text-center text-xs text-slate-500">{c.label}</Text>
          </Card>
        ))}
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-extrabold text-slate-800">
          {ar ? 'أحدث المرضى' : 'Recent patients'}
        </Text>
        {patients.length === 0 ? (
          <Text className="py-6 text-center text-slate-400">{ar ? 'لا يوجد مرضى بعد' : 'No patients yet'}</Text>
        ) : (
          <View className="gap-2">
            {patients.slice(0, 5).map((p) => (
              <PressableRow
                key={p.id}
                title={p.name}
                onPress={() => router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } })}
              />
            ))}
          </View>
        )}
      </View>

      <Card className="mt-4">
        <Text className="text-xs font-bold text-slate-500">{ar ? 'الإيرادات' : 'Income'}</Text>
        <Text className="mt-1 text-sm font-extrabold text-emerald-600">{totals.income.toLocaleString()}</Text>
        <Text className="mt-3 text-xs font-bold text-slate-500">{ar ? 'المصروفات' : 'Expenses'}</Text>
        <Text className="mt-1 text-sm font-extrabold text-rose-500">{totals.expense.toLocaleString()}</Text>
      </Card>
    </Screen>
  );
}

function PressableRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
      <Text className="flex-1 text-sm font-bold text-slate-800">{title}</Text>
      <ChevronRight size={16} color="#CBD5E1" />
    </Pressable>
  );
}

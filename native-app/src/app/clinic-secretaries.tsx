import { useEffect } from 'react';
import { View } from 'react-native';
import { KeyRound, Link2, ShieldCheck, UserPlus } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { ClinicStaffCard } from '@/components/ClinicStaff';
import { setClinicsStoreUser } from '@/lib/clinicsStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';

export default function ClinicSecretariesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    // Opening this screen directly must still resolve the active clinic.
    if (user?.uid) setClinicsStoreUser(user.uid);
  }, [user?.uid]);

  const steps = [
    { Icon: UserPlus, title: ar ? 'ادعُ السكرتير' : 'Invite', text: ar ? 'اختر قالب الصلاحيات وأنشئ الرابط' : 'Pick permissions, create a link' },
    { Icon: Link2, title: ar ? 'يفتح الرابط' : 'They open it', text: ar ? 'ينشئ حسابه وينضم تلقائياً' : 'Own account, joins at once' },
    { Icon: KeyRound, title: ar ? 'تتحكم أنت' : 'You decide', text: ar ? 'عدّل أو أوقف الوصول متى شئت' : 'Change or stop access any time' },
  ];

  return (
    <Screen>
      <View className="overflow-hidden rounded-3xl bg-[#6D28D9] p-5">
        <View
          style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' }}
        />
        <View className="flex-row items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ShieldCheck size={24} color="#FFFFFF" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-extrabold text-white">{ar ? 'سكرتارية العيادة' : 'Clinic secretaries'}</Text>
            <Text className="mt-1 text-xs leading-5 text-white/85">
              {ar
                ? 'لكل سكرتير حسابه الخاص، ويرى فقط ما تسمح به: المواعيد، الحجوزات، الدفعات، المواد. لا يحذف مريضاً ولا دفعة، ولا يرى مستحقات الأطباء.'
                : "Each secretary has their own account and sees only what you allow. They can't delete a patient or a payment, or see doctors' dues."}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        {steps.map((s, i) => (
          <View key={s.title} className="flex-1 items-center rounded-2xl border border-slate-200 bg-white p-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <s.Icon size={16} color="#7C3AED" />
            </View>
            <Text className="mt-2 text-center text-[12px] font-extrabold text-slate-800">
              {i + 1}. {s.title}
            </Text>
            <Text className="mt-0.5 text-center text-[10px] leading-4 text-slate-500">{s.text}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4">
        <ClinicStaffCard ar={ar} />
      </View>
    </Screen>
  );
}

// A suspended account sees this over the app. The admin's decision takes effect
// here at once; the server also disables the sign-in (functions/adminConsole.js).
import { Pressable, View } from 'react-native';
import { signOutDevice } from '@/lib/push';
import { LogOut, ShieldAlert } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { auth } from '@/integrations/firebase/client';
import { useUserRole } from '@/lib/useAuth';

export function SuspendedGate() {
  const { role } = useUserRole();
  if (role?.accountStatus !== 'suspended') return null;
  const reason = (role as { suspendedReason?: string }).suspendedReason;
  return (
    <View className="absolute inset-0 items-center justify-center bg-slate-50 p-5" style={{ zIndex: 1000 }}>
      <View className="w-full max-w-sm items-center rounded-3xl border border-slate-200 bg-white p-7">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
          <ShieldAlert size={28} color="#E11D48" />
        </View>
        <Text className="mt-4 text-lg font-extrabold text-slate-900">تم إيقاف حسابك</Text>
        {!!reason && (
          <View className="mt-2 w-full rounded-xl bg-slate-50 p-3">
            <Text className="text-center text-sm text-slate-700">{reason}</Text>
          </View>
        )}
        <Text className="mt-3 text-center text-sm leading-6 text-slate-500">بياناتك محفوظة ولم يُحذف منها شيء. للاستفسار تواصل مع الدعم.</Text>
        <Pressable onPress={() => void signOutDevice()} className="mt-5 h-11 flex-row items-center gap-2 rounded-xl bg-slate-100 px-5">
          <LogOut size={16} color="#334155" />
          <Text className="text-sm font-bold text-slate-700">تسجيل الخروج</Text>
        </Pressable>
      </View>
    </View>
  );
}

import { Pressable, View } from 'react-native';
import { signOutDevice } from '@/lib/push';
import { ShieldAlert } from 'lucide-react-native';

import { AdminConsole } from '@/components/admin/AdminConsole';
import { Screen, Spinner, Text } from '@/components/ui';
import { auth } from '@/integrations/firebase/client';
import { useI18n } from '@/lib/i18n';
import { useIsAdmin, useUserRole } from '@/lib/useAuth';

export default function AdminScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { role } = useUserRole();
  // Checks the signed ID token's custom claim, same as the web app's
  // /admin-standalone, so the screen protects itself however someone lands on
  // it. The server checks again on every action (functions/adminConsole.js).
  const { isAdmin, loading } = useIsAdmin();

  if (loading) return <Spinner />;

  if (!isAdmin) {
    return (
      <Screen>
        <View className="items-center py-20">
          <ShieldAlert size={48} color="#F43F5E" strokeWidth={1.5} />
          <Text className="mt-4 text-base font-extrabold text-slate-800">
            {ar ? 'لا تملك صلاحية المدير' : 'You are not authorized as admin'}
          </Text>
          <Text className="mt-1.5 text-center text-xs text-slate-500">
            {ar ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم' : 'This account is not permitted to access the admin panel'}
          </Text>
          <Pressable
            onPress={() => signOutDevice()}
            className="mt-6 h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6"
          >
            <Text className="text-sm font-bold text-rose-600">{ar ? 'تسجيل الخروج' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return <AdminConsole adminName={role?.name || 'Admin'} />;
}

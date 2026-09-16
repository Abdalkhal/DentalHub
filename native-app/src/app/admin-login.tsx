import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react-native';

import { Screen, Text, Button, Spinner } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import AdminScreen from './(tabs)/admin';
import { auth } from '@/integrations/firebase/client';
import { useIsAdmin } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';

/**
 * Dedicated, self-contained admin entry point — deliberately NOT linked from
 * anywhere in the app's UI (no button, no menu row, nothing in more.tsx or
 * account.tsx). It's reachable only by opening its deep link directly:
 * dentalhub://admin-login. That obscurity isn't the actual protection though
 * — `useIsAdmin()` below checks the signed-in ID token's custom claim, the
 * same server-verified check the web app's /admin-standalone uses, so this
 * screen refuses a non-admin account regardless of how they got here.
 */
export default function AdminLoginScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, isAdmin, loading } = useIsAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError(ar ? 'بيانات الدخول غير صحيحة' : 'Invalid email or password');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (user && isAdmin) return <AdminScreen />;

  if (user && !isAdmin) {
    return (
      <Screen>
        <View className="items-center py-20">
          <ShieldAlert size={48} color="#F43F5E" strokeWidth={1.5} />
          <Text className="mt-4 text-base font-extrabold text-slate-800">
            {ar ? 'لا تملك صلاحية المدير' : 'You are not authorized as admin'}
          </Text>
          <Text className="mt-1.5 text-center text-xs text-slate-500">
            {ar ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم' : 'This account cannot access the admin panel'}
          </Text>
          <Button
            title={ar ? 'تسجيل الخروج' : 'Sign out'}
            variant="outline"
            className="mt-6"
            onPress={() => signOut(auth)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <Screen>
        <View className="items-center pt-10">
          <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#0052FF' }}>
            <ShieldCheck size={26} color="#FFFFFF" />
          </View>
          <Text className="mt-3 text-lg font-extrabold text-slate-900">
            {ar ? 'لوحة تحكم المدير' : 'Admin panel'}
          </Text>
          <Text className="mt-1 text-xs text-slate-500">
            {ar ? 'دخول مخصص لمدراء النظام فقط' : 'Admins only'}
          </Text>
        </View>

        <View className="mt-8 gap-3">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={ar ? 'البريد الإلكتروني' : 'Email'}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={16} color="#94A3B8" />}
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder={ar ? 'كلمة المرور' : 'Password'}
            secureTextEntry
            leftIcon={<Lock size={16} color="#94A3B8" />}
          />
          {!!error && (
            <Text className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {error}
            </Text>
          )}
          <Button title={ar ? 'دخول' : 'Sign in'} loading={busy} onPress={submit} className="mt-2" />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

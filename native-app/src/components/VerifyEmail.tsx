// Email verification screen (native). A new account must confirm its email
// before it can use the app: until then this full screen covers everything
// except the sign-in screen. Mirrors the web's src/components/VerifyEmail.tsx;
// state and actions live in lib/emailVerification.ts (identical in both apps).
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { ArrowLeft, Check, Inbox, LogOut, MailCheck, MousePointerClick, PencilLine, RefreshCw } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { SINGLE_LINE_INPUT } from '@/components/ui/singleLineInput';
import { auth } from '@/integrations/firebase/client';
import { useUserRole } from '@/lib/useAuth';
import { checkEmail, emailError } from '@/lib/authValidation';
import {
  changeUnverifiedEmail,
  mustVerifyAccount,
  refreshVerification,
  resendSecondsLeft,
  sendVerificationEmail,
  syncVerification,
  useVerification,
} from '@/lib/emailVerification';
import { toast } from '@/lib/toast';

const BLUE = '#1D4ED8';

/** Mounted once over the root stack; covers the app while the email isn't confirmed. */
export function VerifyEmailGate() {
  const { user, role } = useUserRole();
  const mustVerify = mustVerifyAccount(role as Parameters<typeof mustVerifyAccount>[0]);
  const pathname = usePathname();
  useEffect(() => {
    syncVerification(user, mustVerify);
  }, [user, user?.emailVerified, mustVerify]);
  const v = useVerification();
  if (!v.restricted || pathname.startsWith('/login')) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: '#F4F7FB' }]}>
      <VerifyEmailScreen email={v.email} />
    </View>
  );
}

function VerifyEmailScreen({ email }: { email: string }) {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState(resendSecondsLeft());
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Countdown, a quiet re-check every few seconds, and one on returning from
  // the mail app — so the app opens by itself once the link was clicked.
  useEffect(() => {
    const t = setInterval(() => setLeft(resendSecondsLeft()), 1000);
    const poll = setInterval(() => void refreshVerification(true), 5000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshVerification(true);
    });
    return () => {
      clearInterval(t);
      clearInterval(poll);
      sub.remove();
    };
  }, []);

  const check = async () => {
    setChecking(true);
    const ok = await refreshVerification(true);
    setChecking(false);
    if (ok) toast.success('تم تأكيد بريدك، أهلاً بك في Dent Hub ✅');
    else toast.error('لم يتم التأكيد بعد. افتح الرابط في رسالة البريد أولاً.');
  };

  const resend = async () => {
    setSending(true);
    const r = await sendVerificationEmail();
    setSending(false);
    setLeft(resendSecondsLeft());
    if (r === 'sent') toast.success('أرسلنا رسالة تأكيد جديدة');
    else if (r === 'too-many') toast.error('طلبات كثيرة، حاول بعد قليل');
    else if (r === 'error') toast.error('تعذّر الإرسال، تحقق من الاتصال');
  };

  const change = async () => {
    const ec = checkEmail(newEmail);
    if (!ec.ok) return toast.error(emailError(ec));
    if (!password) return toast.error('أدخل كلمة المرور للتأكيد');
    setBusy(true);
    const r = await changeUnverifiedEmail(ec.email, password);
    setBusy(false);
    if (r === 'sent') {
      toast.success(`أرسلنا رابط التأكيد إلى ${ec.email}`);
      setChanging(false);
      setPassword('');
    } else
      toast.error(
        r === 'wrong-password' ? 'كلمة المرور غير صحيحة' : r === 'in-use' ? 'هذا البريد مستخدم في حساب آخر' : 'تعذّر تغيير البريد',
      );
  };

  const steps = [
    { Icon: Inbox, text: 'افتح بريدك الإلكتروني' },
    { Icon: MousePointerClick, text: 'اضغط رابط «تأكيد البريد» في رسالة Dent Hub' },
    { Icon: ArrowLeft, text: 'ارجع هنا — يفتح حسابك تلقائياً' },
  ];

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View className="items-center px-6 pb-20" style={{ backgroundColor: BLUE, paddingTop: insets.top + 36 }}>
          <View className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-white/10" />
          <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-white">
            <MailCheck size={44} color={BLUE} />
          </View>
          <Text className="text-2xl font-extrabold text-white">تحقق من بريدك الإلكتروني</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-white/85">لحماية حسابك، أرسلنا رابط تأكيد إلى</Text>
          <Text className="mt-1 text-base font-bold text-white">{email}</Text>
        </View>

        <View className="-mt-12 px-4">
          <View className="rounded-3xl bg-white p-5">
            <View className="gap-3">
              {steps.map(({ Icon, text }, i) => (
                <View key={i} className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                    <Icon size={18} color="#0284C7" />
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-slate-700">{text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={check}
              disabled={checking}
              className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-2xl"
              style={{ backgroundColor: BLUE, opacity: checking ? 0.6 : 1 }}
            >
              {checking ? <ActivityIndicator color="#fff" /> : <Check size={18} color="#fff" />}
              <Text className="font-bold text-white">أكّدت بريدي، متابعة</Text>
            </Pressable>
            <Pressable
              onPress={resend}
              disabled={sending || left > 0}
              className="mt-2 h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200"
              style={{ opacity: sending || left > 0 ? 0.5 : 1 }}
            >
              {sending ? <ActivityIndicator color="#334155" size="small" /> : <RefreshCw size={16} color="#334155" />}
              <Text className="text-sm font-bold text-slate-700">{left > 0 ? `إعادة الإرسال بعد ${left} ثانية` : 'إعادة إرسال الرسالة'}</Text>
            </Pressable>
            <View className="mt-3 rounded-xl bg-amber-50 px-3 py-2">
              <Text className="text-center text-xs leading-5 text-amber-800">
                لم تصلك خلال دقيقتين؟ تحقق من مجلد الرسائل غير المرغوبة (Spam) أو «الترويجات».
              </Text>
            </View>
          </View>

          <View className="mt-4 rounded-3xl bg-white p-4">
            {changing ? (
              <View className="gap-2">
                <Text className="text-sm font-bold text-slate-800">تغيير البريد</Text>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="البريد الصحيح"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
                  style={[SINGLE_LINE_INPUT, { textAlign: 'right' }]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="كلمة المرور الحالية"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  autoCapitalize="none"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
                  style={[SINGLE_LINE_INPUT, { textAlign: 'right' }]}
                />
                <View className="flex-row gap-2">
                  <Pressable onPress={() => setChanging(false)} className="h-10 flex-1 items-center justify-center rounded-xl border border-slate-200">
                    <Text className="text-xs font-bold text-slate-700">رجوع</Text>
                  </Pressable>
                  <Pressable onPress={change} disabled={busy} className="h-10 flex-1 items-center justify-center rounded-xl bg-slate-900">
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-bold text-white">إرسال للبريد الجديد</Text>}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <Pressable onPress={() => setChanging(true)} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-50">
                  <PencilLine size={16} color="#334155" />
                  <Text className="text-xs font-bold text-slate-700">البريد خطأ؟ غيّره</Text>
                </Pressable>
                <Pressable onPress={() => void auth.signOut()} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-50">
                  <LogOut size={16} color="#E11D48" />
                  <Text className="text-xs font-bold text-rose-600">تسجيل الخروج</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

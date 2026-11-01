// "Confirm your email" — the dialog opened by ensureVerified() (or the banner)
// and the reminder banner. Mirrors the web's src/components/VerifyEmail.tsx;
// state and actions live in lib/emailVerification.ts (identical in both apps).
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Check, MailCheck, MailWarning, RefreshCw, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { SINGLE_LINE_INPUT } from '@/components/ui/singleLineInput';
import { useUserRole } from '@/lib/useAuth';
import { checkEmail, emailError } from '@/lib/authValidation';
import {
  changeUnverifiedEmail,
  closeVerifyGate,
  mustVerifyAccount,
  openVerifyGate,
  refreshVerification,
  resendSecondsLeft,
  sendVerificationEmail,
  syncVerification,
  useVerification,
} from '@/lib/emailVerification';
import { toast } from '@/lib/toast';

/** Mounted once at the root: keeps the state in step and renders the dialog. */
export function VerifyEmailHost() {
  const { user, role } = useUserRole();
  const mustVerify = mustVerifyAccount(role as Parameters<typeof mustVerifyAccount>[0]);
  useEffect(() => {
    syncVerification(user, mustVerify);
  }, [user, user?.emailVerified, mustVerify]);
  // Back from the mail app: pick up a confirmation made meanwhile.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshVerification(mustVerify);
    });
    return () => sub.remove();
  }, [mustVerify]);
  const v = useVerification();
  return (
    <Modal visible={v.gateOpen && v.unverified} transparent animationType="fade" onRequestClose={closeVerifyGate}>
      <VerifyDialog email={v.email} restricted={v.restricted} mustVerify={mustVerify} />
    </Modal>
  );
}

function VerifyDialog({ email, restricted, mustVerify }: { email: string; restricted: boolean; mustVerify?: boolean }) {
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState(resendSecondsLeft());
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLeft(resendSecondsLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const check = async () => {
    setChecking(true);
    const ok = await refreshVerification(mustVerify);
    setChecking(false);
    if (ok) {
      toast.success('تم تأكيد بريدك، حسابك مفعّل بالكامل ✅');
      closeVerifyGate();
    } else toast.error('لم يتم التأكيد بعد. افتح الرابط في رسالة البريد ثم حاول مرة أخرى.');
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
      toast.success(`أرسلنا رابط التأكيد إلى ${ec.email}. بعد فتحه يتغير بريد حسابك إليه.`);
      setChanging(false);
      setPassword('');
    } else
      toast.error(
        r === 'wrong-password' ? 'كلمة المرور غير صحيحة' : r === 'in-use' ? 'هذا البريد مستخدم في حساب آخر' : 'تعذّر تغيير البريد',
      );
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={closeVerifyGate}>
        <Pressable className="rounded-t-3xl bg-white p-6" onPress={() => {}}>
          <View className="flex-row items-start justify-between">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-sky-50">
              <MailCheck size={28} color="#0284C7" />
            </View>
            <Pressable onPress={closeVerifyGate} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <X size={16} color="#64748B" />
            </Pressable>
          </View>
          <Text className="mt-4 text-lg font-extrabold text-slate-900">{restricted ? 'أكّد بريدك أولاً' : 'أكّد بريدك الإلكتروني'}</Text>
          <Text className="mt-1.5 text-sm leading-6 text-slate-600">
            {restricted ? 'لنشر المنتجات وإرسال الطلبات والحالات يجب تأكيد بريدك. ' : ''}
            أرسلنا رابط التأكيد إلى <Text className="font-bold text-slate-900">{email}</Text>. افتح الرسالة واضغط الرابط، ثم ارجع هنا.
          </Text>
          <Text className="mt-2 text-xs text-slate-500">لم تصلك؟ تحقق من مجلد الرسائل غير المرغوبة (Spam).</Text>

          <Pressable onPress={check} disabled={checking} className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary">
            {checking ? <ActivityIndicator color="#fff" /> : <Check size={18} color="#fff" />}
            <Text className="font-bold text-white">أكّدت بريدي</Text>
          </Pressable>
          <Pressable
            onPress={resend}
            disabled={sending || left > 0}
            className="mt-2 h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200"
            style={{ opacity: sending || left > 0 ? 0.5 : 1 }}
          >
            {sending ? <ActivityIndicator color="#334155" size="small" /> : <RefreshCw size={16} color="#334155" />}
            <Text className="text-sm font-bold text-slate-700">{left > 0 ? `إعادة الإرسال بعد ${left} ث` : 'إعادة إرسال الرسالة'}</Text>
          </Pressable>

          {changing ? (
            <View className="mt-4 gap-2 rounded-2xl bg-slate-50 p-3">
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="البريد الصحيح"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                style={[SINGLE_LINE_INPUT, { textAlign: 'right' }]}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="كلمة المرور الحالية"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoCapitalize="none"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                style={[SINGLE_LINE_INPUT, { textAlign: 'right' }]}
              />
              <View className="flex-row gap-2">
                <Pressable onPress={() => setChanging(false)} className="h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Text className="text-xs font-bold text-slate-700">رجوع</Text>
                </Pressable>
                <Pressable onPress={change} disabled={busy} className="h-10 flex-1 items-center justify-center rounded-xl bg-slate-900">
                  {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-bold text-white">إرسال للبريد الجديد</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setChanging(true)} className="mt-3 items-center py-1">
              <Text className="text-xs font-bold text-sky-700">البريد مكتوب خطأ؟ غيّره</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

/**
 * Reminder while the email isn't confirmed. "restricted" is for new accounts
 * that can't publish yet; "reminder" is the gentler nudge for older accounts.
 */
export function VerifyEmailBanner({ mode, className }: { mode: 'restricted' | 'reminder'; className?: string }) {
  const v = useVerification();
  if (!v.unverified || v.restricted !== (mode === 'restricted')) return null;
  return (
    <Pressable onPress={openVerifyGate} className={`flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 ${className ?? ''}`}>
      <MailWarning size={20} color="#D97706" />
      <View className="flex-1">
        <Text className="text-sm font-bold text-amber-900">أكّد بريدك الإلكتروني</Text>
        <Text numberOfLines={1} className="text-xs text-amber-800">
          {v.restricted ? 'لتفعيل النشر وإرسال الطلبات والحالات' : 'لحماية حسابك واسترجاعه عند الحاجة'}
        </Text>
      </View>
      <View className="rounded-xl bg-amber-500 px-3 py-1.5">
        <Text className="text-xs font-bold text-white">تأكيد</Text>
      </View>
    </Pressable>
  );
}

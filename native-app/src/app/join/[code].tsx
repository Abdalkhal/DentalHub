import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { LogOut, ShieldCheck } from 'lucide-react-native';

import { JoinCodePanel } from '@/components/ClinicTeam';
import { Screen, Text } from '@/components/ui';
import { auth, db } from '@/integrations/firebase/client';
import { checkEmail, checkPassword, emailError, passwordError } from '@/lib/authValidation';
import { setClinicsStoreUser } from '@/lib/clinicsStore';
import { lookupStaffInvite, PENDING_STAFF_CODE } from '@/lib/clinicTeam';
import { sendVerificationEmail } from '@/lib/emailVerification';
import { useI18n } from '@/lib/i18n';
import { useUserRole } from '@/lib/useAuth';
import { signOutDevice } from '@/lib/push';

const ACCOUNT_LABEL: Record<string, [string, string]> = {
  dentist: ["طبيب أسنان", "Dentist"],
  secretary: ["سكرتارية", "Secretary"],
  supply: ["مكتب مستلزمات", "Supply office"],
  implant: ["شركة زرعات", "Implant company"],
  lab: ["مختبر", "Lab"],
};

const inputCls = 'h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800';
const ltr = { writingDirection: 'ltr' as const, textAlign: 'left' as const };

/** A secretary's account starts here: they have none until the doctor invites them. */
function StaffSignup({ code, clinicName, ownerName, ar }: { code: string; clinicName: string; ownerName: string; ar: boolean }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const submit = async () => {
    const emailCheck = checkEmail(f.email);
    const passwordCheck = checkPassword(f.password);
    if (!f.name.trim()) return setError(ar ? 'اكتب اسمك' : 'Enter your name');
    if (!f.phone.trim()) return setError(ar ? 'اكتب رقم هاتفك' : 'Enter your phone number');
    if (!emailCheck.ok) return setError(emailError(emailCheck, ar));
    if (!passwordCheck.ok) return setError(passwordError(passwordCheck, ar));
    setBusy(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailCheck.email, f.password);
      localStorage.setItem(PENDING_STAFF_CODE, code);
      await setDoc(doc(db, 'user_roles', cred.user.uid), {
        userId: cred.user.uid,
        role: 'secretary',
        accountType: 'secretary',
        name: f.name.trim(),
        phone: f.phone.trim(),
        email: emailCheck.email,
        mustVerifyEmail: true,
        city: null,
        createdAt: serverTimestamp(),
      });
      void sendVerificationEmail(cred.user);
      router.replace('/secretary' as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('email-already-in-use')
          ? ar ? 'هذا البريد مسجل مسبقاً. سجّل الدخول به.' : 'This email is already registered. Sign in instead.'
          : msg.includes('weak-password')
            ? ar ? 'كلمة المرور ضعيفة' : 'Password too weak'
            : ar ? 'تعذر إنشاء الحساب. تحقق من الاتصال وحاول مجدداً' : "Couldn't create the account. Check your connection and retry",
      );
      setBusy(false);
    }
  };

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-3 rounded-xl bg-violet-50 p-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <ShieldCheck size={19} color="#7C3AED" />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-extrabold text-violet-950">{clinicName}</Text>
          <Text className="text-[11px] text-violet-900">{ar ? `دعوة للعمل في السكرتارية من ${ownerName}` : `Secretary invite from ${ownerName}`}</Text>
        </View>
      </View>
      <TextInput value={f.name} onChangeText={set('name')} placeholder={ar ? 'الاسم الكامل' : 'Full name'} placeholderTextColor="#94A3B8" className={inputCls} />
      <TextInput value={f.phone} onChangeText={set('phone')} placeholder={ar ? 'رقم الهاتف' : 'Phone number'} placeholderTextColor="#94A3B8" keyboardType="phone-pad" className={inputCls} style={ltr} />
      <TextInput value={f.email} onChangeText={set('email')} placeholder={ar ? 'البريد الإلكتروني' : 'Email'} placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} className={inputCls} style={ltr} />
      <TextInput value={f.password} onChangeText={set('password')} placeholder={ar ? 'كلمة المرور' : 'Password'} placeholderTextColor="#94A3B8" secureTextEntry autoCapitalize="none" className={inputCls} style={ltr} />
      {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}
      <Pressable disabled={busy} onPress={() => void submit()} className="h-12 items-center justify-center rounded-xl bg-primary" style={{ opacity: busy ? 0.6 : 1 }}>
        {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-sm font-bold text-primary-foreground">{ar ? 'إنشاء الحساب' : 'Create account'}</Text>}
      </Pressable>
      <Pressable
        onPress={() => {
          localStorage.setItem(PENDING_STAFF_CODE, code);
          router.replace('/login');
        }}
        className="items-center py-2"
      >
        <Text className="text-xs font-bold text-primary">{ar ? 'لدي حساب سكرتارية، تسجيل الدخول' : 'I have a secretary account, sign in'}</Text>
      </Pressable>
    </View>
  );
}

/** Where an invite link lands when it opens in the app. */
export default function JoinClinicScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const upper = String(code ?? '').toUpperCase();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role, loading } = useUserRole();
  const [invite, setInvite] = useState<{ clinicName: string; ownerName: string } | null>(null);
  const [error, setError] = useState('');
  const isStaff = role?.accountType === 'secretary';

  useEffect(() => {
    if (user?.uid) setClinicsStoreUser(user.uid);
  }, [user?.uid]);

  // Signed out: only a secretary's invite can be answered here. A doctor signs in first.
  useEffect(() => {
    if (loading || user) return;
    lookupStaffInvite(upper)
      .then((r) => {
        if (r.secretary) setInvite({ clinicName: r.clinicName ?? '', ownerName: r.ownerName ?? '' });
        else router.replace('/login');
      })
      .catch(() => setError(ar ? 'الرمز غير صحيح أو انتهت صلاحيته' : 'This code is invalid or has expired'));
  }, [loading, user, upper, ar]);

  return (
    <Screen>
      {!!user && (
        // A link opened on a phone that's signed in to another account
        // answers as that account; say which, and let them switch.
        <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] text-slate-500">{ar ? 'أنت مسجل الآن باسم' : 'Signed in as'}</Text>
            <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
              {role?.name || user.email || ''}
              {role?.accountType && ACCOUNT_LABEL[role.accountType] ? ` · ${ACCOUNT_LABEL[role.accountType][ar ? 0 : 1]}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => void signOutDevice()}
            className="h-9 flex-row items-center gap-1.5 rounded-xl border border-slate-200 px-3"
          >
            <LogOut size={14} color="#334155" />
            <Text className="text-xs font-bold text-slate-700">{ar ? 'حساب آخر' : 'Other account'}</Text>
          </Pressable>
        </View>
      )}
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        {user ? (
          <JoinCodePanel ar={ar} initialCode={upper} onJoined={isStaff ? () => router.replace('/secretary' as never) : undefined} />
        ) : invite ? (
          <StaffSignup code={upper} clinicName={invite.clinicName} ownerName={invite.ownerName} ar={ar} />
        ) : error ? (
          <Text className="py-6 text-center text-xs font-medium text-rose-600">{error}</Text>
        ) : (
          <ActivityIndicator color="#2563EB" />
        )}
      </View>
    </Screen>
  );
}

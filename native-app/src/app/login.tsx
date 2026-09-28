import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { auth, db } from '@/integrations/firebase/client';
import { fetchUserRoleDoc, getAccountDashboard, type AccountDashboardHref, type LabStaffRole } from '@/lib/useAuth';
import { CITIES } from '@/data/offices';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/integrations/firebase/types';

type RoleMeta = {
  id: AccountType;
  ar: string;
  en: string;
  icon: ImageSourcePropType;
  iconHex: string;
  activeBg: string;
  activeText: string;
};

const ROLES: RoleMeta[] = [
  {
    id: 'dentist',
    ar: 'الطبيب',
    en: 'Dentist',
    icon: require('../../assets/login/icon-dentist.png'),
    iconHex: '#0284C7',
    activeBg: 'bg-sky-50',
    activeText: 'text-sky-700',
  },
  {
    id: 'supply',
    ar: 'مستلزمات الأسنان',
    en: 'Dental Supplies',
    icon: require('../../assets/login/icon-supply.png'),
    iconHex: '#059669',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-700',
  },
  {
    id: 'lab',
    ar: 'المختبرات',
    en: 'Laboratories',
    icon: require('../../assets/login/icon-lab.png'),
    iconHex: '#7C3AED',
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-700',
  },
  {
    id: 'implant',
    ar: 'شركات الزراعة',
    en: 'Implant Companies',
    icon: require('../../assets/login/icon-implant.png'),
    iconHex: '#D97706',
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-700',
  },
];

// A local pill-shaped field instead of the shared `@/components/ui/Input` —
// that component's wrapper only takes additive layout classes (see its own
// comment), not overrides, because `cn` here is plain `clsx` with no
// tailwind-merge: passing `rounded-full` would just sit alongside its
// built-in `rounded-xl` rather than replace it. Reimplementing the same
// icon-row layout locally keeps this redesign scoped to the login screen
// instead of changing a component every other screen also renders with.
function LoginInput({
  icon,
  rightIcon,
  ...props
}: TextInputProps & { icon?: ReactNode; rightIcon?: ReactNode }) {
  return (
    <View className="h-14 w-full flex-row items-center rounded-full border border-slate-200 bg-slate-50 px-5">
      {icon}
      <TextInput
        placeholderTextColor="#94A3B8"
        className={cn('flex-1 text-sm font-medium text-slate-800', (icon || rightIcon) && 'mx-2.5')}
        {...props}
      />
      {rightIcon}
    </View>
  );
}

export default function LoginScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [next, setNext] = useState<AccountDashboardHref | null>(null);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [accountType, setAccountType] = useState<AccountType>('dentist');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [clinicName, setClinicName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Navigate only after the auth state change has fully committed. Navigating
  // in the same tick as the async write can hit "no navigation context".
  const go = (path: string) => {
    setBusy(false);
    setTimeout(() => setNext(path as never), 80);
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError(ar ? 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }
    if (mode === 'signup' && name.trim().length < 2) {
      setError(ar ? 'الرجاء إدخال الاسم' : 'Please enter your name');
      return;
    }
    if (mode === 'signup' && accountType === 'dentist' && !gender) {
      setError(ar ? 'الرجاء اختيار الجنس' : 'Please select your gender');
      return;
    }
    if (mode === 'signup' && password.trim().length < 6) {
      setError(ar ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const roleDoc = await fetchUserRoleDoc(cred.user.uid);
        if (!roleDoc) {
          // Invited lab staff (designers/technicians/admins added from "كادر
          // المختبر") deliberately have no `user_roles` doc — only a custom
          // claim set server-side by `inviteLabMember`. Check that before
          // concluding there's no account at all.
          const staffClaims = (await cred.user.getIdTokenResult()).claims as {
            role?: LabStaffRole;
            labId?: string;
          };
          const isLabStaff =
            accountType === 'lab' && !!staffClaims.labId && ['ADMIN', 'DESIGNER', 'TECHNICIAN'].includes(staffClaims.role ?? '');
          if (isLabStaff) {
            go('/');
            return;
          }
          setError(
            ar
              ? 'لم يتم العثور على صلاحيات لهذا الحساب. يرجى التسجيل أولاً.'
              : 'No role found for this account. Please register first.',
          );
          await auth.signOut();
          return;
        }
        if (roleDoc.accountType !== accountType) {
          setError(
            ar
              ? 'عذراً، هذا الحساب غير مسجل تحت هذا النوع. اختر نوع الحساب الصحيح.'
              : 'This account is not registered under this type. Choose the correct type.',
          );
          await auth.signOut();
          return;
        }
        go(getAccountDashboard(roleDoc.role));
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const roleData: Record<string, unknown> = {
          userId: cred.user.uid,
          role: accountType,
          accountType,
          name: name.trim(),
          email: email.trim(),
          city: city || null,
          createdAt: serverTimestamp(),
        };
        if (accountType === 'dentist') {
          roleData.surname = surname.trim() || null;
          roleData.gender = gender;
          roleData.clinicName = clinicName.trim() || null;
        }
        await setDoc(doc(db, 'user_roles', cred.user.uid), roleData);
        go(getAccountDashboard(accountType));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('invalid-credential') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError(ar ? 'بريد إلكتروني أو كلمة مرور غير صحيحة' : 'Invalid email or password');
      } else if (msg.includes('email-already-in-use')) {
        setError(ar ? 'هذا البريد الإلكتروني مسجل مسبقاً' : 'This email is already registered');
      } else if (msg.includes('weak-password')) {
        setError(ar ? 'كلمة المرور ضعيفة جداً' : 'Password too weak');
      } else if (msg.includes('too-many-requests')) {
        setError(ar ? 'طلبات كثيرة جداً. حاول لاحقاً.' : 'Too many attempts. Try again later.');
      } else {
        setError(msg || (ar ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError(ar ? 'أدخل بريدك الإلكتروني أولاً' : 'Enter your email first');
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success(ar ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك' : 'Password reset link sent to your email');
    } catch {
      toast.error(ar ? 'تعذر إرسال رابط إعادة التعيين — تحقق من البريد الإلكتروني' : 'Could not send reset link — check the email');
    } finally {
      setResetBusy(false);
    }
  };

  if (next) return <Redirect href={next} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} className="bg-background">
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* Hero — the banner image itself already carries the Dent Hub logo
              and welcome text, so no text/icon is rendered on top of it here
              (that used to duplicate the same message a second time). */}
          <View style={{ height: 260 }} className="w-full overflow-hidden">
            <Image
              source={require('../../assets/login/hero-bg.jpg')}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          {/* Sheet */}
          <View
            className="-mt-6 flex-1 rounded-t-[32px] bg-card px-5 pb-10 pt-7"
            style={{ shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -6 }, elevation: 6 }}
          >
            {/* Account type */}
            <Text className="mb-3 text-center text-xs font-bold text-slate-400">
              {ar ? 'اختر نوع حسابك للمتابعة' : 'Choose your account type to continue'}
            </Text>
            <View className="mb-6 flex-row justify-between gap-2">
              {ROLES.map((opt) => {
                const active = accountType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setAccountType(opt.id);
                      setError('');
                    }}
                    className="flex-1 items-center gap-1.5"
                  >
                    <View
                      className={cn('h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2', active ? opt.activeBg : 'border-transparent bg-slate-50')}
                      style={active ? { borderColor: opt.iconHex } : undefined}
                    >
                      <Image source={opt.icon} style={{ width: 34, height: 34 }} resizeMode="contain" />
                    </View>
                    <Text numberOfLines={2} className={cn('text-center text-[10px] font-bold leading-tight', active ? opt.activeText : 'text-slate-500')}>
                      {ar ? opt.ar : opt.en}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'signup' && (
              <View className="mb-3 gap-3">
                <LoginInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError('');
                  }}
                  placeholder={
                    accountType === 'dentist'
                      ? ar
                        ? 'الاسم الكامل'
                        : 'Full name'
                      : ar
                        ? 'اسم المكتب / الشركة / المختبر'
                        : 'Office / Company / Lab name'
                  }
                  icon={<User size={18} color="#94A3B8" />}
                />

                {accountType === 'dentist' && (
                  <>
                    <LoginInput
                      value={surname}
                      onChangeText={setSurname}
                      placeholder={ar ? 'اللقب (اختياري)' : 'Surname (optional)'}
                    />
                    <View>
                      <Text className="mb-2 px-1 text-xs font-semibold text-slate-500">
                        {ar ? 'الجنس' : 'Gender'}
                      </Text>
                      <View className="flex-row gap-2">
                        {(['male', 'female'] as const).map((g) => (
                          <Pressable
                            key={g}
                            onPress={() => {
                              setGender(g);
                              setError('');
                            }}
                            className={cn(
                              'h-12 flex-1 items-center justify-center rounded-full border-2',
                              gender === g ? 'border-sky-500 bg-sky-50' : 'border-transparent bg-slate-50',
                            )}
                          >
                            <Text className={cn('text-sm font-semibold', gender === g ? 'text-sky-700' : 'text-slate-500')}>
                              {g === 'male' ? (ar ? 'ذكر' : 'Male') : ar ? 'أنثى' : 'Female'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <LoginInput
                      value={clinicName}
                      onChangeText={setClinicName}
                      placeholder={ar ? 'اسم العيادة (اختياري)' : 'Clinic name (optional)'}
                    />
                  </>
                )}

                <View>
                  <Text className="mb-2 px-1 text-xs font-semibold text-slate-500">
                    {ar ? 'المحافظة / المدينة' : 'Governorate / City'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-1.5 pb-1">
                      {CITIES.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => setCity(c.id)}
                          className={cn(
                            'h-8 items-center justify-center rounded-full border px-3',
                            city === c.id ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white',
                          )}
                        >
                          <Text className={cn('text-[11px] font-bold', city === c.id ? 'text-white' : 'text-slate-600')}>
                            {ar ? c.ar : c.en}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}

            <View className="gap-3">
              <LoginInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError('');
                }}
                placeholder={ar ? 'رقم الهاتف / البريد الإلكتروني' : 'Phone number / Email'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon={<Mail size={18} color="#94A3B8" />}
              />
              <LoginInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError('');
                }}
                placeholder={ar ? 'كلمة المرور' : 'Password'}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                icon={<Lock size={18} color="#94A3B8" />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                    {showPassword ? <Eye size={18} color="#94A3B8" /> : <EyeOff size={18} color="#94A3B8" />}
                  </Pressable>
                }
              />
            </View>

            {mode === 'signin' && (
              <View className="mt-3 flex-row justify-end">
                <Pressable onPress={forgotPassword} disabled={resetBusy} hitSlop={8}>
                  <Text className="text-xs font-bold text-primary">
                    {resetBusy ? (ar ? 'جارٍ الإرسال...' : 'Sending...') : ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </Text>
                </Pressable>
              </View>
            )}

            {!!error && (
              <Text className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold leading-relaxed text-rose-600">
                {error}
              </Text>
            )}

            <Pressable
              onPress={submit}
              disabled={busy}
              className={cn(
                'mt-4 flex-row items-center justify-center gap-2 rounded-full',
                busy ? 'bg-slate-300' : 'bg-[#2563EB] active:scale-[0.98]',
              )}
              style={{
                height: 54,
                shadowColor: '#2563EB',
                shadowOpacity: busy ? 0 : 0.3,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: busy ? 0 : 5,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-sm font-bold text-white">
                    {mode === 'signin' ? (ar ? 'تسجيل الدخول' : 'Sign in') : ar ? 'إنشاء حساب' : 'Sign up'}
                  </Text>
                  {ar ? <ArrowLeft size={16} color="#FFFFFF" /> : <ArrowRight size={16} color="#FFFFFF" />}
                </>
              )}
            </Pressable>

            <View className="my-5 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-slate-200" />
              <Text className="text-xs font-semibold text-slate-400">{ar ? 'أو' : 'or'}</Text>
              <View className="h-px flex-1 bg-slate-200" />
            </View>

            {mode === 'signin' ? (
              <Pressable
                onPress={() => {
                  setMode('signup');
                  setError('');
                }}
                className="h-14 flex-row items-center justify-center gap-2 rounded-full border-2 border-primary/30"
              >
                <User size={16} color="#2563EB" />
                <Text className="text-sm font-bold text-primary">{ar ? 'إنشاء حساب جديد' : 'Create new account'}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setMode('signin');
                  setError('');
                }}
                className="items-center py-2"
              >
                <Text className="text-xs font-semibold text-slate-500">
                  {ar ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                  <Text className="font-bold text-primary">{ar ? 'تسجيل الدخول' : 'Sign in'}</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

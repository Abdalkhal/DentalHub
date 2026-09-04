import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Cog,
  Eye,
  EyeOff,
  FlaskConical,
  Lock,
  Mail,
  Package,
  Stethoscope,
  User,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { auth, db } from '@/integrations/firebase/client';
import { fetchUserRoleDoc, getAccountDashboard, type AccountDashboardHref } from '@/lib/useAuth';
import { CITIES } from '@/data/offices';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/integrations/firebase/types';

type RoleMeta = {
  id: AccountType;
  ar: string;
  en: string;
  arDesc: string;
  enDesc: string;
  icon: LucideIcon;
  iconHex: string;
  activeBg: string;
  activeRing: string;
  activeText: string;
};

const ROLES: RoleMeta[] = [
  {
    id: 'dentist',
    ar: 'طبيب أسنان',
    en: 'Dentist',
    arDesc: 'تصفح المواد واطلب من المكاتب',
    enDesc: 'Browse supplies & order',
    icon: Stethoscope,
    iconHex: '#0284C7',
    activeBg: 'bg-sky-50',
    activeRing: 'border-sky-500',
    activeText: 'text-sky-700',
  },
  {
    id: 'supply',
    ar: 'مكتب مستلزمات',
    en: 'Supplies Office',
    arDesc: 'أدر منتجاتك وعروضك',
    enDesc: 'Manage products & offers',
    icon: Package,
    iconHex: '#059669',
    activeBg: 'bg-emerald-50',
    activeRing: 'border-emerald-500',
    activeText: 'text-emerald-700',
  },
  {
    id: 'lab',
    ar: 'مختبر',
    en: 'Laboratory',
    arDesc: 'استلم وتابع حالات الأطباء',
    enDesc: 'Track dentist cases',
    icon: FlaskConical,
    iconHex: '#7C3AED',
    activeBg: 'bg-violet-50',
    activeRing: 'border-violet-500',
    activeText: 'text-violet-700',
  },
  {
    id: 'implant',
    ar: 'شركة زرعات',
    en: 'Implant Company',
    arDesc: 'أدر علامتك التجارية',
    enDesc: 'Manage your brands',
    icon: Cog,
    iconHex: '#D97706',
    activeBg: 'bg-amber-50',
    activeRing: 'border-amber-500',
    activeText: 'text-amber-700',
  },
];

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
        setNext(getAccountDashboard(roleDoc.role));
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
        setNext(getAccountDashboard(accountType));
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

  if (next) return <Redirect href={next} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      className="bg-background"
    >
      <Screen>
      {/* Brand */}
      <View className="mt-1 items-center">
        <Text className="text-2xl font-extrabold tracking-tight">
          <Text className="text-primary">Dental</Text>
          <Text className="text-slate-900">Hub</Text>
        </Text>
        <Text className="mt-1 text-xs text-slate-400">
          {ar ? 'منصة الأطباء والمكاتب والمختبرات' : 'Platform for dentists, offices & labs'}
        </Text>
      </View>

      {/* Info note */}
      <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Text className="text-center text-xs leading-relaxed text-slate-600">
          {ar
            ? 'يمكنك تسجيل الدخول باستخدام رقم الهاتف أو البريد الإلكتروني'
            : 'You can sign in using your phone number or email'}
        </Text>
      </View>

      {/* Account type */}
      <View className="mt-5">
        <View className="mb-3 flex-row items-center gap-1.5 px-1">
          <View className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <Text className="text-xs font-bold text-slate-500">{ar ? 'نوع الحساب' : 'Account type'}</Text>
        </View>
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {ROLES.map((opt) => {
            const active = accountType === opt.id;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setAccountType(opt.id);
                  setError('');
                }}
                style={active ? { transform: [{ scale: 1.02 }] } : undefined}
                className={cn(
                  'w-[48.5%] flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 shadow-md',
                  active
                    ? cn(opt.activeBg, opt.activeRing)
                    : 'border-transparent bg-slate-50',
                )}
              >
                <View
                  className={cn(
                    'h-11 w-11 flex-row items-center justify-center rounded-xl',
                    active
                      ? cn(opt.activeBg, 'ring-2', 'ring-sky-500')
                      : 'bg-white ring-1 ring-slate-200',
                  )}
                >
                  <Icon size={26} color={active ? opt.iconHex : '#94A3B8'} />
                </View>
                <Text className={cn('text-center text-xs font-bold leading-tight', active ? opt.activeText : 'text-slate-600')}>
                  {ar ? opt.ar : opt.en}
                </Text>
                <Text className="text-center text-[10px] leading-tight text-slate-400">
                  {ar ? opt.arDesc : opt.enDesc}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sign in / Sign up tabs */}
      <View className="mt-5 flex-row gap-1.5 rounded-2xl bg-slate-100/80 p-1.5">
        {(['signin', 'signup'] as const).map((m) => {
          const activeTab = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setError('');
              }}
              // shadow-md stays on both branches: see note in labs-office.tsx.
              className={cn(
                'h-11 flex-1 items-center justify-center rounded-xl shadow-md',
                activeTab ? 'bg-white' : 'bg-transparent',
              )}
            >
              <Text className={cn('text-sm font-bold', activeTab ? 'text-slate-900' : 'text-slate-500')}>
                {m === 'signin' ? (ar ? 'تسجيل دخول' : 'Sign in') : ar ? 'إنشاء حساب' : 'Create account'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Form */}
      <ScrollView className="mt-4 max-h-[70%]" contentContainerClassName="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm gap-3">
        {mode === 'signup' && (
          <>
            <Input
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
              leftIcon={<User size={18} color="#94A3B8" />}
            />

            {accountType === 'dentist' && (
              <>
                <Input
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
                          'h-11 flex-1 items-center justify-center rounded-xl border-2',
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
                <Input
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
          </>
        )}

        <Input
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError('');
          }}
          placeholder={ar ? 'رقم الهاتف / البريد الإلكتروني' : 'Phone number / Email'}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          leftIcon={<Mail size={18} color="#94A3B8" />}
        />
        <Input
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError('');
          }}
          placeholder={ar ? 'كلمة المرور' : 'Password'}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          leftIcon={<Lock size={18} color="#94A3B8" />}
          rightIcon={
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
              {showPassword ? (
                <EyeOff size={18} color="#94A3B8" />
              ) : (
                <Eye size={18} color="#94A3B8" />
              )}
            </Pressable>
          }
        />

        {!!error && (
          <Text className="rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold leading-relaxed text-rose-600">
            {error}
          </Text>
        )}

        <Pressable
          onPress={submit}
          disabled={busy}
          className={cn(
            'h-12 flex-row items-center justify-center gap-2 rounded-xl shadow-lg',
            busy ? 'bg-slate-300' : 'bg-[#2563EB] active:scale-[0.98]',
          )}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-bold text-white">
              {mode === 'signin'
                ? ar
                  ? 'تسجيل الدخول'
                  : 'Sign in'
                : ar
                  ? 'إنشاء حساب'
                  : 'Sign up'}
            </Text>
          )}
        </Pressable>

        {mode === 'signup' && (
          <Text className="text-center text-[11px] text-slate-400">
            {ar
              ? 'أول حساب يتم إنشاؤه يصبح مدير النظام تلقائياً.'
              : 'The first account created becomes the system admin automatically.'}
          </Text>
        )}
      </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Bell, ChevronRight, FileText, Globe, Heart, LifeBuoy, LogOut, Megaphone, MessageCircle, Package, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useUserRole } from '@/lib/useAuth';
import { auth } from '@/integrations/firebase/client';
import { useI18n } from '@/lib/i18n';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  dentist: { ar: 'طبيب أسنان', en: 'Dentist' },
  supply: { ar: 'مكتب مستلزمات', en: 'Supplies Office' },
  implant: { ar: 'شركة زرعات', en: 'Implant Company' },
  lab: { ar: 'مختبر', en: 'Laboratory' },
};

function Row({
  icon: Icon,
  label,
  right,
  onPress,
  tone = 'bg-slate-100',
  color = '#334155',
}: {
  icon: LucideIcon;
  label: string;
  right?: string;
  onPress?: () => void;
  tone?: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card px-4 py-3.5 shadow-sm"
    >
      <View className={tone + ' h-10 w-10 items-center justify-center rounded-xl'}>
        <Icon size={19} color={color} strokeWidth={2.2} />
      </View>
      <Text className="flex-1 text-sm font-bold text-slate-800">{label}</Text>
      {right ? <Text className="text-xs font-bold text-slate-400">{right}</Text> : null}
      <ChevronRight size={18} color="#CBD5E1" />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { role } = useUserRole();

  const name = [role?.name, role?.surname].filter(Boolean).join(' ').trim() || 'DentalHub';
  const type = role?.accountType ?? 'dentist';
  const roleLabel = ROLE_LABELS[type]?.[ar ? 'ar' : 'en'] ?? type;
  const photo = role?.photoURL ?? '';
  const city = role?.city || role?.address || '';
  const email = role?.email || '';

  return (
    <Screen>
      {/* Profile card */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        {photo ? (
          <Image source={{ uri: photo }} className="h-16 w-16 rounded-2xl bg-slate-100" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <User size={28} color="#3B82F6" />
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold text-slate-900" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-primary">{roleLabel}</Text>
          <Text className="mt-0.5 text-[11px] text-slate-500" numberOfLines={1}>
            {email || city}
          </Text>
        </View>
      </View>

      {/* Menu */}
      <View className="mt-5 gap-2.5">
        <Row
          icon={Globe}
          tone="bg-sky-100"
          color="#0284C7"
          label={ar ? 'اللغة' : 'Language'}
          right={lang === 'ar' ? 'العربية' : 'English'}
          onPress={toggle}
        />
        <Row
          icon={Bell}
          tone="bg-rose-100"
          color="#E11D48"
          label={ar ? 'الإشعارات' : 'Notifications'}
          onPress={() => router.push('/notifications')}
        />
        <Row
          icon={MessageCircle}
          tone="bg-emerald-100"
          color="#059669"
          label={ar ? 'الرسائل' : 'Messages'}
          onPress={() => router.push('/messages')}
        />
        <Row
          icon={Heart}
          tone="bg-fuchsia-100"
          color="#C026D3"
          label={ar ? 'المفضلة' : 'Favorites'}
          onPress={() => router.push('/favorites')}
        />
        <Row
          icon={Megaphone}
          tone="bg-emerald-100"
          color="#059669"
          label={ar ? 'العروض' : 'Offers'}
          onPress={() => router.push('/offers')}
        />
        <Row
          icon={Package}
          tone="bg-amber-100"
          color="#D97706"
          label={ar ? 'الطلبات السريعة' : 'Quick Orders'}
          onPress={() => router.push('/quick-orders')}
        />
        {(type === 'supply' || type === 'implant') && (
          <Row
            icon={FileText}
            tone="bg-slate-100"
            color="#334155"
            label={ar ? 'فواتير الأطباء' : 'Doctor Invoices'}
            onPress={() => router.push('/doctor-invoices')}
          />
        )}
        <Row
          icon={LifeBuoy}
          tone="bg-indigo-100"
          color="#4F46E5"
          label={ar ? 'المساعدة' : 'Help'}
          onPress={() => router.push('/help')}
        />
      </View>

      <Pressable
        onPress={() => signOut(auth)}
        className="mt-6 h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50"
      >
        <LogOut size={17} color="#E11D48" />
        <Text className="text-sm font-bold text-rose-600">
          {ar ? 'تسجيل الخروج' : 'Sign out'}
        </Text>
      </Pressable>
    </Screen>
  );
}

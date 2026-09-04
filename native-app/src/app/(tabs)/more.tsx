import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
  Bell,
  ChevronLeft,
  Crown,
  FileText,
  FlaskConical,
  HelpCircle,
  Heart,
  ListChecks,
  MessageSquare,
  Package,
  PenTool,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Stethoscope,
  Syringe,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useLabStaffClaim, useUserRole } from '@/lib/useAuth';
import { auth } from '@/integrations/firebase/client';
import { useI18n } from '@/lib/i18n';

const ROLE_AR: Record<string, string> = {
  dentist: 'طبيب أسنان',
  supply: 'مكتب مستلزمات',
  lab: 'مختبر طبي',
  implant: 'شركة زرعات',
  admin: 'مدير النظام',
};

type Item = { icon: LucideIcon; ar: string; en: string; to: Href };

const ITEMS: Record<string, Item[]> = {
  dentist: [
    { icon: Stethoscope, ar: 'عيادتي', en: 'My Clinic', to: '/clinic' },
    { icon: Users, ar: 'المرضى', en: 'Patients', to: '/patients' },
    { icon: ListChecks, ar: 'تتبع الحالات', en: 'Track Cases', to: '/track-cases' },
    { icon: Heart, ar: 'المفضلة', en: 'Favorites', to: '/favorites' },
    { icon: Crown, ar: 'البراندات', en: 'Brands', to: '/brands' },
    { icon: ShoppingBag, ar: 'المستلزمات', en: 'Supplies', to: '/supplies' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: HelpCircle, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShoppingCart, ar: 'السلة', en: 'Cart', to: '/cart' },
  ],
  supply: [
    { icon: Store, ar: 'لوحة المورد', en: 'Supplier Dashboard', to: '/supplies-office' },
    { icon: ShoppingBag, ar: 'المستلزمات', en: 'Supplies', to: '/supplies' },
    { icon: FileText, ar: 'فواتير الأطباء', en: 'Doctor Invoices', to: '/doctor-invoices' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: HelpCircle, ar: 'المساعدة', en: 'Help', to: '/help' },
  ],
  // Web parity: labs get their dashboard, doctors, invoices and messages —
  // previously this menu had only two entries, leaving most of the lab's own
  // features unreachable on mobile.
  lab: [
    { icon: FlaskConical, ar: 'لوحة المختبر', en: 'Lab Dashboard', to: '/labs-office' },
    { icon: PenTool, ar: 'حالات التصميم', en: 'Design Cases', to: '/designer' },
    { icon: Stethoscope, ar: 'الأطباء', en: 'Doctors', to: '/doctors' },
    { icon: FileText, ar: 'فواتير الأطباء', en: 'Doctor Invoices', to: '/doctor-invoices' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: HelpCircle, ar: 'المساعدة', en: 'Help', to: '/help' },
  ],
  implant: [
    { icon: Syringe, ar: 'لوحة الزرعات', en: 'Implant Dashboard', to: '/implants-office' },
    { icon: Package, ar: 'الزرعات', en: 'Implants', to: '/implants' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: HelpCircle, ar: 'المساعدة', en: 'Help', to: '/help' },
  ],
  // Invited lab staff (custom claim, no user_roles doc). A designer must never
  // see lab dashboards — finance lives behind them.
  designer: [
    { icon: PenTool, ar: 'حالاتي كمصمم', en: 'My Design Cases', to: '/designer' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: HelpCircle, ar: 'المساعدة', en: 'Help', to: '/help' },
  ],
  admin: [
    { icon: Shield, ar: 'لوحة الإدارة', en: 'Admin Panel', to: '/admin' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
  ],
};

export default function MoreScreen() {
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { role } = useUserRole();
  const { claim: labStaff } = useLabStaffClaim();

  // Invited staff have a claim but no user_roles doc — key the menu off that.
  const type = labStaff?.role === 'DESIGNER' ? 'designer' : (role?.accountType ?? 'dentist');
  const items = ITEMS[type] ?? ITEMS.dentist;
  const roleAr = ROLE_AR[type] ?? type;

  const fullName = [role?.name, role?.surname].filter(Boolean).join(' ').trim() || 'DentalHub';

  return (
    <Screen>
      {/* Profile */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Text className="text-lg font-extrabold text-primary">{fullName.charAt(0)}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
            {fullName}
          </Text>
          <Text className="text-xs font-semibold text-primary">{roleAr}</Text>
          {!!role?.email && (
            <Text className="text-[11px] text-slate-400" numberOfLines={1}>
              {role.email}
            </Text>
          )}
        </View>
      </View>

      {/* Menu card */}
      <View className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <View key={it.en}>
              <Pressable
                onPress={() => router.push(it.to)}
                className="flex-row items-center gap-3 px-4 py-3.5"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Icon size={19} color="#334155" strokeWidth={2.1} />
                </View>
                <Text className="flex-1 text-sm font-bold text-slate-800">{ar ? it.ar : it.en}</Text>
                <ChevronLeft size={18} color="#CBD5E1" />
              </Pressable>
              {i < items.length - 1 && <View className="ml-16 mr-4 h-px bg-slate-100" />}
            </View>
          );
        })}
      </View>

      {/* Language */}
      <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-card px-4 py-3.5 shadow-sm">
        <Text className="text-sm font-bold text-slate-800">{ar ? 'اللغة' : 'Language'}</Text>
        <PressablePill
          label={lang === 'ar' ? 'English' : 'العربية'}
          onPress={toggle}
        />
      </View>

      {/* Sign out */}
      <View className="mt-6">
        <PressableBlue
          label={ar ? 'تسجيل الخروج' : 'Sign out'}
          onPress={() => signOut(auth)}
        />
      </View>
    </Screen>
  );
}

function PressablePill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-9 items-center justify-center rounded-full bg-primary px-4">
      <Text className="text-xs font-bold text-white">{label}</Text>
    </Pressable>
  );
}

function PressableBlue({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-12 items-center justify-center rounded-2xl bg-[#2563EB] shadow-lg">
      <Text className="text-sm font-bold text-white">{label}</Text>
    </Pressable>
  );
}

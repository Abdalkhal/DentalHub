import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Cog,
  FileText,
  FlaskConical,
  Globe,
  Heart,
  LifeBuoy,
  LogIn,
  ListChecks,
  Megaphone,
  MessageSquare,
  PenTool,
  Shield,
  ShieldCheck,
  Package,
  ShoppingCart,
  Store,
  Stethoscope,
  Tag,
  User,
  Users,
  TicketPercent,
  Lock,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useIsAdmin, useLabStaffClaim, useUserRole } from '@/lib/useAuth';
import { useMaterialsBadge } from '@/lib/materialsStore';
import { useI18n } from '@/lib/i18n';
import { groupMenu, MENU_GROUPS } from '@/lib/menuGroups';

const ROLE_AR: Record<string, string> = {
  dentist: 'طبيب أسنان',
  supply: 'مكتب مستلزمات',
  lab: 'مختبر طبي',
  implant: 'شركة زرعات',
  admin: 'مدير النظام',
  guest: 'زائر',
};
const ROLE_EN: Record<string, string> = {
  dentist: 'Dentist',
  supply: 'Supply Office',
  lab: 'Lab',
  implant: 'Implant Company',
  admin: 'Admin',
  guest: 'Guest',
};

type Item = { icon: LucideIcon; ar: string; en: string; to: string };

const ITEMS: Record<string, Item[]> = {
  dentist: [
    { icon: Stethoscope, ar: 'عيادتي', en: 'My Clinic', to: '/clinic' },
    { icon: Users, ar: 'المرضى', en: 'Patients', to: '/patients' },
    { icon: ListChecks, ar: 'تتبع الحالات', en: 'Track Cases', to: '/track-cases' },
    { icon: Heart, ar: 'المفضلة', en: 'Favorites', to: '/favorites' },
    { icon: Tag, ar: 'العروض', en: 'Offers', to: '/offers' },
    { icon: BadgeCheck, ar: 'البراندات', en: 'Brands', to: '/brands' },
    { icon: Package, ar: 'المستلزمات', en: 'Supplies', to: '/supplies' },
    { icon: Megaphone, ar: 'إعلاناتي', en: 'My Ads', to: '/my-ads' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: Cog, ar: 'الإعدادات', en: 'Settings', to: '/settings' },
    { icon: LifeBuoy, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy', to: '/privacy' },
    { icon: ShoppingCart, ar: 'السلة', en: 'Cart', to: '/cart' },
  ],
  supply: [
    { icon: Store, ar: 'لوحة المورد', en: 'Supplier Dashboard', to: '/supplies-office' },
    { icon: FileText, ar: 'فواتير الأطباء', en: 'Doctor Invoices', to: '/doctor-invoices' },
    { icon: TicketPercent, ar: 'الخصومات', en: 'Discounts', to: '/office-discounts' },
    { icon: Lock, ar: 'إظهار الأسعار', en: 'Who sees prices', to: '/price-access' },
    { icon: Megaphone, ar: 'إعلاناتي', en: 'My Ads', to: '/my-ads' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: Cog, ar: 'الإعدادات', en: 'Settings', to: '/settings' },
    { icon: LifeBuoy, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy', to: '/privacy' },
  ],
  // Web parity: labs get their dashboard, doctors, invoices and messages —
  // previously this menu had only two entries, leaving most of the lab's own
  // features unreachable on mobile.
  lab: [
    { icon: FlaskConical, ar: 'لوحة المختبر', en: 'Lab Dashboard', to: '/labs-office' },
    { icon: PenTool, ar: 'حالات التصميم', en: 'Design Cases', to: '/designer' },
    { icon: Stethoscope, ar: 'الأطباء', en: 'Doctors', to: '/lab-doctors' },
    { icon: FileText, ar: 'فواتير الأطباء', en: 'Doctor Invoices', to: '/doctor-invoices' },
    { icon: Megaphone, ar: 'إعلاناتي', en: 'My Ads', to: '/my-ads' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: Cog, ar: 'الإعدادات', en: 'Settings', to: '/settings' },
    { icon: LifeBuoy, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy', to: '/privacy' },
  ],
  implant: [
    { icon: FlaskConical, ar: 'لوحة الزرعات', en: 'Implant Dashboard', to: '/implants-office' },
    { icon: TicketPercent, ar: 'الخصومات', en: 'Discounts', to: '/office-discounts' },
    { icon: Lock, ar: 'إظهار الأسعار', en: 'Who sees prices', to: '/price-access' },
    { icon: Megaphone, ar: 'إعلاناتي', en: 'My Ads', to: '/my-ads' },
    { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/messages' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: Cog, ar: 'الإعدادات', en: 'Settings', to: '/settings' },
    { icon: LifeBuoy, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy', to: '/privacy' },
  ],
  // Invited lab staff (custom claim, no user_roles doc). A designer must never
  // see lab dashboards — finance lives behind them.
  designer: [
    { icon: PenTool, ar: 'حالاتي كمصمم', en: 'My Design Cases', to: '/designer' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
    { icon: LifeBuoy, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy', to: '/privacy' },
  ],
  // Signed-out visitors: only the catalog screens they can open without an
  // account (see lib/guestAccess.ts).
  guest: [
    { icon: BadgeCheck, ar: 'البراندات', en: 'Brands', to: '/brands' },
    { icon: FlaskConical, ar: 'زراعة الأسنان', en: 'Implants', to: '/implants' },
    { icon: Megaphone, ar: 'العروض', en: 'Offers', to: '/offers' },
    { icon: LifeBuoy, ar: 'المساعدة', en: 'Help', to: '/help' },
    { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy', to: '/privacy' },
  ],
  admin: [
    { icon: Shield, ar: 'لوحة الإدارة', en: 'Admin Panel', to: '/admin' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', to: '/notifications' },
  ],
};

export default function MoreScreen() {
  const materialsBadge = useMaterialsBadge();
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { user, role, loading } = useUserRole();
  const { claim: labStaff } = useLabStaffClaim();
  const { isAdmin } = useIsAdmin();

  // Invited staff have a claim but no user_roles doc — key the menu off that.
  // TECHNICIAN and ADMIN staff land on the same `/designer` screen as
  // DESIGNER staff (see (tabs)/index.tsx's redirect), so they need the same
  // menu here too — this used to fall through to `role?.accountType ??
  // 'dentist'` (always 'dentist' for staff, since they have no user_roles
  // doc), mislabeling a staff member's own More screen as a dentist account
  // with the wrong menu.
  const type =
    !loading && !user
      ? 'guest'
      : labStaff?.role === 'DESIGNER' || labStaff?.role === 'TECHNICIAN' || labStaff?.role === 'ADMIN'
        ? 'designer'
        : (role?.accountType ?? 'dentist');
  // `isAdmin` reflects the real `role: 'admin'` auth claim, independent of
  // `accountType` (an admin is usually still a real dentist/etc. account
  // underneath) — so the admin link is added on top of the normal menu
  // instead of replacing it.
  const items = isAdmin ? [ITEMS.admin[0], ...(ITEMS[type] ?? ITEMS.dentist)] : ITEMS[type] ?? ITEMS.dentist;
  const roleLabel = (ar ? (ROLE_AR[type] ?? type) : (ROLE_EN[type] ?? type)) + (isAdmin ? (ar ? ' · مدير' : ' · Admin') : '');

  const groups = groupMenu(items, type);
  const name = [role?.name, role?.surname].filter(Boolean).join(' ').trim();
  const Chevron = ar ? ChevronLeft : ChevronRight;

  return (
    <Screen>
      {/* Who is signed in: photo in the blue circle (as on Home), name and account type. */}
      <Pressable
        onPress={() => (type === 'guest' ? router.push('/login') : router.push('/account'))}
        className="flex-row items-center gap-3 rounded-[20px] border bg-white p-3.5"
        style={{ borderColor: '#DCE7F5', shadowColor: '#1E3A8A', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        <View
          className="h-14 w-14 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: '#1D6FE8', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#1D4ED8', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}
        >
          {role?.photoURL ? (
            <Image source={{ uri: role.photoURL }} style={{ width: 52, height: 52, borderRadius: 26 }} resizeMode="cover" />
          ) : (
            <User size={24} color="#FFFFFF" strokeWidth={2.3} />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-extrabold" style={{ color: '#0F2747' }}>
            {name || (type === 'guest' ? (ar ? 'زائر' : 'Guest') : ar ? 'حسابي' : 'My account')}
          </Text>
          <View className="mt-1 self-start rounded-full px-2.5 py-0.5" style={{ backgroundColor: '#E8F1FE' }}>
            <Text className="text-[11px] font-bold" style={{ color: '#1D6FE8' }}>
              {roleLabel}
            </Text>
          </View>
        </View>
        <Chevron size={20} color="#64748B" />
      </Pressable>

      {type === 'guest' && (
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
        >
          <LogIn size={17} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">{ar ? 'تسجيل الدخول / إنشاء حساب' : 'Sign in / Create account'}</Text>
        </Pressable>
      )}

      {/* The menu in groups, each with a heading and one icon colour. */}
      {groups.map((g) => {
        const meta = MENU_GROUPS[g.key];
        return (
          <View key={g.key} className="mt-5">
            <Text className="mb-2 px-1 text-[12px] font-extrabold" style={{ color: '#5B6B82' }}>
              {ar ? meta.ar : meta.en}
            </Text>
            <View
              className="overflow-hidden rounded-[20px] border bg-white"
              style={{ borderColor: '#DCE7F5', shadowColor: '#1E3A8A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
            >
              {g.items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <Pressable
                    key={it.en}
                    onPress={() => router.push(it.to as never)}
                    className="flex-row items-center gap-3 px-3.5 py-3"
                    style={i > 0 ? { borderTopWidth: 1, borderTopColor: '#EEF3FA' } : undefined}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg }}>
                      <Icon size={22} color={meta.fg} strokeWidth={2.3} />
                      {it.to === '/clinic' && materialsBadge > 0 && (
                        <View className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-600" style={{ borderWidth: 2, borderColor: '#FFFFFF' }} />
                      )}
                    </View>
                    <Text className="flex-1 text-[14.5px] font-bold" style={{ color: '#0F2747' }}>
                      {ar ? it.ar : it.en}
                    </Text>
                    <Chevron size={18} color="#94A3B8" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <Pressable
        onPress={toggle}
        className="mt-5 flex-row items-center gap-3 rounded-[20px] border bg-white px-3.5 py-3"
        style={{ borderColor: '#DCE7F5' }}
      >
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: '#E8F1FE' }}>
          <Globe size={22} color="#1D6FE8" strokeWidth={2.3} />
        </View>
        <Text className="flex-1 text-[14.5px] font-bold" style={{ color: '#0F2747' }}>
          {ar ? 'اللغة' : 'Language'} · {lang === 'ar' ? 'العربية' : 'English'}
        </Text>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#E8F1FE' }}>
          <Text className="text-xs font-extrabold" style={{ color: '#1D6FE8' }}>
            {lang === 'ar' ? 'EN' : 'AR'}
          </Text>
        </View>
      </Pressable>
    </Screen>
  );
}

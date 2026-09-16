import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { BarChart3, CreditCard, List, Megaphone, Plus, Sparkles, Users, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

type MenuItem = { key: string; ar: string; en: string; icon: LucideIcon; to?: string };

// Matches the web sidebar's item set (minus the Quick Access grouping and
// promo card, which aren't wanted here). All 8 items now have a destination.
const MENU_ITEMS: MenuItem[] = [
  { key: 'new_order', ar: 'طلب جديد', en: 'New Order', icon: Plus, to: '/new-lab-order' },
  { key: 'orders', ar: 'الطلبات', en: 'Orders', icon: List, to: '/orders' },
  { key: 'doctors', ar: 'الأطباء', en: 'Doctors', icon: Users, to: '/lab-doctors' },
  { key: 'accounts', ar: 'الحسابات', en: 'Accounts', icon: CreditCard, to: '/lab-finance' },
  { key: 'patients', ar: 'المرضى', en: 'Patients', icon: Users, to: '/lab-patients' },
  { key: 'reports', ar: 'التقارير', en: 'Reports', icon: BarChart3, to: '/lab-reports' },
  { key: 'services', ar: 'خدمات المختبر', en: 'Lab Services', icon: Sparkles, to: '/lab-services' },
  { key: 'myads', ar: 'إعلاناتي', en: 'My Ads', icon: Megaphone, to: '/my-ads' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(300, SCREEN_WIDTH * 0.78);

export function LabSidebar({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  // Panel is anchored to the reading-start side (right for Arabic, left for
  // English). Deliberately a plain numeric `left` for both cases — an
  // `ar ? 'right' : 'left'` key here rendered on the left in *both*
  // languages (the app forces native RTL layout via I18nManager.forceRTL on
  // language switch, and absolutely-positioned `right` did not behave as a
  // simple mirror of `left` under that forced-RTL root). A left offset
  // computed from screen width sidesteps that entirely.
  const leftPos = ar ? SCREEN_WIDTH - PANEL_WIDTH : 0;
  const hiddenX = ar ? PANEL_WIDTH : -PANEL_WIDTH;
  const translateX = useRef(new Animated.Value(hiddenX)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : hiddenX,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, hiddenX, translateX]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} className="bg-black/40" />
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: PANEL_WIDTH,
            left: leftPos,
            transform: [{ translateX }],
            backgroundColor: '#0F172A',
          }}
        >
          <View className="flex-row items-center justify-between border-b border-white/10 px-4 pb-4 pt-14">
            <Text className="text-sm font-extrabold text-white">{ar ? 'القائمة' : 'Menu'}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <X size={15} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="gap-1 p-3">
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  onClose();
                  if (item.to) router.push(item.to as never);
                }}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-white/5"
              >
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <item.icon size={16} color="#E2E8F0" />
                </View>
                <Text className="text-sm font-semibold text-white">{ar ? item.ar : item.en}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

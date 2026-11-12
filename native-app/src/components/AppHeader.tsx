// The header of every titled stack screen.
//
// The native-stack header on Android doesn't mirror under the app's forced
// RTL: in Arabic the back arrow sat on the left pointing left, with the title
// beside it, as in an English app. This header is an ordinary row, so RTL
// lays it out right-to-left: back arrow on the right pointing right in Arabic,
// the title next to it, and the screen's own buttons (the cart) at the far end.
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

/** The parts of the stack's header props this header uses. */
type HeaderProps = {
  navigation: { goBack: () => void };
  options: {
    title?: string;
    headerRight?: (p: { canGoBack: boolean; tintColor?: string }) => ReactNode;
  };
  back?: unknown;
};

export function AppHeader({ navigation, options, back }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const Arrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const title = typeof options.title === 'string' ? options.title : '';
  const right = options.headerRight?.({ canGoBack: !!back, tintColor: '#0F2747' });

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E4ECF7',
      }}
    >
      <View className="h-14 flex-row items-center gap-1 px-2">
        {back ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={lang === 'ar' ? 'رجوع' : 'Back'}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Arrow size={22} color="#0F2747" />
          </Pressable>
        ) : (
          <View className="w-2" />
        )}
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[17px] font-extrabold" style={{ color: '#0F2747' }}>
          {title}
        </Text>
        {right ? <View className="px-1">{right}</View> : null}
      </View>
    </View>
  );
}

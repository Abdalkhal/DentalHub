import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

// Main page container mirroring the web app's phone column: ice-blue background
// + safe area. Use `scroll` for scrollable pages.
//
// `SafeAreaView` comes from react-native-safe-area-context, not the RN core
// component of the same name: core RN's SafeAreaView is an iOS-only no-op —
// on Android it adds no top inset at all, so content renders straight under
// the status bar (battery/Wi-Fi icons overlapping the header). The context
// library's version reads real inset values on both platforms, matching how
// labs-office.tsx/implants-office.tsx already apply `useSafeAreaInsets()`.
export function Screen({ scroll = true, padded = true, className, children, ...props }: ScreenProps) {
  const inner = padded ? "px-4 pt-4 pb-8" : "flex-1";
  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
        <View className={cn(inner, "flex-1", className)} {...props}>
          {children}
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName={cn(inner, className)}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

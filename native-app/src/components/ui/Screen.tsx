import { ScrollView, SafeAreaView, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

// Main page container mirroring the web app's phone column: ice-blue background
// + safe area. Use `scroll` for scrollable pages.
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

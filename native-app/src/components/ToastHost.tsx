import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { toast, type ToastKind } from "@/lib/toast";

type ToastMsg = { message: string; kind: ToastKind };

const KIND_STYLES: Record<ToastKind, { bg: string; icon: string }> = {
  success: { bg: "#059669", icon: "✓" },
  error: { bg: "#E11D48", icon: "✕" },
  info: { bg: "#2563EB", icon: "i" },
  warning: { bg: "#D97706", icon: "!" },
};

function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [opacity, translateY, onDone]);

  const s = KIND_STYLES[msg.kind];
  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity, transform: [{ translateY }] }}
      className="absolute top-12 left-4 right-4 z-[100] items-center"
    >
      <View className="flex-row items-center gap-2 rounded-full px-4 py-2.5 shadow-lg" style={{ backgroundColor: s.bg }}>
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>{s.icon}</Text>
        <Text numberOfLines={2} style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", flexShrink: 1 }}>
          {msg.message}
        </Text>
      </View>
    </Animated.View>
  );
}

// Mount once near the root of the app to display `toast.*` messages.
export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  useEffect(() => {
    toast.configure((message, kind) => setMsg({ message, kind: kind ?? "info" }));
    return () => toast.configure(() => {});
  }, []);

  if (!msg) return null;
  return <Toast msg={msg} onDone={() => setMsg(null)} />;
}

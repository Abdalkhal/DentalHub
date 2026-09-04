import { ActivityIndicator, View } from "react-native";

export function Spinner({ color = "#3B82F6", size = "large" }: { color?: string; size?: "small" | "large" }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

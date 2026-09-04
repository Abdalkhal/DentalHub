import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";
import { getLang } from "@/lib/i18n";

// Font family tokens registered in _layout via expo-font (Cairo / Urbanist).
const CAIRO: Record<number, string> = {
  400: "Cairo_400Regular",
  500: "Cairo_500Medium",
  600: "Cairo_600SemiBold",
  700: "Cairo_700Bold",
  800: "Cairo_800ExtraBold",
  900: "Cairo_900Black",
};
const URBANIST: Record<number, string> = {
  400: "Urbanist_400Regular",
  500: "Urbanist_500Medium",
  600: "Urbanist_600SemiBold",
  700: "Urbanist_700Bold",
  800: "Urbanist_800ExtraBold",
  900: "Urbanist_900Black",
};

function weightFromClass(className?: string): number {
  if (!className) return 400;
  if (className.includes("font-black")) return 900;
  if (className.includes("font-extrabold")) return 800;
  if (className.includes("font-bold")) return 700;
  if (className.includes("font-semibold")) return 600;
  if (className.includes("font-medium")) return 500;
  if (className.includes("font-light") || className.includes("font-thin")) return 400;
  return 400;
}

export function Text({ className, style, ...props }: TextProps) {
  const weight = weightFromClass(typeof className === "string" ? className : undefined);
  const family = (getLang() === "ar" ? CAIRO : URBANIST)[weight] ?? URBANIST[400];
  return (
    <RNText
      className={cn("text-slate-800", className)}
      style={[{ fontFamily: family }, style]}
      {...props}
    />
  );
}

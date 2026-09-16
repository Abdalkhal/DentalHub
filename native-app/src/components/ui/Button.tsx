import { Pressable, Text, ActivityIndicator, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";

type ButtonProps = PressableProps & {
  title?: string;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "sm";
  children?: React.ReactNode;
};

export function Button({
  title,
  loading,
  variant = "primary",
  size = "md",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  // `min-h-*` + vertical padding instead of a fixed `h-*`: a longer label
  // squeezed into a narrow flex-1 slot (e.g. two side-by-side sm buttons)
  // can wrap to a second line, and RN clips a child that overflows a fixed
  // height — the second line just silently disappears instead of the
  // button growing to fit it.
  const base =
    size === "md" ? "min-h-12 rounded-2xl px-4 py-3" : "min-h-9 rounded-xl px-3 py-2";
  const variants = {
    primary: "bg-primary active:opacity-90",
    outline: "border border-primary bg-transparent",
    ghost: "bg-transparent",
  };
  const labelColor =
    variant === "primary"
      ? "text-primary-foreground"
      : variant === "outline"
        ? "text-primary"
        : "text-primary";
  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        "flex-row items-center justify-center gap-2",
        base,
        variants[variant],
        (disabled || loading) && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : "#3B82F6"} />
      ) : null}
      {title ? (
        <Text className={cn("text-center font-bold text-sm", labelColor)}>{title}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

import { Text, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn(
        "overflow-hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600",
        className,
      )}
      {...props}
    />
  );
}

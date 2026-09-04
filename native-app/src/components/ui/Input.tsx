import { TextInput, View, type TextInputProps } from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InputProps = TextInputProps & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

// Sleek inputs matching the web app: soft slate-50 field, rounded, focus ring
// simulated by the caller passing `border-primary`. Layout classNames are
// forwarded to the wrapper so `flex-1`/margins behave as before.
export function Input({ className, leftIcon, rightIcon, multiline, ...props }: InputProps) {
  return (
    <View className={cn(leftIcon || rightIcon ? "relative" : "", className)}>
      {leftIcon ? (
        <View className="absolute left-3.5 top-0 bottom-0 z-10 justify-center">
          {leftIcon}
        </View>
      ) : null}
      {rightIcon ? (
        <View className="absolute right-3 top-0 bottom-0 z-10 justify-center">
          {rightIcon}
        </View>
      ) : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        className={cn(
          "w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800",
          leftIcon && "pl-11",
          rightIcon && "pr-11",
          multiline && "h-auto min-h-[96px] py-3 text-left",
        )}
        {...props}
      />
    </View>
  );
}

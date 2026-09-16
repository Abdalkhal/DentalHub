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
//
// Icons are ordinary flex-row siblings of the TextInput rather than
// absolutely-positioned overlays: under this app's forced-RTL root
// (I18nManager.forceRTL in i18n.tsx), a fixed `left-*`/`right-*` position
// did not reliably land on the expected physical side (the search icon
// rendered overlapping Arabic placeholder text instead of before it — same
// root cause as LabSidebar's earlier positioning fix). RN's flexDirection
// mirroring under RTL is well-established and reliable, so ordering the
// icon as a sibling sidesteps the ambiguity entirely.
export function Input({ className, leftIcon, rightIcon, multiline, ...props }: InputProps) {
  return (
    <View
      className={cn(
        "w-full flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4",
        multiline ? "h-auto min-h-[96px] items-start py-3" : "h-12",
        className,
      )}
    >
      {leftIcon}
      <TextInput
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        className={cn(
          "flex-1 text-sm font-medium text-slate-800",
          (leftIcon || rightIcon) && "mx-2",
          multiline && "h-full text-left",
        )}
        {...props}
      />
      {rightIcon}
    </View>
  );
}

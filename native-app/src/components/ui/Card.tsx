import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

// Mirrors the web app's mobile card recipe: white, slate border, soft shadow.
export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("rounded-2xl border border-slate-200 bg-card shadow-sm p-4", className)}
      {...props}
    />
  );
}

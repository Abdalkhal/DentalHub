import { cn } from "@/lib/utils";
import type { ToothStatus } from "@/lib/patientsStore";

export const LEGEND_ORDER: ToothStatus[] = ["healthy", "caries", "filled", "crown", "missing", "implant", "rct", "bridge", "unerupted"];

export const TOOTH_META: Record<string, { ar: string; en: string; dot: string }> = {
  healthy: { ar: "سليم", en: "Healthy", dot: "bg-emerald-500" },
  caries: { ar: "تسوس", en: "Caries", dot: "bg-red-500" },
  filled: { ar: "حشو", en: "Filled", dot: "bg-amber-500" },
  crown: { ar: "تاج", en: "Crown", dot: "bg-yellow-500" },
  missing: { ar: "مفقود", en: "Missing", dot: "bg-slate-400" },
  implant: { ar: "زرعة", en: "Implant", dot: "bg-blue-500" },
  rct: { ar: "عصب", en: "RCT", dot: "bg-orange-500" },
  bridge: { ar: "جسر", en: "Bridge", dot: "bg-purple-500" },
  unerupted: { ar: "غير بازغ", en: "Unerupted", dot: "bg-gray-300" },
};

export function DentalArch({
  jaw,
  teeth,
  onTooth,
}: {
  jaw: "upper" | "lower";
  teeth: Record<number, ToothStatus>;
  onTooth?: (n: number) => void;
}) {
  const isUpper = jaw === "upper";
  const range = isUpper ? [1, 16] : [17, 32];

  const statusColors: Record<ToothStatus, string> = {
    healthy: "bg-emerald-100 border-emerald-300 text-emerald-700",
    caries: "bg-red-100 border-red-300 text-red-700",
    filled: "bg-amber-100 border-amber-300 text-amber-700",
    crown: "bg-yellow-100 border-yellow-300 text-yellow-700",
    missing: "bg-slate-200 border-slate-300 text-slate-500 line-through",
    implant: "bg-blue-100 border-blue-300 text-blue-700",
    rct: "bg-orange-100 border-orange-300 text-orange-700",
    bridge: "bg-purple-100 border-purple-300 text-purple-700",
    unerupted: "bg-gray-50 border-gray-200 text-gray-400",
  };

  return (
    <div className="flex justify-center gap-1 py-1">
      {Array.from({ length: 16 }, (_, i) => {
        const n = range[0] + i;
        const status = teeth[n] || "healthy";
        return (
          <button key={n} type="button" onClick={() => onTooth?.(n)}
            className={cn("w-7 h-8 rounded-md border text-[9px] font-bold flex items-center justify-center transition hover:scale-110", statusColors[status])}>
            {n}
          </button>
        );
      })}
    </div>
  );
}

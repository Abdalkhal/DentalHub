import { cn } from "@/lib/utils";
import type { ToothStatus } from "@/lib/patientsStore";
import archUpper from "@/assets/arch-upper.png";
import archLower from "@/assets/arch-lower.png";

export const FDI_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const FDI_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

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

const UPPER_POS: Record<number, [number, number]> = {
  18: [12.5, 82], 17: [13.5, 67], 16: [15.5, 54], 15: [18.5, 42.5], 14: [21, 34],
  13: [25, 25], 12: [32.5, 15.5], 11: [42.5, 11],
  21: [55.5, 11], 22: [65.5, 15.5], 23: [73, 25], 24: [77.5, 34],
  25: [80.5, 42.5], 26: [83.5, 54], 27: [85.5, 67], 28: [86.5, 82],
};

const LOWER_POS: Record<number, [number, number]> = {
  48: [14, 14], 47: [15.5, 27], 46: [17, 41], 45: [20, 54], 44: [24, 63.5],
  43: [28.5, 72], 42: [36, 79], 41: [44, 83],
  31: [54, 83], 32: [62, 79], 33: [69.5, 72], 34: [74, 63.5],
  35: [78, 54], 36: [81, 41], 37: [82.5, 27], 38: [84, 14],
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
  const fdiList = jaw === "upper" ? FDI_UPPER : FDI_LOWER;
  const posMap = jaw === "upper" ? UPPER_POS : LOWER_POS;
  const archSrc = jaw === "upper" ? archUpper : archLower;

  const statusColors: Record<ToothStatus, string> = {
    healthy: "bg-emerald-100/90 border-emerald-300 text-emerald-700",
    caries: "bg-red-100/90 border-red-300 text-red-700",
    filled: "bg-amber-100/90 border-amber-300 text-amber-700",
    crown: "bg-yellow-100/90 border-yellow-300 text-yellow-700",
    missing: "bg-slate-200/90 border-slate-300 text-slate-500 line-through",
    implant: "bg-blue-100/90 border-blue-300 text-blue-700",
    rct: "bg-orange-100/90 border-orange-300 text-orange-700",
    bridge: "bg-purple-100/90 border-purple-300 text-purple-700",
    unerupted: "bg-gray-50/90 border-gray-200 text-gray-400",
  };

  return (
    <div className="relative w-full aspect-[4/3] max-w-md mx-auto">
      <img src={archSrc} alt={jaw === "upper" ? "Upper arch" : "Lower arch"} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
      {fdiList.map((n) => {
        const pos = posMap[n];
        if (!pos) return null;
        const px = pos[0];
        const py = pos[1];
        const lx = 50 + (px - 50) * 1.22;
        const ly = 50 + (py - 50) * 1.18;
        const status = teeth[n] || "healthy";
        return (
          <button
            key={n}
            type="button"
            onClick={() => onTooth?.(n)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 w-[8%] max-w-[28px] aspect-square rounded-full border-2 text-[9px] font-bold flex items-center justify-center transition hover:scale-125 hover:z-10 hover:shadow-md",
              statusColors[status],
            )}
            style={{ top: `${ly}%`, left: `${lx}%` }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

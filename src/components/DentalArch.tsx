import type { ToothStatus } from "@/lib/patientsStore";
import archUpper from "@/assets/arch-upper.png";
import archLower from "@/assets/arch-lower.png";
import {
  ARCH_HITS,
  ARCH_LAYOUT,
  CANVAS_H,
  CANVAS_W,
  HIT_R,
  LABEL_FONT,
  PHOTO,
  PILL_H,
  pillLeft,
  pillWidth,
} from "@/lib/archLayout";

export const FDI_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const FDI_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const LEGEND_ORDER: ToothStatus[] = [
  "healthy",
  "caries",
  "filled",
  "crown",
  "missing",
  "implant",
  "rct",
  "bridge",
  "unerupted",
];

export const TOOTH_META: Record<string, { ar: string; en: string; dot: string; hex: string }> = {
  healthy: { ar: "سليم", en: "Healthy", dot: "bg-emerald-500", hex: "#10B981" },
  caries: { ar: "تسوس", en: "Caries", dot: "bg-red-500", hex: "#EF4444" },
  filled: { ar: "حشو", en: "Filled", dot: "bg-amber-500", hex: "#F59E0B" },
  crown: { ar: "تاج", en: "Crown", dot: "bg-yellow-500", hex: "#EAB308" },
  missing: { ar: "مفقود", en: "Missing", dot: "bg-slate-400", hex: "#94A3B8" },
  implant: { ar: "زرعة", en: "Implant", dot: "bg-blue-500", hex: "#3B82F6" },
  rct: { ar: "عصب", en: "RCT", dot: "bg-orange-500", hex: "#F97316" },
  bridge: { ar: "جسر", en: "Bridge", dot: "bg-purple-500", hex: "#A855F7" },
  unerupted: { ar: "غير بازغ", en: "Unerupted", dot: "bg-gray-300", hex: "#D1D5DB" },
};

export const UPPER_POS: Record<number, [number, number]> = {
  18: [12.5, 82],
  17: [13.5, 67],
  16: [15.5, 54],
  15: [18.5, 42.5],
  14: [21, 34],
  13: [25, 25],
  12: [32.5, 15.5],
  11: [42.5, 11],
  21: [55.5, 11],
  22: [65.5, 15.5],
  23: [73, 25],
  24: [77.5, 34],
  25: [80.5, 42.5],
  26: [83.5, 54],
  27: [85.5, 67],
  28: [86.5, 82],
};

export const LOWER_POS: Record<number, [number, number]> = {
  48: [14, 14],
  47: [15.5, 27],
  46: [17, 41],
  45: [20, 54],
  44: [24, 63.5],
  43: [28.5, 72],
  42: [36, 79],
  41: [44, 83],
  31: [54, 83],
  32: [62, 79],
  33: [69.5, 72],
  34: [74, 63.5],
  35: [78, 54],
  36: [81, 41],
  37: [82.5, 27],
  38: [84, 14],
};

/**
 * The patient's tooth chart: tap a tooth on the photo and it gets a dot in the
 * chosen colour, with a line out to a label showing the tooth number and the
 * status in English (whatever the app language), like a dental chart printout.
 */
export function DentalArch({
  jaw,
  teeth,
  onTooth,
}: {
  jaw: "upper" | "lower";
  teeth: Record<number, ToothStatus>;
  onTooth?: (n: number) => void;
}) {
  const layout = ARCH_LAYOUT[jaw];
  const archSrc = jaw === "upper" ? archUpper : archLower;
  const marked = layout.filter((t) => teeth[t.n] && TOOTH_META[teeth[t.n]]);

  return (
    <div dir="ltr" className="relative w-full aspect-[4/3] max-w-xl mx-auto select-none">
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="absolute inset-0 size-full"
        style={{ direction: "ltr" }}
      >
        <defs>
          <filter id="arch-pill-shadow" x="-20%" y="-40%" width="140%" height="190%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.12" />
          </filter>
        </defs>
        <image href={archSrc} x={PHOTO.x} y={PHOTO.y} width={PHOTO.size} height={PHOTO.size} />

        {/* Leader lines under everything else. */}
        {marked.map((t) => (
          <line
            key={`l${t.n}`}
            x1={t.x}
            y1={t.y}
            x2={t.labelX}
            y2={t.labelY}
            stroke="#64748B"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}

        {/* Tooth numbers, always shown. */}
        {layout.map((t) => (
          <text
            key={`n${t.n}`}
            x={t.numX}
            y={t.numY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={38}
            fontWeight={800}
            fill={teeth[t.n] ? "#334155" : "#94A3B8"}
            stroke="#FFFFFF"
            strokeWidth={10}
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {t.n}
          </text>
        ))}

        {/* Labels: tooth status in English. */}
        {marked.map((t) => {
          const word = TOOTH_META[teeth[t.n]].en;
          const w = pillWidth(word);
          const left = pillLeft(t, w);
          return (
            <g key={`p${t.n}`} filter="url(#arch-pill-shadow)">
              <rect
                x={left}
                y={t.labelY - PILL_H / 2}
                width={w}
                height={PILL_H}
                rx={PILL_H / 2}
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth={2}
              />
              <text
                x={left + w / 2}
                y={t.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={LABEL_FONT}
                fontWeight={700}
                fill="#0F172A"
              >
                {word}
              </text>
            </g>
          );
        })}

        {/* Status dots on the teeth themselves. */}
        {marked.map((t) => (
          <circle
            key={`d${t.n}`}
            cx={t.x}
            cy={t.y}
            r={30}
            fill={TOOTH_META[teeth[t.n]].hex}
            stroke="#FFFFFF"
            strokeWidth={7}
            filter="url(#arch-pill-shadow)"
          />
        ))}

        {/* Invisible tap targets over each tooth. */}
        {onTooth &&
          ARCH_HITS[jaw].map((h, i) => (
            <circle
              key={`h${i}`}
              cx={h.x}
              cy={h.y}
              r={HIT_R}
              fill="transparent"
              className="cursor-pointer hover:fill-white/25"
              onClick={() => onTooth(h.n)}
            >
              <title>{h.n}</title>
            </circle>
          ))}
      </svg>
    </div>
  );
}

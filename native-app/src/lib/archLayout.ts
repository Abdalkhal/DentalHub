/* Shared with src/lib/archLayout.ts — keep the two identical. */
// ---------------------------------------------------------------------------
// Annotated chart geometry. Everything is in one 1600×1200 (4:3) canvas: the
// 1024px arch photo sits in the middle and labels go around it, so the chart
// scales as one piece on any screen.
// ---------------------------------------------------------------------------

export const CANVAS_W = 1600;
export const CANVAS_H = 1200;
/** Where the 1024×1024 arch photo is drawn inside the canvas. */
export const PHOTO = { x: 288, y: 88, size: 1024 };

/** Tooth centres on the arch photos, in photo pixels. */
const UPPER_TEETH: Record<number, [number, number]> = {
  18: [118, 830],
  17: [137, 697],
  16: [165, 553],
  15: [190, 437],
  14: [222, 343],
  13: [262, 245],
  12: [330, 178],
  11: [432, 150],
  21: [553, 150],
  22: [657, 178],
  23: [728, 245],
  24: [770, 343],
  25: [805, 435],
  26: [833, 550],
  27: [868, 693],
  28: [895, 827],
};
const LOWER_TEETH: Record<number, [number, number]> = {
  48: [157, 150],
  47: [160, 290],
  46: [188, 433],
  45: [215, 550],
  44: [243, 643],
  43: [335, 790],
  42: [398, 822],
  41: [469, 830],
  31: [546, 830],
  32: [617, 822],
  33: [682, 790],
  34: [773, 640],
  35: [800, 548],
  36: [830, 430],
  37: [858, 290],
  38: [862, 150],
};
/**
 * The lower photo draws one tooth too many on each side, between the canine
 * and the first premolar. Front teeth are counted from the midline, back teeth
 * from the back, and a tap on the extra tooth marks the canine.
 */
const LOWER_EXTRA_HITS: { n: number; at: [number, number] }[] = [
  { n: 43, at: [278, 727] },
  { n: 33, at: [738, 727] },
];

/** Right edge of the left label column and left edge of the right one. */
const LEFT_COL = 250;
const RIGHT_COL = CANVAS_W - 250;

/** Front teeth whose labels sit above (upper) or below (lower) the arch. */
const FRONT_LABELS: Record<number, [number, number]> = {
  12: [420, 120],
  11: [640, 40],
  21: [960, 40],
  22: [1180, 120],
  42: [470, 1100],
  41: [700, 1160],
  31: [900, 1160],
  32: [1130, 1100],
};

export type ArchTooth = {
  n: number;
  /** Tooth centre, canvas px. */
  x: number;
  y: number;
  /** Where the tooth number is printed, on the way to the label. */
  numX: number;
  numY: number;
  /** Label anchor; `align` says which side of the pill it is. */
  labelX: number;
  labelY: number;
  align: "start" | "middle" | "end";
};

export type ArchHit = { n: number; x: number; y: number };

const toCanvas = ([x, y]: [number, number]): [number, number] => [PHOTO.x + x, PHOTO.y + y];

function layout(teeth: Record<number, [number, number]>): ArchTooth[] {
  return Object.entries(teeth).map(([key, at]) => {
    const n = Number(key);
    const [x, y] = toCanvas(at);
    const unit = n % 10;
    const leftSide = Math.floor(n / 10) === 1 || Math.floor(n / 10) === 4;
    const front = FRONT_LABELS[n];
    const labelX = front ? front[0] : leftSide ? LEFT_COL : RIGHT_COL;
    const labelY = front ? front[1] : y;
    const align: ArchTooth["align"] = front ? "middle" : leftSide ? "end" : "start";
    // The number sits just outside the tooth, on the line to its label.
    const dist = unit >= 6 ? 112 : unit >= 4 ? 100 : 88;
    const dx = labelX - x;
    const dy = labelY - y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      n,
      x,
      y,
      numX: x + (dx / len) * dist,
      numY: y + (dy / len) * dist,
      labelX,
      labelY,
      align,
    };
  });
}

export const ARCH_LAYOUT: Record<"upper" | "lower", ArchTooth[]> = {
  upper: layout(UPPER_TEETH),
  lower: layout(LOWER_TEETH),
};

/** Tap targets: one per tooth, plus the lower photo's extra front teeth. */
export const ARCH_HITS: Record<"upper" | "lower", ArchHit[]> = {
  upper: ARCH_LAYOUT.upper.map((t) => ({ n: t.n, x: t.x, y: t.y })),
  lower: [
    ...ARCH_LAYOUT.lower.map((t) => ({ n: t.n, x: t.x, y: t.y })),
    ...LOWER_EXTRA_HITS.map((h) => {
      const [x, y] = toCanvas(h.at);
      return { n: h.n, x, y };
    }),
  ],
};
/** Tap target radius, canvas px. */
export const HIT_R = 54;

/** Label pill size for a word, canvas px (no text measuring in SVG). */
export const LABEL_FONT = 40;
export const pillWidth = (text: string) => Math.round(text.length * 23 + 48);
export const PILL_H = 62;

/** The pill's left edge for a label anchor. */
export function pillLeft(t: ArchTooth, w: number) {
  return t.align === "start" ? t.labelX : t.align === "end" ? t.labelX - w : t.labelX - w / 2;
}

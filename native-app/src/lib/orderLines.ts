import type { Order } from "./ordersStore";
import { WORK_TYPES } from "./dentalConfig";

export type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
  price?: number;
  totalPrice?: number;
  total?: number;
};

const WORK_TYPE_BY_ID: Record<string, string> = Object.fromEntries(
  WORK_TYPES.map((w) => [w.id, w.ar]),
);

const USD_RATE = 1480;

/**
 * Resolves the final invoice amount, checking every possible price field.
 * The referring dentist reads the (financial-stripped) case document, so the
 * total can live under any of these keys depending on when the order was written.
 */
export function resolveOrderTotal(order: Order): number {
  const firstItemPrice =
    order.items && order.items.length ? Number(order.items[0]?.price) || 0 : 0;
  return (
    Number(order.totalAmount) ||
    Number(order.totalPrice) ||
    Number(order.price) ||
    Number(order.total) ||
    firstItemPrice ||
    0
  );
}

function fallbackUnitPrice(order: Order): number {
  if (Number(order.unitPrice) > 0) {
    return order.currency === "USD" ? Number(order.unitPrice) / USD_RATE : Number(order.unitPrice);
  }
  const total = resolveOrderTotal(order);
  if (total && order.unitsCount) {
    return total / (Number(order.unitsCount) || 1);
  }
  return 0;
}

function toLine(
  id: string,
  name: string,
  quantity: number,
  unitPrice: number,
  currency: "USD" | "IQD",
  price?: number,
  totalPrice?: number,
  total?: number,
): OrderLine {
  const line: OrderLine = { id, name, quantity, unitPrice, currency };
  if (price !== undefined) line.price = price;
  if (totalPrice !== undefined) line.totalPrice = totalPrice;
  if (total !== undefined) line.total = total;
  return line;
}

/**
 * Builds the itemized lines for an order. Prefers the explicitly itemized
 * pricing rows, otherwise derives per-material / per-work-type rows from the
 * doctor Rx data (`rxData.toothItems`, then `rxTeeth`), falling back to a
 * single line.
 */
export function deriveOrderLines(order: Order): OrderLine[] {
  const currency = order.currency ?? "USD";

  const priced = (order.pricingItems ?? []).filter((i) => i.name && String(i.name).trim() !== "");
  if (priced.length > 1) {
    return priced.map((i) =>
      toLine(
        i.id,
        String(i.name),
        Number(i.quantity) || 0,
        Number(i.unitPrice) || 0,
        i.currency,
        Number(i.price) || undefined,
        Number(i.totalPrice) || undefined,
        Number(i.total) || undefined,
      ),
    );
  }

  const unitPrice = fallbackUnitPrice(order);

  const toothItems = (order.rxData?.toothItems as Record<string, string[]> | undefined) ?? {};
  const byLabel = new Map<string, number>();
  Object.values(toothItems).forEach((items) => {
    (Array.isArray(items) ? items : []).forEach((label) => {
      const name = String(label ?? "").trim();
      if (!name) return;
      byLabel.set(name, (byLabel.get(name) ?? 0) + 1);
    });
  });
  if (byLabel.size > 0) {
    return [...byLabel.entries()].map(([name, quantity]) =>
      toLine(`rxitem-${name}`, name, quantity, unitPrice, currency),
    );
  }

  const teeth = order.rxTeeth ?? {};
  const byWork = new Map<string, number>();
  Object.values(teeth).forEach((t) => {
    const label = WORK_TYPE_BY_ID[t] ?? t;
    byWork.set(label, (byWork.get(label) ?? 0) + 1);
  });
  if (byWork.size > 0) {
    return [...byWork.entries()].map(([name, quantity]) =>
      toLine(`rxtooth-${name}`, name, quantity, unitPrice, currency),
    );
  }

  if (priced.length === 1) {
    const i = priced[0];
    return [
      toLine(
        i.id,
        String(i.name),
        Number(i.quantity) || 0,
        Number(i.unitPrice) || 0,
        i.currency,
        Number(i.price) || undefined,
        Number(i.totalPrice) || undefined,
        Number(i.total) || undefined,
      ),
    ];
  }

  return [
    toLine(
      order.id,
      order.workType || "—",
      Number(order.unitsCount) || 1,
      Number(order.unitPrice) || 0,
      currency,
    ),
  ];
}

const TOOTH_SEG = String.raw`\d{1,2}\s*:\s*[^\s،|][^،|]*`;
const ITEM_SEG = String.raw`[^\s،|][^،|]*#\s*\d+`;
const GENERATED_NOTES_RE = new RegExp(
  `^\\s*(?:${TOOTH_SEG}(?:\\s*،\\s*${TOOTH_SEG})*)?\\s*(?:\\|\\s*)?(?:${ITEM_SEG}(?:\\s*،\\s*${ITEM_SEG})*)?\\s*$`,
);

/**
 * Returns the actual doctor notes, hiding the raw auto-generated work
 * breakdown string ("15: تاج... 17: حشوة..." or "تاج #15، حشوة #17").
 */
export function cleanDoctorNotes(notes?: string | null): string {
  if (!notes) return "";
  const text = String(notes).trim();
  if (!text) return "";
  if (GENERATED_NOTES_RE.test(text)) return "";
  return text;
}

/* Shared with native-app/src/lib/officeSearch.ts — keep the two identical. */
/**
 * Product search shown by office: each office once, with how many of its
 * products match, the doctor's own governorate first and the rest behind
 * "show more".
 */
import { CITIES } from "@/data/offices";

export type OfficeHit = {
  id: string;
  name: string;
  photoURL: string;
  /** Governorate id ("nineveh"), or "" when the office has none. */
  city: string;
  /** How many of the found products belong to this office. */
  count: number;
};

/** A governorate as saved anywhere (id, Arabic or English name) → its id. */
export function cityId(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  const c = CITIES.find((x) => x.id === s || x.ar === String(v).trim() || x.en.toLowerCase() === s);
  return c ? c.id : "";
}

export function cityName(id: string, ar: boolean): string {
  const c = CITIES.find((x) => x.id === id);
  return c ? (ar ? c.ar : c.en) : "";
}

/**
 * Groups found products by office. `local` are the offices in the doctor's
 * governorate, `others` the rest; each list has the most matches first.
 */
export function groupByOffice(
  products: Array<{ companyId?: string | null }>,
  accounts: Array<{ id: string; name: string; photoURL: string; city?: string }>,
  doctorCity: string | null | undefined,
): { local: OfficeHit[]; others: OfficeHit[]; doctorCity: string } {
  const counts = new Map<string, number>();
  for (const p of products) if (p.companyId) counts.set(p.companyId, (counts.get(p.companyId) ?? 0) + 1);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const hits: OfficeHit[] = [];
  for (const [id, count] of counts) {
    const a = byId.get(id);
    if (!a) continue;
    hits.push({ id, name: a.name, photoURL: a.photoURL, city: cityId(a.city), count });
  }
  hits.sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
  const mine = cityId(doctorCity);
  if (!mine) return { local: [], others: hits, doctorCity: "" };
  return { local: hits.filter((h) => h.city === mine), others: hits.filter((h) => h.city !== mine), doctorCity: mine };
}

/** "منتج واحد" / "منتجان" / "5 منتجات" / "12 منتجاً". */
export function productsCount(n: number, ar: boolean): string {
  if (!ar) return `${n} ${n === 1 ? "product" : "products"}`;
  if (n === 1) return "منتج واحد";
  if (n === 2) return "منتجان";
  if (n >= 3 && n <= 10) return `${n} منتجات`;
  return `${n} منتجاً`;
}

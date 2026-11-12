import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { ALL_COUNTRIES } from "@/data/countries";
import { assertVerified } from "./emailVerification";
import { resetPriceCache } from "./priceAccess";
import { useCatalogOffers, type Currency, type Product } from "./products";

// The shared product catalog: every product once, with no prices. An office
// lists one by writing its own price and details to a normal `products` doc,
// so carts, orders, discounts and invoices treat it like any other product.
// The file is built by allProducts/build-catalog.cjs and served by hosting, so
// browsing it costs no database reads. The same file runs in both apps.

export type CatalogItem = {
  id: string;
  en: string;
  /** Empty for a product with no brand. */
  brand: string;
  branch: string;
  sub: string;
  /** English country name, when known. */
  country: string;
  /** Main product photo URL; empty when the product has none. */
  image: string;
  /** All the product's photos, main one first; empty when none. */
  images: string[];
};

type RawItem = { i: string; n: string; b: string; s: string; u: string; c: string; g?: string; x?: string[] };

const HOSTED = "https://dental-hub-df069.web.app";

function catalogUrl(): string {
  const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
  return `${origin || HOSTED}/catalog/products.json`;
}

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<CatalogItem[]> => {
      const res = await fetch(catalogUrl());
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const raw = (await res.json()) as RawItem[];
      return raw.map((r) => ({
        id: r.i, en: r.n, brand: r.b, branch: r.s, sub: r.u, country: r.c, image: r.g ?? "",
        images: [r.g ?? "", ...(r.x ?? [])].filter(Boolean),
      }));
    },
  });
}

export type CatalogOffer = { product: Product; officeName: string };

/** The other offices selling this same catalog product, cheapest first. */
export function useOtherOffers(catalogId: string | undefined, currentId: string | undefined) {
  const { data: offers = [] } = useCatalogOffers(catalogId);
  const others = offers.filter((p) => p.id !== currentId && p.inStock);
  const officeIds = [...new Set(others.map((p) => p.companyId).filter(Boolean))].sort() as string[];
  const { data: names = {} } = useQuery({
    queryKey: ["offer-office-names", officeIds.join("|")],
    enabled: officeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const snaps = await Promise.all(officeIds.map((id) => getDoc(doc(db, "public_profiles", id))));
      return Object.fromEntries(snaps.map((s, i) => [officeIds[i], (s.data()?.name as string) ?? ""]));
    },
  });
  return others
    .map((product): CatalogOffer => ({ product, officeName: names[product.companyId ?? ""] ?? "" }))
    .sort((a, b) =>
      a.product.currency === b.product.currency
        ? a.product.price - b.product.price
        : a.product.currency.localeCompare(b.product.currency),
    );
}

/** Brands with how many products each has, the largest first. */
export function catalogBrands(items: CatalogItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    if (it.brand) counts.set(it.brand, (counts.get(it.brand) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type CatalogFilter = {
  /** A brand's name; "" means products with no brand; undefined means any. */
  brand?: string;
  branch?: string;
  sub?: string;
  q?: string;
};

export function filterCatalog(items: CatalogItem[], f: CatalogFilter): CatalogItem[] {
  const words = (f.q ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    if (f.brand !== undefined && it.brand !== f.brand) return false;
    if (f.branch && it.branch !== f.branch) return false;
    if (f.sub && it.sub !== f.sub) return false;
    if (words.length) {
      const hay = `${it.en} ${it.brand}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

const COUNTRY_ALIAS: Record<string, string> = { USA: "United States", UK: "United Kingdom" };

/** A catalog country in the Arabic the rest of the app stores it in. */
export function countryToAr(english: string): string {
  if (!english) return "";
  const name = COUNTRY_ALIAS[english] ?? english;
  return ALL_COUNTRIES.find((c) => c.en === name)?.ar ?? "";
}

/** One selected product as the office is filling it in. */
export type ListingDraft = {
  item: CatalogItem;
  brand: string;
  branch: string;
  sub: string;
  price: string;
  currency: Currency;
  stock: string;
  purchasePrice: string;
  countryAr: string;
  expiryDate: string;
};

export function newDraft(item: CatalogItem, currency: Currency): ListingDraft {
  return {
    item,
    brand: item.brand,
    branch: item.branch,
    sub: item.sub,
    price: "",
    currency,
    stock: "",
    purchasePrice: "",
    countryAr: countryToAr(item.country),
    expiryDate: "",
  };
}

const parseAmount = (v: string) => Number(v.replace(/,/g, "")) || 0;

/** The product's id in `products`: an office lists a catalog product only once. */
export const listingId = (officeId: string, catalogId: string) => `${officeId}_${catalogId}`;

export function draftError(d: ListingDraft, ar: boolean): string | null {
  if (parseAmount(d.price) <= 0) return ar ? `أدخل سعر ${d.item.en}` : `Enter a price for ${d.item.en}`;
  if (d.expiryDate && !/^\d{4}-\d{2}(-\d{2})?$/.test(d.expiryDate)) {
    return ar ? `اكتب الصلاحية بالشكل 2027-08 في ${d.item.en}` : `Write the expiry like 2027-08 for ${d.item.en}`;
  }
  return null;
}

/**
 * Gives the catalog image to this office's catalog listings that have none,
 * such as those listed before catalog images existed. Its own photos win.
 * @return how many products were updated.
 */
export async function fillMissingImages(mine: Product[], items: CatalogItem[]): Promise<number> {
  const byId = new Map(items.map((i) => [i.id, i.images]));
  const todo = mine.filter((p) => p.catalogId && p.images.length === 0 && byId.get(p.catalogId)?.length);
  await Promise.all(
    todo.map((p) => updateDoc(doc(db, "products", p.id), { images: byId.get(p.catalogId!)! }).catch(() => {})),
  );
  return todo.length;
}

/** Publishes the office's selected products. Runs in batches of 400. */
export async function publishListings(officeId: string, drafts: ListingDraft[]): Promise<void> {
  assertVerified();
  // Prices for approved doctors only: hidden from the first write (see
  // useUpsertProduct in products.ts).
  const hidesPrices = await getDoc(doc(db, "user_roles", officeId))
    .then((r) => r.data()?.pricesHidden === true)
    .catch(() => false);
  for (let i = 0; i < drafts.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of drafts.slice(i, i + 400)) {
      const id = listingId(officeId, d.item.id);
      const stockText = d.stock.trim();
      const stock = Math.max(0, Math.floor(parseAmount(stockText)));
      batch.set(
        doc(db, "products", id),
        {
          ...(hidesPrices ? { priceHidden: true } : {}),
          id,
          catalogId: d.item.id,
          companyId: officeId,
          ar: d.item.en,
          en: d.item.en,
          brand: d.brand.trim(),
          branch: d.branch,
          subCategory: d.sub,
          price: parseAmount(d.price),
          currency: d.currency,
          // No count entered: orderable, with the count kept to the office.
          stock: stockText ? stock : 0,
          stockHidden: !stockText,
          inStock: stockText ? stock > 0 : true,
          purchasePrice: d.purchasePrice.trim() ? parseAmount(d.purchasePrice) : null,
          countryOrigin: d.countryAr || null,
          expiryDate: d.expiryDate.trim() || null,
          images: d.item.images,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
  resetPriceCache();
}

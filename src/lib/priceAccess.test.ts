import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ currentUser: null as null | { uid: string }, authStateReady: async () => {} }));
const store = vi.hoisted(() => ({ prices: {} as Record<string, unknown>, readable: true }));
vi.mock("@/integrations/firebase/client", () => ({ auth: authMock, db: {} }));
vi.mock("@/integrations/firebase/config", () => ({ app: {} }));
vi.mock("./notifications", () => ({ createNotification: async () => {} }));
vi.mock("firebase/firestore", async (orig) => ({
  ...(await orig<typeof import("firebase/firestore")>()),
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  getDoc: async () => {
    if (!store.readable) throw new Error("permission-denied");
    return { exists: () => true, data: () => ({ products: store.prices }) };
  },
}));

import { applyPrices, resetPriceCache, revealPrices } from "./priceAccess";

// The server keeps a hidden-price product's prices as dotted paths
// (functions/hiddenPrices.js extractPrices); the apps put them back.
describe("applyPrices", () => {
  const hidden = {
    id: "p1",
    price: 0,
    discountTiers: [{ fromQty: 5, toQty: 9, price: 0, discountPct: 0 }],
    accessories: [{ name: "a", price: 0 }],
    boneGraft: { packSizes: [{ volume: "1g", priceUsd: 0, priceIqd: 0 }] },
  };
  const entries = [
    { p: "price", v: 50 },
    { p: "discountTiers.0.price", v: 45 },
    { p: "accessories.0.price", v: 10 },
    { p: "boneGraft.packSizes.0.priceUsd", v: 200 },
    { p: "accessories.3.price", v: 99 }, // no such accessory any more
  ];

  it("puts every stored price back where it belongs", () => {
    const out = applyPrices(hidden, entries);
    expect(out.price).toBe(50);
    expect(out.discountTiers[0].price).toBe(45);
    expect(out.accessories[0].price).toBe(10);
    expect(out.boneGraft.packSizes[0].priceUsd).toBe(200);
    expect(out.accessories).toHaveLength(1);
  });

  it("does not change the product it was given", () => {
    applyPrices(hidden, entries);
    expect(hidden.price).toBe(0);
  });
});

describe("revealPrices", () => {
  type P = { id: string; companyId: string; price: number; priceHidden?: boolean; priceLocked?: boolean };
  beforeEach(() => {
    resetPriceCache();
    store.readable = true;
    store.prices = { a: [{ p: "price", v: 32000 }] };
  });

  it("locks hidden-price products for a signed-out visitor and leaves the rest", async () => {
    authMock.currentUser = null;
    const [a, b] = await revealPrices<P>([
      { id: "a", companyId: "o1", price: 0, priceHidden: true },
      { id: "b", companyId: "o2", price: 5 },
    ]);
    expect(a.priceLocked).toBe(true);
    expect(b.priceLocked).toBeUndefined();
  });

  it("locks every hidden price for a doctor who isn't approved, never a zero", async () => {
    authMock.currentUser = { uid: "doc" };
    store.readable = false;
    const out = await revealPrices<P>([
      { id: "a", companyId: "o1", price: 0, priceHidden: true },
      { id: "new", companyId: "o1", price: 15000, priceHidden: true }, // just saved
    ]);
    expect(out.every((p) => p.priceLocked)).toBe(true);
  });

  it("shows the office every one of its own prices, new products included", async () => {
    authMock.currentUser = { uid: "o1" };
    await revealPrices<P>([{ id: "a", companyId: "o1", price: 0, priceHidden: true }]); // read is cached
    store.prices = { ...store.prices, b: [{ p: "price", v: 15000 }] }; // the office adds b
    const later = Date.now() + 2_000;
    vi.spyOn(Date, "now").mockReturnValue(later);
    const [a, b, c] = await revealPrices<P>([
      { id: "a", companyId: "o1", price: 0, priceHidden: true },
      { id: "b", companyId: "o1", price: 0, priceHidden: true },
      { id: "c", companyId: "o1", price: 14500, priceHidden: true }, // not moved yet
    ]);
    expect([a.price, b.price, c.price]).toEqual([32000, 15000, 14500]);
    expect([a, b, c].some((p) => p.priceLocked)).toBe(false);
    vi.restoreAllMocks();
  });

  it("locks an approved doctor's product whose price isn't known", async () => {
    authMock.currentUser = { uid: "doc" };
    const [a, x] = await revealPrices<P>([
      { id: "a", companyId: "o1", price: 0, priceHidden: true },
      { id: "x", companyId: "o1", price: 0, priceHidden: true },
    ]);
    expect(a.price).toBe(32000);
    expect(x.priceLocked).toBe(true);
  });
});

import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ db: {}, storage: {}, auth: {} }));
vi.mock("@/integrations/firebase/config", () => ({ app: {} }));
vi.mock("firebase/functions", () => ({ getFunctions: () => ({}), httpsCallable: () => async () => ({}) }));

import {
  addMaterial,
  adjustMaterialQty,
  attentionOf,
  daysLeft,
  DEFAULT_META,
  durationText,
  importMaterials,
  markMaterialsSeen,
  needsReview,
  pendingLines,
  pruneSeen,
  removeMaterial,
  setMaterialMeta,
  setMaterialsStoreUser,
  setMaterialStatus,
  unseenAlerts,
  type ImportLine,
  type Material,
} from "./materialsStore";

const DAY = 86400000;
const NOW = Date.parse("2026-11-06T12:00:00Z");
const mat = (over: Partial<Material>): Material => ({
  id: "m", name: "n", category: "general", qty: 10, minQty: 0, unit: "", price: 0, expiryDate: "", batchNumber: "", supplierName: "", storageLocation: "",
  status: "available", statusAt: NOW, lastRestockAt: NOW, restockQty: 10, cycles: [], createdAt: "2026-01-01", updatedAt: 1, ...over,
});
let clinic = 0;
const store = () => JSON.parse(localStorage.getItem(`dh_materials_v1:guest:c${clinic}`) || "[]") as Material[];
const metaNow = () => ({ ...DEFAULT_META, ...JSON.parse(localStorage.getItem(`dh_materials_v1:guest:c${clinic}:meta`) || "{}") });

beforeEach(() => {
  clinic += 1;
  setMaterialsStoreUser("", `c${clinic}`);
});

it("one tap says it ran out, whatever the number said, and teaches how long it lasted", () => {
  vi.setSystemTime(NOW);
  const m = addMaterial({ name: "قفازات", qty: 10, category: "general" });
  vi.setSystemTime(NOW + 10 * DAY);
  setMaterialStatus(m.id, "out");
  const after = store()[0];
  expect(after).toMatchObject({ qty: 0, status: "out" });
  expect(after.cycles).toEqual([{ days: 10, qty: 10 }]);
  vi.useRealTimers();
});

it("the same-day case in the doctor's question: finished at once, no false estimate", () => {
  vi.setSystemTime(NOW);
  const m = addMaterial({ name: "قفازات", qty: 10, category: "general" });
  setMaterialStatus(m.id, "out");
  expect(store()[0]).toMatchObject({ qty: 0, status: "out", cycles: [] });
  vi.useRealTimers();
});

it("estimates from how long past quantities lasted, not before", () => {
  expect(daysLeft(mat({}), NOW)).toBeNull();
  const m = mat({ cycles: [{ days: 30, qty: 10 }], restockQty: 10, lastRestockAt: NOW - 10 * DAY });
  expect(daysLeft(m, NOW)).toBe(20);
  // Bought twice as much: lasts twice as long.
  expect(daysLeft(mat({ cycles: [{ days: 30, qty: 10 }], restockQty: 20, lastRestockAt: NOW }), NOW)).toBe(60);
  expect(daysLeft(mat({ status: "out" }), NOW)).toBe(0);
});

it("warns as early as the doctor chose, per reason", () => {
  const soon = mat({ cycles: [{ days: 30, qty: 10 }], lastRestockAt: NOW - 10 * DAY });
  expect(attentionOf(soon, { leadDays: 30, expiryDays: 60 }, NOW)).toBe("soon");
  expect(attentionOf(soon, { leadDays: 14, expiryDays: 60 }, NOW)).toBeNull();
  const exp = (d: number) => mat({ expiryDate: new Date(NOW + d * DAY).toISOString().slice(0, 10) });
  expect(attentionOf(exp(40), { leadDays: 30, expiryDays: 60 }, NOW)).toBe("expiring");
  expect(attentionOf(exp(40), { leadDays: 30, expiryDays: 30 }, NOW)).toBeNull();
  expect(attentionOf(exp(-2), { leadDays: 30, expiryDays: 60 }, NOW)).toBe("expired");
  expect(attentionOf(mat({ qty: 1, minQty: 1 }), DEFAULT_META, NOW)).toBe("low");
  expect(attentionOf(mat({ status: "low" }), DEFAULT_META, NOW)).toBe("low");
  expect(attentionOf(mat({}), DEFAULT_META, NOW)).toBeNull();
});

it("the number disappears on a visit, and returns only for a new shortage", () => {
  const a = addMaterial({ name: "a", qty: 5, category: "general", minQty: 0 });
  const b = addMaterial({ name: "b", qty: 5, category: "general", minQty: 0 });
  setMaterialStatus(a.id, "out");
  setMaterialStatus(b.id, "out");
  expect(unseenAlerts(store(), metaNow(), Date.now())).toHaveLength(2);
  markMaterialsSeen();
  expect(unseenAlerts(store(), metaNow(), Date.now())).toHaveLength(0);
  const c = addMaterial({ name: "c", qty: 5, category: "general", minQty: 0 });
  setMaterialStatus(c.id, "low");
  expect(unseenAlerts(store(), metaNow(), Date.now())).toEqual([c.id]);
  // Refilled, then short again: it counts again.
  const list = store().map((m) => (m.id === a.id ? { ...m, status: "available" as const, qty: 9 } : m));
  const seen = pruneSeen(list, metaNow(), Date.now());
  expect(seen).not.toContain(a.id);
  const later = list.map((m) => (m.id === a.id ? { ...m, status: "out" as const } : m));
  expect(unseenAlerts(later, { ...metaNow(), seen }, Date.now())).toContain(a.id);
});

it("lists only what the office confirmed, once, without what it couldn't supply", () => {
  const order = (id: string, status: string, availability?: string) => ({
    id, status, supplierId: "s", createdAt: { toMillis: () => NOW },
    items: [{ productId: "p1", name: "x", quantity: 3, price: 1, availability }, { productId: "p2", name: "y", quantity: 1, price: 1 }],
  });
  const lines = pendingLines([order("a", "confirmed"), order("b", "rejected"), order("c", "pending"), order("d", "confirmed", "not_available")], { imported: ["a:1"], ignored: [] });
  expect(lines.map((l) => l.key)).toEqual(["a:0", "d:1"]);
  expect(pendingLines([order("a", "confirmed")], { imported: ["a:0"], ignored: ["a:1"] })).toEqual([]);
});

const line = (over: Partial<ImportLine>): ImportLine => ({
  key: "o:0", orderId: "o", productId: "p1", name: "كومبوزيت", qty: 4, category: "operative", subCategory: "كومبوزيت", supplierName: "مكتب", price: 5, orderedAt: NOW, ...over,
});

it("each purchase goes to its own section, and a repeat adds quantity, not a row", () => {
  vi.setSystemTime(NOW);
  importMaterials([line({}), line({ key: "o:1", productId: "p2", name: "قفازات", category: "general", subCategory: undefined, qty: 10 })]);
  expect(store().map((m) => [m.name, m.category, m.qty]).sort()).toEqual([["قفازات", "general", 10], ["كومبوزيت", "operative", 4]].sort());
  expect(metaNow().imported).toEqual(["o:0", "o:1"]);

  importMaterials([line({ key: "o2:0", qty: 2 })]);
  expect(store().filter((m) => m.productId === "p1")).toHaveLength(1);
  expect(store().find((m) => m.productId === "p1")?.qty).toBe(6);

  // Bought again and the old quantity had finished: replaces it and learns.
  vi.setSystemTime(NOW + 20 * DAY);
  importMaterials([line({ key: "o3:0", qty: 5, finished: true } as Partial<ImportLine>)]);
  const m = store().find((x) => x.productId === "p1")!;
  expect(m).toMatchObject({ qty: 5, status: "available", restockQty: 5 });
  expect(m.cycles).toEqual([{ days: 20, qty: 6 }]);
  vi.useRealTimers();
});

it("counting by hand still works, and reaching zero means out", () => {
  const m = addMaterial({ name: "x", qty: 2, category: "general" });
  adjustMaterialQty(m.id, -1);
  expect(store()[0].qty).toBe(1);
  adjustMaterialQty(m.id, -1);
  expect(store()[0]).toMatchObject({ qty: 0, status: "out" });
  adjustMaterialQty(m.id, 3);
  expect(store()[0]).toMatchObject({ qty: 3, status: "available", restockQty: 3 });
  removeMaterial(m.id);
  expect(store()).toEqual([]);
});

it("asks about stale materials only, and can be turned off", () => {
  const old = mat({ statusAt: NOW - 40 * DAY, lastRestockAt: NOW - 40 * DAY });
  expect(needsReview(old, 30, NOW)).toBe(true);
  expect(needsReview(old, 0, NOW)).toBe(false);
  expect(needsReview(mat({}), 30, NOW)).toBe(false);
  expect(needsReview({ ...old, status: "out" }, 30, NOW)).toBe(false);
});

it("brings over what this device held before, into the new sections, keeping the old copy", () => {
  clinic += 1;
  const key = `dh_clinic_v3:guest:c${clinic}`;
  localStorage.setItem(key, JSON.stringify({ materials: [{ id: "old", name: "Filtek", category: "composite", qty: 3, minQty: 1 }] }));
  setMaterialsStoreUser("", `c${clinic}`);
  addMaterial({ name: "new", qty: 1, category: "general" });
  const got = store().find((m) => m.id === "old");
  expect(got).toMatchObject({ category: "operative", subCategory: "كومبوزيت", status: "available", qty: 3 });
  expect(localStorage.getItem(key)).toContain("Filtek");
});

it("words its estimates and keeps settings", () => {
  expect(durationText(21, true)).toBe("نحو 3 أسابيع");
  expect(durationText(30, true)).toBe("نحو شهر");
  expect(durationText(120, true)).toBe("نحو 4 أشهر");
  setMaterialMeta({ leadDays: 60 });
  expect(metaNow().leadDays).toBe(60);
});

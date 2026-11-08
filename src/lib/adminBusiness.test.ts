import { expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/config", () => ({ app: {} }));

import { formatBoth, officeRows, orderLines, periodsOf, rateOn, sumLines, type AdminOrder, type BusinessData } from "./adminBusiness";

const at = (d: string) => Date.parse(`${d}T12:00:00Z`);
const order = (over: Partial<AdminOrder>): AdminOrder => ({
  id: "o", orderNumber: "1", supplierId: "s1", dentistId: "d", dentistName: "n", clinicName: "c", status: "confirmed",
  totalIQD: 0, totalUSD: 0, items: [], createdAt: at("2026-05-10"), ...over,
});
const data = (orders: AdminOrder[], history: BusinessData["settings"]["history"] = []): BusinessData => ({
  orders,
  suppliers: [{ id: "s1", name: "Office A", accountType: "supply" }, { id: "s2", name: "Office B", accountType: "supply" }, { id: "i1", name: "Implant", accountType: "implant" }],
  labs: [],
  settings: { rates: { supply: 1, implant: 0 }, history },
});

it("takes 1% of a completed list, per currency, and nothing from a rejected one", () => {
  const lines = orderLines(data([
    order({ id: "a", totalIQD: 1000000, totalUSD: 200 }),
    order({ id: "b", status: "rejected", totalIQD: 500000 }),
    order({ id: "c", status: "pending", totalUSD: 900 }),
  ]));
  const t = sumLines(lines);
  expect(t).toMatchObject({ lists: 1, salesIQD: 1000000, salesUSD: 200, earnIQD: 10000, earnUSD: 2 });
});

it("a new rate only applies from its date", () => {
  const history = [{ accountType: "supply" as const, rate: 2, from: "2026-06-01", at: 2 }];
  const lines = orderLines(data([
    order({ id: "old", totalIQD: 1000, createdAt: at("2026-05-20") }),
    order({ id: "new", totalIQD: 1000, createdAt: at("2026-06-20") }),
  ], history));
  expect(lines.find((l) => l.id === "old")?.earnIQD).toBe(10);
  expect(lines.find((l) => l.id === "new")?.earnIQD).toBe(20);
  expect(rateOn(data([], history).settings, "supply", "2026-07-01")).toBe(2);
});

it("uses the set rate for each kind of account", () => {
  const lines = orderLines(data([order({ supplierId: "i1", totalUSD: 1000 })]));
  expect(lines[0].earnUSD).toBe(0);
});

it("counts what each office sold, available items only, and lists offices without sales", () => {
  const d = data([
    order({ id: "a", items: [{ name: "x", quantity: 3, price: 1, currency: "USD", available: true }, { name: "y", quantity: 9, price: 1, currency: "USD", available: false }] }),
    order({ id: "b", items: [{ name: "x", quantity: 2, price: 1, currency: "USD", available: true }] }),
  ]);
  const rows = officeRows(d, orderLines(d));
  expect(rows[0]).toMatchObject({ id: "s1", totals: { lists: 2, items: 5 } });
  expect(rows.map((r) => r.id)).toContain("s2");
  expect(rows.find((r) => r.id === "s2")?.totals.lists).toBe(0);
});

it("handles a list from a deleted office and never adds currencies together", () => {
  const lines = orderLines(data([order({ supplierId: "gone", totalIQD: 100 })]));
  expect(lines[0].supplierName).toBe("حساب محذوف");
  expect(formatBoth(10000, 2)).toBe("10,000 د.ع + \u2066$2\u2069");
  expect(formatBoth(0, 0)).toBe("0");
  expect(periodsOf([{ createdAt: at("2026-05-01") }, { createdAt: at("2026-06-01") }, { createdAt: at("2026-05-09") }])).toEqual(["2026-06", "2026-05"]);
});

import { expect, it } from "vitest";
import { doctorAccounts, groupOrders, labTotals, type LabPayment } from "./labFinance";
import type { Order } from "./ordersStore";

const order = (id: string, extra: Partial<Order>) =>
  ({ id, doctor: "", patient: "", status: "new", totalAmount: 0, ...extra }) as unknown as Order;

const orders = [
  order("1", { doctor: "د. أحمد", dentistId: "u1", patient: "سارة", totalAmount: 100000, currency: "IQD" }),
  order("2", { doctor: "د. احمد ", patient: "سارة", totalAmount: 50000 }), // typed by the lab, no id, spelling differs
  order("3", { doctor: "د. أحمد", dentistId: "u1", patient: "علي", totalAmount: 200, currency: "USD" }),
  order("4", { doctor: "د. أحمد", dentistId: "u2", patient: "سارة", totalAmount: 30000 }), // a namesake
];
const payments: LabPayment[] = [
  { id: "p1", clinic: "د. أحمد", doctorId: "u1", amount: 120000, currency: "IQD", date: "2026-10-01" },
  { id: "p2", clinic: "د. احمد", amount: 50, currency: "USD", date: "2026-10-02" }, // typed name → matched to u1
];

it("keeps dinars and dollars apart and matches doctors by account", () => {
  const iqd = doctorAccounts(orders, payments, "IQD");
  const u1 = iqd.find((a) => a.doctorId === "u1")!;
  expect(u1.billed).toBe(150000); // case 1 + the lab-typed case 2
  expect(u1.collected).toBe(120000);
  expect(u1.remaining).toBe(30000);
  expect(iqd.find((a) => a.doctorId === "u2")!.billed).toBe(30000); // namesake not merged

  const usd = doctorAccounts(orders, payments, "USD");
  expect(usd).toHaveLength(1);
  expect(usd[0]).toMatchObject({ doctorId: "u1", billed: 200, collected: 50, remaining: 150 });

  expect(labTotals(orders, payments, "IQD")).toEqual({ invoiced: 180000, collected: 120000, remaining: 60000 });
  expect(labTotals(orders, payments, "USD")).toEqual({ invoiced: 200, collected: 50, remaining: 150 });
});

it("groups by doctor account and patients per doctor", () => {
  const doctors = groupOrders(orders, "doctor");
  expect(doctors.map((d) => d.orders.length).sort()).toEqual([1, 3]);
  const patients = groupOrders(orders, "patient");
  // "سارة" at u1 (cases 1 and 2) and "سارة" at u2 are different people.
  expect(patients.filter((p) => p.name === "سارة").map((p) => p.orders.length).sort()).toEqual([1, 2]);
});

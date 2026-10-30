import { expect, it } from "vitest";
import { periodStart, reportTotals } from "./clinicStore";

const today = new Date().toISOString().slice(0, 10);
const longAgo = "2020-01-15";

const clinic = {
  transactions: [
    { id: "1", label: "قسط", kind: "income" as const, amount: 50000, source: "patient", date: today },
    { id: "2", label: "مواد", kind: "expense" as const, amount: 200000, source: "supply", date: today },
    { id: "3", label: "old", kind: "income" as const, amount: 999, source: "x", date: longAgo },
  ],
  orders: [],
  materials: [],
  doctors: [],
} as unknown as Parameters<typeof reportTotals>[0];

it("counts manual income movements in revenue (they used to be ignored)", () => {
  const patients = [{ feeCurrency: "IQD" as const, payments: [{ amount: 450000, date: today }] }];
  const t = reportTotals(clinic, patients, "month");
  expect(t.income).toBe(500000); // 450,000 patient + 50,000 manual
  expect(t.expense).toBe(200000);
  expect(t.net).toBe(300000);
});

it("reports dinars and dollars separately and honours the period", () => {
  const patients = [
    { feeCurrency: "USD" as const, payments: [{ amount: 100, date: today }] },
    { payments: [{ amount: 50, date: today }] }, // no currency = USD (the fees tab default)
  ];
  const withUsd = {
    ...clinic,
    transactions: [
      ...clinic.transactions,
      { id: "4", label: "usd fee", kind: "income" as const, amount: 20, source: "other", date: today, currency: "USD" as const },
      { id: "5", label: "usd kit", kind: "expense" as const, amount: 30, source: "supply", date: today, currency: "USD" as const },
    ],
  };
  const t = reportTotals(withUsd, patients, "month");
  expect(t.income).toBe(50000); // dollar movements and payments stay out of dinars
  const usd = reportTotals(withUsd, patients, "month", "USD");
  expect(usd.income).toBe(170); // 150 patient + 20 manual
  expect(usd.expense).toBe(30);
  expect(usd.net).toBe(140);
  expect(reportTotals(clinic, [], "year").income).toBe(50000); // 2020 entry excluded
  expect(periodStart("year").endsWith("-01-01")).toBe(true);
});

import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ db: {}, storage: {}, auth: {} }));

import { reportTotals } from "./clinicStore";
import { deletedPaymentText, feeChangeText, financeSectionHtml, receiptBodyHtml, receiptText } from "./paymentReceipt";
import {
  addPayment,
  balanceIn,
  getPatient,
  patientDeletedPayments,
  patientFeeHistory,
  removePayment,
  setFeeCurrency,
  setPatientFee,
  setPatientStoreUser,
  settlePatientFinance,
  type Patient,
} from "./patientsStore";

const base = {
  id: "p1", fileNo: "PAT-105", name: "ahmad", age: 22, gender: "male", phone: "07747660050", history: {},
  complaint: "", status: "new", lastVisit: "", createdAt: "2026-01-01", teeth: {}, visits: [], files: [],
};
let clinic = 0;
function seed(over: Record<string, unknown>) {
  clinic += 1;
  localStorage.setItem(`dh:patients:v1:guest:c${clinic}`, JSON.stringify([{ ...base, totalFees: 0, payments: [], ...over }]));
  setPatientStoreUser("", `c${clinic}`);
}
const p = () => getPatient("p1") as Patient;

beforeEach(() => localStorage.clear());

it("switching currency never relabels amounts (the old $100,000 from 100,000 د.ع)", () => {
  seed({
    feeCurrency: "IQD", totalFees: 575000,
    payments: [{ id: "a", date: "2026-11-04", amount: 100000 }],
    plan: [{ id: "s", title: "x", status: "planned", cost: 25000 }],
  });
  setFeeCurrency("p1", "USD");
  expect(balanceIn(p(), "USD")).toEqual({ fees: 0, paid: 0, remaining: 0 });
  expect(balanceIn(p(), "IQD")).toEqual({ fees: 575000, paid: 100000, remaining: 475000 });
  expect(p().plan?.[0].currency).toBe("IQD");

  addPayment("p1", { amount: 50, currency: "USD" });
  setPatientFee("p1", "USD", 350);
  expect(balanceIn(p(), "USD")).toEqual({ fees: 350, paid: 50, remaining: 300 });
  expect(balanceIn(p(), "IQD").remaining).toBe(475000);

  setFeeCurrency("p1", "IQD");
  expect(p().totalFees).toBe(575000);
  expect(balanceIn(p(), "USD").paid).toBe(50);
});

it("records a change to a set fee, not the first entry or a save with no change", () => {
  seed({ feeCurrency: "IQD" });
  setPatientFee("p1", "IQD", 500000);
  expect(p().feeHistory ?? []).toEqual([]);
  setPatientFee("p1", "IQD", 500000);
  setPatientFee("p1", "IQD", 575000);
  const [h] = patientFeeHistory(p());
  expect(h).toMatchObject({ from: 500000, to: 575000, currency: "IQD" });
  expect(feeChangeText(h, true)).toContain("من 500,000 د.ع إلى 575,000 د.ع بتاريخ");
  setPatientFee("p1", "IQD", 0);
  expect(p().feeHistory).toHaveLength(2);
});

it("numbers receipts per patient: old payments first, and a number is never reused", () => {
  seed({
    feeCurrency: "IQD",
    payments: [
      { id: "new", date: "2026-02-01", amount: 2 },
      { id: "old", date: "2026-01-01", amount: 1 },
    ],
  });
  settlePatientFinance("p1");
  const no = (id: string) => p().payments.find((x) => x.id === id)?.receiptNo;
  expect(no("old")).toBe("REC-105-01");
  expect(no("new")).toBe("REC-105-02");

  const third = addPayment("p1", { amount: 3 });
  expect(third?.receiptNo).toBe("REC-105-03");
  removePayment("p1", third!.id);
  expect(addPayment("p1", { amount: 4 })?.receiptNo).toBe("REC-105-04");
});

it("a deleted payment leaves the balance but stays on record, in the shared file too", () => {
  seed({ feeCurrency: "IQD", totalFees: 500000, payments: [{ id: "old", date: "2026-11-04", amount: 100000 }] });
  removePayment("p1", "old");
  expect(balanceIn(p(), "IQD").paid).toBe(0);
  const [d] = patientDeletedPayments(p());
  expect(d).toMatchObject({ amount: 100000, currency: "IQD", date: "2026-11-04", receiptNo: "REC-105-01" });
  const text = deletedPaymentText(d, true);
  expect(text).toContain("حُذفت دفعة 100,000 د.ع (وصل REC-105-01، بتاريخ 2026-11-04)");
  expect(financeSectionHtml(p(), true)).toContain(text);
  removePayment("p1", "missing");
  expect(p().deletedPayments).toHaveLength(1);
});

it("leaves an already settled patient alone", () => {
  seed({ feeCurrency: "IQD", totalFees: 10, payments: [{ id: "a", date: "2026-01-01", amount: 1 }] });
  settlePatientFinance("p1");
  const at = p().updatedAt;
  settlePatientFinance("p1");
  expect(p().updatedAt).toBe(at);
});

it("receipts and the shared file carry the finances, per currency, with text escaped", () => {
  seed({ feeCurrency: "IQD", name: "<b>x</b>" });
  setPatientFee("p1", "IQD", 575000);
  setPatientFee("p1", "IQD", 600000);
  setPatientFee("p1", "USD", 350);
  const pay = addPayment("p1", { amount: 100000, note: "دفعة <1>" })!;

  const text = receiptText(p(), pay, "عيادة الصفوة", true);
  expect(text).toContain("عيادة الصفوة");
  expect(text).toContain("REC-105-01");
  expect(text).toContain("المبلغ المدفوع: 100,000 د.ع");
  expect(text).toContain("المتبقي: 500,000 د.ع");

  const receipt = receiptBodyHtml(p(), pay, "", true);
  expect(receipt).toContain("100,000 د.ع");
  expect(receipt).not.toContain("<b>x</b>");

  const file = financeSectionHtml(p(), true);
  expect(file).toContain("600,000 د.ع");
  expect(file).toContain("$350");
  expect(file).toContain("REC-105-01");
  expect(file).toContain("دفعة &lt;1&gt;");
  expect(file).toContain("من 575,000 د.ع إلى 600,000 د.ع");
});

it("counts each payment under its own currency in reports", () => {
  const today = new Date().toISOString().slice(0, 10);
  const patients = [
    { feeCurrency: "USD" as const, payments: [{ amount: 100000, date: today, currency: "IQD" as const }, { amount: 50, date: today, currency: "USD" as const }] },
  ];
  const d = { transactions: [] } as unknown as Parameters<typeof reportTotals>[0];
  expect(reportTotals(d, patients, "month", "IQD").patientIncome).toBe(100000);
  expect(reportTotals(d, patients, "month", "USD").patientIncome).toBe(50);
});

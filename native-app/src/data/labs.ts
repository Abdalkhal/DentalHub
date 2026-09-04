export type Lab = {
  id: string;
  ar: string;
  en: string;
  area: { ar: string; en: string };
  rating: number;
  deliveryDays: number;
  workTypes: { ar: string; en: string }[];
  priceList: { ar: string; en: string; price: number }[];
};

// قائمة المختبرات فارغة — ستظهر تلقائياً عند تسجيل أصحاب المختبرات
export const LABS: Lab[] = [];

export type CaseStatus = "received" | "in_progress" | "done" | "on_the_way" | "delivered";

export type LabCase = {
  id: string;
  labId: string;
  patient: string;
  work: { ar: string; en: string };
  status: CaseStatus;
  sentDate: string;
};

export const CASES: LabCase[] = [];

export const CASE_STEPS: CaseStatus[] = [
  "received",
  "in_progress",
  "done",
  "on_the_way",
  "delivered",
];

// The admin console's business figures: earnings from office orders, each
// office's purchases, and lab case counts. The data comes from the
// adminGetBusiness function (functions/adminConsole.js).
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/integrations/firebase/config";

export type Currency = "IQD" | "USD";
export type SupplierType = "supply" | "implant";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  supplierId: string;
  dentistId: string;
  dentistName: string;
  clinicName: string;
  status: string;
  totalIQD: number;
  totalUSD: number;
  items: { name: string; quantity: number; price: number; currency: Currency; available: boolean }[];
  createdAt: number;
};

export type LabStats = {
  id: string;
  name: string;
  total: number;
  byStatus: Record<string, number>;
  doctors: { name: string; count: number }[];
  months: Record<string, number>;
};

export type CommissionSettings = {
  rates: Record<SupplierType, number>;
  history: { accountType: SupplierType; rate: number; from: string; at: number }[];
};

export type BusinessData = {
  orders: AdminOrder[];
  suppliers: { id: string; name: string; accountType: SupplierType }[];
  labs: LabStats[];
  settings: CommissionSettings;
};

export type AccountFile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  photoURL: string;
  accountType: string;
  role: string;
  status: string;
  suspendedReason: string;
  subscriptionExpiry: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: number;
  lastSignIn: number;
  counts: Record<"asSupplier" | "asDentist" | "products" | "offers" | "patients" | "cases" | "reports", number>;
  history: { id: string; message: string; reason: string; adminName: string; at: number }[];
};

/** An order counts once the office has confirmed it. */
export const isCompleted = (o: Pick<AdminOrder, "status">) => o.status === "confirmed";

export const dayOf = (ms: number) => (ms ? new Date(ms + 3 * 3600 * 1000).toISOString().slice(0, 10) : "");
export const monthOf = (ms: number) => dayOf(ms).slice(0, 7);

/** The rate in force on a date, so changing it doesn't rewrite the past. */
export function rateOn(settings: CommissionSettings, type: SupplierType, date: string): number {
  const list = settings.history.filter((h) => h.accountType === type).sort((a, b) => a.at - b.at);
  if (list.length === 0) return settings.rates[type] ?? 0;
  let cur: (typeof list)[number] | null = null;
  for (const h of list) if (h.from <= date) cur = h;
  // Older than the first change: the starting rate of 1% for offices.
  return cur ? cur.rate : type === "supply" ? 1 : 0;
}

export type OrderLine = AdminOrder & {
  supplierName: string;
  supplierType: SupplierType;
  rate: number;
  earnIQD: number;
  earnUSD: number;
  itemCount: number;
  completed: boolean;
};

export function orderLines(data: BusinessData): OrderLine[] {
  const by = new Map(data.suppliers.map((s) => [s.id, s]));
  return data.orders
    .map((o): OrderLine => {
      const s = by.get(o.supplierId);
      const supplierType = s?.accountType ?? "supply";
      const completed = isCompleted(o);
      const rate = completed ? rateOn(data.settings, supplierType, dayOf(o.createdAt)) : 0;
      return {
        ...o,
        supplierName: s?.name ?? "حساب محذوف",
        supplierType,
        rate,
        completed,
        earnIQD: (o.totalIQD * rate) / 100,
        earnUSD: (o.totalUSD * rate) / 100,
        itemCount: o.items.filter((i) => i.available).reduce((n, i) => n + i.quantity, 0),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export const inPeriod = (ms: number, period: string) => period === "all" || monthOf(ms) === period;

export type Totals = { lists: number; items: number; salesIQD: number; salesUSD: number; earnIQD: number; earnUSD: number };

export function sumLines(lines: OrderLine[]): Totals {
  const t: Totals = { lists: 0, items: 0, salesIQD: 0, salesUSD: 0, earnIQD: 0, earnUSD: 0 };
  for (const l of lines) {
    if (!l.completed) continue;
    t.lists += 1;
    t.items += l.itemCount;
    t.salesIQD += l.totalIQD;
    t.salesUSD += l.totalUSD;
    t.earnIQD += l.earnIQD;
    t.earnUSD += l.earnUSD;
  }
  return t;
}

export type OfficeRow = { id: string; name: string; type: SupplierType; totals: Totals; lines: OrderLine[]; lastAt: number };

/** Every office, even with no purchases, busiest first. */
export function officeRows(data: BusinessData, lines: OrderLine[]): OfficeRow[] {
  const rows = data.suppliers.map((s): OfficeRow => {
    const own = lines.filter((l) => l.supplierId === s.id);
    return { id: s.id, name: s.name, type: s.accountType, lines: own, totals: sumLines(own), lastAt: own[0]?.createdAt ?? 0 };
  });
  return rows.sort((a, b) => b.totals.lists - a.totals.lists || b.lastAt - a.lastAt || a.name.localeCompare(b.name));
}

/** Months with orders, newest first. */
export function periodsOf(orders: { createdAt: number }[]): string[] {
  return [...new Set(orders.map((o) => monthOf(o.createdAt)).filter(Boolean))].sort().reverse();
}

export function formatMoney(n: number, c: Currency): string {
  const v = (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: c === "IQD" ? 0 : 2 });
  return c === "IQD" ? `${v} د.ع` : `\u2066$${v}\u2069`;
}

/** Both currencies when both exist; they are never added together. */
export function formatBoth(iqd: number, usd: number): string {
  const parts: string[] = [];
  if (iqd) parts.push(formatMoney(iqd, "IQD"));
  if (usd) parts.push(formatMoney(usd, "USD"));
  return parts.join(" + ") || "0";
}

async function call<T>(name: string, data: object): Promise<T> {
  const res = await httpsCallable(getFunctions(app), name)(data);
  return res.data as T;
}

export const getBusinessData = () => call<BusinessData>("adminGetBusiness", {});
export const getAccountFile = (uid: string) => call<AccountFile>("adminGetAccountFile", { uid });
export const setCommissionRate = (accountType: SupplierType, rate: number) => call("adminSetCommission", { accountType, rate });
export const setAccountStatusAction = (uid: string, status: "active" | "suspended" | "expired", reason = "") =>
  call("adminSetAccountStatus", { uid, status, reason });
export const extendSubscriptionAction = (uid: string, months: number) => call("adminExtendSubscription", { uid, months });
export const revokeSessionsAction = (uid: string) => call("adminRevokeSessions", { uid });
export const adActionCall = (
  input: { collection?: "offers" | "ads"; id: string } & ({ action: "approve"; expiryDate: string } | { action: "reject"; reason: string } | { action: "stop" }),
) => call("adminAdAction", input);
export const resolveReportAction = (id: string, status: "open" | "reviewing" | "resolved", note = "") =>
  call("adminResolveReport", { id, status, note });

export function adminErrorMessage(err: unknown): string {
  const message = (err as { message?: string } | null)?.message ?? "";
  const m: Record<string, string> = {
    "reason-required": "اكتب السبب أولاً",
    "not-yourself": "لا يمكنك إيقاف حسابك أنت",
    "target-is-admin": "لا يمكن إيقاف حساب مدير",
    "not-admin": "هذا الحساب لا يملك صلاحية المدير",
    "bad-rate": "النسبة يجب أن تكون بين 0 و100",
    "bad-date": "اختر تاريخاً صحيحاً",
  };
  return m[message] ?? "تعذر تنفيذ العملية. تحقق من الاتصال وحاول مجدداً";
}

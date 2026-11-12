import type { Timestamp } from "firebase/firestore";

export type AccountType = "dentist" | "supply" | "implant" | "lab" | "secretary";
export type AppRole = "admin" | AccountType;

export type ProductDoc = {
  id: string;
  branch: string;
  ar: string;
  en: string;
  brand: string;
  price: number;
  inStock: boolean;
  images: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type UserRoleDoc = {
  userId: string;
  role: AppRole;
  accountType: AccountType;
  name: string;
  surname: string;
  gender: string;
  email: string;
  phone?: string;
  photoURL?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  title?: string;
  dob?: string;
  labDescription?: string;
  notificationsEnabled?: boolean;
  // Set on sign-up since email verification became required (emailVerification.ts).
  mustVerifyEmail?: boolean;
  // Office shows its prices only to doctors it approves (functions/hiddenPrices.js).
  pricesHidden?: boolean;
  clinicName?: string;
  accountStatus?: "active" | "suspended" | "expired";
  subscriptionExpiry?: string;
  createdAt: Timestamp;
};

export type InvoiceItem = {
  productId: string;
  name: string;
  quantity: number;
  /** After any quantity tier. The line's share of a code or doctor discount is apart. */
  price: number;
  listPrice?: number;
  discountAmount?: number;
  currency: "USD" | "IQD";
  availability?: "available" | "not_available";
};

export type InvoiceStatus = "pending" | "confirmed" | "shipped" | "delivered" | "rejected";

export type InvoiceDoc = {
  id: string;
  discount?: { code?: string; doctorPct?: number } | null;
  orderNumber: string;
  officeId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  doctorPhone: string;
  doctorAddress?: string;
  doctorCity?: string;
  items: InvoiceItem[];
  total: number;
  totalUSD?: number;
  totalIQD?: number;
  status: InvoiceStatus;
  createdAt: Timestamp;
  confirmedAt?: Timestamp | null;
  shippedAt?: Timestamp | null;
  deliveredAt?: Timestamp | null;
  rejectedAt?: Timestamp | null;
  note?: string;
};

export type OrderDiscount = {
  code?: string;
  doctorPct?: number;
  discountUSD?: number;
  discountIQD?: number;
  tierSavedUSD?: number;
  tierSavedIQD?: number;
};

export type OrderStatus = "pending" | "confirmed" | "rejected";

export type OrderDoc = {
  id: string;
  supplierId: string;
  dentistId: string;
  dentistName: string;
  dentistPhone?: string;
  dentistAddress?: string;
  clinicName?: string;
  orderNumber?: string;
  items: InvoiceItem[];
  total: number;
  totalUSD?: number;
  totalIQD?: number;
  status: OrderStatus;
  note?: string;
  discount?: OrderDiscount | null;
  invoiceId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

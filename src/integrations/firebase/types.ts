import type { Timestamp } from "firebase/firestore";

export type AccountType = "dentist" | "supply" | "implant" | "lab";
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
  createdAt: Timestamp;
};

export type OrderDoc = {
  id: string;
  supplierId: string;
  dentistId: string;
  dentistName: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: string;
  status: "pending" | "confirmed" | "delivered";
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

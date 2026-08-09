import { z } from "zod";

export const notificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  type: z.enum(["order_new", "order_status", "message"]),
  orderId: z.string().optional(),
});

export const productSchema = z.object({
  id: z.string().min(1),
  branch: z.string().optional(),
  ar: z.string().optional(),
  en: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().min(0),
  currency: z.enum(["USD", "IQD"]).default("USD"),
  stock: z.number().min(0).optional(),
  inStock: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  category: z.string().min(1),
  companyId: z.string().min(1),
  country: z.string().optional(),
  countryFlag: z.string().optional(),
  description: z.string().optional(),
  productType: z.string().optional(),
  parentId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  implantSpec: z.object({
    materialGrade: z.string().optional(),
    surfaceTreatment: z.string().optional(),
    diameters: z.array(z.string()).optional(),
    lengths: z.array(z.string()).optional(),
    connectionType: z.string().optional(),
    recommendedTorque: z.string().optional(),
    kitType: z.string().optional(),
    catalogUrl: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    country: z.string().optional(),
    implantType: z.string().optional(),
  }).optional(),
  accessories: z.array(
    z.object({
      type: z.string().optional(),
      name: z.string().optional(),
      specs: z.string().optional(),
      price: z.number().optional(),
      imageUrl: z.string().optional(),
      currency: z.string().optional(),
    }),
  ).optional(),
});

export const offerSchema = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  expiryDate: z.string().optional(),
  price: z.number().min(0).optional(),
  currency: z.enum(["USD", "IQD"]).default("USD"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const userRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["dentist", "supply", "lab", "implant", "admin"]),
  accountType: z.string(),
  name: z.string().min(1),
  surname: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  clinicName: z.string().optional(),
  speciality: z.string().optional(),
  photoURL: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapUrl: z.string().optional(),
  labDescription: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.string().min(1),
  supplierId: z.string().min(1),
  dentistId: z.string().min(1),
  dentistName: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  productImage: z.string().optional(),
  quantity: z.number().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  currency: z.enum(["USD", "IQD"]).default("USD"),
  status: z.enum(["pending", "confirmed", "delivered"]).default("pending"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const labServiceSchema = z.object({
  services: z.array(
    z.object({
      id: z.string().min(1),
      titleAr: z.string().optional(),
      titleEn: z.string().optional(),
      category: z.string().optional(),
      turnaroundAr: z.string().optional(),
      turnaroundEn: z.string().optional(),
      price: z.number().min(0),
      currency: z.enum(["USD", "IQD"]).default("USD"),
      imageUrl: z.string().optional(),
    }),
  ),
});

export const labFinanceSchema = z.object({
  payments: z.array(
    z.object({
      id: z.string().min(1),
      clinic: z.string(),
      amount: z.number().min(0),
      currency: z.enum(["USD", "IQD"]),
      date: z.string(),
    }),
  ),
  expenses: z.array(
    z.object({
      id: z.string().min(1),
      category: z.string(),
      icon: z.string().optional(),
      items: z.array(
        z.object({
          label: z.string(),
          amount: z.number().min(0),
        }),
      ),
    }),
  ),
});

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, storage } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, deleteObject, getDownloadURL } from "firebase/storage";

export const MAX_PRODUCT_IMAGES = 5;
export const PRODUCT_IMAGE_BUCKET = "product-images";

export type Currency = "USD" | "IQD";

export type ImplantSpec = {
  materialGrade?: string;
  surfaceTreatment?: string;
  diameters?: number[];
  lengths?: number[];
  connectionType?: string;
  recommendedTorque?: string;
  kitType?: "implant" | "surgical_kit";
  catalogUrl?: string;
  certifications?: string[];
  country?: string;
  implantType?: "immediate" | "non-immediate";
};

export type ProductAccessory = {
  type: string;
  name: string;
  specs: string;
  price: number;
  imageUrl: string;
  currency: Currency;
};

export type Product = {
  id: string;
  branch: string;
  ar: string;
  en: string;
  brand: string;
  price: number;
  currency: Currency;
  stock: number;
  inStock: boolean;
  images: string[];
  category?: string;
  implantSpec?: ImplantSpec;
  country?: string;
  countryFlag?: string;
  companyId?: string;
  createdAt?: string;
  description?: string;
  accessories?: ProductAccessory[];
  productType?: "main_implant" | "accessory";
  parentId?: string | null;
};

const fromDoc = (id: string, data: Record<string, unknown>): Product => {
  const rawSpec = data.implantSpec as Record<string, unknown> | undefined;
  return {
    id,
    branch: (data.branch as string) ?? "",
    ar: (data.ar as string) ?? "",
    en: (data.en as string) ?? "",
    brand: (data.brand as string) ?? "",
    price: Number(data.price) || 0,
    currency: (data.currency as Currency) || "USD",
    stock: Number(data.stock) || 0,
    inStock: Boolean(data.inStock),
    images: (data.images as string[]) ?? [],
    category: (data.category as string) ?? undefined,
    implantSpec: rawSpec
      ? {
          materialGrade: (rawSpec.materialGrade as string) ?? undefined,
          surfaceTreatment: (rawSpec.surfaceTreatment as string) ?? undefined,
          diameters: (rawSpec.diameters as number[]) ?? undefined,
          lengths: (rawSpec.lengths as number[]) ?? undefined,
          connectionType: (rawSpec.connectionType as string) ?? undefined,
          recommendedTorque: (rawSpec.recommendedTorque as string) ?? undefined,
          kitType: (rawSpec.kitType as ImplantSpec["kitType"]) ?? undefined,
          catalogUrl: (rawSpec.catalogUrl as string) ?? undefined,
          certifications: (rawSpec.certifications as string[]) ?? undefined,
          country: (rawSpec.country as string) ?? undefined,
          implantType: (rawSpec.implantType as ImplantSpec["implantType"]) ?? undefined,
        }
      : undefined,
    companyId: (data.companyId as string) ?? undefined,
    country: (data.country as string) ?? undefined,
    countryFlag: (data.countryFlag as string) ?? undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? undefined,
    description: (data.description as string) ?? undefined,
    accessories: (data.accessories as ProductAccessory[] | null) ?? undefined,
    productType: (data.productType as "main_implant" | "accessory") ?? undefined,
    parentId: (data.parentId as string | null) ?? undefined,
  };
};

export const productsQueryKey = ["products"] as const;

export function useProducts() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: async (): Promise<Product[]> => {
      const q = query(collection(db, "products"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromDoc(d.id, d.data()));
    },
    staleTime: 30_000,
  });
}

function removeUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (obj !== null && typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export function useUpsertProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Product) => {
      const ref = doc(db, "products", p.id);
      const cleanSpec = p.implantSpec ? (removeUndefined(p.implantSpec) as ImplantSpec) : null;
      const cleanAccessories = p.accessories
        ? (removeUndefined(p.accessories) as ProductAccessory[])
        : null;
      await setDoc(
        ref,
        {
          id: p.id,
          branch: p.branch,
          ar: p.ar,
          en: p.en,
          brand: p.brand,
          price: p.price,
          currency: p.currency,
          stock: p.stock,
          inStock: p.stock > 0,
          images: p.images,
          category: p.category ?? null,
          implantSpec: cleanSpec,
          companyId: p.companyId ?? null,
          country: p.country ?? null,
          countryFlag: p.countryFlag ?? null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          description: p.description ?? null,
          accessories: cleanAccessories,
          productType: p.productType ?? null,
          parentId: p.parentId ?? null,
        },
        { merge: true },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productsQueryKey }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const docSnap = await getDoc(doc(db, "products", id));
      const paths = (docSnap.data()?.images as string[] | null) ?? [];
      for (const path of paths) {
        try {
          await deleteObject(ref(storage, path));
        } catch {}
      }
      await deleteDoc(doc(db, "products", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productsQueryKey }),
  });
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `products/${productId}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  return path;
}

export async function removeProductImage(path: string): Promise<void> {
  if (!path) return;
  await deleteObject(ref(storage, path));
}

export function useSignedImageUrls(paths: string[]) {
  const key = ["signed-product-images", [...new Set(paths)].sort().join("|")];
  return useQuery({
    queryKey: key,
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const unique = [...new Set(paths)];
      if (unique.length === 0) return {};
      const map: Record<string, string> = {};
      await Promise.all(
        unique.map(async (path) => {
          try {
            map[path] = await getDownloadURL(ref(storage, path));
          } catch {}
        }),
      );
      return map;
    },
  });
}

export const COUNTRY_SLUG_TO_CODE: Record<string, string> = {
  korean: "KR",
  swiss: "CH",
  german: "DE",
  italian: "IT",
  brazilian: "BR",
};

export const COUNTRY_CODE_TO_SLUG: Record<string, string> = {
  KR: "korean",
  CH: "swiss",
  DE: "german",
  IT: "italian",
  BR: "brazilian",
};

export function useProductsByCountry(countrySlug: string) {
  const countryCode = COUNTRY_SLUG_TO_CODE[countrySlug] ?? countrySlug.toUpperCase();
  return useQuery({
    queryKey: [...productsQueryKey, "by-country", countryCode],
    queryFn: async (): Promise<Product[]> => {
      const q = query(
        collection(db, "products"),
        where("category", "==", "implant"),
        where("country", "==", countryCode),
        orderBy("createdAt", "asc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromDoc(d.id, d.data()));
    },
    staleTime: 30_000,
  });
}

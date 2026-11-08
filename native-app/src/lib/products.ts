import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertVerified } from "./emailVerification";
import { auth, db, storage } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ref, deleteObject, getDownloadURL } from "firebase/storage";
import { uploadFileUri } from "./nativeUpload";
import type { ProductSpecs } from "@/data/specs";
import { randomUUID } from "@/lib/randomId";
import { File } from "expo-file-system";

export const MAX_PRODUCT_IMAGES = 5;
export const PRODUCT_IMAGE_BUCKET = "product-images";

export type Currency = "USD" | "IQD";

export type ImplantSpec = {
  materialGrade?: string;
  surfaceTreatment?: string;
  diameters?: number[];
  lengths?: number[];
  dimensionStocks?: { diameter: number; length: number; quantity: number }[];
  variants?: { diameter: number; length: number; stock: number }[];
  connectionType?: string;
  recommendedTorque?: string;
  kitType?: "implant" | "surgical_kit";
  catalogUrl?: string;
  certifications?: string[];
  country?: string;
  implantType?: "immediate" | "non-immediate";
  subType?: "basal" | "compressive";
};

export type ProductAccessory = {
  type: string;
  name: string;
  specs: string;
  price: number;
  imageUrl: string;
  currency: Currency;
  stock: number;
  stockHidden?: boolean;
};

export type BoneGraftPackSize = {
  volume: string;
  priceUsd: number;
  priceIqd: number;
  available: boolean;
};

export type BoneGraftSpec = {
  graftType: string;
  form: string;
  materialSource: string;
  composition: string;
  particleSize: string;
  sterilizationMethod: string;
  shelfLife: string;
  features: string[];
  packSizes: BoneGraftPackSize[];
  clinicalImages?: string[];
  // Whether the graft is used with a barrier membrane, and that membrane's details.
  membrane?: BoneGraftMembrane;
};

export type BoneGraftMembrane = {
  needed: boolean;
  type?: string;
  size?: string;
  priceUsd?: number;
  priceIqd?: number;
  // Storage path, like the product images.
  image?: string;
};

export type ProductDiscountTier = {
  fromQty: number;
  toQty: number;
  price: number;
  discountPct: number;
};

export type SurgicalKitSpec = {
  productLine?: string;
  kitType?: string;
  placementType?: string;
  compatibility?: string[];
  toolsCount?: number;
};

export type SpecializedImplantSpec = {
  category: string;
  fields: Record<string, string | string[]>;
  clinicalImages?: string[];
};

export type Product = {
  id: string;
  branch: string;
  subCategory?: string;
  ar: string;
  en: string;
  brand: string;
  price: number;
  currency: Currency;
  stock: number;
  inStock: boolean;
  // The office chose not to publish its stock count ("إخفاء المخزون"): the
  // product stays orderable (inStock true, stock 0 so checkout never
  // decrements it) and buyers see "available" with no number.
  stockHidden?: boolean;
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
  boneGraft?: BoneGraftSpec;
  purchasePrice?: number;
  barcode?: string;
  volume?: string;
  shadeSystem?: string;
  shades?: string[];
  discountTiers?: ProductDiscountTier[];
  countryOrigin?: string;
  specs?: ProductSpecs;
  technicalSpecifications?: ProductSpecs;
  sku?: string;
  expiryDate?: string;
  surgicalGuide?: string;
  surgicalGuideTools?: string[];
  surgicalKit?: SurgicalKitSpec;
  specializedImplant?: SpecializedImplantSpec;
  /** The shared catalog product this office's listing is an offer on. */
  catalogId?: string;
};

const fromDoc = (id: string, data: Record<string, unknown>): Product => {
  const rawSpec = data.implantSpec as Record<string, unknown> | undefined;
  return {
    id,
    branch: (data.branch as string) ?? "",
    subCategory: (data.subCategory as string) ?? undefined,
    ar: (data.ar as string) ?? "",
    en: (data.en as string) ?? "",
    brand: (data.brand as string) ?? "",
    price: Number(data.price) || 0,
    currency: (data.currency as Currency) || "USD",
    stock: Number(data.stock) || 0,
    inStock: Boolean(data.inStock),
    stockHidden: data.stockHidden === true,
    images: (data.images as string[]) ?? [],
    category: (data.category as string) ?? undefined,
    implantSpec: rawSpec
      ? {
          materialGrade: (rawSpec.materialGrade as string) ?? undefined,
          surfaceTreatment: (rawSpec.surfaceTreatment as string) ?? undefined,
          diameters: (rawSpec.diameters as number[]) ?? undefined,
          lengths: (rawSpec.lengths as number[]) ?? undefined,
          dimensionStocks: (rawSpec.dimensionStocks as ImplantSpec["dimensionStocks"]) ?? undefined,
          variants: (rawSpec.variants as ImplantSpec["variants"]) ?? undefined,
          connectionType: (rawSpec.connectionType as string) ?? undefined,
          recommendedTorque: (rawSpec.recommendedTorque as string) ?? undefined,
          kitType: (rawSpec.kitType as ImplantSpec["kitType"]) ?? undefined,
          catalogUrl: (rawSpec.catalogUrl as string) ?? undefined,
          certifications: (rawSpec.certifications as string[]) ?? undefined,
          country: (rawSpec.country as string) ?? undefined,
          implantType: (rawSpec.implantType as ImplantSpec["implantType"]) ?? undefined,
          subType: (rawSpec.subType as ImplantSpec["subType"]) ?? undefined,
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
    boneGraft: (data.boneGraft as BoneGraftSpec | null) ?? undefined,
    purchasePrice: (data.purchasePrice as number) ?? undefined,
    barcode: (data.barcode as string) ?? undefined,
    volume: (data.volume as string) ?? undefined,
    shadeSystem: (data.shadeSystem as string) ?? undefined,
    shades: (data.shades as string[]) ?? undefined,
    discountTiers: (data.discountTiers as ProductDiscountTier[] | null) ?? undefined,
    countryOrigin: (data.countryOrigin as string) ?? undefined,
    specs: (data.specs as ProductSpecs | null) ?? undefined,
    technicalSpecifications: (data.technicalSpecifications as ProductSpecs | null) ?? undefined,
    sku: (data.sku as string) ?? undefined,
    expiryDate: (data.expiryDate as string) ?? undefined,
    surgicalGuide: (data.surgicalGuide as string) ?? undefined,
    surgicalGuideTools: (data.surgicalGuideTools as string[] | null) ?? undefined,
    surgicalKit: (data.surgicalKit as SurgicalKitSpec | null) ?? undefined,
    specializedImplant: (data.specializedImplant as SpecializedImplantSpec | null) ?? undefined,
    catalogId: (data.catalogId as string) ?? undefined,
  };
};

export const productsQueryKey = ["products"] as const;

const liveProducts = (docs: { id: string; data: () => Record<string, unknown> }[]): Product[] =>
  docs.filter((d) => d.data().suspended !== true).map((d) => fromDoc(d.id, d.data()));

const oldestFirst = (a: Product, b: Product) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "");

/**
 * The whole collection. Only the admin tab uses this: everywhere else a screen
 * asks for the products it shows, since this reads every product every time.
 */
export function useAllProducts() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: async (): Promise<Product[]> => {
      const q = query(collection(db, "products"), orderBy("createdAt", "asc"));
      return liveProducts((await getDocs(q)).docs);
    },
    staleTime: 30_000,
  });
}

/** Products with one field equal to a value. */
export function useProductsWhere(field: string, value: string | undefined) {
  return useQuery({
    queryKey: [...productsQueryKey, "where", field, value],
    enabled: !!value,
    staleTime: 30_000,
    queryFn: async (): Promise<Product[]> => {
      const snap = await getDocs(query(collection(db, "products"), where(field, "==", value)));
      return liveProducts(snap.docs).sort(oldestFirst);
    },
  });
}

/** One office's products. */
export const useProductsByCompany = (companyId: string | undefined) =>
  useProductsWhere("companyId", companyId);

/** One product. */
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...productsQueryKey, "one", id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async (): Promise<Product | null> => {
      const snap = await getDoc(doc(db, "products", id!));
      if (!snap.exists() || snap.data().suspended === true) return null;
      return fromDoc(snap.id, snap.data());
    },
  });
}

/** Particular products, such as the lines of an order. */
export function useProductsByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].sort();
  return useQuery({
    queryKey: [...productsQueryKey, "ids", unique.join("|")],
    enabled: unique.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Product[]> => {
      const chunks: string[][] = [];
      // Firestore takes at most 30 values in one "in" query.
      for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
      const snaps = await Promise.all(
        chunks.map((c) => getDocs(query(collection(db, "products"), where(documentId(), "in", c)))),
      );
      return snaps.flatMap((s) => liveProducts(s.docs));
    },
  });
}

/** A brand's products, under any of the spellings it's stored with. */
export function useProductsByBrand(names: string[]) {
  const spellings = [
    ...new Set(names.filter(Boolean).flatMap((n) => [n, n.toUpperCase(), n.toLowerCase()])),
  ].slice(0, 30);
  return useQuery({
    queryKey: [...productsQueryKey, "brand", spellings.join("|")],
    enabled: spellings.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Product[]> => {
      const snap = await getDocs(query(collection(db, "products"), where("brand", "in", spellings)));
      return liveProducts(snap.docs).sort(oldestFirst);
    },
  });
}

/** Every office's offer on one catalog product. */
export const useCatalogOffers = (catalogId: string | undefined) =>
  useProductsWhere("catalogId", catalogId);

/** How many products each office lists, counted by the server. */
export function useProductCounts(companyIds: string[]) {
  const ids = [...new Set(companyIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: [...productsQueryKey, "counts", ids.join("|")],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          const q = query(collection(db, "products"), where("companyId", "==", id));
          return [id, (await getCountFromServer(q)).data().count] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });
}

const SEARCH_MAX_PREFIX = 15;

function searchParts(term: string): string[] {
  return term
    .trim()
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2);
}

async function searchProductsOnce(term: string, max: number): Promise<Product[]> {
  const parts = searchParts(term);
  if (parts.length === 0) return [];
  const q = query(
    collection(db, "products"),
    where("searchWords", "array-contains", parts[0].slice(0, SEARCH_MAX_PREFIX)),
    limit(max),
  );
  const products = liveProducts((await getDocs(q)).docs);
  // Only one word can go to the server. The rest narrow what came back.
  return products.filter((p) => {
    const hay = [p.en, p.ar, p.brand].filter(Boolean).join(" ").toLowerCase();
    return parts.every((w) => hay.includes(w));
  });
}

/** Products whose words begin with what's been typed. */
export function useProductSearch(term: string, max = 30) {
  const clean = term.trim().toLowerCase();
  return useQuery({
    queryKey: [...productsQueryKey, "search", clean, max],
    enabled: searchParts(clean).length > 0,
    staleTime: 30_000,
    queryFn: () => searchProductsOnce(clean, max),
  });
}

/** What a scanned code refers to: an id, a barcode, a SKU or a name. */
export async function findProductByCode(code: string): Promise<Product | null> {
  const clean = code.trim();
  if (!clean) return null;
  if (!clean.includes("/")) {
    const byId = await getDoc(doc(db, "products", clean));
    if (byId.exists() && byId.data().suspended !== true) return fromDoc(byId.id, byId.data());
  }
  for (const field of ["barcode", "sku"]) {
    const snap = await getDocs(query(collection(db, "products"), where(field, "==", clean), limit(1)));
    const [hit] = liveProducts(snap.docs);
    if (hit) return hit;
  }
  return (await searchProductsOnce(clean, 1))[0] ?? null;
}

const BRANCH_PAGE = 60;

/** A section's products a page at a time, or its search results while searching. */
export function useBranchProducts(branch: string | undefined, term: string) {
  const searching = searchParts(term).length > 0;
  const search = useProductSearch(searching ? term : "", 60);
  const pages = useInfiniteQuery({
    queryKey: [...productsQueryKey, "branch", branch],
    enabled: !!branch && !searching,
    staleTime: 30_000,
    initialPageParam: null as QueryDocumentSnapshot | null,
    queryFn: async ({ pageParam }) => {
      const base = [where("branch", "==", branch), orderBy("createdAt", "desc"), limit(BRANCH_PAGE)];
      const q = pageParam
        ? query(collection(db, "products"), ...base, startAfter(pageParam))
        : query(collection(db, "products"), ...base);
      const snap = await getDocs(q);
      return {
        products: liveProducts(snap.docs),
        next: snap.docs.length === BRANCH_PAGE ? snap.docs[snap.docs.length - 1] : null,
      };
    },
    getNextPageParam: (last) => last.next,
  });
  if (searching) {
    return {
      data: (search.data ?? []).filter((p) => p.branch === branch),
      isLoading: search.isLoading,
      hasMore: false,
      loadMore: () => {},
      loadingMore: false,
    };
  }
  return {
    data: (pages.data?.pages ?? []).flatMap((p) => p.products),
    isLoading: pages.isLoading,
    hasMore: !!pages.hasNextPage,
    loadMore: () => pages.fetchNextPage(),
    loadingMore: pages.isFetchingNextPage,
  };
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
      assertVerified();
      const ref = doc(db, "products", p.id);
      const cleanSpec = p.implantSpec ? (removeUndefined(p.implantSpec) as ImplantSpec) : null;
      const cleanAccessories = p.accessories
        ? (removeUndefined(p.accessories) as ProductAccessory[])
        : null;
      const cleanBoneGraft = p.boneGraft
        ? (removeUndefined(p.boneGraft) as BoneGraftSpec)
        : null;
      const cleanDiscountTiers = p.discountTiers
        ? (removeUndefined(p.discountTiers) as ProductDiscountTier[])
        : null;
      const cleanSpecs = p.specs ? (removeUndefined(p.specs) as ProductSpecs) : null;
      const cleanTechnicalSpecs = p.technicalSpecifications
        ? (removeUndefined(p.technicalSpecifications) as ProductSpecs)
        : null;
      const cleanSurgicalKit = p.surgicalKit
        ? (removeUndefined(p.surgicalKit) as SurgicalKitSpec)
        : null;
      const cleanSpecialized = p.specializedImplant
        ? (removeUndefined(p.specializedImplant) as SpecializedImplantSpec)
        : null;
      await setDoc(
        ref,
        {
          id: p.id,
          branch: p.branch,
          subCategory: p.subCategory ?? null,
          ar: p.ar,
          en: p.en,
          brand: p.brand,
          price: p.price,
          currency: p.currency,
          stock: p.stockHidden ? 0 : p.stock,
          inStock: p.stockHidden === true || p.stock > 0,
          stockHidden: p.stockHidden === true,
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
          boneGraft: cleanBoneGraft,
          purchasePrice: p.purchasePrice ?? null,
          barcode: p.barcode ?? null,
          volume: p.volume ?? null,
          shadeSystem: p.shadeSystem ?? null,
          shades: p.shades ?? null,
          discountTiers: cleanDiscountTiers,
          countryOrigin: p.countryOrigin ?? null,
          specs: cleanSpecs,
          technicalSpecifications: cleanTechnicalSpecs,
          sku: p.sku ?? null,
          expiryDate: p.expiryDate ?? null,
          surgicalGuide: p.surgicalGuide ?? null,
          surgicalGuideTools: p.surgicalGuideTools ?? null,
          surgicalKit: cleanSurgicalKit,
          specializedImplant: cleanSpecialized,
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

export async function uploadProductImage(
  productId: string,
  file: { uri: string; name?: string; type?: string },
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  // Under the uploader's own folder: the Storage rule only has to compare the
  // folder with the signed-in uid. The old products/{productId}/ location
  // needed a Firestore lookup from the Storage rules to prove ownership, and
  // that cross-service check refused every upload ("storage/unauthorized").
  // Who may attach the image to a product is enforced on the product doc.
  const path = `product_images/${uid}/${productId}/${randomUUID()}.${ext || "jpg"}`;
  if ((new File(file.uri).size ?? 0) >= 10 * 1024 * 1024) throw new Error("Image is larger than 10 MB");
  // Sent by the native file uploader, not as a JS byte array (see nativeUpload.ts).
  await uploadFileUri(path, file.uri, file.type || "image/jpeg");
  return path;
}

export async function removeProductImage(path: string): Promise<void> {
  // A catalog image isn't a file of this office's: removing it from the
  // product is all there is to do.
  if (!path || isWebImage(path)) return;
  await deleteObject(ref(storage, path));
}

/** A catalog image is a web address; everything an office uploads is a Storage path. */
export const isWebImage = (path: string) => /^https?:\/\//i.test(path);

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
          if (isWebImage(path)) {
            map[path] = path;
            return;
          }
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
      // Only filter on a single equality field (automatic index) so this
      // works without a composite index; country is filtered client-side.
      const q = query(collection(db, "products"), where("category", "==", "implant"));
      const snap = await getDocs(q);
      return snap.docs
        .filter((d) => d.data().suspended !== true)
        .map((d) => fromDoc(d.id, d.data()))
        .filter(
          (p) =>
            p.branch !== "bone_graft" &&
            (p.country === countryCode || p.implantSpec?.country === countryCode),
        );
    },
    staleTime: 30_000,
  });
}

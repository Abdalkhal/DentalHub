import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, storage } from "@/integrations/firebase/client";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

export type SurgicalGuideCompany = {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  software: string;
  phone: string;
  description: string;
  logoUrl?: string;
  systems: string[];
  printingMaterial: string;
  gallery: { url: string; caption: string }[];
  companyId: string;
  createdAt: number;
};

export const SURGICAL_GUIDE_SOFTWARE = [
  "exocad",
  "3Shape",
  "coDiagnostiX",
  "Blue Sky Plan",
  "RealGUIDE",
];

export const SURGICAL_GUIDE_SYSTEMS: { ar: string; en: string }[] = [
  { ar: "التقليدي", en: "Conventional" },
  { ar: "الوجني", en: "Zygomatic" },
  { ar: "الجناحي", en: "Pterygoid" },
  { ar: "All-on-4 / All-on-6", en: "All-on-4 / All-on-6" },
  { ar: "دليل تسوية العظم", en: "Bone Reduction Guide" },
  { ar: "الدليل متعدد الطبقات", en: "Stackable Guide" },
  { ar: "دليل الزرعات الفورية", en: "Guide for Immediate Implants" },
];

export const SURGICAL_GUIDE_MATERIALS: { ar: string; en: string }[] = [
  { ar: "رزن طبي معقم", en: "Medical Grade Resin" },
  { ar: "نظام هجين: رزن + جلبات فولاذية", en: "Hybrid System: Resin + Steel Sleeves" },
  { ar: "ستيل / تيتانيوم", en: "Stainless Steel / Titanium" },
];

export const surgicalGuideQueryKey = ["surgical-guide-companies"] as const;

const fromDoc = (id: string, data: Record<string, unknown>): SurgicalGuideCompany => ({
  id,
  nameAr: (data.nameAr as string) ?? "",
  nameEn: (data.nameEn as string) ?? "",
  city: (data.city as string) ?? "",
  software: (data.software as string) ?? "",
  phone: (data.phone as string) ?? "",
  description: (data.description as string) ?? "",
  logoUrl: (data.logoUrl as string) ?? undefined,
  systems: (data.systems as string[]) ?? [],
  printingMaterial: (data.printingMaterial as string) ?? "",
  gallery: (data.gallery as { url: string; caption: string }[]) ?? [],
  companyId: (data.companyId as string) ?? "",
  createdAt: Number(data.createdAt) || 0,
});

export function useSurgicalGuideCompanies() {
  return useQuery({
    queryKey: surgicalGuideQueryKey,
    queryFn: async (): Promise<SurgicalGuideCompany[]> => {
      const snap = await getDocs(collection(db, "surgical_guide_companies"));
      return snap.docs
        .map((d) => fromDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 30_000,
  });
}

export function useUpsertSurgicalGuideCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: SurgicalGuideCompany) => {
      await setDoc(
        doc(db, "surgical_guide_companies", c.id),
        { ...c, createdAt: c.createdAt || Date.now() },
        { merge: true },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: surgicalGuideQueryKey }),
  });
}

export async function uploadGuideFile(ownerId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `surgical-guides/${ownerId}/${crypto.randomUUID()}.${ext || "jpg"}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type || "image/jpeg" });
  return path;
}

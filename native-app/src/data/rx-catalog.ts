/**
 * Unified prescription catalog: base medicines + all company products
 * (KIN, LACALUT, WISDOM) merged into ONE list used by the Rx picker.
 */
import { KIN_PRODUCTS, type KinCategory } from "./kin-products";
import { LACALUT_PRODUCTS, type LacalutGroup } from "./lacalut-products";
import { WISDOM_PRODUCTS, type WisdomCategory } from "./wisdom-products";

export type RxCompany = "General" | "KIN" | "WISDOM" | "LACALUT";

export type RxCatalogItem = {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  dosage: string;
  instruction: string;
  duration: string;
  company: RxCompany;
  image?: string;
  url?: string;
};

export const RX_CATEGORIES = [
  "الكل",
  "مسكنات",
  "مضادات حيوية",
  "غسول وغرغرة",
  "معاجين أسنان",
  "جل للثه والتقرحات",
  "فرش وإكسسوارات",
  "عناية الأطفال",
  "تبييض",
  "حساسية",
  "أخرى",
];

/** 1. Base medicines */
const BASE: RxCatalogItem[] = [
  { id: "p1", name: "Paracetamol 500mg", nameAr: "باراسيتامول 500 ملغ", category: "مسكنات", company: "General", dosage: "1 Tab", instruction: "عند الحاجة / كل 8 ساعات", duration: "3 أيام" },
  { id: "p2", name: "Diclofenac Potassium 50mg", nameAr: "ديكلوفيناك بوتاسيوم 50 ملغ", category: "مسكنات", company: "General", dosage: "1 Tab", instruction: "بعد الأكل كل 8-12 ساعة", duration: "3 أيام" },
  { id: "p2b", name: "Ibuprofen 400mg", nameAr: "ايبوبروفين 400 ملغ", category: "مسكنات", company: "General", dosage: "1 Tab", instruction: "كل 8 ساعات بعد الأكل", duration: "3 أيام" },
  { id: "p3", name: "Amoxicillin 500mg", nameAr: "أموكسيسيلين 500 ملغ", category: "مضادات حيوية", company: "General", dosage: "1 Cap", instruction: "كل 8 ساعات بعد الأكل", duration: "5-7 أيام" },
  { id: "p4", name: "Augmentin 1g", nameAr: "أوغمنتين 1 غم", category: "مضادات حيوية", company: "General", dosage: "1 Tab", instruction: "كل 12 ساعة بعد الأكل", duration: "5-7 أيام" },
  { id: "p5", name: "Azithromycin 500mg", nameAr: "أزيثرومايسين 500 ملغ", category: "مضادات حيوية", company: "General", dosage: "1 Tab", instruction: "حبة واحدة يومياً قبل الأكل", duration: "3 أيام" },
  { id: "p6", name: "Metronidazole (Flagyl) 500mg", nameAr: "ميترونيدازول (فلاجيل) 500 ملغ", category: "مضادات حيوية", company: "General", dosage: "1 Tab", instruction: "كل 8 ساعات بعد الأكل", duration: "5 أيام" },
  { id: "p6b", name: "Chlorhexidine 0.12% Mouthwash", nameAr: "غسول كلورهيكسيدين 0.12%", category: "غسول وغرغرة", company: "General", dosage: "15 ml", instruction: "مضمضة دقيقة مرتين يومياً", duration: "7-10 أيام" },
];

/** 2. KIN products */
const KIN_CAT: Record<KinCategory, string> = {
  daily: "غسول وغرغرة",
  gums: "جل للثه والتقرحات",
  kids: "عناية الأطفال",
  whitening: "تبييض",
  sensitivity: "حساسية",
  ortho: "أخرى",
  prosthesis: "أخرى",
  "dry-mouth": "غسول وغرغرة",
  brushes: "فرش وإكسسوارات",
  other: "أخرى",
};

const KIN: RxCatalogItem[] = KIN_PRODUCTS.map((p) => ({
  id: `kin-${p.id}`,
  name: p.en,
  nameAr: p.ar,
  category: KIN_CAT[p.category] ?? "أخرى",
  company: "KIN" as const,
  dosage: "-",
  instruction: p.description || "حسب توجيهات الطبيب",
  duration: "حسب الحاجة",
  image: p.image,
  url: p.url,
}));

/** 3. LACALUT products */
const LACALUT_CAT: Record<LacalutGroup, string> = {
  aktiv: "معاجين أسنان",
  flora: "غسول وغرغرة",
  sensitive: "حساسية",
  white: "تبييض",
  multi: "معاجين أسنان",
  kids: "عناية الأطفال",
  new: "أخرى",
  accessories: "فرش وإكسسوارات",
};

const LACALUT: RxCatalogItem[] = LACALUT_PRODUCTS.map((p) => ({
  id: `lac-${p.id}`,
  name: p.en,
  nameAr: p.ar,
  category: LACALUT_CAT[p.group] ?? "أخرى",
  company: "LACALUT" as const,
  dosage: "-",
  instruction: p.features?.[0] || "حسب توجيهات الطبيب",
  duration: "حسب الحاجة",
  image: p.image,
}));

/** 4. WISDOM products */
const WISDOM_CAT: Record<WisdomCategory, string> = {
  "manual-toothbrushes": "فرش وإكسسوارات",
  "power-toothbrushes": "فرش وإكسسوارات",
  "childrens-products": "عناية الأطفال",
  "interdental-and-floss": "فرش وإكسسوارات",
  "dental-accessories": "فرش وإكسسوارات",
  toothpaste: "معاجين أسنان",
  mouthwash: "غسول وغرغرة",
  "eco-products": "أخرى",
  "gum-health": "جل للثه والتقرحات",
  "teeth-whitening": "تبييض",
};

const WISDOM: RxCatalogItem[] = WISDOM_PRODUCTS.map((p) => ({
  id: `wis-${p.id}`,
  name: p.en,
  category: WISDOM_CAT[p.category] ?? "أخرى",
  company: "WISDOM" as const,
  dosage: "-",
  instruction: "حسب توجيهات الطبيب",
  duration: "حسب الحاجة",
  image: p.image,
  url: p.url,
}));

/** The ONE list used everywhere in the Rx picker. */
export const RX_CATALOG: RxCatalogItem[] = [...BASE, ...KIN, ...LACALUT, ...WISDOM];

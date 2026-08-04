import {
  BRAND_SEEDS_P_Z,
  COUNTRY_AR,
  seedColor,
  seedSlug,
} from "./brands-extra";

export type BrandCategory = "fillings" | "devices" | "endo" | "impression";


export const BRAND_CATEGORIES: { slug: BrandCategory; ar: string; en: string }[] = [
  { slug: "fillings", ar: "حشوات وسمنت", en: "Fillings & Cements" },
  { slug: "devices", ar: "أجهزة وأدوات", en: "Devices & Instruments" },
  { slug: "endo", ar: "علاج جذور", en: "Endodontics" },
  { slug: "impression", ar: "مواد طبعة", en: "Impression Materials" },
];

export type VendorPrice = {
  vendorAr: string;
  vendorEn: string;
  price: number;
  inStock: boolean;
  phone?: string;
};

export type BrandProduct = {
  id: string;
  ar: string;
  en: string;
  category: BrandCategory;
  vendors: VendorPrice[];
};

export type Brand = {
  id: string;
  name: string;
  ar: string;
  /** brand color used for the typographic logo tile */
  color: string;
  countryAr: string;
  countryEn: string;
  distributors: number;
  products: BrandProduct[];
};

export const BRANDS: Brand[] = [
  {
    id: "3m",
    name: "3M",
    ar: "3M",
    color: "oklch(0.55 0.22 25)",
    countryAr: "الولايات المتحدة",
    countryEn: "United States",
    distributors: 4,
    products: [
      {
        id: "3m-z350",
        ar: "كومبوزيت Filtek Z350 XT",
        en: "Filtek Z350 XT Composite",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 20, inStock: true, phone: "9647700000001" },
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 19, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب البصرة", vendorEn: "Basra Office", price: 22, inStock: false, phone: "9647700000003" },
        ],
      },
      {
        id: "3m-single-bond",
        ar: "لاصق Single Bond Universal",
        en: "Single Bond Universal Adhesive",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 78, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب أربيل", vendorEn: "Erbil Office", price: 82, inStock: true, phone: "9647700000004" },
        ],
      },
      {
        id: "3m-impregum",
        ar: "مادة طبعة Impregum",
        en: "Impregum Impression Material",
        category: "impression",
        vendors: [
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 55, inStock: true, phone: "9647700000001" },
        ],
      },
    ],
  },
  {
    id: "dentsply-sirona",
    name: "Dentsply Sirona",
    ar: "دنتسبلاي سيرونا",
    color: "oklch(0.5 0.02 250)",
    countryAr: "الولايات المتحدة / ألمانيا",
    countryEn: "USA / Germany",
    distributors: 3,
    products: [
      {
        id: "ds-protaper",
        ar: "مبارد ProTaper Gold",
        en: "ProTaper Gold Files",
        category: "endo",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 64, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب النجف", vendorEn: "Najaf Office", price: 60, inStock: false, phone: "9647700000005" },
        ],
      },
      {
        id: "ds-ceram-x",
        ar: "كومبوزيت Ceram.X One",
        en: "Ceram.X One Composite",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 26, inStock: true, phone: "9647700000001" },
        ],
      },
      {
        id: "ds-xsmart",
        ar: "جهاز X-Smart Plus",
        en: "X-Smart Plus Motor",
        category: "devices",
        vendors: [
          { vendorAr: "مكتب أربيل", vendorEn: "Erbil Office", price: 890, inStock: true, phone: "9647700000004" },
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 910, inStock: true, phone: "9647700000002" },
        ],
      },
    ],
  },
  {
    id: "tokuyama",
    name: "Tokuyama",
    ar: "توكوياما",
    color: "oklch(0.6 0.14 240)",
    countryAr: "اليابان",
    countryEn: "Japan",
    distributors: 2,
    products: [
      {
        id: "tk-omnichroma",
        ar: "كومبوزيت OMNICHROMA",
        en: "OMNICHROMA Composite",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 45, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 48, inStock: true, phone: "9647700000001" },
        ],
      },
      {
        id: "tk-estecem",
        ar: "سمنت Estecem II",
        en: "Estecem II Cement",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب كربلاء", vendorEn: "Karbala Office", price: 70, inStock: false, phone: "9647700000006" },
        ],
      },
    ],
  },
  {
    id: "dentium",
    name: "Dentium",
    ar: "دنتيوم",
    color: "oklch(0.55 0.12 190)",
    countryAr: "كوريا الجنوبية",
    countryEn: "South Korea",
    distributors: 3,
    products: [
      {
        id: "dt-superline",
        ar: "زرعة SuperLine",
        en: "SuperLine Implant",
        category: "devices",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 120, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب أربيل", vendorEn: "Erbil Office", price: 115, inStock: true, phone: "9647700000004" },
        ],
      },
      {
        id: "dt-osteon",
        ar: "بون كرافت OSTEON 3",
        en: "OSTEON 3 Bone Graft",
        category: "devices",
        vendors: [
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 95, inStock: false, phone: "9647700000001" },
        ],
      },
    ],
  },
  {
    id: "ivoclar",
    name: "Ivoclar",
    ar: "إيفوكلار",
    color: "oklch(0.52 0.16 30)",
    countryAr: "ليختنشتاين",
    countryEn: "Liechtenstein",
    distributors: 2,
    products: [
      {
        id: "iv-tetric",
        ar: "كومبوزيت Tetric N-Ceram",
        en: "Tetric N-Ceram Composite",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 38, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب البصرة", vendorEn: "Basra Office", price: 36, inStock: true, phone: "9647700000003" },
        ],
      },
      {
        id: "iv-emax",
        ar: "بلوكات IPS e.max CAD",
        en: "IPS e.max CAD Blocks",
        category: "impression",
        vendors: [
          { vendorAr: "مكتب أربيل", vendorEn: "Erbil Office", price: 210, inStock: true, phone: "9647700000004" },
        ],
      },
    ],
  },
  {
    id: "bisco",
    name: "Bisco",
    ar: "بيسكو",
    color: "oklch(0.5 0.15 265)",
    countryAr: "الولايات المتحدة",
    countryEn: "United States",
    distributors: 2,
    products: [
      {
        id: "bi-allbond",
        ar: "لاصق All-Bond Universal",
        en: "All-Bond Universal",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب النجف", vendorEn: "Najaf Office", price: 88, inStock: true, phone: "9647700000005" },
        ],
      },
      {
        id: "bi-thera",
        ar: "سمنت TheraCem",
        en: "TheraCem Cement",
        category: "fillings",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 76, inStock: false, phone: "9647700000002" },
        ],
      },
    ],
  },
  {
    id: "bsmiley",
    name: "BSmiley",
    ar: "بي سمايلي",
    color: "oklch(0.35 0.02 260)",
    countryAr: "المملكة المتحدة",
    countryEn: "United Kingdom",
    distributors: 1,
    products: [
      {
        id: "bs-whitening",
        ar: "طقم تبييض احترافي",
        en: "Professional Whitening Kit",
        category: "devices",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 130, inStock: true, phone: "9647700000002" },
        ],
      },
    ],
  },
  {
    id: "meta-biomed",
    name: "Meta Biomed",
    ar: "ميتا بيوميد",
    color: "oklch(0.55 0.14 145)",
    countryAr: "كوريا الجنوبية",
    countryEn: "South Korea",
    distributors: 2,
    products: [
      {
        id: "mb-ah",
        ar: "معجون حشو قنوات",
        en: "Root Canal Sealer",
        category: "endo",
        vendors: [
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 18, inStock: true, phone: "9647700000001" },
          { vendorAr: "مكتب كربلاء", vendorEn: "Karbala Office", price: 17, inStock: true, phone: "9647700000006" },
        ],
      },
    ],
  },
  {
    id: "zhermack",
    name: "Zhermack",
    ar: "زيرماك",
    color: "oklch(0.55 0.18 15)",
    countryAr: "إيطاليا",
    countryEn: "Italy",
    distributors: 2,
    products: [
      {
        id: "zh-alginate",
        ar: "ألجينات Hydrogum 5",
        en: "Hydrogum 5 Alginate",
        category: "impression",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 14, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب البصرة", vendorEn: "Basra Office", price: 15, inStock: true, phone: "9647700000003" },
        ],
      },
      {
        id: "zh-elite",
        ar: "سيليكون Elite HD+",
        en: "Elite HD+ Silicone",
        category: "impression",
        vendors: [
          { vendorAr: "مكتب أربيل", vendorEn: "Erbil Office", price: 42, inStock: false, phone: "9647700000004" },
        ],
      },
    ],
  },
  {
    id: "woodpecker",
    name: "Woodpecker",
    ar: "وودبيكر",
    color: "oklch(0.5 0.13 210)",
    countryAr: "الصين",
    countryEn: "China",
    distributors: 3,
    products: [
      {
        id: "wp-scaler",
        ar: "جهاز تنظيف الجير UDS-E",
        en: "UDS-E Ultrasonic Scaler",
        category: "devices",
        vendors: [
          { vendorAr: "مكتب بغداد", vendorEn: "Baghdad Office", price: 320, inStock: true, phone: "9647700000002" },
          { vendorAr: "مكتب الموصل الدوائي", vendorEn: "Mosul Medical Office", price: 335, inStock: true, phone: "9647700000001" },
        ],
      },
      {
        id: "wp-curing",
        ar: "جهاز ليزر التصليب iLED",
        en: "iLED Curing Light",
        category: "devices",
        vendors: [
          { vendorAr: "مكتب النجف", vendorEn: "Najaf Office", price: 150, inStock: true, phone: "9647700000005" },
        ],
      },
    ],
  },
];

// Directory-only brands (letters P → Z) merged in, skipping ones already detailed above.
const existingNames = new Set(BRANDS.map((b) => b.name.toLowerCase()));
for (const seed of BRAND_SEEDS_P_Z) {
  if (existingNames.has(seed.name.toLowerCase())) continue;
  existingNames.add(seed.name.toLowerCase());
  BRANDS.push({
    id: seedSlug(seed.name),
    name: seed.name,
    ar: seed.name,
    color: seedColor(seed.name),
    countryAr: COUNTRY_AR[seed.country] ?? seed.country,
    countryEn: seed.country,
    distributors: 0,
    products: [],
  });
}



export const POPULAR_BRAND_IDS = [
  "3m",
  "dentsply-sirona",
  "tokuyama",
  "dentium",
  "ivoclar",
  "bisco",
  "woodpecker",
];

export function getBrand(id: string) {
  return BRANDS.find((b) => b.id === id);
}

export function minPrice(p: BrandProduct) {
  return Math.min(...p.vendors.map((v) => v.price));
}

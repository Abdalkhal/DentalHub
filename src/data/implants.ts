export type Country = {
  slug: string;
  ar: string;
  en: string;
  flag: string;
};

export const COUNTRIES: Country[] = [
  { slug: "korean", ar: "كورية", en: "Korean", flag: "🇰🇷" },
  { slug: "swiss", ar: "سويسرية", en: "Swiss", flag: "🇨🇭" },
  { slug: "italian", ar: "إيطالية", en: "Italian", flag: "🇮🇹" },
  { slug: "german", ar: "ألمانية", en: "German", flag: "🇩🇪" },
  { slug: "brazilian", ar: "برازيلية", en: "Brazilian", flag: "🇧🇷" },
];

export type SurgicalGuideCompany = {
  id: string;
  name: string;
  ar: string;
  description: { ar: string; en: string };
  systems: { ar: string; en: string }[];
};

export const SURGICAL_GUIDE_COMPANIES: SurgicalGuideCompany[] = [];

export type ImplantType = "immediate" | "delayed" | "basal";

export type ImplantVariant = {
  id: string;
  ar: string;
  en: string;
  type: ImplantType;
  sizes: string[];
  price?: number;
  note?: { ar: string; en: string };
};

export type ImplantBrand = {
  id: string;
  country: string;
  name: string;
  ar: string;
  types: ImplantType[];
  sizes: string[];
  price: number;
  agent: { ar: string; en: string };
  variants: ImplantVariant[];
};

export const IMPLANTS: ImplantBrand[] = [
  {
    id: "dentium-superline",
    country: "korean",
    name: "Dentium SuperLine",
    ar: "دنتيوم سوبرلاين",
    types: ["immediate", "delayed"],
    sizes: ["3.6", "4.0", "4.5", "5.0"],
    price: 180,
    agent: { ar: "وكيل الموصل للأسنان", en: "Mosul Dental Agency" },
    variants: [
      {
        id: "v1",
        ar: "SuperLine قياسي",
        en: "SuperLine Standard",
        type: "delayed",
        sizes: ["3.6", "4.0", "4.5"],
        price: 180,
      },
      {
        id: "v2",
        ar: "SuperLine مخروطي فوري",
        en: "SuperLine Tapered Immediate",
        type: "immediate",
        sizes: ["4.0", "4.5", "5.0"],
        price: 210,
      },
      {
        id: "v3",
        ar: "Implantium ضيّق",
        en: "Implantium Narrow",
        type: "delayed",
        sizes: ["3.4", "3.6"],
        price: 165,
      },
    ],
  },
  {
    id: "osstem-ts",
    country: "korean",
    name: "Osstem TSIII",
    ar: "أوستم TSIII",
    types: ["immediate", "delayed"],
    sizes: ["3.5", "4.0", "4.5", "5.0", "6.0"],
    price: 200,
    agent: { ar: "شركة الرافدين الطبية", en: "Rafidain Medical Co." },
    variants: [
      {
        id: "v1",
        ar: "TSIII SA فوري",
        en: "TSIII SA Immediate",
        type: "immediate",
        sizes: ["4.0", "4.5", "5.0"],
        price: 220,
      },
      {
        id: "v2",
        ar: "TSIII CA قياسي",
        en: "TSIII CA Standard",
        type: "delayed",
        sizes: ["3.5", "4.0", "4.5"],
        price: 200,
      },
      {
        id: "v3",
        ar: "TSIII واسع (Wide)",
        en: "TSIII Wide",
        type: "delayed",
        sizes: ["5.0", "6.0"],
        price: 235,
      },
    ],
  },
  {
    id: "straumann-blx",
    country: "swiss",
    name: "Straumann BLX",
    ar: "ستراومان BLX",
    types: ["immediate", "delayed"],
    sizes: ["3.5", "3.75", "4.0", "4.5", "5.0"],
    price: 520,
    agent: { ar: "الوكيل الحصري — بغداد", en: "Exclusive Agent — Baghdad" },
    variants: [
      {
        id: "v1",
        ar: "BLX Roxolid فوري",
        en: "BLX Roxolid Immediate",
        type: "immediate",
        sizes: ["3.75", "4.0", "4.5"],
        price: 540,
      },
      {
        id: "v2",
        ar: "BLT قياسي",
        en: "BLT Standard",
        type: "delayed",
        sizes: ["3.3", "4.1", "4.8"],
        price: 500,
      },
    ],
  },
  {
    id: "sweden-martina",
    country: "italian",
    name: "Sweden & Martina Prama",
    ar: "سويدن آند مارتينا براما",
    types: ["delayed"],
    sizes: ["3.8", "4.25", "5.0"],
    price: 320,
    agent: { ar: "وكيل أوروبا الطبي", en: "Euro-Med Distributor" },
    variants: [
      {
        id: "v1",
        ar: "Prama قياسي",
        en: "Prama Standard",
        type: "delayed",
        sizes: ["3.8", "4.25"],
        price: 320,
      },
      {
        id: "v2",
        ar: "Premium Kohno",
        en: "Premium Kohno",
        type: "delayed",
        sizes: ["4.25", "5.0"],
        price: 360,
      },
    ],
  },
  {
    id: "alfa-gate",
    country: "german",
    name: "Alfa Gate",
    ar: "ألفا غيت",
    types: ["immediate", "delayed", "basal"],
    sizes: ["3.3", "3.75", "4.2", "5.0"],
    price: 399,
    agent: { ar: "بوابة الموصل", en: "Mosul Gate" },
    variants: [
      {
        id: "v1",
        ar: "Spiral Tech فوري",
        en: "Spiral Tech Immediate",
        type: "immediate",
        sizes: ["3.75", "4.2"],
        price: 399,
      },
      {
        id: "v2",
        ar: "Internal Hex قياسي",
        en: "Internal Hex Standard",
        type: "delayed",
        sizes: ["3.3", "3.75", "4.2"],
        price: 380,
      },
      {
        id: "v3",
        ar: "Basal قطعة واحدة",
        en: "Basal One-Piece",
        type: "basal",
        sizes: ["3.5", "4.0"],
        price: 420,
      },
    ],
  },
  {
    id: "neodent-grand-morse",
    country: "brazilian",
    name: "Neodent Grand Morse",
    ar: "نيودنت غراند مورس",
    types: ["immediate", "delayed"],
    sizes: ["3.5", "3.75", "4.0", "4.3", "5.0"],
    price: 260,
    agent: { ar: "نيودنت العراق", en: "Neodent Iraq" },
    variants: [
      {
        id: "v1",
        ar: "Helix GM فوري",
        en: "Helix GM Immediate",
        type: "immediate",
        sizes: ["3.5", "3.75", "4.0"],
        price: 275,
      },
      {
        id: "v2",
        ar: "Drive GM قياسي",
        en: "Drive GM Standard",
        type: "delayed",
        sizes: ["3.75", "4.0", "4.3"],
        price: 260,
      },
      {
        id: "v3",
        ar: "Titamax قصير",
        en: "Titamax Short",
        type: "delayed",
        sizes: ["5.0"],
        price: 245,
      },
    ],
  },
];

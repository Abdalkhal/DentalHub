export type Branch = {
  slug: string;
  ar: string;
  en: string;
};

export const BRANCHES: Branch[] = [
  { slug: "general", ar: "مواد عامة", en: "General" },
  { slug: "operative", ar: "ترميمي (Operative)", en: "Operative" },
  { slug: "endodontic", ar: "علاج الجذور", en: "Endodontic" },
  { slug: "prosthodontic", ar: "التركيبات", en: "Prosthodontic" },
  { slug: "surgery", ar: "جراحة الفم", en: "Surgery" },
  { slug: "orthopedic", ar: "تقويم الأسنان", en: "Orthopedic" },
  { slug: "pedodontic", ar: "أسنان الأطفال", en: "Pedodontic" },
  { slug: "periodontic", ar: "علاج اللثة", en: "Periodontic" },
  { slug: "equipment", ar: "معدات", en: "Equipment" },
  { slug: "burs", ar: "مبردات الأسنان", en: "Dental Burs" },
  { slug: "sterilization", ar: "مواد التعقيم", en: "Sterilization" },
  { slug: "oral-care", ar: "العناية بالفم", en: "Oral Care" },
  { slug: "apparel", ar: "ملابس وأزياء", en: "Apparel" },
  { slug: "training", ar: "التعلم والتدريب", en: "Training" },
  { slug: "maintenance", ar: "مواد الصيانة", en: "Maintenance" },
  { slug: "lab-materials", ar: "مواد المختبر", en: "Lab Materials" },
];

export type Office = {
  id: string;
  ar: string;
  en: string;
  city: { ar: string; en: string };
  area: { ar: string; en: string };
  rating: number;
  itemsCount: number;
};

// كل محافظات العراق
export const CITIES: { id: string; ar: string; en: string }[] = [
  { id: "baghdad", ar: "بغداد", en: "Baghdad" },
  { id: "nineveh", ar: "نينوى", en: "Nineveh" },
  { id: "basra", ar: "البصرة", en: "Basra" },
  { id: "erbil", ar: "أربيل", en: "Erbil" },
  { id: "najaf", ar: "النجف الأشرف", en: "Najaf" },
  { id: "karbala", ar: "كربلاء المقدسة", en: "Karbala" },
  { id: "sulaymaniyah", ar: "السليمانية", en: "Sulaymaniyah" },
  { id: "duhok", ar: "دهوك", en: "Duhok" },
  { id: "kirkuk", ar: "كركوك", en: "Kirkuk" },
  { id: "babylon", ar: "بابل", en: "Babylon" },
  { id: "qadisiyah", ar: "القادسية", en: "Al-Qadisiyah" },
  { id: "dhiqar", ar: "ذي قار", en: "Dhi Qar" },
  { id: "maysan", ar: "ميسان", en: "Maysan" },
  { id: "wasit", ar: "واسط", en: "Wasit" },
  { id: "anbar", ar: "الأنبار", en: "Anbar" },
  { id: "salahuddin", ar: "صلاح الدين", en: "Salah ad-Din" },
  { id: "diyala", ar: "ديالى", en: "Diyala" },
  { id: "muthanna", ar: "المثنى", en: "Muthanna" },
];

// قائمة المكاتب فارغة — ستظهر تلقائياً عند تسجيل أصحاب المكاتب
export const OFFICES: Office[] = [];

export type Product = {
  id: string;
  branch: string;
  ar: string;
  en: string;
  brand: string;
  price: number;
  inStock: boolean;
  image?: string;
  createdAt?: string;
};

// A small catalog per branch. The same catalog is used across offices for demo.
export const PRODUCTS: Product[] = [
  // General
  {
    id: "g1",
    branch: "general",
    ar: "مرآة فحص الأسنان",
    en: "Dental mirror",
    brand: "Hu-Friedy",
    price: 12,
    inStock: true,
    image: "dental-mirror",
    createdAt: "2025-01-05",
  },
  {
    id: "g2",
    branch: "general",
    ar: "مسبار فحص (Explorer)",
    en: "Dental probe / explorer",
    brand: "Hu-Friedy",
    price: 10,
    inStock: true,
    image: "dental-probe",
    createdAt: "2025-01-12",
  },
  {
    id: "g3",
    branch: "general",
    ar: "ملقط قطن (Tweezers)",
    en: "Cotton tweezers",
    brand: "Hu-Friedy",
    price: 11,
    inStock: true,
    image: "dental-tweezers",
    createdAt: "2025-01-20",
  },
  {
    id: "g4",
    branch: "general",
    ar: "قفازات نتريل (100)",
    en: "Nitrile gloves (100)",
    brand: "Medicom",
    price: 9,
    inStock: true,
    createdAt: "2025-02-01",
  },
  {
    id: "g5",
    branch: "general",
    ar: "كمامات طبية (50)",
    en: "Surgical masks (50)",
    brand: "3M",
    price: 6,
    inStock: true,
    createdAt: "2025-02-10",
  },
  {
    id: "g6",
    branch: "general",
    ar: "كحول طبي 1لتر",
    en: "Medical alcohol 1L",
    brand: "Local",
    price: 4,
    inStock: true,
    createdAt: "2025-02-15",
  },
  {
    id: "g7",
    branch: "general",
    ar: "قطن طبي",
    en: "Cotton rolls",
    brand: "Hartmann",
    price: 3,
    inStock: false,
    createdAt: "2025-01-03",
  },
  // Operative
  {
    id: "op1",
    branch: "operative",
    ar: "كومبوزيت ضوئي A2",
    en: "Composite A2 light-cure",
    brand: "3M Filtek",
    price: 38,
    inStock: true,
    createdAt: "2025-03-01",
  },
  {
    id: "op2",
    branch: "operative",
    ar: "Bonding مرحلة واحدة",
    en: "Universal bonding",
    brand: "3M Single Bond",
    price: 45,
    inStock: true,
    createdAt: "2025-03-05",
  },
  {
    id: "op3",
    branch: "operative",
    ar: "حمض حفر 37%",
    en: "Etching gel 37%",
    brand: "Meta",
    price: 6,
    inStock: true,
    createdAt: "2025-03-08",
  },
  {
    id: "op4",
    branch: "operative",
    ar: "فرايز ألماس",
    en: "Diamond burs kit",
    brand: "Komet",
    price: 25,
    inStock: true,
    createdAt: "2025-03-12",
  },
  {
    id: "op5",
    branch: "operative",
    ar: "مصفوفات حشو (Matrix)",
    en: "Matrix bands",
    brand: "TDV",
    price: 8,
    inStock: true,
    createdAt: "2025-03-15",
  },
  // Endo
  {
    id: "e1",
    branch: "endodontic",
    ar: "ملفات روتارية ProTaper",
    en: "ProTaper rotary files",
    brand: "Dentsply",
    price: 65,
    inStock: true,
    createdAt: "2025-04-01",
  },
  {
    id: "e2",
    branch: "endodontic",
    ar: "هيبوكلوريت الصوديوم 5.25%",
    en: "NaOCl 5.25%",
    brand: "Cerkamed",
    price: 8,
    inStock: true,
    createdAt: "2025-04-05",
  },
  {
    id: "e3",
    branch: "endodontic",
    ar: "كونات Gutta Percha",
    en: "Gutta percha points",
    brand: "Meta Biomed",
    price: 12,
    inStock: true,
    createdAt: "2025-04-08",
  },
  {
    id: "e4",
    branch: "endodontic",
    ar: "AH Plus حشوة عصب",
    en: "AH Plus sealer",
    brand: "Dentsply",
    price: 55,
    inStock: true,
    createdAt: "2025-04-10",
  },
  // Prostho
  {
    id: "p1",
    branch: "prosthodontic",
    ar: "مواد طبع Aquasil",
    en: "Aquasil impression",
    brand: "Dentsply",
    price: 75,
    inStock: true,
    createdAt: "2025-05-01",
  },
  {
    id: "p2",
    branch: "prosthodontic",
    ar: "أسنان أكريلك",
    en: "Acrylic teeth set",
    brand: "Major",
    price: 35,
    inStock: true,
    createdAt: "2025-05-05",
  },
  {
    id: "p3",
    branch: "prosthodontic",
    ar: "أكريلك حار",
    en: "Heat-cure acrylic",
    brand: "Vertex",
    price: 28,
    inStock: true,
    createdAt: "2025-05-08",
  },
  // Surgery
  {
    id: "s1",
    branch: "surgery",
    ar: "خيوط Vicryl 3/0",
    en: "Vicryl 3/0 sutures",
    brand: "Ethicon",
    price: 18,
    inStock: true,
    createdAt: "2025-06-01",
  },
  {
    id: "s2",
    branch: "surgery",
    ar: "إبر تخدير قصيرة",
    en: "Short anesthetic needles",
    brand: "Septodont",
    price: 9,
    inStock: true,
    createdAt: "2025-06-05",
  },
  {
    id: "s3",
    branch: "surgery",
    ar: "Lidocaine 2%",
    en: "Lidocaine 2%",
    brand: "Septodont",
    price: 22,
    inStock: true,
    createdAt: "2025-06-08",
  },
  // Ortho
  {
    id: "o1",
    branch: "orthopedic",
    ar: "براكتس معدنية",
    en: "Metal brackets",
    brand: "3M Unitek",
    price: 45,
    inStock: true,
    createdAt: "2025-06-12",
  },
  {
    id: "o2",
    branch: "orthopedic",
    ar: "أسلاك NiTi",
    en: "NiTi archwires",
    brand: "Ormco",
    price: 12,
    inStock: true,
    createdAt: "2025-06-15",
  },
  {
    id: "o3",
    branch: "orthopedic",
    ar: "مطاطات تقويم",
    en: "Ortho elastics",
    brand: "American Ortho",
    price: 5,
    inStock: true,
    createdAt: "2025-06-18",
  },
  // Pedo
  {
    id: "pd1",
    branch: "pedodontic",
    ar: "حشوة GIC للأطفال",
    en: "GIC for kids",
    brand: "GC Fuji",
    price: 32,
    inStock: true,
    createdAt: "2025-06-20",
  },
  {
    id: "pd2",
    branch: "pedodontic",
    ar: "تيجان فولاذية",
    en: "Stainless steel crowns",
    brand: "3M ESPE",
    price: 28,
    inStock: true,
    createdAt: "2025-06-22",
  },
  // Perio
  {
    id: "pr1",
    branch: "periodontic",
    ar: "أدوات تنظيف Gracey",
    en: "Gracey curettes set",
    brand: "Hu-Friedy",
    price: 95,
    inStock: true,
    createdAt: "2025-06-25",
  },
  {
    id: "pr2",
    branch: "periodontic",
    ar: "Chlorhexidine 0.2%",
    en: "Chlorhexidine 0.2%",
    brand: "GUM",
    price: 7,
    inStock: true,
    createdAt: "2025-06-28",
  },
];

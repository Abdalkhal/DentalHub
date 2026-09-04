/**
 * Lacalut (لاكلوت) — German oral-care brand, distributed in Iraq by Emirates Scientific Office.
 * Source: https://lacalut-iraq.com/
*/

export type LacalutGroup =
  | "aktiv"
  | "flora"
  | "sensitive"
  | "white"
  | "multi"
  | "kids"
  | "new"
  | "accessories";

export const LACALUT_GROUPS: { slug: LacalutGroup; ar: string; en: string }[] = [
  { slug: "aktiv", ar: "مجموعة aktiv — اللثة", en: "Aktiv — Gums" },
  { slug: "flora", ar: "مجموعة flora — النفس المنعش", en: "Flora — Fresh breath" },
  { slug: "sensitive", ar: "مجموعة sensitive — الحساسية", en: "Sensitive" },
  { slug: "white", ar: "مجموعة white — التبييض", en: "White — Whitening" },
  { slug: "multi", ar: "العناية المركزة 5in1", en: "Multi-effect 5in1" },
  { slug: "kids", ar: "عناية الأطفال", en: "Kids care" },
  { slug: "new", ar: "وصل حديثاً", en: "New arrivals" },
  { slug: "accessories", ar: "مستلزمات العناية", en: "Care accessories" },
];

export type LacalutProduct = {
  id: string;
  ar: string;
  en: string;
  group: LacalutGroup;
  /** price in IQD */
  price: number;
  features: string[];
  image: string;
};

export const LACALUT_URL = "https://lacalut-iraq.com/";

export const LACALUT_PRODUCTS: LacalutProduct[] = [
  {
    id: "aktiv-gum-protection-sensitivity-toothpaste-75-ml",
    ar: "aktiv gum protection & sensitivity toothpaste 75 ml",
    en: "aktiv gum protection & sensitivity toothpaste 75 ml",
    group: "aktiv",
    price: 9000,
    features: ["يعالج الحالات المتقدمة من حساسية الاسنان", "يعالج التهابات و نزيف اللثة", "يقضي على بكتيريا تسوس الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/sensitivity-e1754481710326.png",
  },
  {
    id: "aktiv-gentle-white-toothpaste-75-ml",
    ar: "aktiv & gentle white toothpaste 75 ml",
    en: "aktiv & gentle white toothpaste 75 ml",
    group: "aktiv",
    price: 9000,
    features: ["يعالج التهابات و نزيف اللثة فهو معزز بحمض الهايلورونك", "يقضي على بكتيريا تسوس الاسنان", "يمنحك بياض طبيعي و مشرق"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/gentle-e1754481545153.png",
  },
  {
    id: "aktiv-herbal-75-ml",
    ar: "aktiv herbal 75 ml",
    en: "aktiv herbal 75 ml",
    group: "aktiv",
    price: 7500,
    features: ["يحتوي على 9 اعشاب طبيعية", "تركيبة مميزة لحماية اللثة و الاربطة حول الاسنان", "يوقف و يعالج نزيف اللثة"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/herbal-1-e1754481475830.png",
  },
  {
    id: "aktiv-toothpaste-75-ml",
    ar: "aktiv toothpaste 75 ml",
    en: "aktiv toothpaste 75 ml",
    group: "aktiv",
    price: 7500,
    features: ["يعالج نزيف اللثة", "يقضي على البكتيريا التي تسبب تسوس الاسنان", "يقوي اللثة و الاربطة حول الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/aktiv-e1754480178175.png",
  },
  {
    id: "aktiv-mouthwash-300-ml",
    ar: "aktiv mouthwash 300 ml",
    en: "aktiv mouthwash 300 ml",
    group: "aktiv",
    price: 11000,
    features: ["لثة صحية من اول اسبوع التزام", "تعالج التهابات و نزيف اللثة", "تقوية الاربطة حول الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/photo_5206684154979286372_y-e1754050443941.jpg",
  },
  {
    id: "aktiv-toothbrush",
    ar: "aktiv toothbrush",
    en: "aktiv toothbrush",
    group: "aktiv",
    price: 5500,
    features: ["فرشاة مخصصة لالتهابات اللثة", "شعيراتها مصممة للحفاظ على الاربطة حول الاسنان و عدم حدوث التهابات للثة"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/%D9%81%D8%B1%D8%B4%D9%87-%D8%A7%D9%83%D8%AA%D9%81.png",
  },
  {
    id: "flora-mouthwash-300-ml",
    ar: "flora mouthwash 300 ml",
    en: "flora mouthwash 300 ml",
    group: "flora",
    price: 10500,
    features: ["يقضي على البكتيريا المسببة لرائحة الفم", "نفس منعش يدون طويلا", "الحل الامثل للمدخنين و الذين يعانون من رائحة الفم"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/mouthwash-flora-%D9%86%D8%B3%D8%AE%D8%A9-e1754052123194.png",
  },
  {
    id: "flora-toothpaste-75-ml",
    ar: "flora toothpaste 75 ml",
    en: "flora toothpaste 75 ml",
    group: "flora",
    price: 8500,
    features: ["نفس منعش يدوم طويلا", "يقضي على البكتيريا المسببة للتسوس", "الحل الامثل للمدخنين و الذين يعانون من رائحة الفم"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/flora-e1754481383638.png",
  },
  {
    id: "sensitive-toothbrush",
    ar: "sensitive toothbrush",
    en: "sensitive toothbrush",
    group: "sensitive",
    price: 5500,
    features: ["فرشاة مصممة خصيصا للاسنان الحساسة", "نوعين من الشعيرات التي تساعد على تنظيف الاسنان بدون تحسس"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/8-2-e1754053474616.png",
  },
  {
    id: "sensitive-mouthwash-300-ml",
    ar: "sensitive mouthwash 300 ml",
    en: "sensitive mouthwash 300 ml",
    group: "sensitive",
    price: 10500,
    features: ["تناول طعامك و شرابك بدون الم", "ينظف جيدا برفق و بدون تحسس", "يقوي و يحافظ على الاسنان من التسوس"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/mouthwash-sen-e1754053403714.png",
  },
  {
    id: "sensitive-toothpaste-75-ml",
    ar: "sensitive toothpaste 75 ml",
    en: "sensitive toothpaste 75 ml",
    group: "sensitive",
    price: 7500,
    features: ["تناول طعامك و شرابك بدون الم", "ينظف جيدا برفق و بدون تحسس", "يقوي و يحافظ على الاسنان من التسوس"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/sen-e1754481062129.png",
  },
  {
    id: "extra-sensitive-toothpaste-75-ml",
    ar: "extra sensitive toothpaste 75 ml",
    en: "extra sensitive toothpaste 75 ml",
    group: "sensitive",
    price: 8500,
    features: ["يعالج الحالات المتقدمة من تحسس الاسنان", "تركيبة ثلاثية خاصة مميزة ضد الالم", "يقوي و يحافظ على الاسنان من التسوس"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/extra-sen-e1754480927684.png",
  },
  {
    id: "white-toothpast-75-ml",
    ar: "white toothpast 75 ml",
    en: "white toothpast 75 ml",
    group: "white",
    price: 8500,
    features: ["يمنحك بياض طبيعي و مشرق", "لا يحتوي على مواد مخدشة", "لا يسبب تحسس الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/white-e1754480098705.png",
  },
  {
    id: "white-repair-toothpast-75-ml",
    ar: "white & repair toothpast 75 ml",
    en: "white & repair toothpast 75 ml",
    group: "white",
    price: 9500,
    features: ["تركيبة خاصة تعيد بناء طبقة المينا", "يمنحك بياض طبيعي و مشرق", "لا يسبب تحسس الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/white-and-re-e1754480017983.png",
  },
  {
    id: "white-mouthwash-300-ml",
    ar: "white mouthwash 300 ml",
    en: "white mouthwash 300 ml",
    group: "white",
    price: 10500,
    features: ["يمنحك بياض طبيعي و مشرق", "لا يحتوي على مواد مخدشة", "لا يسبب تحسس الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/01f18289-1211-4dce-bfaa-c592a573f0d1-e1754058166697.png",
  },
  {
    id: "white-toothbrush",
    ar: "white toothbrush",
    en: "white toothbrush",
    group: "white",
    price: 5500,
    features: ["فرشاة مخصصة لتبييض الاسنان", "شعيرات مصممة خصيصا لازالة البقع عن طبقة المينا"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/2-e1754058139555.png",
  },
  {
    id: "multi-effect-plus-toothpast-75-ml",
    ar: "multi-effect plus toothpast 75 ml",
    en: "multi-effect plus toothpast 75 ml",
    group: "multi",
    price: 9000,
    features: ["يحتوي على فيتامينات ( ca,b12,vit.c )", "يقاوم التسوس", "يحافظ على بياض الاسنان و يقوي طبقة المينا", "يحمي اللثة و يمنحك نفس منعش"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/multi-plus-e1754481171805.png",
  },
  {
    id: "multi-effect-toothpast-75-ml",
    ar: "multi-effect toothpast 75 ml",
    en: "multi-effect toothpast 75 ml",
    group: "multi",
    price: 8500,
    features: ["يقاوم التسوس", "يحافظ على بياض الاسنان و يقوي طبقة المينا", "يحمي اللثة و يمنحك نفس منعش"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/multi-1-e1754481228625.png",
  },
  {
    id: "kids-2-6-toothpast",
    ar: "kids 2-6 toothpast",
    en: "kids 2-6 toothpast",
    group: "kids",
    price: 5250,
    features: ["مصمم للاطفال من عمر سنتين و حتى 6 سنوات", "يأتي بطعم يحبه الاطفال و امن عند البلع", "يخلو من السكريات و الالوان الصناعية", "يحتوي فيتامين A , E لحماية اللثة و يقوي مينا الاسنان"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/2-2-e1754213570979.png",
  },
  {
    id: "junior-6-toothpast",
    ar: "Junior +6 toothpast",
    en: "Junior +6 toothpast",
    group: "kids",
    price: 5250,
    features: ["مصمم للاطفال والمراهقين فوق عمر 6 سنوات", "يأتي بطعم يحبه الاطفال و امن عند البلع", "يخلو من السكريات و الالوان الصناعية", "يقوي مينا الاسنان من التسوس بفعل الفلورايد"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/3-2-e1754213619973.png",
  },
  {
    id: "baby-0-2-toothpast",
    ar: "baby 0-2 toothpast",
    en: "baby 0-2 toothpast",
    group: "kids",
    price: 5250,
    features: ["مصمم للاطفال حديثي الولادة وحتى عمر السنتين", "يأتي بطعم يحبه الاطفال و امن عند البلع", "يخلو من السكريات و الالوان الصناعية", "يقوي ويحمي مينا الاسنان بفعل الفلورايد"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/1-2-1-e1754213524124.png",
  },
  {
    id: "baby-tooth-brush-4",
    ar: "BABY tooth brush +4",
    en: "BABY tooth brush +4",
    group: "kids",
    price: 5250,
    features: ["فرشاة خاصة لتنظيف اسنان الاطفال", "تصل للاماكن التي لا يمكن للفرشاة العادية الوصول اليها"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/7-2-e1754213871820.png",
  },
  {
    id: "baby-tooth-brush-0-4",
    ar: "BABY tooth brush 0-4",
    en: "BABY tooth brush 0-4",
    group: "kids",
    price: 5250,
    features: ["فرشاة خاصة لتنظيف اسنان الاطفال", "تصل للاماكن التي لا يمكن للفرشاة العادية الوصول اليها"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/6-scaled-e1754213939272.png",
  },
  {
    id: "lacalut-fluorid-fresh-toothpaste-75-ml",
    ar: "lacalut fluorid fresh toothpaste 75 ml",
    en: "lacalut fluorid fresh toothpaste 75 ml",
    group: "new",
    price: 7500,
    features: ["حماية فعالة من التسوس من خلال مركب ثنائي الفورايد", "يمنحك نفس منعش طوال اليوم", "حماية من التهاب و نزيف اللثة ويقوي طبقة المينا"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/%D9%81-e1754220967538.png",
  },
  {
    id: "dental-floss",
    ar: "dental floss",
    en: "dental floss",
    group: "accessories",
    price: 5000,
    features: ["خيط الاسنان من لاكلوت يصل لاماكن لا يمكن للفرشاة ان تصلها لنظافة فم مثالية"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/10-e1754169897263.png",
  },
  {
    id: "intrdental-brush-xxs-xs-s-m-l",
    ar: "intrdental brush (XXS,XS,S,M,L)",
    en: "intrdental brush (XXS,XS,S,M,L)",
    group: "accessories",
    price: 7000,
    features: ["تنظف بقايا الطعام بين الاسنان", "الحل الامثل للاشخاص الذين يرتدون التقويم او لديهم تيجان و جسور", "تقلل من تراكم الترسبات و البلاك"],
    image: "https://lacalut-iraq.com/wp-content/uploads/2025/08/11-scaled-e1754218932733.png",
  },
];

export function lacalutByGroup(g: LacalutGroup) {
  return LACALUT_PRODUCTS.filter((p) => p.group === g);
}

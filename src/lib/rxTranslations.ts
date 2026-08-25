import type { Lang } from "@/lib/i18n";

type RxEntry = { ar: string[]; en: string[] };

const RX_ENTRIES: RxEntry[] = [
  { ar: ["تاج"], en: ["Crown"] },
  { ar: ["جسر"], en: ["Bridge"] },
  { ar: ["فينير", "قشرة"], en: ["Veneer"] },
  { ar: ["حشوة داخلية/خارجية", "إنلاي", "أونلاي"], en: ["Inlay / Onlay", "Inlay/Onlay"] },
  { ar: ["فينير إيماكس"], en: ["E-Max Veneer", "Veneer E-max", "E.max Veneer"] },
  { ar: ["تاج إيماكس"], en: ["E-Max Crown", "Crown E-max", "E.max Crown"] },
  { ar: ["زيركون", "زركون", "زركونيا", "زيركونيا"], en: ["Zirconium", "ZIRCONIUM", "Zirconia"] },
  { ar: ["زيركون 5D", "زركون 5D"], en: ["Zircon 5D"] },
  { ar: ["تاج زيركون", "تاج زركون"], en: ["Zircon Crown"] },
  { ar: ["جسر زيركون", "جسر زركون"], en: ["Zircon Bridge"] },
  { ar: ["تاج سيراميك"], en: ["Ceramic Crown"] },
  { ar: ["فينير سيراميك"], en: ["Ceramic Veneer"] },
  { ar: ["جسر سيراميك"], en: ["Ceramic Bridge"] },
  { ar: ["طقم جزئي"], en: ["Partial Denture"] },
  { ar: ["طقم كامل"], en: ["Complete Denture"] },
  { ar: ["واقي ليلي"], en: ["Night guard", "Night Guard"] },
  { ar: ["مثبّت", "مثبت"], en: ["Retainer"] },
  { ar: ["وحدة مؤقتة"], en: ["Temporary unit", "Temporary Unit"] },
  { ar: ["جزئي"], en: ["Partial"] },
  { ar: ["كامل"], en: ["Complete"] },
  { ar: ["أكريليك"], en: ["Acrylic"] },
];

export function translateWorkItem(text: string, lang: Lang): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const m = trimmed.match(/^(.*?)( ?#\d+)$/);
  const base = (m ? m[1] : trimmed).trim();
  const suffix = m ? m[2] : "";
  const entry = RX_ENTRIES.find((e) => e.ar.includes(base) || e.en.includes(base));
  const out = entry ? (lang === "ar" ? entry.ar[0] : entry.en[0]) : base;
  return suffix ? `${out}${suffix}` : out;
}

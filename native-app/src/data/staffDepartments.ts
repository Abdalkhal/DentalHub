import {
  PenTool,
  Palette,
  Beaker,
  Wrench,
  Users,
  Gem,
  Layers,
  Headset,
  type LucideIcon,
} from "lucide-react-native";
import type { StaffDepartment } from "@/lib/staffStore";

export type DepartmentDef = {
  id: StaffDepartment;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  icon: LucideIcon;
  color: string;
};

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: "cad_designer",
    ar: "Ø§Ù„Ø¯Ø§ÙŠØ²Ù†Ø± (Ù…ØµÙ…Ù… CAD)",
    en: "CAD Designer",
    descAr: "ØªØµÙ…ÙŠÙ… ÙˆØªØ¬Ù‡ÙŠØ² Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ø±Ù‚Ù…ÙŠØ© Ù„Ù„Ø·Ø¨Ø§Ø¹Ø© ÙˆØ§Ù„ØªÙØ±ÙŠØ²",
    descEn: "Designs and prepares digital files for printing & milling",
    icon: PenTool,
    color: "text-sky-600 bg-sky-50",
  },
  {
    id: "ceramist",
    ar: "Ø§Ù„Ø³Ø±Ø§Ù…ÙŠØ³Øª",
    en: "Ceramist",
    descAr: "ØªØ·Ø¨ÙŠÙ‚ Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ø¨ÙˆØ±Ø³Ù„Ø§Ù† ÙˆØ§Ù„ØªÙ„ÙˆÙŠÙ† Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ù„Ù„ØªØ±ÙƒÙŠØ¨Ø§Øª",
    descEn: "Applies porcelain layers and final shade of restorations",
    icon: Palette,
    color: "text-pink-600 bg-pink-50",
  },
  {
    id: "mix_tech",
    ar: "ÙÙ†ÙŠ Ø§Ù„Ù…ÙŠÙƒØ³",
    en: "Mix Technician",
    descAr: "ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø®Ù„Ø·Ø§Øª ÙˆØ§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø£ÙˆÙ„ÙŠØ© Ù„Ù„ØµØ¨ ÙˆØ§Ù„ØªØ´ÙƒÙŠÙ„",
    descEn: "Prepares mixes and raw materials for casting & forming",
    icon: Beaker,
    color: "text-violet-600 bg-violet-50",
  },
  {
    id: "prosthetics_tech",
    ar: "ÙÙ†ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨Ø§Øª",
    en: "Prosthetics Technician",
    descAr: "ØªØ±ÙƒÙŠØ¨ ÙˆØªØ¬Ù‡ÙŠØ² Ø§Ù„Ø£Ø·Ù‚Ù… ÙˆØ§Ù„Ø¬Ø³ÙˆØ± ÙˆØ§Ù„ØªØ±ÙƒÙŠØ¨Ø§Øª Ø§Ù„Ù…ØªØ­Ø±ÙƒØ©",
    descEn: "Assembles dentures, bridges and removable prosthetics",
    icon: Wrench,
    color: "text-amber-600 bg-amber-50",
  },
  {
    id: "sales",
    ar: "Ù…Ù†Ø¯ÙˆØ¨ÙŠÙ† ÙˆÙ…Ø¨ÙŠØ¹Ø§Øª",
    en: "Sales & Representatives",
    descAr: "Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ø¹ÙŠØ§Ø¯Ø§Øª ÙˆØ§Ø³ØªÙ„Ø§Ù… ÙˆØªØ³Ù„ÙŠÙ… Ø§Ù„Ø­Ø§Ù„Ø§Øª",
    descEn: "Liaises with clinics and handles case pickup & delivery",
    icon: Users,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "zirconia",
    ar: "Ù‚Ø³Ù… Ø§Ù„Ø²ÙŠØ±ÙƒÙˆÙ†",
    en: "Zirconia Department",
    descAr: "ØªÙØ±ÙŠØ² ÙˆØªÙ„Ø¨ÙŠØ³ ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø²ÙŠØ±ÙƒÙˆÙ† ÙˆØ§Ù„Ø²Ø±ÙƒÙˆÙ†ÙŠØ§",
    descEn: "Milling and veneering of zirconia units",
    icon: Gem,
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    id: "acrylic",
    ar: "Ù‚Ø³Ù… Ø§Ù„Ø£ÙƒØ±ÙŠÙ„ÙŠÙƒ",
    en: "Acrylic Department",
    descAr: "ØªØµÙ†ÙŠØ¹ Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø£ÙƒØ±ÙŠÙ„ÙŠÙƒ ÙˆØ§Ù„Ø£Ø·Ù‚Ù… Ø§Ù„Ù…Ø¤Ù‚ØªØ©",
    descEn: "Fabricates acrylic bases and temporary dentures",
    icon: Layers,
    color: "text-orange-600 bg-orange-50",
  },
  {
    id: "admin_support",
    ar: "Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙˆØ§Ù„Ø¯Ø¹Ù…",
    en: "Admin & Support",
    descAr: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ© ÙˆØ§Ù„Ø¯Ø¹Ù… Ø§Ù„Ù„ÙˆØ¬Ø³ØªÙŠ",
    descEn: "Handles daily operations and logistic support",
    icon: Headset,
    color: "text-slate-600 bg-slate-100",
  },
];

export function getDepartment(id: StaffDepartment | string): DepartmentDef | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}


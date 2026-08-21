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
} from "lucide-react";
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
    ar: "الدايزنر (مصمم CAD)",
    en: "CAD Designer",
    descAr: "تصميم وتجهيز الملفات الرقمية للطباعة والتفريز",
    descEn: "Designs and prepares digital files for printing & milling",
    icon: PenTool,
    color: "text-sky-600 bg-sky-50",
  },
  {
    id: "ceramist",
    ar: "السراميست",
    en: "Ceramist",
    descAr: "تطبيق طبقات البورسلان والتلوين النهائي للتركيبات",
    descEn: "Applies porcelain layers and final shade of restorations",
    icon: Palette,
    color: "text-pink-600 bg-pink-50",
  },
  {
    id: "mix_tech",
    ar: "فني الميكس",
    en: "Mix Technician",
    descAr: "تحضير الخلطات والمواد الأولية للصب والتشكيل",
    descEn: "Prepares mixes and raw materials for casting & forming",
    icon: Beaker,
    color: "text-violet-600 bg-violet-50",
  },
  {
    id: "prosthetics_tech",
    ar: "فني التركيبات",
    en: "Prosthetics Technician",
    descAr: "تركيب وتجهيز الأطقم والجسور والتركيبات المتحركة",
    descEn: "Assembles dentures, bridges and removable prosthetics",
    icon: Wrench,
    color: "text-amber-600 bg-amber-50",
  },
  {
    id: "sales",
    ar: "مندوبين ومبيعات",
    en: "Sales & Representatives",
    descAr: "التواصل مع العيادات واستلام وتسليم الحالات",
    descEn: "Liaises with clinics and handles case pickup & delivery",
    icon: Users,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "zirconia",
    ar: "قسم الزيركون",
    en: "Zirconia Department",
    descAr: "تفريز وتلبيس وحدات الزيركون والزركونيا",
    descEn: "Milling and veneering of zirconia units",
    icon: Gem,
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    id: "acrylic",
    ar: "قسم الأكريليك",
    en: "Acrylic Department",
    descAr: "تصنيع قواعد الأكريليك والأطقم المؤقتة",
    descEn: "Fabricates acrylic bases and temporary dentures",
    icon: Layers,
    color: "text-orange-600 bg-orange-50",
  },
  {
    id: "admin_support",
    ar: "الإدارة والدعم",
    en: "Admin & Support",
    descAr: "إدارة العمليات اليومية والدعم اللوجستي",
    descEn: "Handles daily operations and logistic support",
    icon: Headset,
    color: "text-slate-600 bg-slate-100",
  },
];

export function getDepartment(id: StaffDepartment | string): DepartmentDef | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

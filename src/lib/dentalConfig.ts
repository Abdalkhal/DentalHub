import { Gem, Diamond, Shield, Cog, Clock, Sparkles, Smile, Ruler } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MaterialId =
  | "material.zirconia"
  | "material.emax"
  | "material.pfm"
  | "material.full_cast_metal"
  | "material.pmma"
  | "material.feldspathic"
  | "material.clear_aligner"
  | "material.titanium_bar";

export type WorkTypeId =
  | "crown"
  | "bridge"
  | "implant_crown"
  | "implant_bridge"
  | "full_arch"
  | "veneer"
  | "inlay"
  | "onlay"
  | "overlay"
  | "limited_bridge"
  | "implant_temporary";

export type ManufacturingMethodId =
  | "monolithic"
  | "cutback_layering"
  | "cad_cam_milling"
  | "pressing"
  | "layering"
  | "metal_coping_layering"
  | "metal_framework_layering"
  | "casting";

export type FrameworkCreationId = "conventional_casting" | "cad_cam_metal";

export type Material = {
  id: MaterialId;
  ar: string;
  en: string;
  icon: LucideIcon;
};

export type WorkType = {
  id: WorkTypeId;
  ar: string;
  en: string;
  category?: "core" | "advanced";
};

export type ManufacturingMethod = {
  id: ManufacturingMethodId;
  ar: string;
  en: string;
};

export type FrameworkCreation = {
  id: FrameworkCreationId;
  ar: string;
  en: string;
};

export const MATERIALS: Material[] = [
  { id: "material.zirconia", ar: "زركون", en: "Zirconia", icon: Gem },
  { id: "material.emax", ar: "إيماكس", en: "E.max / Lithium Disilicate", icon: Diamond },
  { id: "material.pfm", ar: "سيراميك ملتحم بالمعدن", en: "PFM — Porcelain Fused to Metal", icon: Shield },
  { id: "material.full_cast_metal", ar: "معدن كامل", en: "Full Cast Metal", icon: Cog },
  { id: "material.pmma", ar: "تركيبات مؤقتة", en: "PMMA (Temporary)", icon: Clock },
  { id: "material.feldspathic", ar: "سيراميك تجميلي", en: "Feldspathic Ceramic", icon: Sparkles },
  { id: "material.clear_aligner", ar: "تقويم شفاف", en: "Clear Aligner", icon: Smile },
  { id: "material.titanium_bar", ar: "تيتانيوم بار", en: "Titanium Bar", icon: Ruler },
];

export const WORK_TYPES: WorkType[] = [
  { id: "crown", ar: "تاج", en: "Crown", category: "core" },
  { id: "bridge", ar: "جسر", en: "Bridge", category: "core" },
  { id: "implant_crown", ar: "تاج فوق زرعة", en: "Implant Crown", category: "core" },
  { id: "implant_bridge", ar: "جسر فوق الزرعات", en: "Implant Bridge", category: "core" },
  { id: "full_arch", ar: "تركيبة كاملة", en: "Full-Arch Prosthesis", category: "core" },
  { id: "veneer", ar: "فينير", en: "Veneer", category: "advanced" },
  { id: "inlay", ar: "إنلاي", en: "Inlay", category: "advanced" },
  { id: "onlay", ar: "أونلاي", en: "Onlay", category: "advanced" },
  { id: "overlay", ar: "أوفرلاي", en: "Overlay", category: "advanced" },
  { id: "limited_bridge", ar: "جسر محدود", en: "Limited Bridge" },
  { id: "implant_temporary", ar: "ترميم مؤقت فوق زرعة", en: "Implant Temporary" },
];

export const MANUFACTURING_METHODS: ManufacturingMethod[] = [
  { id: "monolithic", ar: "تشريح كامل / متجانس", en: "Full Anatomy / Monolithic" },
  { id: "cutback_layering", ar: "قص خلفي + طبقات بورسلان", en: "Cut-Back + Porcelain Layering" },
  { id: "cad_cam_milling", ar: "تفريز CAD/CAM", en: "CAD/CAM Milling" },
  { id: "pressing", ar: "ضغط", en: "Pressing" },
  { id: "layering", ar: "تراكم يدوي", en: "Layering" },
  { id: "metal_coping_layering", ar: "كوبينغ معدني + طبقات بورسلان", en: "Metal Coping + Porcelain Layering" },
  { id: "metal_framework_layering", ar: "هيكل معدني + طبقات بورسلان", en: "Metal Framework + Porcelain Layering" },
  { id: "casting", ar: "صب", en: "Casting" },
];

export const FRAMEWORK_CREATION: FrameworkCreation[] = [
  { id: "conventional_casting", ar: "صب تقليدي", en: "Conventional Casting" },
  { id: "cad_cam_metal", ar: "معدن مفروز CAD/CAM", en: "CAD/CAM Milled Metal" },
];

export type MaterialRules = {
  allowedWorkTypes: WorkTypeId[];
  manufacturingRules: Partial<Record<WorkTypeId, ManufacturingMethodId[]>>;
};

/** Work types that trigger the dynamic "Implant Details" section. */
export const IMPLANT_WORK_TYPES: WorkTypeId[] = [
  "implant_crown",
  "implant_bridge",
  "implant_temporary",
  "full_arch",
];

/**
 * Strict material → work type → manufacturing method rules.
 * Clear Aligner and Titanium Bar use specialized views (no standard work types).
 */
export const RULES: Record<MaterialId, MaterialRules> = {
  "material.zirconia": {
    allowedWorkTypes: [
      "crown",
      "bridge",
      "implant_crown",
      "implant_bridge",
      "full_arch",
      "veneer",
      "inlay",
      "onlay",
      "overlay",
    ],
    manufacturingRules: {
      crown: ["monolithic", "cutback_layering"],
      bridge: ["monolithic", "cutback_layering"],
      implant_crown: ["monolithic", "cutback_layering"],
      implant_bridge: ["monolithic", "cutback_layering"],
      full_arch: ["monolithic", "cutback_layering"],
      veneer: ["cutback_layering", "monolithic"],
      inlay: ["monolithic", "cutback_layering"],
      onlay: ["monolithic", "cutback_layering"],
      overlay: ["monolithic", "cutback_layering"],
    },
  },
  "material.emax": {
    allowedWorkTypes: ["crown", "veneer", "inlay", "onlay", "overlay", "implant_crown", "limited_bridge"],
    manufacturingRules: {
      crown: ["cad_cam_milling", "pressing"],
      veneer: ["cad_cam_milling", "pressing", "layering"],
      inlay: ["cad_cam_milling", "pressing"],
      onlay: ["cad_cam_milling", "pressing"],
      overlay: ["cad_cam_milling", "pressing"],
      implant_crown: ["cad_cam_milling", "pressing"],
      limited_bridge: ["pressing"],
    },
  },
  "material.pfm": {
    allowedWorkTypes: ["crown", "bridge", "implant_crown"],
    manufacturingRules: {
      crown: ["metal_coping_layering"],
      bridge: ["metal_framework_layering"],
      implant_crown: ["metal_coping_layering"],
    },
  },
  "material.full_cast_metal": {
    allowedWorkTypes: ["crown", "bridge"],
    manufacturingRules: {
      crown: ["casting"],
      bridge: ["casting"],
    },
  },
  "material.pmma": {
    allowedWorkTypes: ["crown", "bridge", "implant_temporary", "implant_crown"],
    manufacturingRules: {
      crown: ["cad_cam_milling", "layering"],
      bridge: ["cad_cam_milling", "layering"],
      implant_temporary: ["cad_cam_milling"],
      implant_crown: ["cad_cam_milling"],
    },
  },
  "material.feldspathic": {
    allowedWorkTypes: ["veneer", "crown", "inlay", "onlay", "overlay"],
    manufacturingRules: {
      veneer: ["layering"],
      crown: ["layering"],
      inlay: ["layering"],
      onlay: ["layering"],
      overlay: ["layering"],
    },
  },
  "material.clear_aligner": {
    allowedWorkTypes: [],
    manufacturingRules: {},
  },
  "material.titanium_bar": {
    allowedWorkTypes: [],
    manufacturingRules: {},
  },
};

export type VitaShade = { code: string; hex: string };

export const VITA_SHADES: VitaShade[] = [
  { code: "A1", hex: "#F5E6D3" },
  { code: "A2", hex: "#E8D5B7" },
  { code: "A3", hex: "#D4B896" },
  { code: "A3.5", hex: "#C4A57A" },
  { code: "A4", hex: "#B08D62" },
  { code: "B1", hex: "#F2E9DC" },
  { code: "B2", hex: "#E1D3B8" },
  { code: "B3", hex: "#CFB88F" },
  { code: "B4", hex: "#BBA071" },
  { code: "C1", hex: "#EBE0D3" },
  { code: "C2", hex: "#D6C5AD" },
  { code: "C3", hex: "#C0A98A" },
  { code: "C4", hex: "#A88D6B" },
  { code: "D2", hex: "#E0D2BB" },
  { code: "D3", hex: "#CCB894" },
  { code: "D4", hex: "#B39A73" },
];

export const VITA_3D_SHADES: VitaShade[] = [
  { code: "1M1", hex: "#F7F2EA" },
  { code: "1M2", hex: "#F2E7D6" },
  { code: "2M1", hex: "#EFE6D8" },
  { code: "2M2", hex: "#EAD9C2" },
  { code: "2L1.5", hex: "#E7DCC8" },
  { code: "2R1.5", hex: "#EBDDC9" },
  { code: "3M1", hex: "#E4D5BC" },
  { code: "3M2", hex: "#DCC5A6" },
  { code: "3L1.5", hex: "#DDC9A8" },
  { code: "3L2.5", hex: "#D2B68E" },
  { code: "3R1.5", hex: "#E0CFB0" },
  { code: "3R2.5", hex: "#D6BC99" },
  { code: "4M1", hex: "#D6C3A2" },
  { code: "4M2", hex: "#CBB08A" },
  { code: "4L1.5", hex: "#D0B896" },
  { code: "4L2.5", hex: "#C4A477" },
  { code: "4R1.5", hex: "#D3BC9B" },
  { code: "5M1", hex: "#C7AC85" },
  { code: "5M2", hex: "#BB9C72" },
  { code: "5M3", hex: "#AD8C60" },
];

export const VITA_BLEACH_SHADES: VitaShade[] = [
  { code: "BL1", hex: "#FBF7F1" },
  { code: "BL2", hex: "#F7F1E6" },
  { code: "BL3", hex: "#F3EBDB" },
  { code: "BL4", hex: "#EFE5D1" },
];

export type ShadeTab = "classical" | "3d" | "bleach" | "others";

/** Maps a shade code to its shade-system tab (falls back to `others`). */
export function classifyShade(code: string): ShadeTab {
  if (!code) return "others";
  if (VITA_SHADES.some((s) => s.code === code)) return "classical";
  if (VITA_3D_SHADES.some((s) => s.code === code)) return "3d";
  if (VITA_BLEACH_SHADES.some((s) => s.code === code)) return "bleach";
  return "others";
}

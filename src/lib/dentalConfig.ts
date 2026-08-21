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
  | "veneer"
  | "inlay_onlay"
  | "implant"
  | "full_arch";

export type ManufacturingMethodId =
  | "cad_cam_milling"
  | "layering"
  | "pressing"
  | "casting";

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
};

export type ManufacturingMethod = {
  id: ManufacturingMethodId;
  ar: string;
  en: string;
};

export const MATERIALS: Material[] = [
  { id: "material.zirconia", ar: "زركونيا", en: "Zirconia", icon: Gem },
  { id: "material.emax", ar: "إيماكس", en: "E.max", icon: Diamond },
  { id: "material.pfm", ar: "سيراميك على معدن", en: "PFM / Ceramic", icon: Shield },
  { id: "material.full_cast_metal", ar: "معدن كامل", en: "Full Cast Metal", icon: Cog },
  { id: "material.pmma", ar: "تركيبات مؤقتة", en: "PMMA (Temporary)", icon: Clock },
  { id: "material.feldspathic", ar: "سيراميك تجميلي", en: "Feldspathic Ceramic", icon: Sparkles },
  { id: "material.clear_aligner", ar: "تقويم شفاف", en: "Clear Aligner", icon: Smile },
  { id: "material.titanium_bar", ar: "تيتانيوم بار", en: "Titanium Bar", icon: Ruler },
];

export const WORK_TYPES: WorkType[] = [
  { id: "crown", ar: "تاج", en: "Crown" },
  { id: "bridge", ar: "جسر", en: "Bridge" },
  { id: "veneer", ar: "فينير", en: "Veneer" },
  { id: "inlay_onlay", ar: "إنلاي وأونلاي", en: "Inlay & Onlay" },
  { id: "implant", ar: "تاج على زرعة", en: "Implant Crown" },
  { id: "full_arch", ar: "قوس كامل", en: "Full Arch" },
];

export const MANUFACTURING_METHODS: ManufacturingMethod[] = [
  { id: "cad_cam_milling", ar: "تفريز CAD/CAM", en: "CAD/CAM Milling" },
  { id: "layering", ar: "تراكم يدوي", en: "Layering" },
  { id: "pressing", ar: "ضغط", en: "Pressing" },
  { id: "casting", ar: "صب", en: "Casting" },
];

export type MaterialRules = {
  allowedWorkTypes: WorkTypeId[];
  manufacturingRules: Partial<Record<WorkTypeId, ManufacturingMethodId[]>>;
};

/**
 * Strict material → work type → manufacturing method rules.
 * Only the combinations listed here are selectable in the UI.
 * Clear Aligner and Titanium Bar use specialized views (no work types).
 */
export const RULES: Record<MaterialId, MaterialRules> = {
  "material.zirconia": {
    allowedWorkTypes: ["crown", "bridge", "veneer", "inlay_onlay", "implant", "full_arch"],
    manufacturingRules: {
      crown: ["cad_cam_milling", "layering"],
      bridge: ["cad_cam_milling"],
      veneer: ["cad_cam_milling", "layering"],
      inlay_onlay: ["cad_cam_milling"],
      implant: ["cad_cam_milling", "layering"],
      full_arch: ["cad_cam_milling"],
    },
  },
  "material.emax": {
    allowedWorkTypes: ["crown", "veneer", "inlay_onlay", "implant"],
    manufacturingRules: {
      crown: ["pressing", "cad_cam_milling"],
      veneer: ["pressing"],
      inlay_onlay: ["pressing", "cad_cam_milling"],
      implant: ["pressing", "cad_cam_milling"],
    },
  },
  "material.pfm": {
    allowedWorkTypes: ["crown", "bridge"],
    manufacturingRules: {
      crown: ["casting", "cad_cam_milling"],
      bridge: ["casting"],
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
    allowedWorkTypes: ["crown", "bridge", "implant"],
    manufacturingRules: {
      crown: ["cad_cam_milling", "layering"],
      bridge: ["cad_cam_milling", "layering"],
      implant: ["cad_cam_milling"],
    },
  },
  "material.feldspathic": {
    allowedWorkTypes: ["veneer", "crown", "inlay_onlay"],
    manufacturingRules: {
      veneer: ["layering"],
      crown: ["layering"],
      inlay_onlay: ["layering"],
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

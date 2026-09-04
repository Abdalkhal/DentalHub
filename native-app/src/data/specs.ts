import { VITA_SHADES, VITA_3D_SHADES, VITA_BLEACH_SHADES } from "@/lib/dentalConfig";

export type SpecFieldId =
  | "shadeSystem"
  | "shades"
  | "isoSize"
  | "taper"
  | "workingLength"
  | "wireSize"
  | "wireMaterial"
  | "bracketSlot"
  | "bracketTechnique"
  | "bracketMaterial"
  | "elasticPull"
  | "elasticDiameter"
  | "implantDiameter"
  | "implantLength"
  | "platformConnection"
  | "sutureSize"
  | "sutureMaterial"
  | "bladeSize"
  | "boneGraftWeight"
  | "gritBand"
  | "shankType"
  | "volume"
  | "deliveryForm"
  | "gloveSize"
  | "gloveMaterial"
  | "pouchDimensions"
  | "connectionType"
  | "lightFeature"
  | "headSize"
  | "glovePowder"
  | "maskType"
  | "maskColor"
  | "maskFastening"
  | "consumableType"
  | "consumableSize"
  | "protectionType"
  | "accessorySpec"
  | "shade"
  | "fillingType"
  | "giUse"
  | "giShade"
  | "tempColor"
  | "tempConsistency"
  | "modelingVolume"
  | "pulpMaterial"
  | "pulpForm"
  | "cementType"
  | "opaquerColor"
  | "amalgamSpills"
  | "amalgamPack"
  | "bondingType"
  | "bondingVolume"
  | "glycerinVolume"
  | "polishForm"
  | "polishGrit"
  | "instrumentType"
  | "instrumentSize"
  | "cariesColor"
  | "endoAccessInstrument"
  | "endoAccessSize"
  | "fileIso"
  | "fileTaper"
  | "fileLength"
  | "fileType"
  | "obturationType"
  | "obturationIso"
  | "obturationTaper"
  | "postMaterial"
  | "postSize"
  | "irrigantType"
  | "repairMaterial"
  | "endoAccessoryType"
  | "prosthoToolType"
  | "prosthoCordSize"
  | "impressionType"
  | "impressionVolume"
  | "crownType"
  | "crownShade"
  | "labMaterialType"
  | "labMaterialWeight"
  | "waxType"
  | "waxForm"
  | "waxHardness"
  | "surgInstrumentType"
  | "surgRegion"
  | "surgSutureSize"
  | "surgSutureMaterial"
  | "needleShape"
  | "needleCurvature"
  | "surgMaterialType"
  | "surgPackaging"
  | "portUnitType"
  | "portPowerSource"
  | "scanTechnology"
  | "scanCompatibility"
  | "motorTorque"
  | "motorGear"
  | "motorIllumination"
  | "motorPump"
  | "eqpType"
  | "loupeType"
  | "loupeMagnification"
  | "loupeHeadlight"
  | "loupeWorkingDistance"
  | "sterType"
  | "sterClass"
  | "sterCapacity"
  | "sterDataLogging"
  | "imgType"
  | "imgSensorSize"
  | "hpSpeed"
  | "hpConnection"
  | "hpHeadSize"
  | "hpIllumination"
  | "hpChuck"
  | "perioInstrument"
  | "perioProbeType"
  | "perioGracey"
  | "guardType"
  | "guardThickness"
  | "perioSurgicalType"
  | "perioTissueProduct"
  | "perioCordSize"
  | "perioCordType"
  | "graftType"
  | "graftParticle"
  | "graftWeight"
  | "membraneType"
  | "gbrType"
  | "plaqueType"
  | "orthoElasticType"
  | "orthoElasticSize"
  | "orthoExpansionType"
  | "iprType"
  | "iprThickness"
  | "orthoBracketMaterial"
  | "orthoBracketPrescription"
  | "orthoBracketSlot"
  | "orthoWireMaterial"
  | "orthoWireShape"
  | "orthoWireArchform"
  | "orthoWireSize"
  | "orthoSupplyProduct"
  | "tadDiameter"
  | "tadLength"
  | "pedSealant"
  | "pedSealantAccessories"
  | "pedSpaceType"
  | "pedSpaceSize"
  | "pedCrownMaterial"
  | "pedCrownTooth"
  | "pedCrownQuadrant"
  | "pedCrownSize"
  | "pedEndoMaterials"
  | "pedAnesthetic"
  | "pedMatrices"
  | "scrubSize"
  | "scrubGender"
  | "scrubColor"
  | "scrubFabric"
  | "scrubNeckline"
  | "scrubPockets"
  | "scrubWaist"
  | "labcoatSize"
  | "labcoatLength"
  | "labcoatSleeve"
  | "jacketSize"
  | "jacketClosure"
  | "capShape"
  | "capPattern"
  | "clogSize"
  | "clogMaterial"
  | "clogSafety"
  | "clogDesign"
  | "clogArch"
  | "apparelAccessory"
  | "irrigatorType"
  | "irrigatorModes"
  | "irrigatorTank"
  | "irrigatorNozzle"
  | "flossType"
  | "flossFlavor"
  | "flossLength"
  | "flossAccessories"
  | "toothpasteNeed"
  | "toothpasteVolume"
  | "brushType"
  | "brushBristle"
  | "brushInterdental"
  | "mouthwashPurpose"
  | "mouthwashVolume"
  | "dentureCareProducts"
  | "dispenserOperation"
  | "dispenserMounting"
  | "dispenserCapacity"
  | "deviceSterTechnology"
  | "pouchType"
  | "sterPouchDimensions"
  | "sanitizerForm"
  | "sanitizerIngredient"
  | "sanitizerVolume"
  | "surfaceForm"
  | "surfaceDisinfectionTime"
  | "surfacePackaging"
  | "ppeGloveMaterial"
  | "ppeGloveSize"
  | "ppeMaskType"
  | "ppeEyeProtection"
  | "barrierItems"
  | "indicatorTypes"
  | "enzymaticCleaner"
  | "diamondShank"
  | "diamondGrit"
  | "diamondShape"
  | "carbideShank"
  | "carbideSize"
  | "carbideFunction"
  | "steelApplication"
  | "abrasiveMaterial"
  | "abrasiveStage"
  | "abrasiveAccessories"
  | "surgBurLength"
  | "surgBurCutting"
  | "burKitUse"
  | "burKitHolder"
  | "dentTeethMaterial"
  | "dentTeethShade"
  | "dentTeethArch"
  | "dentTeethMould"
  | "cadBlockMaterial"
  | "cadDimensions"
  | "cadThickness"
  | "cadTranslucency"
  | "ceramicType"
  | "ceramicShade"
  | "ceramicSystem"
  | "gypsumType"
  | "labSilicone"
  | "acrylicCuring"
  | "labWaxes"
  | "investmentMaterial"
  | "lubricantType"
  | "lubricantVolume"
  | "lubricantCompatibility"
  | "sparePartType"
  | "spareDeviceCompat"
  | "trainModelType"
  | "trainAccessories"
  | "trainStandard";

export type ProductSpecs = Partial<Record<SpecFieldId, string | string[]>>;

export type SpecOption = { value: string; ar?: string; color?: string };

export type SpecFieldDef = {
  id: SpecFieldId;
  ar: string;
  en: string;
  type: "select" | "multi" | "text";
  options?: SpecOption[];
  placeholder?: string;
  /** Only show this field when the referenced field has the given value. */
  showWhen?: { field: SpecFieldId; value: string };
};

export type SpecGroup = {
  id: string;
  ar: string;
  en: string;
  match?: string[];
  matchBranch?: string[];
  fields: SpecFieldId[];
};

export const SHADE_SYSTEMS = ["VITA Classical", "VITA 3D-Master", "Bleach"];

export function shadeListFor(system: string) {
  if (system === "VITA 3D-Master") return VITA_3D_SHADES;
  if (system === "Bleach") return VITA_BLEACH_SHADES;
  return VITA_SHADES;
}

export const SPEC_FIELDS: Record<SpecFieldId, SpecFieldDef> = {
  shadeSystem: {
    id: "shadeSystem",
    ar: "نظام درجات اللون",
    en: "Shade System",
    type: "select",
    options: SHADE_SYSTEMS.map((value) => ({ value })),
  },
  shades: { id: "shades", ar: "درجات اللون المختارة", en: "Selected Shades", type: "multi" },
  isoSize: {
    id: "isoSize",
    ar: "مقاس ISO / رمز اللون",
    en: "ISO Size / Color Code",
    type: "select",
    options: [
      { value: "#15", ar: "#15 (أبيض)", color: "#ffffff" },
      { value: "#20", ar: "#20 (أصفر)", color: "#facc15" },
      { value: "#25", ar: "#25 (أحمر)", color: "#ef4444" },
      { value: "#30", ar: "#30 (أزرق)", color: "#3b82f6" },
      { value: "#35", ar: "#35 (أخضر)", color: "#22c55e" },
      { value: "#40", ar: "#40 (أسود)", color: "#111827" },
      { value: "Assorted 15-40", ar: "مشكل 15-40" },
      { value: "Assorted 45-80", ar: "مشكل 45-80" },
    ],
  },
  taper: {
    id: "taper",
    ar: "الاستدقاق (Taper)",
    en: "Taper",
    type: "select",
    options: [
      { value: "0.02" },
      { value: "0.04" },
      { value: "0.06" },
      { value: "Greater Taper", ar: "استدقاق أكبر" },
    ],
  },
  workingLength: {
    id: "workingLength",
    ar: "طول العمل",
    en: "Working Length",
    type: "select",
    options: [{ value: "21mm" }, { value: "25mm" }, { value: "31mm" }],
  },
  wireSize: {
    id: "wireSize",
    ar: "حجم ومقطع السلك",
    en: "Wire Size & Profile",
    type: "select",
    options: [
      { value: "0.012", ar: "0.012 Round" },
      { value: "0.014", ar: "0.014 Round" },
      { value: "0.016", ar: "0.016 Round" },
      { value: "0.018", ar: "0.018 Round" },
      { value: "0.020", ar: "0.020 Round" },
      { value: "0.022", ar: "0.022 Round" },
      { value: "0.016x0.022", ar: "0.016×0.022 Rectangular" },
      { value: "0.017x0.025", ar: "0.017×0.025 Rectangular" },
      { value: "0.018x0.025", ar: "0.018×0.025 Rectangular" },
      { value: "0.019x0.025", ar: "0.019×0.025 Rectangular" },
      { value: "0.021x0.025", ar: "0.021×0.025 Rectangular" },
    ],
  },
  wireMaterial: {
    id: "wireMaterial",
    ar: "مادة السلك",
    en: "Wire Material",
    type: "select",
    options: [
      { value: "NiTi" },
      { value: "Stainless Steel", ar: "فولاذ مقاوم للصدأ" },
      { value: "Thermal NiTi", ar: "نيوتي حراري" },
    ],
  },
  bracketSlot: {
    id: "bracketSlot",
    ar: "فتحة البراكيت (Slot)",
    en: "Bracket Slot",
    type: "select",
    options: [{ value: "0.018" }, { value: "0.022" }],
  },
  bracketTechnique: {
    id: "bracketTechnique",
    ar: "تقنية البراكيت",
    en: "Bracket Technique",
    type: "select",
    options: [{ value: "Roth" }, { value: "MBT" }, { value: "EdgeWise" }],
  },
  bracketMaterial: {
    id: "bracketMaterial",
    ar: "مادة البراكيت",
    en: "Bracket Material",
    type: "select",
    options: [
      { value: "معدني", ar: "معدني (Metal)" },
      { value: "سيراميك", ar: "سيراميك (Ceramic)" },
      { value: "Self-Ligating", ar: "ذاتي الربط (Self-Ligating)" },
    ],
  },
  elasticPull: {
    id: "elasticPull",
    ar: "قوة شد المطاط",
    en: "Elastics Pull Strength",
    type: "select",
    options: [{ value: "Light" }, { value: "Medium" }, { value: "Heavy" }],
  },
  elasticDiameter: {
    id: "elasticDiameter",
    ar: "قطر المطاط (بوصة)",
    en: "Elastic Diameter (Inches)",
    type: "text",
    placeholder: 'e.g. 1/8" · 0.125 in',
  },
  implantDiameter: {
    id: "implantDiameter",
    ar: "قطر الزرعة",
    en: "Implant Diameter",
    type: "select",
    options: [{ value: "3.3mm" }, { value: "3.75mm" }, { value: "4.2mm" }, { value: "5.0mm" }],
  },
  implantLength: {
    id: "implantLength",
    ar: "طول الزرعة",
    en: "Implant Length",
    type: "select",
    options: [{ value: "8mm" }, { value: "10mm" }, { value: "11.5mm" }, { value: "13mm" }],
  },
  platformConnection: {
    id: "platformConnection",
    ar: "الوصل المنبسط (Platform)",
    en: "Platform Connection",
    type: "select",
    options: [
      { value: "Internal Hex", ar: "سداسي داخلي (Internal Hex)" },
      { value: "Conical Connection", ar: "وصلة مخروطية (Conical)" },
    ],
  },
  sutureSize: {
    id: "sutureSize",
    ar: "مقاس الخيط USP",
    en: "Suture USP Size",
    type: "select",
    options: [{ value: "3-0" }, { value: "4-0" }, { value: "5-0" }, { value: "6-0" }],
  },
  sutureMaterial: {
    id: "sutureMaterial",
    ar: "نوع الخيط",
    en: "Suture Material",
    type: "select",
    options: [
      { value: "Vicryl (قابل للامتصاص)" },
      { value: "Catgut" },
      { value: "Silk" },
      { value: "Nylon" },
    ],
  },
  bladeSize: {
    id: "bladeSize",
    ar: "مقاس الشفرة",
    en: "Blade Size",
    type: "select",
    options: [{ value: "#10" }, { value: "#11" }, { value: "#12" }, { value: "#15" }, { value: "#15C" }],
  },
  boneGraftWeight: {
    id: "boneGraftWeight",
    ar: "وزن / أبعاد الطعم العظمي",
    en: "Bone Graft Weight / Dimensions",
    type: "select",
    options: [
      { value: "0.25g" },
      { value: "0.5g" },
      { value: "1g" },
      { value: "15x20mm", ar: "15×20mm" },
    ],
  },
  gritBand: {
    id: "gritBand",
    ar: "خشونة السنابلة",
    en: "Grit Band",
    type: "select",
    options: [
      { value: "Extra Coarse", ar: "Extra Coarse (أسود)", color: "#111827" },
      { value: "Coarse", ar: "Coarse (أخضر)", color: "#22c55e" },
      { value: "Medium" },
      { value: "Fine", ar: "Fine (أحمر)", color: "#ef4444" },
      { value: "Extra Fine", ar: "Extra Fine (أصفر)", color: "#eab308" },
    ],
  },
  shankType: {
    id: "shankType",
    ar: "نوع العمود (Shank)",
    en: "Shank Type",
    type: "select",
    options: [
      { value: "High Speed (FG)" },
      { value: "Micromotor (HP)" },
      { value: "Contra-Angle (RA/Latch)" },
    ],
  },
  volume: {
    id: "volume",
    ar: "الحجم / السعة",
    en: "Volume / Capacity",
    type: "text",
    placeholder: "3ml · 5ml · 500ml · 454g · 1kg",
  },
  deliveryForm: {
    id: "deliveryForm",
    ar: "شكل التعبئة",
    en: "Delivery Form",
    type: "select",
    options: [
      { value: "حقنة Syringe", ar: "حقنة (Syringe)" },
      { value: "كبسولات Capsules", ar: "كبسولات (Capsules)" },
      { value: "طلقات سيليكون Cartridge", ar: "طلقات سيليكون (Cartridge)" },
      { value: "خلط يدوي Hand Mix", ar: "خلط يدوي (Hand Mix)" },
    ],
  },
  gloveSize: {
    id: "gloveSize",
    ar: "مقاس القفاز",
    en: "Glove Size",
    type: "select",
    options: [{ value: "XS" }, { value: "Small" }, { value: "Medium" }, { value: "Large" }, { value: "XL" }],
  },
  gloveMaterial: {
    id: "gloveMaterial",
    ar: "مادة القفاز",
    en: "Glove Material",
    type: "select",
    options: [
      { value: "Latex", ar: "لاتكس (Latex)" },
      { value: "Nitrile", ar: "نيتريل (Nitrile)" },
      { value: "Vinyl", ar: "فينيل (Vinyl)" },
    ],
  },
  pouchDimensions: {
    id: "pouchDimensions",
    ar: "أبعاد الكيس",
    en: "Pouch Dimensions",
    type: "text",
    placeholder: "5.5x10 cm · 9x23 cm · 20x33 cm",
  },
  connectionType: {
    id: "connectionType",
    ar: "نوع الوصلة",
    en: "Connection Type",
    type: "select",
    options: [{ value: "2-Hole Midwest" }, { value: "4-Hole" }, { value: "Coupler" }],
  },
  lightFeature: {
    id: "lightFeature",
    ar: "الإضاءة",
    en: "Light Feature",
    type: "select",
    options: [{ value: "LED" }, { value: "Non-Optic" }],
  },
  headSize: {
    id: "headSize",
    ar: "حجم الرأس",
    en: "Head Size",
    type: "select",
    options: [{ value: "Pediatric" }, { value: "Standard" }, { value: "Torque" }],
  },
  glovePowder: {
    id: "glovePowder",
    ar: "البودرة",
    en: "Powder Status",
    type: "select",
    options: [
      { value: "Powdered", ar: "مبودر" },
      { value: "Powder-Free", ar: "خالي من البودرة" },
    ],
  },
  maskType: {
    id: "maskType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Mask", ar: "كمامة وجه" },
      { value: "Cap", ar: "غطاء رأس" },
      { value: "Shoe Cover", ar: "غطاء حذاء" },
    ],
  },
  maskColor: {
    id: "maskColor",
    ar: "اللون",
    en: "Color",
    type: "select",
    options: [
      { value: "Blue", ar: "أزرق" },
      { value: "Pink", ar: "وردي" },
      { value: "White", ar: "أبيض" },
      { value: "Black", ar: "أسود" },
      { value: "Green", ar: "أخضر" },
    ],
  },
  maskFastening: {
    id: "maskFastening",
    ar: "الربط",
    en: "Fastening",
    type: "select",
    options: [
      { value: "Earloop", ar: "رباط أذن" },
      { value: "Tie-on", ar: "رباط خلفي" },
    ],
  },
  consumableType: {
    id: "consumableType",
    ar: "نوع المستهلك",
    en: "Type",
    type: "select",
    options: [
      { value: "Cups", ar: "أكواب مضمضة" },
      { value: "Saliva Ejectors", ar: "شفاطات لعاب" },
      { value: "Cotton Rolls", ar: "قطن أسنان" },
      { value: "Dental Bibs", ar: "مناديل/مفارش" },
    ],
  },
  consumableSize: {
    id: "consumableSize",
    ar: "اللون / الحجم",
    en: "Color / Size",
    type: "text",
    placeholder: "e.g. Medium · Blue",
  },
  protectionType: {
    id: "protectionType",
    ar: "نوع الحماية",
    en: "Protection Type",
    type: "select",
    options: [
      { value: "Glasses", ar: "نظارات حماية" },
      { value: "Face Shield", ar: "واجهية / شيلد" },
      { value: "Lead Apron", ar: "مريلة رصاص" },
    ],
  },
  accessorySpec: {
    id: "accessorySpec",
    ar: "المواصفة / الحجم",
    en: "Spec / Size",
    type: "text",
    placeholder: "e.g. 5ml · 2mm",
  },
  shade: {
    id: "shade",
    ar: "شيد اللون",
    en: "Shade",
    type: "select",
    options: [
      { value: "A1" },
      { value: "A2" },
      { value: "A3" },
      { value: "A3.5" },
      { value: "A4" },
      { value: "B1" },
      { value: "B2" },
      { value: "B3" },
      { value: "C1" },
      { value: "C2" },
      { value: "Bleach" },
      { value: "Incisal/Translucent" },
    ],
  },
  fillingType: {
    id: "fillingType",
    ar: "نوع التعبئة",
    en: "Filling Type",
    type: "select",
    options: [
      { value: "Syringe", ar: "حقنة (Syringe)" },
      { value: "Compules", ar: "كبسولات (Compules)" },
    ],
  },
  giUse: {
    id: "giUse",
    ar: "الاستخدام",
    en: "Type",
    type: "select",
    options: [
      { value: "Restorative", ar: "حشوات (Restorative)" },
      { value: "Luting", ar: "أسمنت تثبيت (Luting)" },
      { value: "Base/Liner", ar: "بطانة (Base/Liner)" },
    ],
  },
  giShade: {
    id: "giShade",
    ar: "شيد اللون",
    en: "Shade",
    type: "select",
    options: [{ value: "A1" }, { value: "A2" }, { value: "A3" }, { value: "Universal" }],
  },
  tempColor: {
    id: "tempColor",
    ar: "اللون",
    en: "Color",
    type: "select",
    options: [
      { value: "Opaque White", ar: "أبيض (Opaque White)" },
      { value: "Pink", ar: "وردي (Pink)" },
      { value: "Yellow", ar: "أصفر (Yellow)" },
    ],
  },
  tempConsistency: {
    id: "tempConsistency",
    ar: "القوام",
    en: "Consistency",
    type: "select",
    options: [
      { value: "Ready Paste", ar: "معجون جاهز" },
      { value: "Powder/Liquid", ar: "بودرة وسائل" },
    ],
  },
  modelingVolume: {
    id: "modelingVolume",
    ar: "الحجم / السعة",
    en: "Volume / Capacity",
    type: "select",
    options: [{ value: "1.5ml" }, { value: "3ml" }, { value: "5ml" }],
  },
  pulpMaterial: {
    id: "pulpMaterial",
    ar: "المادة الأساسية",
    en: "Base Material",
    type: "select",
    options: [
      { value: "MTA" },
      { value: "Calcium Hydroxide", ar: "هيدروكسيد الكالسيوم" },
      { value: "Biodentine" },
    ],
  },
  pulpForm: {
    id: "pulpForm",
    ar: "الشكل",
    en: "Form",
    type: "select",
    options: [
      { value: "Syringe", ar: "معجون جاهز (Syringe)" },
      { value: "Powder/Liquid", ar: "بودرة وسائل" },
    ],
  },
  cementType: {
    id: "cementType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Zinc Phosphate" },
      { value: "Polycarboxylate" },
      { value: "Resin-Modified" },
    ],
  },
  opaquerColor: {
    id: "opaquerColor",
    ar: "اللون / الصبغة",
    en: "Color / Pigment",
    type: "select",
    options: [
      { value: "Blue" },
      { value: "Brown" },
      { value: "White" },
      { value: "Ochre" },
      { value: "Clear" },
    ],
  },
  amalgamSpills: {
    id: "amalgamSpills",
    ar: "الجرعة (Spills)",
    en: "Spills",
    type: "select",
    options: [
      { value: "1 Spill", ar: "1 جرعة" },
      { value: "2 Spills", ar: "جرعتان" },
      { value: "3 Spills", ar: "3 جرعات" },
    ],
  },
  amalgamPack: {
    id: "amalgamPack",
    ar: "التعبئة",
    en: "Pack",
    type: "select",
    options: [
      { value: "50 Capsules", ar: "50 كبسولة" },
      { value: "100 Capsules", ar: "100 كبسولة" },
    ],
  },
  bondingType: {
    id: "bondingType",
    ar: "نوع المنتج",
    en: "Product Type",
    type: "select",
    options: [
      { value: "Etchant Gel", ar: "حمض إتشر (Etchant Gel)" },
      { value: "Bond/Adhesive", ar: "بوند (Bond/Adhesive)" },
    ],
  },
  bondingVolume: {
    id: "bondingVolume",
    ar: "الحجم",
    en: "Volume",
    type: "select",
    options: [{ value: "3ml" }, { value: "5ml" }, { value: "12ml" }],
  },
  glycerinVolume: {
    id: "glycerinVolume",
    ar: "الحجم",
    en: "Volume",
    type: "select",
    options: [{ value: "3ml" }, { value: "5ml" }, { value: "10ml" }],
  },
  polishForm: {
    id: "polishForm",
    ar: "الشكل",
    en: "Form",
    type: "select",
    options: [
      { value: "Discs", ar: "أقراص (Discs)" },
      { value: "Rubbers", ar: "أقماع (Rubbers)" },
      { value: "Paste", ar: "معجون تلميع (Paste)" },
      { value: "Strips", ar: "أشرطة (Strips)" },
    ],
  },
  polishGrit: {
    id: "polishGrit",
    ar: "درجة الخشونة",
    en: "Grit",
    type: "select",
    options: [
      { value: "Coarse", ar: "خشن" },
      { value: "Medium", ar: "متوسط" },
      { value: "Fine", ar: "ناعم" },
      { value: "Extra Fine" },
    ],
  },
  instrumentType: {
    id: "instrumentType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Matrix Bands", ar: "مصفوفات (Matrix Bands)" },
      { value: "Wedges", ar: "إسفين (Wedges)" },
      { value: "Matrix Retainers", ar: "حوامل (Matrix Retainers)" },
    ],
  },
  instrumentSize: {
    id: "instrumentSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [
      { value: "Small" },
      { value: "Medium" },
      { value: "Large" },
      { value: "Assorted" },
    ],
  },
  cariesColor: {
    id: "cariesColor",
    ar: "اللون / الحجم",
    en: "Color",
    type: "select",
    options: [
      { value: "Red", ar: "أحمر" },
      { value: "Green", ar: "أخضر" },
    ],
  },
  endoAccessInstrument: {
    id: "endoAccessInstrument",
    ar: "نوع الأداة",
    en: "Instrument Type",
    type: "select",
    options: [
      { value: "Endo-Access Bur" },
      { value: "Gates Glidden" },
      { value: "Peeso Reamer" },
      { value: "Endo-Z / Safe-End Bur" },
      { value: "Long Neck (LN) Bur" },
    ],
  },
  endoAccessSize: {
    id: "endoAccessSize",
    ar: "المقاس / الرقم",
    en: "Size / Number",
    type: "select",
    options: [
      { value: "#1" },
      { value: "#2" },
      { value: "#3" },
      { value: "#4" },
      { value: "#5" },
      { value: "#6" },
      { value: "Assorted 1-6" },
      { value: "Assorted 1-4" },
    ],
  },
  fileIso: {
    id: "fileIso",
    ar: "مقاس ISO / رمز اللون",
    en: "ISO Size / Color Code",
    type: "select",
    options: [
      { value: "#06" },
      { value: "#08" },
      { value: "#10" },
      { value: "#15" },
      { value: "#20" },
      { value: "#25" },
      { value: "#30" },
      { value: "#35" },
      { value: "#40" },
      { value: "#45" },
      { value: "#50" },
      { value: "#55" },
      { value: "#60" },
      { value: "#70" },
      { value: "#80" },
      { value: "Assorted 15-40" },
      { value: "Assorted 45-80" },
    ],
  },
  fileTaper: {
    id: "fileTaper",
    ar: "الاستدقاق (Taper)",
    en: "Taper",
    type: "select",
    options: [{ value: "0.02" }, { value: "0.04" }, { value: "0.06" }, { value: "0.08" }],
  },
  fileLength: {
    id: "fileLength",
    ar: "الطول",
    en: "Length",
    type: "select",
    options: [{ value: "21mm" }, { value: "25mm" }, { value: "31mm" }],
  },
  fileType: {
    id: "fileType",
    ar: "نوع المبرد",
    en: "File Type",
    type: "select",
    options: [
      { value: "Rotary File" },
      { value: "Hand File (K-File)" },
      { value: "Hand File (H-File)" },
    ],
  },
  obturationType: {
    id: "obturationType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [{ value: "Gutta Percha Points" }, { value: "Paper Points" }],
  },
  obturationIso: {
    id: "obturationIso",
    ar: "مقاس ISO",
    en: "ISO Size",
    type: "select",
    options: [
      { value: "#15" },
      { value: "#20" },
      { value: "#25" },
      { value: "#30" },
      { value: "#35" },
      { value: "#40" },
      { value: "Assorted 15-40" },
    ],
  },
  obturationTaper: {
    id: "obturationTaper",
    ar: "الاستدقاق (Taper)",
    en: "Taper",
    type: "select",
    options: [{ value: "0.02" }, { value: "0.04" }, { value: "0.06" }],
  },
  postMaterial: {
    id: "postMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [
      { value: "Fiber Post" },
      { value: "Titanium Post" },
      { value: "Stainless Steel Post" },
      { value: "Zirconia Post" },
      { value: "Cast Post" },
    ],
  },
  postSize: {
    id: "postSize",
    ar: "المقاس / القطر",
    en: "Size / Diameter",
    type: "select",
    options: [
      { value: "#0 (0.8-0.9mm)" },
      { value: "#1 (1.0mm)" },
      { value: "#2 (1.2mm)" },
      { value: "#3 (1.4mm)" },
      { value: "#4 (1.6mm)" },
      { value: "Assorted Kit" },
    ],
  },
  irrigantType: {
    id: "irrigantType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Sodium Hypochlorite (NaOCl)" },
      { value: "EDTA Liquid" },
      { value: "EDTA Gel / Cream" },
      { value: "Chlorhexidine (CHX)" },
      { value: "Calcium Hydroxide Paste" },
      { value: "Normal Saline" },
      { value: "Sterile Water" },
      { value: "Formocresol / CPMC" },
    ],
  },
  repairMaterial: {
    id: "repairMaterial",
    ar: "نوع المادة",
    en: "Material Type",
    type: "select",
    options: [
      { value: "Bioceramic Sealer / Putty" },
      { value: "MTA" },
      { value: "Biodentine" },
      { value: "GP Solvent (Orange Oil / Eucalyptol / Chloroform)" },
    ],
  },
  endoAccessoryType: {
    id: "endoAccessoryType",
    ar: "نوع الإكسسوار",
    en: "Accessory Type",
    type: "select",
    options: [
      { value: "Endo Ring" },
      { value: "Endo Ruler" },
      { value: "Endo Spreader" },
      { value: "Endo Plugger" },
      { value: "Rubber Dam Sheet" },
      { value: "Rubber Dam Clamps" },
      { value: "Rubber Dam Frame / Punch" },
    ],
  },
  prosthoToolType: {
    id: "prosthoToolType",
    ar: "نوع الأداة",
    en: "Tool Type",
    type: "select",
    options: [
      { value: "Retraction Cord" },
      { value: "Retraction Paste / Hemostatic Gel" },
      { value: "Crown Prep Burs" },
      { value: "Crown Remover" },
      { value: "Articulating Paper" },
      { value: "Tongue Depressor" },
    ],
  },
  prosthoCordSize: {
    id: "prosthoCordSize",
    ar: "مقاس الخيط (Cord)",
    en: "Cord Size",
    type: "select",
    showWhen: { field: "prosthoToolType", value: "Retraction Cord" },
    options: [{ value: "#000" }, { value: "#00" }, { value: "#0" }, { value: "#1" }, { value: "#2" }],
  },
  impressionType: {
    id: "impressionType",
    ar: "نوع المادة",
    en: "Material Type",
    type: "select",
    options: [
      { value: "Alginate" },
      { value: "C-Silicone Putty" },
      { value: "C-Silicone Light Body" },
      { value: "A-Silicone / PVS (Putty / Light / Heavy)" },
      { value: "Bite Registration Material" },
      { value: "Polyether" },
      { value: "Zinc Oxide Eugenol" },
    ],
  },
  impressionVolume: {
    id: "impressionVolume",
    ar: "الحجم / الوزن",
    en: "Volume / Weight",
    type: "select",
    options: [
      { value: "454g" },
      { value: "500g" },
      { value: "50ml Cartridge" },
      { value: "900ml Putty Kit" },
      { value: "100g Hand-mix Kit" },
    ],
  },
  crownType: {
    id: "crownType",
    ar: "النوع / المنتج",
    en: "Type / Product",
    type: "select",
    options: [
      { value: "Temporary Crown Resin (Auto-mix 50ml)" },
      { value: "Prefabricated Temporary Crowns" },
      { value: "Resin Cement (Self-adhesive / Total-etch)" },
      { value: "Glass Ionomer Luting Cement (GIC)" },
      { value: "Resin-Modified GIC (RMGIC)" },
      { value: "Temporary Cement (Eugenol / Non-Eugenol)" },
      { value: "Zinc Phosphate Cement" },
      { value: "Zirconia / Ceramic Primer" },
      { value: "Porcelain Etchant (HF Acid)" },
    ],
  },
  crownShade: {
    id: "crownShade",
    ar: "شيد اللون",
    en: "Shade",
    type: "select",
    options: [
      { value: "A1" },
      { value: "A2" },
      { value: "A3" },
      { value: "A3.5" },
      { value: "B1" },
      { value: "Universal" },
      { value: "Translucent" },
      { value: "Bleach" },
    ],
  },
  labMaterialType: {
    id: "labMaterialType",
    ar: "نوع المادة",
    en: "Material Type",
    type: "select",
    options: [
      { value: "Dental Plaster (Type II)" },
      { value: "Dental Stone (Type III)" },
      { value: "Die Stone (Type IV)" },
      { value: "Heat-Cure Acrylic" },
      { value: "Self-Cure / Cold Acrylic" },
      { value: "Soft Relining Material" },
      { value: "Hard Relining Material" },
      { value: "Light-Cure Tray Plates" },
      { value: "Separating Medium (Cold Mold Seal)" },
    ],
  },
  labMaterialWeight: {
    id: "labMaterialWeight",
    ar: "الوزن / الحجم",
    en: "Weight / Volume",
    type: "select",
    options: [
      { value: "250g" },
      { value: "500g" },
      { value: "1kg" },
      { value: "5kg" },
      { value: "1L Monomer" },
    ],
  },
  waxType: {
    id: "waxType",
    ar: "نوع الشمع",
    en: "Wax Type",
    type: "select",
    options: [
      { value: "Orthodontic Relief Wax" },
      { value: "Baseplate / Modeling Wax (Pink)" },
      { value: "Inlay / Casting Wax" },
      { value: "Sticky Wax" },
      { value: "Bite Registration Wax / Rims" },
      { value: "Beading & Boxing Wax" },
      { value: "Preformed Wax Patterns / Wire" },
      { value: "Utility Wax" },
    ],
  },
  waxForm: {
    id: "waxForm",
    ar: "الشكل",
    en: "Form",
    type: "select",
    options: [
      { value: "Sheets" },
      { value: "Sticks / Rods" },
      { value: "Preformed Rims / Wafers" },
      { value: "Wax Wire Spool (2mm/3mm/4mm)" },
      { value: "Patient Pocket Box (Ortho)" },
    ],
  },
  waxHardness: {
    id: "waxHardness",
    ar: "درجة الصلابة",
    en: "Hardness Level",
    type: "select",
    options: [
      { value: "Soft" },
      { value: "Medium" },
      { value: "Hard / Extra Hard" },
    ],
  },
  surgInstrumentType: {
    id: "surgInstrumentType",
    ar: "نوع الأداة",
    en: "Instrument Type",
    type: "select",
    options: [
      { value: "Tooth Extraction Forceps" },
      { value: "Root Elevator / Luxator" },
      { value: "Scalpel Handle" },
      { value: "Scalpel Blades (#10, #11, #12, #15, #15C)" },
      { value: "Needle Holder" },
      { value: "Surgical Scissors" },
      { value: "Periosteal Elevator (Molt 9)" },
      { value: "Surgical Curette (Lucas)" },
      { value: "Hemostat / Mosquito Forceps" },
      { value: "Surgical Suction Tip" },
    ],
  },
  surgRegion: {
    id: "surgRegion",
    ar: "منطقة الاستخدام",
    en: "Application Region",
    type: "select",
    options: [{ value: "Upper" }, { value: "Lower" }, { value: "Pediatric" }, { value: "General" }],
  },
  surgSutureSize: {
    id: "surgSutureSize",
    ar: "مقاس USP",
    en: "USP Size",
    type: "select",
    options: [{ value: "2-0" }, { value: "3-0" }, { value: "4-0" }, { value: "5-0" }, { value: "6-0" }],
  },
  surgSutureMaterial: {
    id: "surgSutureMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [
      { value: "Vicryl (PGLA)" },
      { value: "Silk" },
      { value: "Nylon" },
      { value: "Chromic Gut" },
      { value: "Plain Gut" },
      { value: "PTFE (Monofilament)" },
      { value: "PGA" },
    ],
  },
  needleShape: {
    id: "needleShape",
    ar: "شكل الإبرة",
    en: "Needle Shape",
    type: "select",
    options: [
      { value: "Reverse Cutting" },
      { value: "Taper Cut" },
      { value: "Conventional Cutting" },
    ],
  },
  needleCurvature: {
    id: "needleCurvature",
    ar: "انحناء الإبرة",
    en: "Needle Curvature",
    type: "select",
    options: [{ value: "3/8 Circle" }, { value: "1/2 Circle" }],
  },
  surgMaterialType: {
    id: "surgMaterialType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Gelatamp / Spongostan Gelatin Sponge" },
      { value: "Periodontal Pack (Coe-Pak)" },
      { value: "Bone Graft Powder (0.25g / 0.5g / 1g)" },
      { value: "Pericardium / Collagen Membrane" },
      { value: "Collagen Plug / Fleece" },
      { value: "Alveogyl (Dry Socket Dressing)" },
      { value: "Surgicel (Oxidized Cellulose)" },
    ],
  },
  surgPackaging: {
    id: "surgPackaging",
    ar: "التعبئة / الكمية",
    en: "Packaging / Quantity",
    type: "select",
    options: [
      { value: "Box of 20 pcs" },
      { value: "Box of 50 pcs" },
      { value: "Tube/Jar 100g" },
      { value: "Vial 0.5g / 1.0g" },
    ],
  },
  portUnitType: {
    id: "portUnitType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Portable Dental Unit" },
      { value: "Portable X-Ray Unit" },
      { value: "Portable Chair" },
    ],
  },
  portPowerSource: {
    id: "portPowerSource",
    ar: "مصدر الطاقة",
    en: "Power Source",
    type: "select",
    options: [
      { value: "Direct AC" },
      { value: "Battery-Powered" },
      { value: "Built-in Compressor" },
    ],
  },
  scanTechnology: {
    id: "scanTechnology",
    ar: "التقنية",
    en: "Technology",
    type: "select",
    options: [{ value: "Wired" }, { value: "Wireless" }],
  },
  scanCompatibility: {
    id: "scanCompatibility",
    ar: "التوافق",
    en: "Compatibility",
    type: "select",
    options: [{ value: "Open STL/PLY" }, { value: "Closed System" }],
  },
  motorTorque: {
    id: "motorTorque",
    ar: "مدى العزم",
    en: "Torque Range",
    type: "select",
    options: [{ value: "5-50 Ncm" }, { value: "5-80 Ncm" }, { value: "5-100 Ncm" }],
  },
  motorGear: {
    id: "motorGear",
    ar: "نسبة التخفيض",
    en: "Gear Ratio",
    type: "select",
    options: [{ value: "20:1 Reduction" }, { value: "1:1 Direct" }, { value: "1:5 Speed-Up" }],
  },
  motorIllumination: {
    id: "motorIllumination",
    ar: "الإضاءة",
    en: "Illumination",
    type: "select",
    options: [{ value: "Optic LED" }, { value: "Non-Optic" }],
  },
  motorPump: {
    id: "motorPump",
    ar: "مضخة مدمجة",
    en: "Built-in Pump",
    type: "select",
    options: [{ value: "True" }, { value: "False" }],
  },
  eqpType: {
    id: "eqpType",
    ar: "نوع المعدة",
    en: "Equipment Type",
    type: "select",
    options: [
      { value: "Drill / Lathe Machine" },
      { value: "Material Mixer / Amalgamator" },
      { value: "Air Compressor" },
      { value: "Suction Machine (Wet/Dry)" },
      { value: "Ultrasonic Scaler (Standalone / Built-in)" },
      { value: "Curing Light (Broadband LED / Turbo)" },
      { value: "Air Polishing / Prophy Unit" },
    ],
  },
  loupeType: {
    id: "loupeType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [{ value: "Magnification Loupes" }, { value: "Operating Microscope" }],
  },
  loupeMagnification: {
    id: "loupeMagnification",
    ar: "قوة التكبير",
    en: "Magnification Ratio",
    type: "select",
    options: [{ value: "2.5x" }, { value: "3.5x" }, { value: "5.0x" }, { value: "Variable Zoom" }],
  },
  loupeHeadlight: {
    id: "loupeHeadlight",
    ar: "الإضاءة الأمامية",
    en: "Headlight",
    type: "select",
    options: [{ value: "LED Headlight Attachment" }, { value: "Without Light" }],
  },
  loupeWorkingDistance: {
    id: "loupeWorkingDistance",
    ar: "مسافة العمل",
    en: "Working Distance",
    type: "select",
    options: [
      { value: "Short (350mm)" },
      { value: "Regular (420mm)" },
      { value: "Long (500mm)" },
    ],
  },
  sterType: {
    id: "sterType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Autoclave" },
      { value: "Sealing Machine" },
      { value: "Ultrasonic Cleaner" },
      { value: "Water Distiller" },
    ],
  },
  sterClass: {
    id: "sterClass",
    ar: "فئة الأوتوكلاف",
    en: "Autoclave Class",
    type: "select",
    showWhen: { field: "sterType", value: "Autoclave" },
    options: [{ value: "Class B" }, { value: "Class N" }, { value: "Class S" }],
  },
  sterCapacity: {
    id: "sterCapacity",
    ar: "السعة",
    en: "Capacity",
    type: "select",
    showWhen: { field: "sterType", value: "Autoclave" },
    options: [{ value: "18L" }, { value: "23L" }, { value: "29L" }],
  },
  sterDataLogging: {
    id: "sterDataLogging",
    ar: "تسجيل البيانات",
    en: "Data Logging",
    type: "select",
    showWhen: { field: "sterType", value: "Autoclave" },
    options: [{ value: "USB Logging" }, { value: "Built-in Printer" }, { value: "None" }],
  },
  imgType: {
    id: "imgType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "RVG Sensor" },
      { value: "Panorama / CBCT" },
      { value: "Intraoral Camera" },
      { value: "Phosphor Plate Scanner (PSP)" },
      { value: "Wall-Mounted / Mobile X-Ray Unit" },
    ],
  },
  imgSensorSize: {
    id: "imgSensorSize",
    ar: "حجم الحساس",
    en: "Sensor Size",
    type: "select",
    showWhen: { field: "imgType", value: "RVG Sensor" },
    options: [{ value: "Size 0" }, { value: "Size 1" }, { value: "Size 2" }, { value: "Size 3" }],
  },
  hpSpeed: {
    id: "hpSpeed",
    ar: "فئة السرعة",
    en: "Speed Category",
    type: "select",
    options: [
      { value: "High Speed Turbine" },
      { value: "Low Speed Straight" },
      { value: "Low Speed Contra-Angle" },
      { value: "Electric Micromotor Handpiece" },
    ],
  },
  hpConnection: {
    id: "hpConnection",
    ar: "نوع الوصلة",
    en: "Connection Type",
    type: "select",
    options: [
      { value: "2 Holes (Borden)" },
      { value: "4 Holes (Midwest)" },
      { value: "LED Coupling 4 Holes" },
      { value: "Quick Coupling (Kavo/NSK Type)" },
    ],
  },
  hpHeadSize: {
    id: "hpHeadSize",
    ar: "حجم الرأس",
    en: "Head Size",
    type: "select",
    options: [{ value: "Mini Head" }, { value: "Standard Head" }, { value: "Torque Head" }],
  },
  hpIllumination: {
    id: "hpIllumination",
    ar: "الإضاءة",
    en: "Illumination",
    type: "select",
    options: [{ value: "Fiberoptic LED" }, { value: "Non-Optic" }],
  },
  hpChuck: {
    id: "hpChuck",
    ar: "نوع التثبيت",
    en: "Chuck Type",
    type: "select",
    options: [{ value: "Push Button" }, { value: "Latch Type / Key" }],
  },
  perioInstrument: {
    id: "perioInstrument",
    ar: "نوع الأداة",
    en: "Instrument Type",
    type: "select",
    options: [
      { value: "Scaler" },
      { value: "Curette (Gracey)" },
      { value: "Universal Curette" },
      { value: "Sickle Scaler" },
      { value: "Periodontal Probe" },
      { value: "Periosteal Elevator" },
    ],
  },
  perioProbeType: {
    id: "perioProbeType",
    ar: "نوع المسبار",
    en: "Probe Type",
    type: "select",
    showWhen: { field: "perioInstrument", value: "Periodontal Probe" },
    options: [{ value: "UNC-15" }, { value: "CP-12" }, { value: "Nabers Probe" }],
  },
  perioGracey: {
    id: "perioGracey",
    ar: "رقم Gracey",
    en: "Gracey Numbers",
    type: "select",
    showWhen: { field: "perioInstrument", value: "Curette (Gracey)" },
    options: [
      { value: "Gracey 1/2" },
      { value: "Gracey 7/8" },
      { value: "Gracey 11/12" },
      { value: "Gracey 13/14" },
      { value: "Gracey 15/16" },
      { value: "Gracey 17/18" },
    ],
  },
  guardType: {
    id: "guardType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Night Guard" },
      { value: "Sports Guard" },
      { value: "Retention Splint" },
      { value: "Bleaching Tray" },
    ],
  },
  guardThickness: {
    id: "guardThickness",
    ar: "السمك",
    en: "Thickness",
    type: "select",
    options: [{ value: "1.0mm" }, { value: "1.5mm" }, { value: "2.0mm" }, { value: "3.0mm" }],
  },
  perioSurgicalType: {
    id: "perioSurgicalType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Coe-Pak Periodontal Dressing" },
      { value: "Surgical Sutures (PGA, Silk, Nylon, PTFE)" },
      { value: "Micro-Surgical Blades (#64, #69, #15C)" },
    ],
  },
  perioTissueProduct: {
    id: "perioTissueProduct",
    ar: "المنتج",
    en: "Product",
    type: "select",
    options: [
      { value: "Retraction Cord" },
      { value: "Hemostatic Agent (Aluminum Chloride / Ferric Sulfate)" },
    ],
  },
  perioCordSize: {
    id: "perioCordSize",
    ar: "مقاس الخيط (Cord)",
    en: "Cord Size",
    type: "select",
    options: [{ value: "#000" }, { value: "#00" }, { value: "#0" }, { value: "#1" }, { value: "#2" }],
  },
  perioCordType: {
    id: "perioCordType",
    ar: "نوع الخيط",
    en: "Cord Type",
    type: "select",
    options: [
      { value: "Knitted" },
      { value: "Braided" },
      { value: "Impregnated" },
      { value: "Non-Impregnated" },
    ],
  },
  graftType: {
    id: "graftType",
    ar: "نوع الطعم",
    en: "Graft Type",
    type: "select",
    options: [
      { value: "Bone Powder (Xenograft)" },
      { value: "Allograft" },
      { value: "Synthetic / Alloplast (HA/TCP)" },
      { value: "Autogenous Bone" },
    ],
  },
  graftParticle: {
    id: "graftParticle",
    ar: "حجم الحبيبات",
    en: "Particle Size",
    type: "select",
    options: [
      { value: "Small (0.25mm - 1.0mm)" },
      { value: "Large (1.0mm - 2.0mm)" },
    ],
  },
  graftWeight: {
    id: "graftWeight",
    ar: "الوزن / الحجم",
    en: "Weight / Volume",
    type: "select",
    options: [{ value: "0.25g" }, { value: "0.5g" }, { value: "1.0g" }, { value: "2.0g" }],
  },
  membraneType: {
    id: "membraneType",
    ar: "نوع الغشاء",
    en: "Membrane Type",
    type: "select",
    options: [
      { value: "Resorbable Collagen Membrane" },
      { value: "dPTFE Non-Resorbable Membrane" },
      { value: "Titanium-Reinforced dPTFE Membrane" },
      { value: "Pericardium Membrane" },
    ],
  },
  gbrType: {
    id: "gbrType",
    ar: "نوع التثبيت / المستلزمات",
    en: "Fixation / Supplies Type",
    type: "select",
    options: [
      { value: "Bone Fixation Tacks (3mm, 4mm, 5mm)" },
      { value: "Bone Fixation Screws (1.2mm, 1.4mm, 1.6mm)" },
      { value: "Titanium Mesh / Sheets" },
      { value: "PRF Collection Tubes (Red/Yellow)" },
      { value: "PRF Box & Membrane Shaper" },
      { value: "PRF Centrifuge Machine" },
      { value: "Hyaluronic Acid Perio Gel" },
      { value: "Emdogain / EMD" },
      { value: "rhPDGF-BB Growth Factors" },
    ],
  },
  plaqueType: {
    id: "plaqueType",
    ar: "نوع المنتج",
    en: "Product Type",
    type: "select",
    options: [
      { value: "CHX Mouthwash (0.12% / 0.2%)" },
      { value: "Disclosing Tablets" },
      { value: "Periodontal Gel" },
      { value: "Specialized Perio Toothpaste" },
    ],
  },
  orthoElasticType: {
    id: "orthoElasticType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Elastomeric Ties" },
      { value: "Intermaxillary Elastics" },
      { value: "Power Chain (Continuous / Short / Long)" },
    ],
  },
  orthoElasticSize: {
    id: "orthoElasticSize",
    ar: "القوة والحجم",
    en: "Force & Size",
    type: "select",
    options: [
      { value: "Light" },
      { value: "Medium" },
      { value: "Heavy" },
      { value: '1/8"' },
      { value: '3/16"' },
      { value: '1/4"' },
      { value: '5/16"' },
    ],
  },
  orthoExpansionType: {
    id: "orthoExpansionType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Hyrax Expander" },
      { value: "Quad Helix" },
      { value: "Expansion Screw" },
      { value: "Rapid Palatal Expander (RPE)" },
      { value: "Transpalatal Arch (TPA)" },
      { value: "Nance Appliance" },
    ],
  },
  iprType: {
    id: "iprType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "IPR Strips (Manual)" },
      { value: "IPR Discs (Contra-Angle Mounted)" },
    ],
  },
  iprThickness: {
    id: "iprThickness",
    ar: "السمك",
    en: "Thickness",
    type: "select",
    options: [{ value: "0.1mm" }, { value: "0.2mm" }, { value: "0.3mm" }, { value: "0.4mm" }, { value: "0.5mm" }],
  },
  orthoBracketMaterial: {
    id: "orthoBracketMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [
      { value: "Metal Brackets" },
      { value: "Ceramic Brackets" },
      { value: "Sapphire / Clear Brackets" },
      { value: "Self-Ligating Brackets" },
    ],
  },
  orthoBracketPrescription: {
    id: "orthoBracketPrescription",
    ar: "الوصفة (Prescription)",
    en: "Prescription",
    type: "select",
    options: [
      { value: "MBT" },
      { value: "Roth" },
      { value: "Edgewise" },
      { value: "Damon System" },
    ],
  },
  orthoBracketSlot: {
    id: "orthoBracketSlot",
    ar: "حجم الفتحة (Slot)",
    en: "Slot Size",
    type: "select",
    options: [{ value: '0.018"' }, { value: '0.022"' }],
  },
  orthoWireMaterial: {
    id: "orthoWireMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [{ value: "NiTi" }, { value: "Stainless Steel" }, { value: "TMA" }, { value: "Thermal NiTi" }],
  },
  orthoWireShape: {
    id: "orthoWireShape",
    ar: "المقطع",
    en: "Shape",
    type: "select",
    options: [{ value: "Round" }, { value: "Rectangular" }, { value: "Square" }],
  },
  orthoWireArchform: {
    id: "orthoWireArchform",
    ar: "شكل القوس",
    en: "Archform",
    type: "select",
    options: [{ value: "Natural" }, { value: "Oval" }, { value: "Square" }],
  },
  orthoWireSize: {
    id: "orthoWireSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [
      { value: "0.012" },
      { value: "0.014" },
      { value: "0.016" },
      { value: "0.018" },
      { value: "0.020" },
      { value: "0.016x0.016" },
      { value: "0.016x0.022" },
      { value: "0.017x0.022" },
      { value: "0.017x0.025" },
      { value: "0.018x0.025" },
      { value: "0.019x0.025" },
      { value: "0.021x0.025" },
    ],
  },
  orthoSupplyProduct: {
    id: "orthoSupplyProduct",
    ar: "المنتج",
    en: "Product",
    type: "select",
    options: [
      { value: "Ortho Adhesive (Light Cure)" },
      { value: "Molar Tubes" },
      { value: "Bondable Buttons" },
      { value: "Orthodontic Bands" },
      { value: "TAD Mini-Implant" },
      { value: "TAD Driver" },
      { value: "Hard Wire Cutter / Distal End Cutter" },
      { value: "Mathieu Plier" },
      { value: "Weingart / How Plier" },
      { value: "Bracket Remover Plier" },
      { value: "Bird Beak Plier" },
    ],
  },
  tadDiameter: {
    id: "tadDiameter",
    ar: "قطر TAD",
    en: "TAD Diameter",
    type: "select",
    showWhen: { field: "orthoSupplyProduct", value: "TAD Mini-Implant" },
    options: [{ value: "1.4mm" }, { value: "1.6mm" }, { value: "2.0mm" }],
  },
  tadLength: {
    id: "tadLength",
    ar: "طول TAD",
    en: "TAD Length",
    type: "select",
    showWhen: { field: "orthoSupplyProduct", value: "TAD Mini-Implant" },
    options: [{ value: "6mm" }, { value: "8mm" }, { value: "10mm" }, { value: "12mm" }],
  },
  pedSealant: {
    id: "pedSealant",
    ar: "نوع المادة",
    en: "Material Type",
    type: "select",
    options: [
      { value: "Pit & Fissure Sealant (Resin / Glass Ionomer)" },
      { value: "Fluoride Varnish (5% NaF)" },
      { value: "Fluoride Gel / Foam" },
      { value: "Silver Diamine Fluoride (SDF 38%)" },
    ],
  },
  pedSealantAccessories: {
    id: "pedSealantAccessories",
    ar: "الإكسسوارات",
    en: "Accessories",
    type: "select",
    options: [
      { value: "Fluoride Trays (Small / Medium / Large)" },
      { value: "None" },
    ],
  },
  pedSpaceType: {
    id: "pedSpaceType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Band & Loop" },
      { value: "Crown & Loop" },
      { value: "Lingual Arch" },
      { value: "Distal Shoe Space Maintainer" },
      { value: "Transpalatal Arch (TPA)" },
    ],
  },
  pedSpaceSize: {
    id: "pedSpaceSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [{ value: "Assorted Sizes #1-#6" }],
  },
  pedCrownMaterial: {
    id: "pedCrownMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [
      { value: "Stainless Steel Crowns (SSC)" },
      { value: "Zirconia Pediatric Crowns" },
      { value: "Strip Crowns (Celluloid)" },
    ],
  },
  pedCrownTooth: {
    id: "pedCrownTooth",
    ar: "نوع السن",
    en: "Tooth Type",
    type: "select",
    options: [
      { value: "Primary First Molar (D)" },
      { value: "Primary Second Molar (E)" },
      { value: "Anterior" },
    ],
  },
  pedCrownQuadrant: {
    id: "pedCrownQuadrant",
    ar: "الربع",
    en: "Quadrant",
    type: "select",
    options: [
      { value: "Upper Left" },
      { value: "Upper Right" },
      { value: "Lower Left" },
      { value: "Lower Right" },
    ],
  },
  pedCrownSize: {
    id: "pedCrownSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [
      { value: "Size 1" },
      { value: "Size 2" },
      { value: "Size 3" },
      { value: "Size 4" },
      { value: "Size 5" },
      { value: "Size 6" },
    ],
  },
  pedEndoMaterials: {
    id: "pedEndoMaterials",
    ar: "المواد",
    en: "Materials",
    type: "select",
    options: [
      { value: "Formocresol" },
      { value: "Ferric Sulfate (15.5% / 20%)" },
      { value: "MTA (Mineral Trioxide Aggregate)" },
      { value: "Biodentine" },
      { value: "Pediatric Ca(OH)2" },
      { value: "ZOE Paste" },
      { value: "Vitapex / Metapex (Iodoform Paste)" },
    ],
  },
  pedAnesthetic: {
    id: "pedAnesthetic",
    ar: "التخدير الموضعي",
    en: "Topical Anesthetic",
    type: "select",
    options: [
      { value: "Benzocaine 20% Topical Gel (Flavored)" },
      { value: "Lidocaine 5% Ointment" },
      { value: "None" },
    ],
  },
  pedMatrices: {
    id: "pedMatrices",
    ar: "المصفوفات",
    en: "Matrices",
    type: "select",
    options: [
      { value: "Pediatric Sectional Matrix System" },
      { value: "AutoMatrix for Kids" },
      { value: "Brass T-Bands" },
      { value: "None" },
    ],
  },
  scrubSize: {
    id: "scrubSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [
      { value: "XS" },
      { value: "S" },
      { value: "M" },
      { value: "L" },
      { value: "XL" },
      { value: "XXL" },
      { value: "XXXL" },
    ],
  },
  scrubGender: {
    id: "scrubGender",
    ar: "الفئة",
    en: "Gender",
    type: "select",
    options: [{ value: "Unisex" }, { value: "Men" }, { value: "Women" }],
  },
  scrubColor: {
    id: "scrubColor",
    ar: "اللون",
    en: "Color",
    type: "select",
    options: [
      { value: "Navy Blue" },
      { value: "Royal Blue" },
      { value: "Black" },
      { value: "Green" },
      { value: "Burgundy" },
      { value: "Grey" },
      { value: "White" },
    ],
  },
  scrubFabric: {
    id: "scrubFabric",
    ar: "القماش",
    en: "Fabric",
    type: "select",
    options: [{ value: "Cotton" }, { value: "Polyester Blend" }, { value: "Stretch" }],
  },
  scrubNeckline: {
    id: "scrubNeckline",
    ar: "نوع الرقبة",
    en: "Neckline Style",
    type: "select",
    options: [{ value: "V-Neck" }, { value: "Crew Neck" }, { value: "Mock Wrap" }],
  },
  scrubPockets: {
    id: "scrubPockets",
    ar: "الجيوب",
    en: "Pocket Configuration",
    type: "select",
    options: [
      { value: "1 Pocket (Chest)" },
      { value: "2 Pockets" },
      { value: "Multi-Pocket Cargo" },
    ],
  },
  scrubWaist: {
    id: "scrubWaist",
    ar: "نوع خصر البنطلون",
    en: "Pants Waist Type",
    type: "select",
    options: [{ value: "Drawstring" }, { value: "Elastic" }, { value: "Jogger Style" }],
  },
  labcoatSize: {
    id: "labcoatSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [{ value: "XS" }, { value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }, { value: "XXL" }],
  },
  labcoatLength: {
    id: "labcoatLength",
    ar: "الطول",
    en: "Length",
    type: "select",
    options: [
      { value: "Short (Waist)" },
      { value: "Medium (Knee)" },
      { value: "Long" },
    ],
  },
  labcoatSleeve: {
    id: "labcoatSleeve",
    ar: "الأكمام",
    en: "Sleeve",
    type: "select",
    options: [{ value: "Long Sleeve" }, { value: "Short Sleeve" }],
  },
  jacketSize: {
    id: "jacketSize",
    ar: "المقاس",
    en: "Size",
    type: "select",
    options: [{ value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }, { value: "XXL" }],
  },
  jacketClosure: {
    id: "jacketClosure",
    ar: "نوع الإغلاق",
    en: "Closure Type",
    type: "select",
    options: [{ value: "Buttons" }, { value: "Snaps" }, { value: "Zipper" }],
  },
  capShape: {
    id: "capShape",
    ar: "الشكل",
    en: "Shape Type",
    type: "select",
    options: [{ value: "Bouffant Cap" }, { value: "Tie-Back Cap" }, { value: "Elastic Cap" }],
  },
  capPattern: {
    id: "capPattern",
    ar: "النقشة / اللون",
    en: "Pattern / Color",
    type: "select",
    options: [{ value: "Solid Color" }, { value: "Patterned / Printed" }],
  },
  clogSize: {
    id: "clogSize",
    ar: "المقاس EU",
    en: "EU Size",
    type: "select",
    options: [
      { value: "36" },
      { value: "37" },
      { value: "38" },
      { value: "39" },
      { value: "40" },
      { value: "41" },
      { value: "42" },
      { value: "43" },
      { value: "44" },
      { value: "45" },
    ],
  },
  clogMaterial: {
    id: "clogMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [
      { value: "Autoclaveable Rubber" },
      { value: "Leather" },
      { value: "EVA Foam" },
    ],
  },
  clogSafety: {
    id: "clogSafety",
    ar: "ميزات السلامة",
    en: "Safety Features",
    type: "select",
    options: [{ value: "Anti-Slip" }, { value: "Anti-Static" }],
  },
  clogDesign: {
    id: "clogDesign",
    ar: "التصميم",
    en: "Design Style",
    type: "select",
    options: [
      { value: "Closed Heel" },
      { value: "Open Heel with Strap" },
      { value: "Vent Holes" },
    ],
  },
  clogArch: {
    id: "clogArch",
    ar: "دعم القوس",
    en: "Arch Support",
    type: "select",
    options: [{ value: "True" }, { value: "False" }],
  },
  apparelAccessory: {
    id: "apparelAccessory",
    ar: "نوع الإكسسوار",
    en: "Accessory Type",
    type: "select",
    options: [
      { value: "Name Badges / Pins" },
      { value: "Compression Socks" },
      { value: "Eyewear Straps" },
      { value: "Protective Safety Goggles" },
      { value: "Face Shields" },
      { value: "Retractable Badge Reels" },
      { value: "Lanyards" },
    ],
  },
  irrigatorType: {
    id: "irrigatorType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Cordless / Rechargeable" },
      { value: "Countertop Portable" },
    ],
  },
  irrigatorModes: {
    id: "irrigatorModes",
    ar: "الأوضاع والسرعات",
    en: "Modes & Speeds",
    type: "select",
    options: [{ value: "3 Modes" }, { value: "5 Modes" }, { value: "Variable Pressure" }],
  },
  irrigatorTank: {
    id: "irrigatorTank",
    ar: "سعة الخزان",
    en: "Tank Capacity",
    type: "select",
    options: [{ value: "150ml" }, { value: "200ml" }, { value: "300ml" }, { value: "600ml" }],
  },
  irrigatorNozzle: {
    id: "irrigatorNozzle",
    ar: "رؤوس النفث",
    en: "Nozzle Tips",
    type: "select",
    options: [
      { value: "Standard Jet Tip" },
      { value: "Orthodontic Tip" },
      { value: "Plaque Seeker Tip" },
      { value: "Periodontal Pocket Tip" },
    ],
  },
  flossType: {
    id: "flossType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Waxed" },
      { value: "Unwaxed" },
      { value: "PTFE Tape" },
      { value: "Floss Picks" },
      { value: "Super Floss" },
    ],
  },
  flossFlavor: {
    id: "flossFlavor",
    ar: "النكهة",
    en: "Flavor",
    type: "select",
    options: [{ value: "Mint" }, { value: "Unflavored" }],
  },
  flossLength: {
    id: "flossLength",
    ar: "الطول / التعبئة",
    en: "Length / Pack",
    type: "select",
    options: [{ value: "10m" }, { value: "30m" }, { value: "50m" }, { value: "100 pcs Pack" }],
  },
  flossAccessories: {
    id: "flossAccessories",
    ar: "الإكسسوارات",
    en: "Accessories",
    type: "select",
    options: [{ value: "Floss Threaders" }, { value: "None" }],
  },
  toothpasteNeed: {
    id: "toothpasteNeed",
    ar: "الهدف / الحاجة",
    en: "Target Need",
    type: "select",
    options: [
      { value: "Sensitivity Relief" },
      { value: "Whitening" },
      { value: "Anti-Cavity / Fluoride" },
      { value: "Gum Care" },
      { value: "Natural / Organic" },
      { value: "Enamel Repair / Remineralization" },
      { value: "Pediatric / Kids" },
    ],
  },
  toothpasteVolume: {
    id: "toothpasteVolume",
    ar: "الحجم",
    en: "Volume",
    type: "select",
    options: [{ value: "50ml" }, { value: "75ml" }, { value: "100ml" }, { value: "125ml" }],
  },
  brushType: {
    id: "brushType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Manual Toothbrush" },
      { value: "Electric / Sonic Toothbrush" },
      { value: "Replacement Brush Heads" },
      { value: "Interdental Brush" },
      { value: "Orthodontic V-Shape Brush" },
    ],
  },
  brushBristle: {
    id: "brushBristle",
    ar: "صلابة الشعيرات",
    en: "Bristle Hardness",
    type: "select",
    options: [{ value: "Extra Soft" }, { value: "Soft" }, { value: "Medium" }],
  },
  brushInterdental: {
    id: "brushInterdental",
    ar: "مقاس Interdental",
    en: "Interdental Sizes",
    type: "select",
    showWhen: { field: "brushType", value: "Interdental Brush" },
    options: [
      { value: "0.4mm (ISO 0)" },
      { value: "0.6mm (ISO 2)" },
      { value: "0.8mm (ISO 4)" },
      { value: "1.1mm (ISO 5)" },
    ],
  },
  mouthwashPurpose: {
    id: "mouthwashPurpose",
    ar: "الغرض",
    en: "Purpose",
    type: "select",
    options: [
      { value: "Antiseptic / Antibacterial" },
      { value: "Fluoride Protection" },
      { value: "Alcohol-Free" },
      { value: "Sensitive Teeth" },
      { value: "Chlorhexidine 0.12% / 0.2%" },
      { value: "Dry Mouth (Enzyme-based)" },
    ],
  },
  mouthwashVolume: {
    id: "mouthwashVolume",
    ar: "الحجم",
    en: "Volume",
    type: "select",
    options: [{ value: "250ml" }, { value: "500ml" }, { value: "1000ml" }],
  },
  dentureCareProducts: {
    id: "dentureCareProducts",
    ar: "المنتجات",
    en: "Products",
    type: "select",
    options: [
      { value: "Denture Adhesive Cream / Powder" },
      { value: "Denture Cleansing Tablets" },
      { value: "Denture Brush" },
    ],
  },
  dispenserOperation: {
    id: "dispenserOperation",
    ar: "طريقة التشغيل",
    en: "Operation Method",
    type: "select",
    options: [
      { value: "Touchless Sensor (Automatic)" },
      { value: "Manual Pump" },
      { value: "Foot Pedal" },
    ],
  },
  dispenserMounting: {
    id: "dispenserMounting",
    ar: "طريقة التركيب",
    en: "Mounting",
    type: "select",
    options: [
      { value: "Wall-Mounted" },
      { value: "Countertop Stand" },
      { value: "Floor Stand" },
    ],
  },
  dispenserCapacity: {
    id: "dispenserCapacity",
    ar: "السعة",
    en: "Capacity",
    type: "select",
    options: [{ value: "500ml" }, { value: "1000ml" }, { value: "1200ml" }],
  },
  deviceSterTechnology: {
    id: "deviceSterTechnology",
    ar: "التقنية",
    en: "Technology",
    type: "select",
    options: [
      { value: "UV Light Sanitizer" },
      { value: "Glass Bead Sterilizer" },
      { value: "Dry Heat Sterilizer" },
    ],
  },
  pouchType: {
    id: "pouchType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Self-Sealing Pouches" },
      { value: "Sterilization Rolls / Reels" },
    ],
  },
  sterPouchDimensions: {
    id: "sterPouchDimensions",
    ar: "الأبعاد",
    en: "Dimensions",
    type: "select",
    options: [
      { value: "57mm x 130mm" },
      { value: "90mm x 230mm" },
      { value: "135mm x 280mm" },
      { value: "200mm x 300mm" },
    ],
  },
  sanitizerForm: {
    id: "sanitizerForm",
    ar: "الشكل",
    en: "Form",
    type: "select",
    options: [{ value: "Gel" }, { value: "Liquid Rub" }, { value: "Foam" }],
  },
  sanitizerIngredient: {
    id: "sanitizerIngredient",
    ar: "المادة الفعالة",
    en: "Active Ingredient",
    type: "select",
    options: [
      { value: "Alcohol-Based (70%+)" },
      { value: "Alcohol-Free / Benzalkonium" },
    ],
  },
  sanitizerVolume: {
    id: "sanitizerVolume",
    ar: "الحجم",
    en: "Volume",
    type: "select",
    options: [{ value: "100ml" }, { value: "500ml Pump" }, { value: "1L" }, { value: "5L Canister" }],
  },
  surfaceForm: {
    id: "surfaceForm",
    ar: "الشكل",
    en: "Form",
    type: "select",
    options: [
      { value: "Disinfectant Wipes" },
      { value: "Spray" },
      { value: "Liquid Concentrate" },
    ],
  },
  surfaceDisinfectionTime: {
    id: "surfaceDisinfectionTime",
    ar: "زمن التطهير",
    en: "Disinfection Time",
    type: "select",
    options: [{ value: "Rapid (1-3 mins)" }, { value: "Standard (5-10 mins)" }],
  },
  surfacePackaging: {
    id: "surfacePackaging",
    ar: "حجم العبوة",
    en: "Packaging Volume",
    type: "select",
    options: [
      { value: "Tub 100 Wipes" },
      { value: "750ml Spray" },
      { value: "5L Canister" },
    ],
  },
  ppeGloveMaterial: {
    id: "ppeGloveMaterial",
    ar: "مادة القفازات",
    en: "Gloves Material Type",
    type: "select",
    options: [
      { value: "Latex" },
      { value: "Nitrile (Powder-Free)" },
      { value: "Vinyl" },
      { value: "None" },
    ],
  },
  ppeGloveSize: {
    id: "ppeGloveSize",
    ar: "مقاس القفازات",
    en: "Gloves Size",
    type: "select",
    options: [{ value: "XS" }, { value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }, { value: "None" }],
  },
  ppeMaskType: {
    id: "ppeMaskType",
    ar: "نوع الكمامات",
    en: "Masks Type",
    type: "select",
    options: [
      { value: "Ear-loop Surgical Mask" },
      { value: "Tie-on Mask" },
      { value: "N95 / FFP2 Respirator" },
      { value: "None" },
    ],
  },
  ppeEyeProtection: {
    id: "ppeEyeProtection",
    ar: "حماية العين / الوجه",
    en: "Eye / Face Protection",
    type: "select",
    options: [
      { value: "Face Shield" },
      { value: "Protective Safety Goggles" },
      { value: "None" },
    ],
  },
  barrierItems: {
    id: "barrierItems",
    ar: "المواد",
    en: "Items",
    type: "select",
    options: [
      { value: "Dental Chair Covers" },
      { value: "Light Handle Sleeves" },
      { value: "X-Ray Sensor Sleeves" },
      { value: "Syringe Sleeves" },
      { value: "Barrier Film Roll / Tape" },
    ],
  },
  indicatorTypes: {
    id: "indicatorTypes",
    ar: "المؤشرات",
    en: "Indicators",
    type: "select",
    options: [
      { value: "Chemical Indicator Strips (Class 4/5/6)" },
      { value: "Biological Indicators (Spore Tests)" },
      { value: "Bowie-Dick Test Pack" },
      { value: "None" },
    ],
  },
  enzymaticCleaner: {
    id: "enzymaticCleaner",
    ar: "الإنزيمية والتعقيم البارد",
    en: "Enzymatic & Cold Sterilization",
    type: "select",
    options: [
      { value: "Enzymatic Cleaning Solution" },
      { value: "Cold Sterilization / Glutaraldehyde Liquid" },
      { value: "None" },
    ],
  },
  diamondShank: {
    id: "diamondShank",
    ar: "نوع العمود",
    en: "Shank Type",
    type: "select",
    options: [
      { value: "Friction Grip (FG High Speed)" },
      { value: "Right Angle (RA / Latch Low Speed)" },
      { value: "Handpiece (HP Long)" },
    ],
  },
  diamondGrit: {
    id: "diamondGrit",
    ar: "الخشونة",
    en: "Grit",
    type: "select",
    options: [
      { value: "Super Coarse (Black)", color: "#111827" },
      { value: "Coarse (Green)", color: "#22c55e" },
      { value: "Medium (Blue)", color: "#3b82f6" },
      { value: "Fine (Red)", color: "#ef4444" },
      { value: "Extra Fine (Yellow)", color: "#eab308" },
    ],
  },
  diamondShape: {
    id: "diamondShape",
    ar: "شكل السنابلة",
    en: "Shape Code",
    type: "select",
    options: [
      { value: "Round" },
      { value: "Inverted Cone" },
      { value: "Fissure Flat End" },
      { value: "Fissure Round End" },
      { value: "Tapered Flat End" },
      { value: "Tapered Round End" },
      { value: "Pear" },
      { value: "Football / Egg" },
      { value: "Flame" },
      { value: "Wheel" },
      { value: "Needle / Interproximal" },
      { value: "Depth Marker / Occlusion Reduction" },
    ],
  },
  carbideShank: {
    id: "carbideShank",
    ar: "نوع العمود",
    en: "Shank Type",
    type: "select",
    options: [{ value: "FG High Speed" }, { value: "RA Low Speed" }],
  },
  carbideSize: {
    id: "carbideSize",
    ar: "الرقم / المقاس",
    en: "Number / Size",
    type: "select",
    options: [
      { value: "#1/2" },
      { value: "#2" },
      { value: "#4" },
      { value: "#6" },
      { value: "#330" },
      { value: "#245" },
      { value: "#557" },
      { value: "#701" },
      { value: "#7404 (12-Flute Finishing)" },
      { value: "#7901 (12-Flute Finishing)" },
      { value: "#7802 (30-Flute High-Shine)" },
      { value: "Transmetal (Metal & Zirconia Cutting)" },
    ],
  },
  carbideFunction: {
    id: "carbideFunction",
    ar: "الوظيفة",
    en: "Function",
    type: "select",
    options: [
      { value: "Operative / Cavity Prep" },
      { value: "Crown Cutting" },
      { value: "Metal Cutting" },
      { value: "Composite Finishing / Polishing" },
    ],
  },
  steelApplication: {
    id: "steelApplication",
    ar: "الاستخدام",
    en: "Application",
    type: "select",
    options: [
      { value: "Surgical / Bone Cutting" },
      { value: "Lab Preparation" },
      { value: "Low Speed Caries Removal" },
    ],
  },
  abrasiveMaterial: {
    id: "abrasiveMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [
      { value: "Rubber / Silicone Polishers" },
      { value: "Composite Fine Diamond" },
      { value: "Felt / Brush" },
      { value: "Rubber Cups & Cones" },
    ],
  },
  abrasiveStage: {
    id: "abrasiveStage",
    ar: "المرحلة",
    en: "Stage",
    type: "select",
    options: [
      { value: "Pre-polishing (Coarse)" },
      { value: "High Shine Finishing (Fine)" },
    ],
  },
  abrasiveAccessories: {
    id: "abrasiveAccessories",
    ar: "الإكسسوارات",
    en: "Accessories",
    type: "select",
    options: [
      { value: "Composite Polishing Discs (Coarse to Extra Fine)" },
      { value: "Interproximal Polishing Strips" },
      { value: "Diamond Polishing Paste" },
      { value: "None" },
    ],
  },
  surgBurLength: {
    id: "surgBurLength",
    ar: "الطول",
    en: "Length",
    type: "select",
    options: [
      { value: "Standard Length" },
      { value: "Extra Long (Zekrya / Lindemann)" },
    ],
  },
  surgBurCutting: {
    id: "surgBurCutting",
    ar: "نوع القطع",
    en: "Cutting Type",
    type: "select",
    options: [
      { value: "Bone Cutter" },
      { value: "Impacted Tooth Sectioning" },
      { value: "Lindemann Bur (Bone Cutting)" },
      { value: "Zekrya Bur (Safety-Tip)" },
      { value: "Tapered Tissue Trimmer (Soft Tissue)" },
    ],
  },
  burKitUse: {
    id: "burKitUse",
    ar: "استخدام الطقم",
    en: "Kit Use",
    type: "select",
    options: [
      { value: "Crown Prep Kit" },
      { value: "Composite Finishing Kit" },
      { value: "Endo Access Kit" },
      { value: "Veneer Prep Kit" },
      { value: "Pediatric Bur Kit" },
      { value: "None" },
    ],
  },
  burKitHolder: {
    id: "burKitHolder",
    ar: "الحوامل",
    en: "Holders",
    type: "select",
    options: [
      { value: "Autoclavable Aluminium Bur Block" },
      { value: "Stainless Steel Bur Holder" },
      { value: "None" },
    ],
  },
  dentTeethMaterial: {
    id: "dentTeethMaterial",
    ar: "المادة",
    en: "Material",
    type: "select",
    options: [{ value: "Acrylic Resin" }, { value: "Composite" }, { value: "Porcelain" }],
  },
  dentTeethShade: {
    id: "dentTeethShade",
    ar: "اللون",
    en: "Shade",
    type: "select",
    options: [
      { value: "A1" },
      { value: "A2" },
      { value: "A3" },
      { value: "A3.5" },
      { value: "B1" },
      { value: "B2" },
      { value: "Bleach" },
    ],
  },
  dentTeethArch: {
    id: "dentTeethArch",
    ar: "القوس والنوع",
    en: "Arch & Type",
    type: "select",
    options: [
      { value: "Upper Anterior" },
      { value: "Lower Anterior" },
      { value: "Upper Posterior" },
      { value: "Lower Posterior" },
      { value: "Full Set (28 Teeth)" },
    ],
  },
  dentTeethMould: {
    id: "dentTeethMould",
    ar: "المقاس (Mould)",
    en: "Mould Size",
    type: "select",
    options: [{ value: "Small" }, { value: "Medium" }, { value: "Large" }],
  },
  cadBlockMaterial: {
    id: "cadBlockMaterial",
    ar: "مادة الكتلة / القرص",
    en: "Block / Disc Material",
    type: "select",
    options: [
      { value: "Zirconia Block/Disc" },
      { value: "PMMA Disc" },
      { value: "Wax Disc" },
      { value: "E.max / Lithium Disilicate" },
      { value: "Hybrid Ceramic" },
      { value: "PEEK Disc" },
      { value: "Cobalt-Chromium Disc (Co-Cr)" },
      { value: "Titanium Disc (Grade 5)" },
    ],
  },
  cadDimensions: {
    id: "cadDimensions",
    ar: "الأبعاد",
    en: "Dimensions",
    type: "select",
    options: [
      { value: "98mm Disc" },
      { value: "95mm Disc (Zirkonzahn)" },
      { value: "Block Size C14/B40" },
    ],
  },
  cadThickness: {
    id: "cadThickness",
    ar: "السمك (ملم)",
    en: "Thickness (mm)",
    type: "select",
    options: [
      { value: "10" },
      { value: "12" },
      { value: "14" },
      { value: "16" },
      { value: "18" },
      { value: "20" },
      { value: "22" },
      { value: "25" },
      { value: "30" },
    ],
  },
  cadTranslucency: {
    id: "cadTranslucency",
    ar: "الشفافية",
    en: "Translucency",
    type: "select",
    options: [
      { value: "HT (High Translucency)" },
      { value: "ST (Super Translucency)" },
      { value: "UT (Ultra Translucency)" },
      { value: "Multilayer (3D / 4D)" },
    ],
  },
  ceramicType: {
    id: "ceramicType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Porcelain Powder" },
      { value: "Stain & Glaze Paste" },
      { value: "Opaque Powder/Paste" },
      { value: "Mixing Liquid" },
    ],
  },
  ceramicShade: {
    id: "ceramicShade",
    ar: "اللون",
    en: "Shade",
    type: "select",
    options: [
      { value: "VITA Classic Shades (A1-D4)" },
      { value: "VITA 3D-Master" },
    ],
  },
  ceramicSystem: {
    id: "ceramicSystem",
    ar: "توافق النظام",
    en: "System Compatibility",
    type: "select",
    options: [
      { value: "Metal-Ceramic (PFM)" },
      { value: "Zirconia Layering" },
      { value: "All-Ceramic" },
    ],
  },
  gypsumType: {
    id: "gypsumType",
    ar: "نوع الجبس",
    en: "Gypsum Type",
    type: "select",
    options: [
      { value: "Type II (Plaster of Paris)" },
      { value: "Type III (Dental Stone)" },
      { value: "Type IV (Die Stone / High Strength)" },
      { value: "Type V (High Strength, High Expansion)" },
      { value: "None" },
    ],
  },
  labSilicone: {
    id: "labSilicone",
    ar: "سيليكون المختبر",
    en: "Lab Silicone",
    type: "select",
    options: [
      { value: "Laboratory Putty" },
      { value: "Duplicating Silicone (Agar / Addition)" },
      { value: "None" },
    ],
  },
  acrylicCuring: {
    id: "acrylicCuring",
    ar: "نوع المعالجة",
    en: "Curing Type",
    type: "select",
    options: [
      { value: "Heat-Cured Acrylic" },
      { value: "Self-Cured / Cold-Cured Acrylic" },
      { value: "Light-Cured Custom Tray" },
      { value: "None" },
    ],
  },
  labWaxes: {
    id: "labWaxes",
    ar: "الشموع",
    en: "Waxes",
    type: "select",
    options: [
      { value: "Baseplate Wax" },
      { value: "Inlay Casting Wax" },
      { value: "Utility / Sticky Wax" },
      { value: "Milling Wax" },
      { value: "None" },
    ],
  },
  investmentMaterial: {
    id: "investmentMaterial",
    ar: "مواد الاستثمار (Investment)",
    en: "Investment Materials",
    type: "select",
    options: [
      { value: "Phosphate-Bonded Investment" },
      { value: "Gypsum-Bonded Investment" },
      { value: "None" },
    ],
  },
  lubricantType: {
    id: "lubricantType",
    ar: "النوع",
    en: "Type",
    type: "select",
    options: [
      { value: "Lubricant Spray Can" },
      { value: "Dropper Bottle Oil" },
      { value: "Cleaning & Flushing Solution" },
      { value: "Automatic Lubrication Station Cleaner" },
    ],
  },
  lubricantVolume: {
    id: "lubricantVolume",
    ar: "الحجم",
    en: "Volume",
    type: "select",
    options: [{ value: "250ml" }, { value: "300ml" }, { value: "500ml" }, { value: "1000ml" }],
  },
  lubricantCompatibility: {
    id: "lubricantCompatibility",
    ar: "التوافق",
    en: "Compatibility",
    type: "select",
    options: [
      { value: "High Speed Turbines" },
      { value: "Low Speed Angles" },
      { value: "Universal" },
    ],
  },
  sparePartType: {
    id: "sparePartType",
    ar: "نوع القطعة",
    en: "Part Type",
    type: "select",
    options: [
      { value: "Turbine Cartridge / Rotor" },
      { value: "O-Rings & Seals" },
      { value: "Dental Chair Valves & Tubing" },
      { value: "LED Bulbs / Couplings" },
      { value: "Water/Air Filters" },
      { value: "Suction Tubing" },
      { value: "Autoclave Gaskets & Filters" },
      { value: "Compressor Oil & Air Filters" },
    ],
  },
  spareDeviceCompat: {
    id: "spareDeviceCompat",
    ar: "توافق الجهاز",
    en: "Device Compatibility",
    type: "select",
    options: [
      { value: "Handpiece Part" },
      { value: "Dental Chair Unit" },
      { value: "Autoclave Part" },
      { value: "Compressor / Suction Part" },
    ],
  },
  trainModelType: {
    id: "trainModelType",
    ar: "نوع النموذج",
    en: "Model Type",
    type: "select",
    options: [
      { value: "Typodont Model (With Removable Teeth)" },
      { value: "Soft Gum Study Model" },
      { value: "Caries / Pathology Model" },
      { value: "Endodontic Training Model / Transparent Teeth" },
      { value: "Implant Demo Model" },
      { value: "Pediatric Typodont Model" },
      { value: "Orthodontic Typodont Model" },
    ],
  },
  trainAccessories: {
    id: "trainAccessories",
    ar: "الإكسسوارات والاستبدال",
    en: "Accessories & Replacement",
    type: "select",
    options: [
      { value: "Replacement Typodont Teeth (100 pcs pack)" },
      { value: "Screws & Articulator Fixings" },
      { value: "Artificial Calculus / Cavity Preparation Teeth" },
      { value: "Training Resin Blocks" },
      { value: "None" },
    ],
  },
  trainStandard: {
    id: "trainStandard",
    ar: "النظام القياسي",
    en: "System Standard",
    type: "select",
    options: [
      { value: "Kilgore / Nissan Type" },
      { value: "Frasaco Type" },
      { value: "Universal" },
    ],
  },
};

export const SPEC_GROUPS: SpecGroup[] = [
  {
    id: "restorative",
    ar: "الحشوات والترميم التجميلي",
    en: "Restorative & Esthetics",
    match: [
      "Composites",
      "Composite Modeling Liquid",
      "Opaquers & Tints",
      "Finishing & Polishing",
      "Amalgams",
      "Acrylics",
      "Denture teeth",
      "Ceramic Material",
      "Crown & Bridge",
      "كومبوزيت",
      "أسنان أكريليك",
    ],
    fields: ["shadeSystem", "shades"],
  },
  {
    id: "endodontics",
    ar: "علاج الجذور",
    en: "Endodontics",
    match: [
      "Access Cavity Preparation",
      "Canal Preparation & Cleaning",
      "Obturation",
      "Post & Core",
      "RC irrigants & Medicament",
      "Root Repair",
      "Re-treatment",
      "Endodontic Accessories",
      "Endo instruments",
      "مبارد عصب",
      "حشو قنوات",
    ],
    fields: ["isoSize", "taper", "workingLength"],
  },
  {
    id: "orthodontics",
    ar: "تقويم الأسنان",
    en: "Orthodontics",
    matchBranch: ["orthopedic"],
    match: ["تقويم الأسنان", "Orthodontics"],
    fields: [
      "wireSize",
      "wireMaterial",
      "bracketSlot",
      "bracketTechnique",
      "bracketMaterial",
      "elasticPull",
      "elasticDiameter",
    ],
  },
  {
    id: "implantology",
    ar: "زراعة الأسنان",
    en: "Implantology",
    match: ["Implant Motors", "زراعة الأسنان", "Implantology"],
    fields: ["implantDiameter", "implantLength", "platformConnection"],
  },
  {
    id: "surgical",
    ar: "الجراحة والخياطة",
    en: "Surgical & Sutures",
    match: [
      "Sutures",
      "Surgical instruments",
      "Hemostatic / Antiseptic",
      "Surgical products",
      "Surgical dressings",
      "Bone Grafts",
      "خيوط جراحية",
      "عظام ترقيع",
    ],
    fields: ["sutureSize", "sutureMaterial", "bladeSize", "boneGraftWeight"],
  },
  {
    id: "burs",
    ar: "السنابل والتلميع",
    en: "Burs & Polishing",
    matchBranch: ["burs"],
    match: ["Polishers", "Burs", "سنابل حفر"],
    fields: ["gritBand", "shankType"],
  },
  {
    id: "liquids",
    ar: "المواد السائلة والطبعة",
    en: "Liquids & Impression",
    match: [
      "Bonding Agents & Etchants",
      "Impression Materials",
      "RC irrigants & Medicament",
      "Mouthwashes",
      "Glycerin",
      "Adhesives",
      "Model Creation",
      "Dental Waxes",
      "سوائل ومحاليل",
      "Bonding",
      "Etchant",
      "Alginate",
    ],
    fields: ["volume", "deliveryForm"],
  },
  {
    id: "ppe",
    ar: "المستهلكات الوقائية",
    en: "Disposables & PPE",
    match: [
      "Gloves",
      "Face masks & Caps",
      "General Disposables",
      "Protective gear",
      "Sterilization Pouches",
      "Head Caps",
      "Medical Scrubs",
      "Lab Coats",
      "Scrub Jackets",
      "Clogs (Slippers)",
      "قفازات",
      "كمامات",
      "أكياس تعقيم",
    ],
    fields: ["gloveSize", "gloveMaterial", "pouchDimensions"],
  },
  {
    id: "equipment",
    ar: "الأجهزة والقبضات",
    en: "Equipment & Handpieces",
    matchBranch: ["equipment"],
    match: ["Handpieces & Turbines", "أجهزة ومعدات"],
    fields: ["connectionType", "lightFeature", "headSize"],
  },
];

export function activeSpecGroups(
  branch: string,
  subCategory: string,
  subCategoryAr: string,
): SpecGroup[] {
  const values = [subCategory, subCategoryAr].filter(Boolean);
  return SPEC_GROUPS.filter((g) => {
    if (g.matchBranch?.includes(branch)) return true;
    return values.some((v) => g.match?.includes(v));
  });
}

const STRICT_SUBCATEGORY_SPECS: Record<string, SpecFieldId[]> = {
  Gloves: ["gloveSize", "gloveMaterial", "glovePowder"],
  "Face masks & Caps": ["maskType", "maskColor", "maskFastening"],
  "General Disposables": ["consumableType", "consumableSize"],
  "Protective gear": ["protectionType"],
  "General accessories": ["accessorySpec"],
  Composites: ["shade", "fillingType"],
  "Glass Ionomer": ["giUse", "giShade"],
  "Temporary Filling Material": ["tempColor", "tempConsistency"],
  "Composite Modeling Liquid": ["modelingVolume"],
  "Pulp Protection": ["pulpMaterial", "pulpForm"],
  "Cement base": ["cementType"],
  "Opaquers & Tints": ["opaquerColor"],
  Amalgams: ["amalgamSpills", "amalgamPack"],
  "Bonding Agents & Etchants": ["bondingType", "bondingVolume"],
  Glycerin: ["glycerinVolume"],
  "Finishing & Polishing": ["polishForm", "polishGrit"],
  "Restorative instruments": ["instrumentType", "instrumentSize"],
  "Caries Detectors/Control": ["cariesColor"],
  "Access Cavity Preparation": ["endoAccessInstrument", "endoAccessSize"],
  "Canal Preparation & Cleaning": ["fileIso", "fileTaper", "fileLength", "fileType"],
  "Obturation": ["obturationType", "obturationIso", "obturationTaper"],
  "Post & Core": ["postMaterial", "postSize"],
  "RC irrigants & Medicament": ["irrigantType"],
  "Root Repair": ["repairMaterial"],
  "Re-treatment": ["repairMaterial"],
  "Endodontic Accessories": ["endoAccessoryType"],
  "Endo instruments": ["endoAccessoryType"],
  "Prostho Instruments": ["prosthoToolType", "prosthoCordSize"],
  "Impression Materials": ["impressionType", "impressionVolume"],
  "Crown & Bridge": ["crownType", "crownShade"],
  "Model Creation": ["labMaterialType", "labMaterialWeight"],
  "Acrylics": ["labMaterialType", "labMaterialWeight"],
  "Denture Processing": ["labMaterialType", "labMaterialWeight"],
  "Denture relines": ["labMaterialType", "labMaterialWeight"],
  "Dental Waxes": ["waxType", "waxForm", "waxHardness"],
  "Surgical instruments": ["surgInstrumentType", "surgRegion"],
  "Sutures": ["surgSutureSize", "surgSutureMaterial", "needleShape", "needleCurvature"],
  "Hemostatic / Antiseptic": ["surgMaterialType", "surgPackaging"],
  "Portable Units": ["portUnitType", "portPowerSource"],
  "Intraoral Scanners": ["scanTechnology", "scanCompatibility"],
  "Implant Motors": ["motorTorque", "motorGear", "motorIllumination", "motorPump"],
  "General equipments": ["eqpType"],
  "Loupes & Microscopes": [
    "loupeType",
    "loupeMagnification",
    "loupeHeadlight",
    "loupeWorkingDistance",
  ],
  "Sterilization Equipment": ["sterType", "sterClass", "sterCapacity", "sterDataLogging"],
  "Imaging Systems": ["imgType", "imgSensorSize"],
  "Handpieces & Turbines": [
    "hpSpeed",
    "hpConnection",
    "hpHeadSize",
    "hpIllumination",
    "hpChuck",
  ],
  "Perio instruments": ["perioInstrument", "perioProbeType", "perioGracey"],
  "Splints & Mouth Guards": ["guardType", "guardThickness"],
  "Surgical products": ["perioSurgicalType"],
  "Surgical dressings": ["perioSurgicalType"],
  "Tissue Management": ["perioTissueProduct", "perioCordSize", "perioCordType"],
  "Bone Grafts": ["graftType", "graftParticle", "graftWeight", "membraneType"],
  "GBR Fixation & Biologics": ["gbrType"],
  "Plaque Control": ["plaqueType"],
  "Ligatures & Elastics": ["orthoElasticType", "orthoElasticSize"],
  "Expansion & Appliances": ["orthoExpansionType"],
  "Interproximal Reduction — IPR": ["iprType", "iprThickness"],
  "Bracket Systems": [
    "orthoBracketMaterial",
    "orthoBracketPrescription",
    "orthoBracketSlot",
  ],
  "Wire Products": ["orthoWireMaterial", "orthoWireShape", "orthoWireArchform", "orthoWireSize"],
  "Attachments": ["orthoSupplyProduct", "tadDiameter", "tadLength"],
  "Orthodontics Anchorage": ["orthoSupplyProduct", "tadDiameter", "tadLength"],
  "Ortho Accessories": ["orthoSupplyProduct", "tadDiameter", "tadLength"],
  "Ortho instruments": ["orthoSupplyProduct", "tadDiameter", "tadLength"],
  "Preventive": ["pedSealant", "pedSealantAccessories"],
  "Space Maintainer": ["pedSpaceType", "pedSpaceSize"],
  "Pediatric Crowns": ["pedCrownMaterial", "pedCrownTooth", "pedCrownQuadrant", "pedCrownSize"],
  "Pulp Therapy": ["pedEndoMaterials"],
  "Pediatric Anesthesia & Matrices": ["pedAnesthetic", "pedMatrices"],
  "Medical Scrubs": [
    "scrubSize",
    "scrubGender",
    "scrubColor",
    "scrubFabric",
    "scrubNeckline",
    "scrubPockets",
    "scrubWaist",
  ],
  "Lab Coats": ["labcoatSize", "labcoatLength", "labcoatSleeve"],
  "Scrub Jackets": ["jacketSize", "jacketClosure"],
  "Head Caps": ["capShape", "capPattern"],
  "Clogs (Slippers)": ["clogSize", "clogMaterial", "clogSafety", "clogDesign", "clogArch"],
  "Accessories": ["apparelAccessory"],
  "Water Jet": ["irrigatorType", "irrigatorModes", "irrigatorTank", "irrigatorNozzle"],
  "Flosser": ["flossType", "flossFlavor", "flossLength", "flossAccessories"],
  "Toothpaste": ["toothpasteNeed", "toothpasteVolume"],
  "Toothbrush": ["brushType", "brushBristle", "brushInterdental"],
  "Mouthwashes": ["mouthwashPurpose", "mouthwashVolume"],
  "Denture Care": ["dentureCareProducts"],
  "Hand Sanitizer Dispensers": [
    "dispenserOperation",
    "dispenserMounting",
    "dispenserCapacity",
  ],
  "Instrument Sterilizers": ["deviceSterTechnology"],
  "Sterilization Pouches": ["pouchType", "sterPouchDimensions"],
  "Hand Sanitizers": ["sanitizerForm", "sanitizerIngredient", "sanitizerVolume"],
  "Surface Disinfectants": ["surfaceForm", "surfaceDisinfectionTime", "surfacePackaging"],
  "Personal Protective Equipment": [
    "ppeGloveMaterial",
    "ppeGloveSize",
    "ppeMaskType",
    "ppeEyeProtection",
  ],
  "Barrier Protection": ["barrierItems"],
  "Sterilization Indicators & Cleaning": ["indicatorTypes", "enzymaticCleaner"],
  "Diamond Burs": ["diamondShank", "diamondGrit", "diamondShape"],
  "Carbide Burs": ["carbideShank", "carbideSize", "carbideFunction"],
  "Steel Burs": ["steelApplication"],
  "Abrasive Burs": ["abrasiveMaterial", "abrasiveStage", "abrasiveAccessories"],
  "Polishers": ["abrasiveMaterial", "abrasiveStage", "abrasiveAccessories"],
  "Surgical Burs": ["surgBurLength", "surgBurCutting"],
  "Bur Kits": ["burKitUse", "burKitHolder"],
  "Denture teeth": ["dentTeethMaterial", "dentTeethShade", "dentTeethArch", "dentTeethMould"],
  "CAD CAM": ["cadBlockMaterial", "cadDimensions", "cadThickness", "cadTranslucency"],
  "Ceramic Material": ["ceramicType", "ceramicShade", "ceramicSystem"],
  "Impression & Gypsum": ["gypsumType", "labSilicone"],
  "Acrylic Resins & Waxes": ["acrylicCuring", "labWaxes", "investmentMaterial"],
  "Handpiece Lubricant": ["lubricantType", "lubricantVolume", "lubricantCompatibility"],
  "Spare Parts": ["sparePartType", "spareDeviceCompat"],
  "Training Teeth and Models": ["trainModelType", "trainAccessories", "trainStandard"],
};

const STRICT_SUBCATEGORY_ALIASES: Record<string, string> = {
  "قفازات": "Gloves",
  "كمامات وأغطية رأس": "Face masks & Caps",
  "مستهلكات عامة": "General Disposables",
  "معدات حماية": "Protective gear",
  "إكسسوارات عامة": "General accessories",
  "كومبوزيت": "Composites",
  "جلاس أيونومر": "Glass Ionomer",
  "حشوات مؤقتة": "Temporary Filling Material",
  "سائل تشكيل الكومبوزيت": "Composite Modeling Liquid",
  "حماية اللب": "Pulp Protection",
  "أسمنت قاعدي": "Cement base",
  "مواد إخفاء وصبغات": "Opaquers & Tints",
  "ملغم (أملغم)": "Amalgams",
  "مواد لاصقة وحوافض": "Bonding Agents & Etchants",
  "جلسرين": "Glycerin",
  "تلميع وإنهاء": "Finishing & Polishing",
  "أدوات الترميم": "Restorative instruments",
  "كواشف التسوس": "Caries Detectors/Control",
  "تحضير الحجرة اللبية": "Access Cavity Preparation",
  "تحضير وتنظيف القنوات": "Canal Preparation & Cleaning",
  "المبارد والأقماع": "Canal Preparation & Cleaning",
  "حشو القنوات": "Obturation",
  "أوتاد ونوى": "Post & Core",
  "محاليل الغسل والأدوية": "RC irrigants & Medicament",
  "إصلاح الجذور": "Root Repair",
  "إعادة علاج": "Re-treatment",
  "إكسسوارات علاج الجذور": "Endodontic Accessories",
  "أدوات علاج الجذور": "Endo instruments",
  "أدوات التركيبات": "Prostho Instruments",
  "مواد الطبع": "Impression Materials",
  "مواد الطبعات": "Impression Materials",
  "تيجان وجسور": "Crown & Bridge",
  "صناعة النماذج": "Model Creation",
  "أكريليك": "Acrylics",
  "معالجة الأطقم": "Denture Processing",
  "تبطين الأطقم": "Denture relines",
  "شموع الأسنان": "Dental Waxes",
  "أدوات جراحية": "Surgical instruments",
  "خيوط جراحية": "Sutures",
  "مواد مرقئة ومطهرة": "Hemostatic / Antiseptic",
  "وحدات محمولة": "Portable Units",
  "ماسحات فموية": "Intraoral Scanners",
  "محركات الزراعة": "Implant Motors",
  "معدات عامة": "General equipments",
  "مكبرات ومجاهر": "Loupes & Microscopes",
  "معدات تعقيم": "Sterilization Equipment",
  "أنظمة تصوير": "Imaging Systems",
  "قبضات وتوربينات": "Handpieces & Turbines",
  "أدوات اللثة": "Perio instruments",
  "جبائر وواقيات فم": "Splints & Mouth Guards",
  "منتجات جراحية": "Surgical products",
  "ضمادات جراحية": "Surgical dressings",
  "إدارة الأنسجة": "Tissue Management",
  "طعوم عظمية": "Bone Grafts",
  "تثبيت GBR ومستلزمات PRF": "GBR Fixation & Biologics",
  "التحكم بالبلاك": "Plaque Control",
  "أربطة ومطاطات": "Ligatures & Elastics",
  "أجهزة توسعة": "Expansion & Appliances",
  "تقليل ما بين الأسنان": "Interproximal Reduction — IPR",
  "أنظمة الحاصرات": "Bracket Systems",
  "أسلاك": "Wire Products",
  "ملحقات": "Attachments",
  "مراسي التقويم": "Orthodontics Anchorage",
  "إكسسوارات التقويم": "Ortho Accessories",
  "أدوات التقويم": "Ortho instruments",
  "وقائي": "Preventive",
  "علاجات وقائية": "Preventive",
  "حافظات المسافة": "Space Maintainer",
  "تيجان أطفال": "Pediatric Crowns",
  "تيجان الأطفال": "Pediatric Crowns",
  "علاج اللب": "Pulp Therapy",
  "علاج عصب الأطفال": "Pulp Therapy",
  "تخدير ومصفوفات الأطفال": "Pediatric Anesthesia & Matrices",
  "أزياء طبية": "Medical Scrubs",
  "معاطف مختبر": "Lab Coats",
  "جاكيتات طبية": "Scrub Jackets",
  "أغطية رأس": "Head Caps",
  "أحذية طبية": "Clogs (Slippers)",
  "أغذية طبية": "Clogs (Slippers)",
  "إكسسوارات": "Accessories",
  "خيط مائي": "Water Jet",
  "خيط تنظيف": "Flosser",
  "معجون أسنان": "Toothpaste",
  "فرشاة أسنان": "Toothbrush",
  "غسول فم": "Mouthwashes",
  "العناية بالأطقم": "Denture Care",
  "موزعات معقمات": "Hand Sanitizer Dispensers",
  "أجهزة تعقيم الأدوات": "Instrument Sterilizers",
  "أكياس التعقيم": "Sterilization Pouches",
  "معقمات يدوية": "Hand Sanitizers",
  "مطهرات الأسطح": "Surface Disinfectants",
  "معدات الحماية الشخصية": "Personal Protective Equipment",
  "حماية عازلة": "Barrier Protection",
  "مؤشرات التعقيم والتنظيف": "Sterilization Indicators & Cleaning",
  "مبردات ألماس": "Diamond Burs",
  "مبردات كربيد": "Carbide Burs",
  "مبردات فولاذية": "Steel Burs",
  "مبردات كاشطة": "Abrasive Burs",
  "ملمعات": "Polishers",
  "مبردات جراحية": "Surgical Burs",
  "أطقم المبردات": "Bur Kits",
  "أسنان أطقم": "Denture teeth",
  "كاد كام": "CAD CAM",
  "مواد سيراميك": "Ceramic Material",
  "مواد الطبعات والجبس": "Impression & Gypsum",
  "الأكريليك والشمع": "Acrylic Resins & Waxes",
  "مزيتات القبضة": "Handpiece Lubricant",
  "قطع غيار": "Spare Parts",
  "أسنان ونماذج تدريب": "Training Teeth and Models",
};

/** Strict per-sub-category field mapping. Returns null when no exact match exists. */
export function strictSpecFieldsFor(subCategory: string, subCategoryAr: string): SpecFieldId[] | null {
  const key = STRICT_SUBCATEGORY_SPECS[subCategory]
    ? subCategory
    : (STRICT_SUBCATEGORY_ALIASES[subCategoryAr] ?? "");
  return key ? (STRICT_SUBCATEGORY_SPECS[key] ?? null) : null;
}

export type SpecializedField = {
  id: string;
  ar: string;
  en: string;
  type: "select" | "text" | "multi";
  options?: { value: string; ar?: string }[];
  placeholder?: string;
};

export const SPECIALIZED_CATEGORIES: { id: string; ar: string; en: string }[] = [
  { id: "subperiosteal", ar: "تحت السمحاق", en: "Subperiosteal" },
  { id: "zygomatic", ar: "الوجنة", en: "Zygomatic" },
  { id: "pterygoid", ar: "الجناحية", en: "Pterygoid" },
  { id: "trans_sinus", ar: "عبر الجيب الفكي", en: "Trans Sinus" },
  { id: "all_on_x", ar: "All-on-X", en: "All-on-X" },
  { id: "titanium_mesh", ar: "شبكة تيتانيوم ثلاثية الأبعاد", en: "3D Titanium Mesh" },
];

export const SPECIALIZED_FIELDS: Record<string, SpecializedField[]> = {
  subperiosteal: [
    {
      id: "frameworkMaterial",
      ar: "مادة الهيكل",
      en: "Framework Material",
      type: "select",
      options: [
        { value: "Titanium", ar: "تيتانيوم" },
        { value: "Cobalt-Chromium", ar: "كوبالت-كروم" },
        { value: "PEEK" },
      ],
    },
    {
      id: "attachmentType",
      ar: "نوع التثبيت",
      en: "Attachment Type",
      type: "select",
      options: [
        { value: "Screw-Retained", ar: "تثبيت بالبرغي" },
        { value: "Bar & Clip", ar: "شريط ومشبك" },
        { value: "Locator", ar: "لوكيتر" },
      ],
    },
    {
      id: "boneCoverage",
      ar: "تغطية العظم",
      en: "Bone Coverage",
      type: "multi",
      options: [
        { value: "Full Arch", ar: "فك كامل" },
        { value: "Posterior", ar: "خلفي" },
        { value: "Anterior", ar: "أمامي" },
      ],
    },
    {
      id: "arch",
      ar: "القوس",
      en: "Arch",
      type: "multi",
      options: [
        { value: "Upper", ar: "علوي" },
        { value: "Lower", ar: "سفلي" },
        { value: "Both", ar: "كلاهما" },
      ],
    },
  ],
  zygomatic: [
    {
      id: "implantLength",
      ar: "طول الزرعة",
      en: "Implant Length",
      type: "select",
      options: [
        { value: "35mm" },
        { value: "40mm" },
        { value: "45mm" },
        { value: "50mm" },
        { value: "52.5mm" },
      ],
    },
    {
      id: "implantCount",
      ar: "عدد الزرعات",
      en: "Implant Count",
      type: "select",
      options: [{ value: "2" }, { value: "4" }],
    },
    {
      id: "platform",
      ar: "المنصة",
      en: "Platform",
      type: "select",
      options: [
        { value: "Standard", ar: "قياسية" },
        { value: "Multi-Unit", ar: "مالتي يونيت" },
      ],
    },
  ],
  pterygoid: [
    {
      id: "length",
      ar: "الطول",
      en: "Length",
      type: "select",
      options: [
        { value: "15mm" },
        { value: "18mm" },
        { value: "20mm" },
        { value: "22mm" },
        { value: "25mm" },
      ],
    },
    {
      id: "diameter",
      ar: "القطر",
      en: "Diameter",
      type: "select",
      options: [{ value: "3.75mm" }, { value: "4.0mm" }, { value: "4.5mm" }],
    },
    {
      id: "connection",
      ar: "الوصل",
      en: "Connection",
      type: "select",
      options: [
        { value: "Internal Hex", ar: "سداسي داخلي" },
        { value: "Conical", ar: "مخروطي" },
      ],
    },
  ],
  trans_sinus: [
    {
      id: "approach",
      ar: "الأسلوب",
      en: "Approach",
      type: "select",
      options: [
        { value: "Trans-Sinus (TS)", ar: "عبر الجيب" },
        { value: "Dual-Zone (DZ)", ar: "منطقتان" },
        { value: "Extra-Short", ar: "قصير جداً" },
      ],
    },
    {
      id: "length",
      ar: "الطول",
      en: "Length",
      type: "select",
      options: [{ value: "8mm" }, { value: "10mm" }, { value: "11.5mm" }],
    },
    {
      id: "diameter",
      ar: "القطر",
      en: "Diameter",
      type: "select",
      options: [{ value: "4.0mm" }, { value: "4.5mm" }, { value: "5.0mm" }],
    },
  ],
  all_on_x: [
    {
      id: "implantCount",
      ar: "عدد الزرعات",
      en: "Implant Count",
      type: "select",
      options: [{ value: "4" }, { value: "6" }, { value: "8" }],
    },
    {
      id: "material",
      ar: "مادة التركيبة",
      en: "Prosthesis Material",
      type: "select",
      options: [
        { value: "Zirconia", ar: "زركون" },
        { value: "PMMA" },
        { value: "Metal-Ceramic", ar: "معدن-سيراميك" },
      ],
    },
    {
      id: "retention",
      ar: "التثبيت",
      en: "Retention",
      type: "select",
      options: [
        { value: "Screw-Retained", ar: "بالبرغي" },
        { value: "Cement-Retained", ar: "بالإسمنت" },
      ],
    },
  ],
  titanium_mesh: [
    {
      id: "meshThickness",
      ar: "سماكة الشبكة",
      en: "Mesh Thickness",
      type: "select",
      options: [{ value: "0.2mm" }, { value: "0.3mm" }, { value: "0.4mm" }],
    },
    {
      id: "fixationScrews",
      ar: "براغي التثبيت",
      en: "Fixation Screws",
      type: "select",
      options: [{ value: "1.2mm" }, { value: "1.4mm" }, { value: "1.6mm" }],
    },
    {
      id: "boneGraft",
      ar: "نوع الطعم",
      en: "Bone Graft",
      type: "select",
      options: [
        { value: "Xenograft", ar: "حيواني" },
        { value: "Allograft", ar: "بشري" },
        { value: "Synthetic", ar: "تركيبي" },
      ],
    },
  ],
};

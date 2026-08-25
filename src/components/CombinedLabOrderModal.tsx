import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Calendar,
  Sparkles,
  User,
  Stethoscope,
  Trash2,
  PenTool,
  Palette,
  Gem,
  Pencil,
  Plus,
  Check,
} from "lucide-react";
import {
  MATERIALS,
  FRAMEWORK_CREATION,
  RULES,
  IMPLANT_WORK_TYPES,
  VITA_SHADES,
  type MaterialId,
  type WorkTypeId,
  type ManufacturingMethodId,
  type MaterialRules,
} from "@/lib/dentalConfig";
import { useStaff } from "@/lib/staffStore";
import { useLabCatalog, saveLabCatalog, type LabCatalog } from "@/lib/catalogStore";
import { toast } from "sonner";

export type PricingItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
};

export type OrderPrefill = {
  patientName?: string;
  doctorName?: string;
  clinicName?: string;
  material?: MaterialId;
  workType?: WorkTypeId;
  shade?: string;
  notes?: string;
};

export type CombinedLabOrder = {
  patientName: string;
  doctorName: string;
  clinicName: string;
  deliveryDate: string;
  material: string;
  workType?: string;
  manufacturingMethod?: string;
  frameworkCreation?: string;
  pricingMode: "single" | "mixed";
  currency: "USD" | "IQD";
  pricingItems?: PricingItem[];
  unitsCount: number;
  unitPriceIQD: number;
  subtotalIQD: number;
  discountAmountIQD: number;
  finalTotalIQD: number;
  finalTotalUSD: number;
  shade?: string;
  notes: string;
  implantCompany?: string;
  implantSystem?: string;
  implantConnection?: string;
  implantPlatform?: string;
  implantScanBody?: string;
  implantLevel?: string;
  implantRetention?: string;
  alignerTreatmentType?: string;
  alignerArch?: string;
  alignerScans?: string;
  alignerCount?: string;
  alignerWearProtocol?: string;
  titaniumFrameworkType?: string;
  designerId?: string;
  designerName?: string;
  ceramistId?: string;
  ceramistName?: string;
};

type CatalogSection = "materials" | "workTypes" | "manufacturingMethods";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: CombinedLabOrder) => void;
  labId?: string;
  prefill?: OrderPrefill | null;
};

export function CombinedLabOrderModal({ open, onClose, onSubmit, labId, prefill }: Props) {
  const { catalog } = useLabCatalog(labId ?? "");
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  const [selectedMaterialId, setSelectedMaterialId] = useState<MaterialId>("material.zirconia");
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeId | "">("crown");
  const [selectedManufacturingMethod, setSelectedManufacturingMethod] = useState("monolithic");
  const [frameworkCreation, setFrameworkCreation] = useState("conventional_casting");

  const [pricingMode, setPricingMode] = useState<"single" | "mixed">("single");
  const [singleQuantity, setSingleQuantity] = useState("1");
  const [singleUnitPrice, setSingleUnitPrice] = useState("0");
  const [singleCurrency, setSingleCurrency] = useState<"USD" | "IQD">("IQD");
  const [shade, setShade] = useState("");
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0, currency: "IQD" },
  ]);

  // Implant details (dynamic — shown only for implant-related cases)
  const [implantCompany, setImplantCompany] = useState("");
  const [implantSystem, setImplantSystem] = useState("");
  const [implantConnection, setImplantConnection] = useState("");
  const [implantPlatform, setImplantPlatform] = useState("");
  const [implantScanBody, setImplantScanBody] = useState("");
  const [implantLevel, setImplantLevel] = useState("implant");
  const [implantRetention, setImplantRetention] = useState("screw");

  // Clear aligner
  const [alignerTreatmentType, setAlignerTreatmentType] = useState("comprehensive");
  const [alignerArch, setAlignerArch] = useState("both");
  const [alignerScans, setAlignerScans] = useState("");
  const [alignerCount, setAlignerCount] = useState("10");
  const [alignerWearProtocol, setAlignerWearProtocol] = useState("14days");
  const [titaniumFrameworkType, setTitaniumFrameworkType] = useState("fixed_framework");

  const [notes, setNotes] = useState("");

  // Technical staff assignment
  const [designerId, setDesignerId] = useState("");
  const [ceramistId, setCeramistId] = useState("");
  const staff = useStaff();

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<LabCatalog | null>(null);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [addingSection, setAddingSection] = useState<keyof LabCatalog | null>(null);
  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");

  const designers = staff.filter((m) => m.department === "cad_designer");
  const ceramists = staff.filter((m) => m.department === "ceramist");

  const resetForm = () => {
    setPatientName("");
    setDoctorName("");
    setClinicName("");
    setDeliveryDate("");
    setSelectedMaterialId("material.zirconia");
    setSelectedWorkType("crown");
    setSelectedManufacturingMethod("monolithic");
    setFrameworkCreation("conventional_casting");
    setPricingMode("single");
    setSingleQuantity("1");
    setSingleUnitPrice("0");
    setSingleCurrency("IQD");
    setPricingItems([{ id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0, currency: "IQD" }]);
    setShade("");
    setImplantCompany("");
    setImplantSystem("");
    setImplantConnection("");
    setImplantPlatform("");
    setImplantScanBody("");
    setImplantLevel("implant");
    setImplantRetention("screw");
    setAlignerTreatmentType("comprehensive");
    setAlignerArch("both");
    setAlignerScans("");
    setAlignerCount("10");
    setAlignerWearProtocol("14days");
    setTitaniumFrameworkType("fixed_framework");
    setNotes("");
    setDesignerId("");
    setCeramistId("");
  };

  const applyPrefill = (p: OrderPrefill) => {
    resetForm();
    if (p.patientName) setPatientName(p.patientName);
    if (p.doctorName) setDoctorName(p.doctorName);
    if (p.clinicName) setClinicName(p.clinicName);
    if (p.shade) setShade(p.shade);
    if (p.notes) setNotes(p.notes);
    if (p.material) {
      setSelectedMaterialId(p.material);
      const rule = (RULES as Record<string, MaterialRules | undefined>)[p.material];
      const wt =
        p.workType && rule?.allowedWorkTypes.includes(p.workType as WorkTypeId)
          ? (p.workType as WorkTypeId)
          : rule?.allowedWorkTypes[0] ?? (catalog.workTypes[0]?.id as WorkTypeId | undefined);
      if (wt) {
        setSelectedWorkType(wt);
        setSelectedManufacturingMethod(rule?.manufacturingRules[wt]?.[0] ?? "");
      } else {
        setSelectedWorkType("");
        setSelectedManufacturingMethod("");
      }
    }
  };

  useEffect(() => {
    if (open) {
      if (prefill) applyPrefill(prefill);
      else resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isClearAligner = selectedMaterialId === "material.clear_aligner";
  const isTitaniumBar = selectedMaterialId === "material.titanium_bar";
  const isPFM = selectedMaterialId === "material.pfm";
  const isZirconia = selectedMaterialId === "material.zirconia";

  const displayCatalog: LabCatalog = editMode && draft ? draft : catalog;
  const materialIcon = (id: string) => MATERIALS.find((m) => m.id === id)?.icon ?? Gem;

  const enterEditMode = () => {
    setDraft({
      materials: catalog.materials.map((m) => ({ ...m })),
      workTypes: catalog.workTypes.map((w) => ({ ...w })),
      manufacturingMethods: catalog.manufacturingMethods.map((m) => ({ ...m })),
    });
    setAddingSection(null);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setDraft(null);
    setAddingSection(null);
    setNewAr("");
    setNewEn("");
  };

  const saveEditMode = async () => {
    if (!labId || !draft) return;
    setSavingCatalog(true);
    try {
      await saveLabCatalog(labId, draft);
      setEditMode(false);
      setDraft(null);
    } finally {
      setSavingCatalog(false);
    }
  };

  const removeCatalogItem = (section: CatalogSection, id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = prev[section] as { id: string }[];
      return { ...prev, [section]: list.filter((x) => x.id !== id) } as LabCatalog;
    });
  };

  const confirmAddCatalogItem = () => {
    if (!addingSection || !newAr.trim()) return;
    const id = `custom_${Date.now().toString(36)}`;
    setDraft((prev) => {
      if (!prev) return prev;
      const item =
        addingSection === "workTypes"
          ? { id, ar: newAr.trim(), en: newEn.trim() || newAr.trim(), category: "advanced" as const }
          : { id, ar: newAr.trim(), en: newEn.trim() || newAr.trim() };
      return { ...prev, [addingSection]: [...(prev[addingSection] as { id: string }[]), item] } as LabCatalog;
    });
    setNewAr("");
    setNewEn("");
    setAddingSection(null);
  };

  const rulesEntry = (RULES as Record<string, MaterialRules | undefined>)[selectedMaterialId];
  const allowedWorkTypes = rulesEntry
    ? rulesEntry.allowedWorkTypes
    : (displayCatalog.workTypes.map((w) => w.id) as WorkTypeId[]);
  const workTypes = displayCatalog.workTypes.filter((wt) => allowedWorkTypes.includes(wt.id as WorkTypeId));
  const allowedMethods = rulesEntry
    ? (rulesEntry.manufacturingRules[selectedWorkType as WorkTypeId] ?? [])
    : (displayCatalog.manufacturingMethods.map((m) => m.id) as ManufacturingMethodId[]);
  const manufacturingMethods = displayCatalog.manufacturingMethods.filter((mm) =>
    allowedMethods.includes(mm.id as ManufacturingMethodId),
  );

  const isImplantCase = isTitaniumBar || IMPLANT_WORK_TYPES.includes(selectedWorkType as WorkTypeId);

  const USD_RATE = 1480;
  const itemTotalIQD = (it: PricingItem) =>
    (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) * (it.currency === "IQD" ? 1 : USD_RATE);

  const singleUnits = Number(singleQuantity) || 0;
  const singlePriceIQD = (Number(singleUnitPrice) || 0) * (singleCurrency === "IQD" ? 1 : USD_RATE);

  const units =
    pricingMode === "single"
      ? singleUnits
      : pricingItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const subtotalIQD =
    pricingMode === "single"
      ? singleUnits * singlePriceIQD
      : pricingItems.reduce((s, it) => s + itemTotalIQD(it), 0);
  const unitPriceIQD = units > 0 ? subtotalIQD / units : 0;
  const discountAmountIQD = 0;
  const finalTotalIQD = subtotalIQD - discountAmountIQD;
  const finalTotalUSD = finalTotalIQD / USD_RATE;

  const fmtNum = (n: number) => n.toLocaleString("en-US");
  const singleTotalValue =
    singleCurrency === "USD"
      ? singleUnits * (Number(singleUnitPrice) || 0)
      : singleUnits * singlePriceIQD;
  const singleTotalLabel =
    singleCurrency === "USD" ? `$ ${fmtNum(singleTotalValue)}` : `IQD ${fmtNum(singleTotalValue)}`;
  const grandTotalLabel =
    pricingMode === "single" && singleCurrency === "USD"
      ? `$ ${fmtNum(finalTotalUSD)}`
      : `IQD ${fmtNum(finalTotalIQD)}`;

  const updatePricingItem = (id: string, patch: Partial<PricingItem>) => {
    setPricingItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addPricingItem = () => {
    setPricingItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0, currency: "IQD" },
    ]);
  };

  const removePricingItem = (id: string) => {
    setPricingItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  const selectMaterial = (id: MaterialId) => {
    setSelectedMaterialId(id);
    const rule = (RULES as Record<string, MaterialRules | undefined>)[id];
    const firstWorkType = rule?.allowedWorkTypes[0] ?? displayCatalog.workTypes[0]?.id;
    if (firstWorkType) {
      setSelectedWorkType(firstWorkType as WorkTypeId);
      setSelectedManufacturingMethod(rule?.manufacturingRules[firstWorkType as WorkTypeId]?.[0] ?? "");
    } else {
      setSelectedWorkType("");
      setSelectedManufacturingMethod("");
    }
  };

  const selectWorkType = (wt: WorkTypeId) => {
    setSelectedWorkType(wt);
    const rule = (RULES as Record<string, MaterialRules | undefined>)[selectedMaterialId];
    setSelectedManufacturingMethod(rule?.manufacturingRules[wt]?.[0] ?? "");
  };

  const handleSubmit = () => {
    if (!patientName.trim()) {
      toast.error("يرجى إدخال اسم المريض");
      return;
    }
    if (!doctorName.trim()) {
      toast.error("يرجى إدخال اسم الطبيب");
      return;
    }
    if (!deliveryDate) {
      toast.error("يرجى تحديد تاريخ الإخراج");
      return;
    }
    if (!selectedMaterialId) {
      toast.error("يرجى اختيار المادة الأساسية");
      return;
    }

    onSubmit({
      patientName: patientName.trim(),
      doctorName: doctorName.trim(),
      clinicName: clinicName ?? "",
      deliveryDate: deliveryDate ?? "",
      material: selectedMaterialId ?? "",
      workType: selectedWorkType || "",
      manufacturingMethod: selectedManufacturingMethod || "",
      frameworkCreation: isPFM ? frameworkCreation : undefined,
      pricingMode,
      currency: pricingMode === "single" ? singleCurrency : "IQD",
      pricingItems:
        pricingMode === "mixed"
          ? pricingItems.map((it) => ({
              ...it,
              quantity: Number(it.quantity) || 0,
              unitPrice: Number(it.unitPrice) || 0,
            }))
          : undefined,
      unitsCount: units,
      unitPriceIQD,
      subtotalIQD,
      discountAmountIQD,
      finalTotalIQD,
      finalTotalUSD,
      shade: shade || "",
      notes: notes ?? "",
      implantCompany: isImplantCase ? implantCompany : undefined,
      implantSystem: isImplantCase ? implantSystem : undefined,
      implantConnection: isImplantCase ? implantConnection : undefined,
      implantPlatform: isImplantCase ? implantPlatform : undefined,
      implantScanBody: isImplantCase ? implantScanBody : undefined,
      implantLevel: isImplantCase ? implantLevel : undefined,
      implantRetention: isImplantCase ? implantRetention : undefined,
      alignerTreatmentType: isClearAligner ? alignerTreatmentType : undefined,
      alignerArch: isClearAligner ? alignerArch : undefined,
      alignerScans: isClearAligner ? alignerScans : undefined,
      alignerCount: isClearAligner ? alignerCount : undefined,
      alignerWearProtocol: isClearAligner ? alignerWearProtocol : undefined,
      titaniumFrameworkType: isTitaniumBar ? titaniumFrameworkType : undefined,
      designerId: designerId || undefined,
      designerName: designers.find((m) => m.id === designerId)?.name,
      ceramistId: ceramistId || undefined,
      ceramistName: ceramists.find((m) => m.id === ceramistId)?.name,
    });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const workTypeChip = (
    wt: { id: string; ar: string; en: string },
    active: boolean,
    onClick: () => void,
    editable = false,
    onDelete?: () => void,
  ) => (
    <div
      key={wt.id}
      className={`flex items-stretch rounded-xl border shadow-sm overflow-hidden transition ${
        active ? "border-blue-600 bg-blue-50/30" : "border-slate-300 bg-white hover:border-blue-300"
      }`}
    >
      <button type="button" onClick={onClick} className="flex-1 min-w-0 px-3.5 py-2 text-right flex flex-col gap-0.5">
        <span className={`text-xs font-bold ${active ? "text-blue-900" : "text-gray-700"}`}>{wt.ar}</span>
        <span className="text-[10px] text-gray-500" dir="ltr">{wt.en}</span>
      </button>
      {editable && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 w-9 border-s border-slate-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const methodChip = (
    mm: { id: string; ar: string; en: string },
    active: boolean,
    onClick: () => void,
    editable = false,
    onDelete?: () => void,
  ) => (
    <div
      key={mm.id}
      className={`flex items-stretch rounded-xl border shadow-sm overflow-hidden transition ${
        active ? "border-emerald-600 bg-emerald-50/40" : "border-slate-300 bg-white hover:border-emerald-300"
      }`}
    >
      <button type="button" onClick={onClick} className="flex-1 min-w-0 px-3.5 py-2 text-right flex flex-col gap-0.5">
        <span className={`text-xs font-bold ${active ? "text-emerald-900" : "text-gray-700"}`}>{mm.ar}</span>
        <span className="text-[10px] text-gray-500" dir="ltr">{mm.en}</span>
      </button>
      {editable && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 w-9 border-s border-slate-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-right" dir="rtl">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-4 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">إضافة طلب جديد للمختبر</h2>
              <p className="text-xs text-gray-500">قم بتسعير حالتك واختيار تفاصيل المواد والتصنيع بدقة عالية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={saveEditMode}
                  disabled={savingCatalog}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  حفظ القائمة
                </button>
                <button
                  onClick={cancelEditMode}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <button
                onClick={enterEditMode}
                className="px-4 py-2 rounded-xl border border-blue-200 text-blue-600 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50"
              >
                <Pencil className="w-4 h-4" />
                تعديل القائمة
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
          {/* Section 1: Basic order data */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">1. بيانات الطلب الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> اسم المريض <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="أدخل اسم المريض"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" /> اسم الطبيب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="أدخل اسم الطبيب"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" /> اسم العيادة
                </label>
                <input
                  type="text"
                  placeholder="أدخل اسم العيادة"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" /> تاريخ الإخراج المتوقع <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Material + manufacturing */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">2. اختيار المادة والتصنيع</h3>

            {/* Step 1: Material */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-600">المادة الأساسية</p>
                {editMode && (
                  <button
                    type="button"
                    onClick={() => { setAddingSection("materials"); setNewAr(""); setNewEn(""); }}
                    className="text-[11px] font-bold text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة مادة
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {displayCatalog.materials.map((m) => {
                  const Icon = materialIcon(m.id);
                  const active = selectedMaterialId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-stretch rounded-xl border shadow-sm overflow-hidden transition ${
                        active ? "border-blue-600 bg-blue-50/30" : "border-slate-300 bg-white hover:border-blue-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => !editMode && selectMaterial(m.id as MaterialId)}
                        className="flex-1 min-w-0 p-3 text-right flex items-center gap-2"
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-bold block truncate ${active ? "text-blue-900" : "text-gray-700"}`}>{m.ar}</span>
                          <span className="text-[10px] text-gray-500 block truncate" dir="ltr">{m.en}</span>
                        </div>
                      </button>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => removeCatalogItem("materials", m.id)}
                          className="shrink-0 w-9 border-s border-slate-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {editMode && addingSection === "materials" && (
                <AddCatalogRow
                  newAr={newAr}
                  newEn={newEn}
                  setNewAr={setNewAr}
                  setNewEn={setNewEn}
                  onConfirm={confirmAddCatalogItem}
                  onCancel={() => setAddingSection(null)}
                  placeholder="اسم المادة الجديدة"
                />
              )}
            </div>

            {isClearAligner ? (
              /* Specialized Clear Aligner config */
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-4">
                <p className="text-xs font-bold text-gray-800">إعدادات التقويم الشفاف</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">نوع العلاج</label>
                    <select value={alignerTreatmentType} onChange={(e) => setAlignerTreatmentType(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5">
                      <option value="comprehensive">شامل (Comprehensive)</option>
                      <option value="express">سريع (Express)</option>
                      <option value="retention">مثبّت (Retention)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">القوس</label>
                    <select value={alignerArch} onChange={(e) => setAlignerArch(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5">
                      <option value="upper">علوي (Upper)</option>
                      <option value="lower">سفلي (Lower)</option>
                      <option value="both">كلاهما (Both)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">المسحات</label>
                    <input type="text" value={alignerScans} onChange={(e) => setAlignerScans(e.target.value)} placeholder="STL / Intraoral Scan" className="w-full text-xs bg-white border rounded-xl p-2.5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">عدد التقويمات</label>
                    <input type="number" value={alignerCount} onChange={(e) => setAlignerCount(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">بروتوكول الارتداء</label>
                    <select value={alignerWearProtocol} onChange={(e) => setAlignerWearProtocol(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5">
                      <option value="7days">كل 7 أيام</option>
                      <option value="10days">كل 10 أيام</option>
                      <option value="14days">كل 14 يوماً</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : isTitaniumBar ? (
              /* Specialized Titanium Bar config */
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-3">
                <p className="text-xs font-bold text-gray-800">إعدادات تيتانيوم بار</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTitaniumFrameworkType("removable_overdenture")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      titaniumFrameworkType === "removable_overdenture" ? "border-blue-600 bg-white" : "border-gray-200 bg-white/60"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-800">طقم قابل للإزالة</p>
                    <p className="text-[10px] text-gray-400" dir="ltr">Removable Overdenture</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitaniumFrameworkType("fixed_framework")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      titaniumFrameworkType === "fixed_framework" ? "border-blue-600 bg-white" : "border-gray-200 bg-white/60"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-800">هيكل ثابت</p>
                    <p className="text-[10px] text-gray-400" dir="ltr">Fixed Framework</p>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Step 2: Work type */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-600">نوع العمل</p>
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => { setAddingSection("workTypes"); setNewAr(""); setNewEn(""); }}
                        className="text-[11px] font-bold text-blue-600 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> إضافة نوع عمل
                      </button>
                    )}
                  </div>
                  {isZirconia ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400">أنواع العمل الأساسية</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {workTypes.filter((wt) => wt.category === "core").map((wt) =>
                            workTypeChip(wt, selectedWorkType === wt.id, () => !editMode && selectWorkType(wt.id as WorkTypeId), editMode, () => removeCatalogItem("workTypes", wt.id)),
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400">أنواع العمل المتقدمة</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {workTypes.filter((wt) => wt.category === "advanced").map((wt) =>
                            workTypeChip(wt, selectedWorkType === wt.id, () => !editMode && selectWorkType(wt.id as WorkTypeId), editMode, () => removeCatalogItem("workTypes", wt.id)),
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {workTypes.map((wt) =>
                        workTypeChip(wt, selectedWorkType === wt.id, () => !editMode && selectWorkType(wt.id as WorkTypeId), editMode, () => removeCatalogItem("workTypes", wt.id)),
                      )}
                    </div>
                  )}
                  {editMode && addingSection === "workTypes" && (
                    <AddCatalogRow
                      newAr={newAr}
                      newEn={newEn}
                      setNewAr={setNewAr}
                      setNewEn={setNewEn}
                      onConfirm={confirmAddCatalogItem}
                      onCancel={() => setAddingSection(null)}
                      placeholder="اسم نوع العمل الجديد"
                    />
                  )}
                </div>

                {/* Step 3: Manufacturing method */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-600">طريقة التصنيع</p>
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => { setAddingSection("manufacturingMethods"); setNewAr(""); setNewEn(""); }}
                        className="text-[11px] font-bold text-blue-600 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> إضافة طريقة تصنيع
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {manufacturingMethods.map((mm) =>
                      methodChip(mm, selectedManufacturingMethod === mm.id, () => !editMode && setSelectedManufacturingMethod(mm.id), editMode, () => removeCatalogItem("manufacturingMethods", mm.id)),
                    )}
                  </div>
                  {editMode && addingSection === "manufacturingMethods" && (
                    <AddCatalogRow
                      newAr={newAr}
                      newEn={newEn}
                      setNewAr={setNewAr}
                      setNewEn={setNewEn}
                      onConfirm={confirmAddCatalogItem}
                      onCancel={() => setAddingSection(null)}
                      placeholder="اسم طريقة التصنيع الجديدة"
                    />
                  )}
                </div>

                {/* PFM framework creation */}
                {isPFM && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-600">طريقة إنشاء الهيكل المعدني</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {FRAMEWORK_CREATION.map((fc) => {
                        const active = frameworkCreation === fc.id;
                        return (
                          <button
                            key={fc.id}
                            type="button"
                            onClick={() => setFrameworkCreation(fc.id)}
                            className={`px-3.5 py-2 rounded-xl border-2 text-right transition-all flex flex-col gap-0.5 ${
                              active ? "border-amber-600 bg-amber-50/40" : "border-gray-200 bg-white hover:border-amber-200"
                            }`}
                          >
                            <span className={`text-xs font-bold ${active ? "text-amber-900" : "text-gray-700"}`}>{fc.ar}</span>
                            <span className="text-[10px] text-gray-400" dir="ltr">{fc.en}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Dynamic Implant Details (auto-triggered) */}
            {isImplantCase && (
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-4">
                <p className="text-xs font-bold text-gray-800">تفاصيل الزرعة</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">شركة الزرعة</label>
                    <input type="text" value={implantCompany} onChange={(e) => setImplantCompany(e.target.value)} placeholder="Straumann, Nobel, ..." className="w-full text-xs bg-white border rounded-xl p-2.5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">نظام الزرعة</label>
                    <input type="text" value={implantSystem} onChange={(e) => setImplantSystem(e.target.value)} placeholder="نظام الزرعة" className="w-full text-xs bg-white border rounded-xl p-2.5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">الربط (Connection)</label>
                    <select value={implantConnection} onChange={(e) => setImplantConnection(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5">
                      <option value="">اختر نوع الربط</option>
                      <option value="internal_hex">سداسي داخلي (Internal Hex)</option>
                      <option value="external_hex">سداسي خارجي (External Hex)</option>
                      <option value="conical">مخروطي (Conical)</option>
                      <option value="morse_taper">Morse Taper</option>
                      <option value="internal_octagon">ثماني داخلي (Internal Octagon)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">المنصة (Platform)</label>
                    <input type="text" value={implantPlatform} onChange={(e) => setImplantPlatform(e.target.value)} placeholder="3.5 / 4.3" className="w-full text-xs bg-white border rounded-xl p-2.5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">Scan Body (اختياري)</label>
                    <select value={implantScanBody} onChange={(e) => setImplantScanBody(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5">
                      <option value="">بدون</option>
                      <option value="dess">DESS</option>
                      <option value="straumann">Straumann</option>
                      <option value="nobel">Nobel Biocare</option>
                      <option value="medentika">Medentika</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">المستوى</label>
                    <select value={implantLevel} onChange={(e) => setImplantLevel(e.target.value)} className="w-full text-xs bg-white border rounded-xl p-2.5">
                      <option value="implant">مستوى الزرعة (Implant Level)</option>
                      <option value="multi_unit">مستوى مالتي يونيت (Multi-Unit)</option>
                    </select>
                  </div>
                </div>

                {/* Retention toggle */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-600">طريقة التثبيت</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImplantRetention("screw")}
                      className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition ${
                        implantRetention === "screw" ? "border-blue-600 bg-white text-blue-800" : "border-gray-200 bg-white/60 text-gray-500"
                      }`}
                    >
                      تثبيت بالبرغي <span className="block text-[10px] font-normal text-gray-400" dir="ltr">Screw-Retained</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImplantRetention("cement")}
                      className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition ${
                        implantRetention === "cement" ? "border-blue-600 bg-white text-blue-800" : "border-gray-200 bg-white/60 text-gray-500"
                      }`}
                    >
                      تثبيت بالإسمنت <span className="block text-[10px] font-normal text-gray-400" dir="ltr">Cement-Retained</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shade selection */}
          <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 ${editMode ? "pointer-events-none opacity-40 select-none" : ""}`}>
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">درجة اللون (Vita Classical)</h3>
            <div className="grid grid-cols-8 gap-1.5">
              {VITA_SHADES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setShade(shade === s.code ? "" : s.code)}
                  className={`relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                    shade === s.code ? "border-blue-600 scale-110 shadow-md z-10 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="size-5 rounded-full border border-slate-300" style={{ background: s.hex }} />
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">{s.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Pricing */}
          <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 ${editMode ? "pointer-events-none opacity-40 select-none" : ""}`}>
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">3. التسعير والإجمالي</h3>

            {/* Pricing mode toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPricingMode("single")}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  pricingMode === "single" ? "border-blue-600 bg-blue-50/30" : "border-gray-200 bg-white hover:border-blue-200"
                }`}
              >
                <span className="text-xs font-bold text-gray-800 block">تسعير حالة واحدة (وحدة واحدة)</span>
                <span className="text-[10px] text-gray-400 block" dir="ltr">Single Unit Pricing</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("mixed")}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  pricingMode === "mixed" ? "border-blue-600 bg-blue-50/30" : "border-gray-200 bg-white hover:border-blue-200"
                }`}
              >
                <span className="text-xs font-bold text-gray-800 block">تسعير حالة متعددة (Mixed)</span>
                <span className="text-[10px] text-gray-400 block" dir="ltr">Multi-Item Matrix</span>
              </button>
            </div>

            {pricingMode === "single" ? (
              /* Single unit pricing */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">عدد الوحدات</label>
                  <input
                    type="number"
                    min="0"
                    value={singleQuantity}
                    onChange={(e) => setSingleQuantity(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">سعر الوحدة</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={singleUnitPrice ? fmtNum(Number(singleUnitPrice)) : ""}
                    onChange={(e) => setSingleUnitPrice(e.target.value.replace(/[^\d]/g, ""))}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">العملة</label>
                  <div className="flex rounded-lg border overflow-hidden">
                    <button type="button" onClick={() => setSingleCurrency("USD")} className={`flex-1 py-2.5 text-xs font-bold transition ${singleCurrency === "USD" ? "bg-blue-600 text-white" : "bg-white text-gray-500"}`}>$</button>
                    <button type="button" onClick={() => setSingleCurrency("IQD")} className={`flex-1 py-2.5 text-xs font-bold transition ${singleCurrency === "IQD" ? "bg-blue-600 text-white" : "bg-white text-gray-500"}`}>IQD</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">الإجمالي</label>
                  <div className="w-full text-xs p-2.5 rounded-lg bg-gray-100 border text-center font-bold text-blue-700" dir="ltr">
                    {singleTotalLabel}
                  </div>
                </div>
              </div>
            ) : (
              /* Mixed multi-unit pricing */
              <div className="space-y-3">
                <div className="grid grid-cols-[1.4fr_64px_96px_72px_96px_32px] gap-2 px-1 text-[10px] font-bold text-gray-400">
                  <span>نوع العمل</span>
                  <span className="text-center">العدد</span>
                  <span className="text-center">السعر</span>
                  <span className="text-center">العملة</span>
                  <span className="text-center">الإجمالي</span>
                  <span />
                </div>
                {pricingItems.map((it) => {
                  const rowTotal = itemTotalIQD(it);
                  return (
                    <div key={it.id} className="grid grid-cols-[1.4fr_64px_96px_72px_96px_32px] gap-2 items-center">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => updatePricingItem(it.id, { name: e.target.value })}
                        placeholder="مثال: تاج فوق زرعة"
                        className="w-full text-xs p-2 border rounded-lg bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        value={it.quantity}
                        onChange={(e) => updatePricingItem(it.id, { quantity: Number(e.target.value) || 0 })}
                        className="w-full text-xs p-2 border rounded-lg bg-white text-center"
                        dir="ltr"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={it.unitPrice ? fmtNum(it.unitPrice) : ""}
                        onChange={(e) => updatePricingItem(it.id, { unitPrice: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-full text-xs p-2 border rounded-lg bg-white text-center"
                        dir="ltr"
                      />
                      <select
                        value={it.currency}
                        onChange={(e) => updatePricingItem(it.id, { currency: e.target.value as "USD" | "IQD" })}
                        className="w-full text-xs p-2 border rounded-lg bg-white"
                      >
                        <option value="IQD">IQD</option>
                        <option value="USD">$</option>
                      </select>
                      <span className="text-xs font-bold text-center text-gray-700" dir="ltr">{rowTotal.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => removePricingItem(it.id)}
                        disabled={pricingItems.length <= 1}
                        className="size-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center disabled:opacity-30"
                        aria-label="حذف"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addPricingItem}
                  className="w-full h-10 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-50/40 transition"
                >
                  + إضافة وحدة
                </button>

                <div className="p-3 rounded-xl bg-gray-50 border flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-gray-600">إجمالي الوحدات: <span className="text-blue-600" dir="ltr">{units}</span></span>
                  <span className="text-xs font-bold text-gray-600">الإجمالي الكلي: <span className="text-blue-600" dir="ltr">{subtotalIQD.toLocaleString()} IQD</span></span>
                </div>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-gray-700">ملاحظات إضافية للمختبر (اختياري)</label>
              <textarea
                rows={2}
                placeholder="أدخل أي ملاحظات خاصة بتصميم ألوان السن أو الملاحظات الطبية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">الإجمالي النهائي</p>
              <p className="text-lg font-bold text-blue-600" dir="ltr">{grandTotalLabel}</p>
            </div>
          </div>

          {/* Section 4: Technical Staff Assignment */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">4. تخصيص الكادر الفني</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-blue-600" /> الدايزنر (المصمم)
                </label>
                <select
                  value={designerId}
                  onChange={(e) => setDesignerId(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر المصمم...</option>
                  {designers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-pink-600" /> السراميست
                </label>
                <select
                  value={ceramistId}
                  onChange={(e) => setCeramistId(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر السراميست...</option>
                  {ceramists.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(designers.length === 0 || ceramists.length === 0) && (
              <p className="text-[11px] text-gray-400">
                يمكن إضافة أعضاء الكادر من صفحة كادر المختبر لتظهر في هذه القوائم.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 sticky bottom-0">
          {editMode ? (
            <>
              <button onClick={cancelEditMode} className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                إلغاء التعديل
              </button>
              <button
                onClick={saveEditMode}
                disabled={savingCatalog}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-60"
              >
                {savingCatalog && <Check className="w-4 h-4" />}
                {savingCatalog ? "جارٍ الحفظ..." : "حفظ القائمة"}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                إلغاء
              </button>
              <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20">
                حفظ وإضافة الطلب
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCatalogRow({
  newAr,
  newEn,
  setNewAr,
  setNewEn,
  onConfirm,
  onCancel,
  placeholder,
}: {
  newAr: string;
  newEn: string;
  setNewAr: (v: string) => void;
  setNewEn: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/30">
      <input
        autoFocus
        value={newAr}
        onChange={(e) => setNewAr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-[140px] text-xs bg-white border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        value={newEn}
        onChange={(e) => setNewEn(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
        }}
        placeholder="English name"
        dir="ltr"
        className="flex-1 min-w-[140px] text-xs bg-white border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={onConfirm}
        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
      >
        <Check className="w-3.5 h-3.5" /> إضافة
      </button>
      <button type="button" onClick={onCancel} className="px-2 py-2 rounded-lg text-gray-400 hover:bg-gray-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

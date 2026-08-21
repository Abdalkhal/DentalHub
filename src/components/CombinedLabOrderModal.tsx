import { useState } from "react";
import { X, Building2, Calendar, Sparkles, User, Stethoscope } from "lucide-react";
import {
  MATERIALS,
  WORK_TYPES,
  MANUFACTURING_METHODS,
  FRAMEWORK_CREATION,
  RULES,
  IMPLANT_WORK_TYPES,
  type MaterialId,
  type WorkTypeId,
} from "@/lib/dentalConfig";

export type CombinedLabOrder = {
  patientName: string;
  doctorName: string;
  clinicName: string;
  deliveryDate: string;
  material: string;
  workType?: string;
  manufacturingMethod?: string;
  frameworkCreation?: string;
  unitsCount: number;
  unitPriceIQD: number;
  subtotalIQD: number;
  discountAmountIQD: number;
  finalTotalIQD: number;
  finalTotalUSD: number;
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: CombinedLabOrder) => void;
};

export function CombinedLabOrderModal({ open, onClose, onSubmit }: Props) {
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  const [selectedMaterialId, setSelectedMaterialId] = useState<MaterialId>("material.zirconia");
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeId | "">("crown");
  const [selectedManufacturingMethod, setSelectedManufacturingMethod] = useState("monolithic");
  const [frameworkCreation, setFrameworkCreation] = useState("conventional_casting");

  const [singleUnitsCount, setSingleUnitsCount] = useState("1");
  const [singleUnitPriceIQD, setSingleUnitPriceIQD] = useState("125000");

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

  if (!open) return null;

  const isClearAligner = selectedMaterialId === "material.clear_aligner";
  const isTitaniumBar = selectedMaterialId === "material.titanium_bar";
  const isPFM = selectedMaterialId === "material.pfm";
  const isZirconia = selectedMaterialId === "material.zirconia";

  const allowedWorkTypes = RULES[selectedMaterialId]?.allowedWorkTypes ?? [];
  const workTypes = WORK_TYPES.filter((wt) => allowedWorkTypes.includes(wt.id));
  const allowedMethods = RULES[selectedMaterialId]?.manufacturingRules[selectedWorkType as WorkTypeId] ?? [];
  const manufacturingMethods = MANUFACTURING_METHODS.filter((mm) => allowedMethods.includes(mm.id));

  const isImplantCase = isTitaniumBar || IMPLANT_WORK_TYPES.includes(selectedWorkType as WorkTypeId);

  const units = Number(singleUnitsCount) || 0;
  const unitPrice = Number(singleUnitPriceIQD) || 0;
  const subtotalIQD = units * unitPrice;
  const discountAmountIQD = 0;
  const finalTotalIQD = subtotalIQD - discountAmountIQD;
  const finalTotalUSD = finalTotalIQD / 1480;

  const selectMaterial = (id: MaterialId) => {
    setSelectedMaterialId(id);
    const firstWorkType = RULES[id]?.allowedWorkTypes[0];
    if (firstWorkType) {
      setSelectedWorkType(firstWorkType);
      setSelectedManufacturingMethod(RULES[id]?.manufacturingRules[firstWorkType]?.[0] ?? "");
    } else {
      setSelectedWorkType("");
      setSelectedManufacturingMethod("");
    }
  };

  const selectWorkType = (wt: WorkTypeId) => {
    setSelectedWorkType(wt);
    setSelectedManufacturingMethod(RULES[selectedMaterialId]?.manufacturingRules[wt]?.[0] ?? "");
  };

  const handleSubmit = () => {
    onSubmit({
      patientName,
      doctorName,
      clinicName,
      deliveryDate,
      material: selectedMaterialId,
      workType: selectedWorkType || undefined,
      manufacturingMethod: selectedManufacturingMethod || undefined,
      frameworkCreation: isPFM ? frameworkCreation : undefined,
      unitsCount: units,
      unitPriceIQD: unitPrice,
      subtotalIQD,
      discountAmountIQD,
      finalTotalIQD,
      finalTotalUSD,
      notes,
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
    });
  };

  const workTypeChip = (wt: (typeof WORK_TYPES)[number], active: boolean, onClick: () => void) => (
    <button
      key={wt.id}
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl border-2 text-right transition-all flex flex-col gap-0.5 ${
        active ? "border-blue-600 bg-blue-50/30" : "border-gray-200 bg-white hover:border-blue-200"
      }`}
    >
      <span className={`text-xs font-bold ${active ? "text-blue-900" : "text-gray-700"}`}>{wt.ar}</span>
      <span className="text-[10px] text-gray-400" dir="ltr">{wt.en}</span>
    </button>
  );

  const methodChip = (mm: (typeof MANUFACTURING_METHODS)[number], active: boolean, onClick: () => void) => (
    <button
      key={mm.id}
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl border-2 text-right transition-all flex flex-col gap-0.5 ${
        active ? "border-emerald-600 bg-emerald-50/40" : "border-gray-200 bg-white hover:border-emerald-200"
      }`}
    >
      <span className={`text-xs font-bold ${active ? "text-emerald-900" : "text-gray-700"}`}>{mm.ar}</span>
      <span className="text-[10px] text-gray-400" dir="ltr">{mm.en}</span>
    </button>
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
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
            <X className="w-5 h-5" />
          </button>
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
              <p className="text-xs font-bold text-gray-600">المادة الأساسية</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {MATERIALS.map((m) => {
                  const Icon = m.icon;
                  const active = selectedMaterialId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMaterial(m.id)}
                      className={`p-3 rounded-xl border-2 text-right transition-all ${
                        active ? "border-blue-600 bg-blue-50/30" : "border-gray-200 bg-white hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
                        <span className={`text-xs font-bold ${active ? "text-blue-900" : "text-gray-700"}`}>{m.ar}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block" dir="ltr">{m.en}</span>
                    </button>
                  );
                })}
              </div>
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
                  <p className="text-xs font-bold text-gray-600">نوع العمل</p>
                  {isZirconia ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400">أنواع العمل الأساسية</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {workTypes.filter((wt) => wt.category === "core").map((wt) => workTypeChip(wt, selectedWorkType === wt.id, () => selectWorkType(wt.id)))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400">أنواع العمل المتقدمة</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {workTypes.filter((wt) => wt.category === "advanced").map((wt) => workTypeChip(wt, selectedWorkType === wt.id, () => selectWorkType(wt.id)))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {workTypes.map((wt) => workTypeChip(wt, selectedWorkType === wt.id, () => selectWorkType(wt.id)))}
                    </div>
                  )}
                </div>

                {/* Step 3: Manufacturing method */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-600">طريقة التصنيع</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {manufacturingMethods.map((mm) => methodChip(mm, selectedManufacturingMethod === mm.id, () => setSelectedManufacturingMethod(mm.id)))}
                  </div>
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

          {/* Section 3: Pricing */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">3. التسعير والإجمالي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border space-y-2">
                <p className="text-xs font-bold">عدد الوحدات</p>
                <input
                  type="number"
                  value={singleUnitsCount}
                  onChange={(e) => setSingleUnitsCount(e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg bg-white"
                />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border space-y-2">
                <p className="text-xs font-bold">سعر الوحدة (IQD)</p>
                <input
                  type="number"
                  value={singleUnitPriceIQD}
                  onChange={(e) => setSingleUnitPriceIQD(e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg bg-white"
                />
              </div>
            </div>

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
              <div>
                <p className="text-xs text-gray-500">الإجمالي النهائي</p>
                <p className="text-lg font-bold text-blue-600">{finalTotalIQD.toLocaleString()} IQD</p>
              </div>
              <p className="text-sm font-semibold text-gray-600">${finalTotalUSD.toFixed(2)} USD</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 sticky bottom-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
            إلغاء
          </button>
          <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20">
            حفظ وإضافة الطلب
          </button>
        </div>
      </div>
    </div>
  );
}

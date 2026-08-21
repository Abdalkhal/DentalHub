import { useState } from "react";
import { X, Building2, Calendar, Sparkles, User, Stethoscope } from "lucide-react";
import {
  MATERIALS,
  WORK_TYPES,
  MANUFACTURING_METHODS,
  RULES,
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
  unitsCount: number;
  unitPriceIQD: number;
  subtotalIQD: number;
  discountAmountIQD: number;
  finalTotalIQD: number;
  finalTotalUSD: number;
  isImplant: boolean;
  scanBody: string;
  abutmentType: string;
  digitalAnalog: string;
  notes: string;
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
  const [selectedManufacturingMethod, setSelectedManufacturingMethod] = useState("cad_cam_milling");

  const [singleUnitsCount, setSingleUnitsCount] = useState("1");
  const [singleUnitPriceIQD, setSingleUnitPriceIQD] = useState("125000");

  const [isImplant, setIsImplant] = useState(false);
  const [scanBody, setScanBody] = useState("");
  const [abutmentType, setAbutmentType] = useState("");
  const [digitalAnalog, setDigitalAnalog] = useState("");

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

  const allowedWorkTypes = RULES[selectedMaterialId]?.allowedWorkTypes ?? [];
  const workTypes = WORK_TYPES.filter((wt) => allowedWorkTypes.includes(wt.id));
  const allowedMethods = RULES[selectedMaterialId]?.manufacturingRules[selectedWorkType as WorkTypeId] ?? [];
  const manufacturingMethods = MANUFACTURING_METHODS.filter((mm) => allowedMethods.includes(mm.id));

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
      unitsCount: units,
      unitPriceIQD: unitPrice,
      subtotalIQD,
      discountAmountIQD,
      finalTotalIQD,
      finalTotalUSD,
      isImplant,
      scanBody,
      abutmentType,
      digitalAnalog,
      notes,
      alignerTreatmentType: isClearAligner ? alignerTreatmentType : undefined,
      alignerArch: isClearAligner ? alignerArch : undefined,
      alignerScans: isClearAligner ? alignerScans : undefined,
      alignerCount: isClearAligner ? alignerCount : undefined,
      alignerWearProtocol: isClearAligner ? alignerWearProtocol : undefined,
      titaniumFrameworkType: isTitaniumBar ? titaniumFrameworkType : undefined,
    });
  };

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
                        <p className={`text-xs font-bold ${active ? "text-blue-900" : "text-gray-700"}`}>{m.ar}</p>
                      </div>
                      <p className="text-[10px] text-gray-400">{m.en}</p>
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
                    <p className="text-[10px] text-gray-400">Removable Overdenture</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitaniumFrameworkType("fixed_framework")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      titaniumFrameworkType === "fixed_framework" ? "border-blue-600 bg-white" : "border-gray-200 bg-white/60"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-800">هيكل ثابت</p>
                    <p className="text-[10px] text-gray-400">Fixed Framework</p>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Step 2: Work type */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-600">نوع العمل</p>
                  <div className="flex flex-wrap gap-2">
                    {workTypes.map((wt) => {
                      const active = selectedWorkType === wt.id;
                      return (
                        <button
                          key={wt.id}
                          type="button"
                          onClick={() => selectWorkType(wt.id)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                            active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          {wt.ar} <span className="text-[10px] opacity-70">({wt.en})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Manufacturing method */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-600">طريقة التصنيع</p>
                  <div className="flex flex-wrap gap-2">
                    {manufacturingMethods.map((mm) => {
                      const active = selectedManufacturingMethod === mm.id;
                      return (
                        <button
                          key={mm.id}
                          type="button"
                          onClick={() => setSelectedManufacturingMethod(mm.id)}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                            active
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                          }`}
                        >
                          {mm.ar} <span className="text-[10px] opacity-70">({mm.en})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Implant Support Toggle */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">عمل على زرعة (Implant Case)?</span>
                    <input
                      type="checkbox"
                      checked={isImplant}
                      onChange={(e) => setIsImplant(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {isImplant && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <select value={scanBody} onChange={(e) => setScanBody(e.target.value)} className="text-xs bg-white border rounded-xl p-2.5">
                        <option value="">اختر Scan Body</option>
                        <option value="dess">DESS System</option>
                      </select>
                      <select value={abutmentType} onChange={(e) => setAbutmentType(e.target.value)} className="text-xs bg-white border rounded-xl p-2.5">
                        <option value="">اختر الأبونتمت</option>
                        <option value="ti_base">Ti-Base Abutment</option>
                      </select>
                      <select value={digitalAnalog} onChange={(e) => setDigitalAnalog(e.target.value)} className="text-xs bg-white border rounded-xl p-2.5">
                        <option value="">اختر الأنالوج</option>
                        <option value="printed">3D Printed Model Analog</option>
                      </select>
                    </div>
                  )}
                </div>
              </>
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

            {/* Notes Section */}
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

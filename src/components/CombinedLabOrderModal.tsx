import { useState } from "react";
import { X, Building2, Calendar, Sparkles, User, Stethoscope } from "lucide-react";

export type CombinedLabOrder = {
  patientName: string;
  doctorName: string;
  clinicName: string;
  deliveryDate: string;
  material: string;
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: CombinedLabOrder) => void;
};

const MATERIALS = [
  { id: "zirconia", title: "زيركون", sub: "Zirconia" },
  { id: "emax", title: "إيماكس", sub: "E-Max" },
  { id: "pfm", title: "سيراميك على معدن", sub: "PFM / Ceramic" },
  { id: "build_up", title: "طبقات", sub: "Layered / Build Up" },
];

export function CombinedLabOrderModal({ open, onClose, onSubmit }: Props) {
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  const [singleMaterial, setSingleMaterial] = useState("zirconia");
  const [singleUnitsCount, setSingleUnitsCount] = useState("1");
  const [singleUnitPriceIQD, setSingleUnitPriceIQD] = useState("125000");

  const [isImplant, setIsImplant] = useState(false);
  const [scanBody, setScanBody] = useState("");
  const [abutmentType, setAbutmentType] = useState("");
  const [digitalAnalog, setDigitalAnalog] = useState("");

  const [notes, setNotes] = useState("");

  if (!open) return null;

  const units = Number(singleUnitsCount) || 0;
  const unitPrice = Number(singleUnitPriceIQD) || 0;
  const subtotalIQD = units * unitPrice;
  const discountAmountIQD = 0;
  const finalTotalIQD = subtotalIQD - discountAmountIQD;
  const finalTotalUSD = finalTotalIQD / 1480;

  const handleSubmit = () => {
    onSubmit({
      patientName,
      doctorName,
      clinicName,
      deliveryDate,
      material: singleMaterial,
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
              <p className="text-xs text-gray-500">قم بتسعير حالتك واختيار تفاصيل المواد والزرعات بدقة عالية</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
          {/* Top Basic Info Bar (Includes Patient & Doctor) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
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

          {/* Work Specifications */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">1. المادة الأساسية والتصنيع</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MATERIALS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSingleMaterial(item.id)}
                  className={`p-3 rounded-xl border-2 text-right transition-all ${
                    singleMaterial === item.id ? "border-blue-600 bg-blue-50/30 text-blue-900" : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  <p className="text-xs font-bold">{item.title}</p>
                  <p className="text-[10px] text-gray-400">{item.sub}</p>
                </button>
              ))}
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
          </div>

          {/* Pricing Summary */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">2. التسعير والإجمالي</h3>
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

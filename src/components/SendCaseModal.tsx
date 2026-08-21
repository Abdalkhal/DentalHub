import { useState, useRef } from "react";
import { X, Send, Loader2, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { submitDentistCase, type OrderAttachment } from "@/lib/ordersStore";
import { createNotification } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { storage } from "@/integrations/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type SendCaseModalProps = {
  labId: string;
  labName: string;
  open: boolean;
  onClose: () => void;
};

const WORK_TYPES = [
  "crown", "veneer", "bridge", "implant",
  "clear_aligner", "denture", "ortho",
];

const WORK_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "فينير", en: "Veneer" },
  bridge: { ar: "جسر", en: "Bridge" },
  implant: { ar: "زراعة", en: "Implant" },
  clear_aligner: { ar: "مقوّم شفاف", en: "Clear Aligner" },
  denture: { ar: "طقم أسنان", en: "Denture" },
  ortho: { ar: "تقويم", en: "Ortho" },
};

const VITA_SHADES = [
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

const MATERIALS = [
  { id: "pfm", ar: "PFM (معدن-سيراميك)", en: "PFM (Metal-Ceramic)" },
  { id: "emax", ar: "Emax (سيراميك)", en: "Emax (Lithium Disilicate)" },
  { id: "zirconia", ar: "زركونيا", en: "Zirconia" },
  { id: "full_zirconia", ar: "زركونيا كامل", en: "Full Zirconia" },
  { id: "full_metal", ar: "معدن كامل", en: "Full Metal" },
  { id: "acrylic", ar: "أكريليك", en: "Acrylic" },
  { id: "peek", ar: "PEEK", en: "PEEK" },
  { id: "hybrid", ar: "هجين", en: "Hybrid" },
];

export function SendCaseModal({ labId, labName, open, onClose }: SendCaseModalProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [workType, setWorkType] = useState("crown");
  const [material, setMaterial] = useState("zirconia");
  const [shade, setShade] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [unitsCount, setUnitsCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [clinic, setClinic] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length + files.length > 10) {
      setError(ar ? "الحد الأقصى 10 ملفات" : "Maximum 10 files");
      return;
    }
    setError(null);
    const newUrls = selected.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selected]);
    setFilePreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const removeFile = (idx: number) => {
    URL.revokeObjectURL(filePreviewUrls[idx]);
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFilePreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadFiles = async (caseId: string): Promise<OrderAttachment[]> => {
    if (files.length === 0) return [];
    const attachments: OrderAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `case_scans/${labId}/${caseId}/scan_${i + 1}.${ext}`;
      const fileRef = ref(storage, path);
      const snap = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snap.ref);
      attachments.push({ name: file.name, url, type: ext });
    }
    return attachments;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!patient.trim()) {
      setError(ar ? "الرجاء إدخال اسم المريض" : "Please enter patient name");
      return;
    }
    if (!dueDate) {
      setError(ar ? "الرجاء تحديد تاريخ التسليم" : "Please select due date");
      return;
    }

    setBusy(true);
    setUploading(files.length > 0);
    try {
      const order = await submitDentistCase(labId, {
        patient: patient.trim(),
        doctor: doctor.trim() || (ar ? "غير محدد" : "Unspecified"),
        workType,
        dueDate,
        unitsCount: parseInt(unitsCount, 10) || 1,
        notes: notes.trim(),
        clinic: clinic.trim() || (ar ? "غير محدد" : "Unspecified"),
        dentistId: user?.uid ?? "unknown",
        dentistName: user?.displayName ?? user?.email ?? (ar ? "طبيب" : "Dentist"),
        shade: shade || undefined,
        material,
      });

      const attachments = await uploadFiles(order.id);

      if (attachments.length > 0) {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/integrations/firebase/client");
        await setDoc(doc(db, "lab_orders", labId, "cases", order.id), {
          ...order,
          attachments,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      try {
        await createNotification({
          userId: labId,
          title: ar ? "طلب حالة جديدة" : "New Case Request",
          body: ar
            ? `قام د. ${order.doctor} بطلب حالة جديدة للمريض ${order.patient}.`
            : `Dr. ${order.doctor} requested a new case for patient ${order.patient}.`,
          type: "order_new",
          orderId: order.id,
        });
      } catch {}

      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || (ar ? "فشل الإرسال. حاول مرة أخرى." : "Failed to send. Try again."));
    } finally {
      setBusy(false);
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom">
          <div className="text-center space-y-3">
            <div className="size-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <Send className="size-8 text-emerald-600" />
            </div>
            <p className="font-bold text-lg text-slate-800">
              {ar ? "تم إرسال الحالة بنجاح!" : "Case sent successfully!"}
            </p>
            <p className="text-sm text-slate-500">
              {ar ? `سيستلم ${labName} الحالة وسيتم إعلامك بالتحديثات` : `${labName} will receive the case and update you`}
            </p>
            <button
              onClick={onClose}
              className="mt-2 h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
            >
              {ar ? "حسناً" : "OK"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pb-3 border-b z-10">
          <h2 className="font-bold text-lg text-slate-800">
            {ar ? "إرسال حالة إلى المختبر" : "Send Case to Lab"}
          </h2>
          <button onClick={onClose} className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <X className="size-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">{ar ? `إلى: ${labName}` : `To: ${labName}`}</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {ar ? "اسم المريض *" : "Patient name *"}
            </label>
            <input
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              placeholder={ar ? "أدخل اسم المريض" : "Enter patient name"}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {ar ? "نوع العمل" : "Work type"}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {WORK_TYPES.map((wt) => (
                <button
                  key={wt}
                  type="button"
                  onClick={() => setWorkType(wt)}
                  className={cn(
                    "h-9 rounded-xl text-[11px] font-semibold border transition-all",
                    workType === wt
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                  )}
                >
                  {ar ? WORK_TYPE_LABELS[wt]?.ar ?? wt : WORK_TYPE_LABELS[wt]?.en ?? wt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {ar ? "نوع المادة" : "Material"}
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                {MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>{ar ? m.ar : m.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {ar ? "عدد الوحدات" : "Units"}
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={unitsCount}
                onChange={(e) => setUnitsCount(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              {ar ? "درجة اللون (Vita Classical)" : "Shade (Vita Classical)"}
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              {VITA_SHADES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setShade(shade === s.code ? "" : s.code)}
                  className={cn(
                    "relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center",
                    shade === s.code
                      ? "border-primary scale-110 shadow-md z-10 ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-400",
                  )}
                >
                  <span className="size-5 rounded-full border border-slate-300" style={{ background: s.hex }} />
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">{s.code}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {ar ? "اسم الطبيب" : "Doctor name"}
              </label>
              <input
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder={ar ? "اسم الطبيب المحوّل" : "Referring doctor"}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {ar ? "تاريخ التسليم *" : "Due date *"}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {ar ? "اسم العيادة" : "Clinic name"}
            </label>
            <input
              value={clinic}
              onChange={(e) => setClinic(e.target.value)}
              placeholder={ar ? "اسم العيادة" : "Clinic name"}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {ar ? "تحميل ملفات (مسح ضوئي / أشعة / صور) — حتى 10 ملفات" : "Upload scans (STL / CBCT / images) — up to 10 files"}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.stl,.ply,.obj,.dcm"
              onChange={handleFileSelect}
              className="hidden"
            />

            {filePreviewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {filePreviewUrls.map((url, i) => (
                  <div key={i} className="relative group size-16 rounded-xl overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="size-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-0.5 end-0.5 size-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 10}
              className="w-full h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-primary transition disabled:opacity-50"
            >
              <Upload className="size-5" />
              <span className="text-[11px] font-semibold">
                {ar ? "اضغط لتحميل الملفات" : "Tap to upload files"}
              </span>
              <span className="text-[9px] text-slate-300">
                {files.length}/10 · STL · DCM · JPG · PNG
              </span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {ar ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={ar ? "تعليمات خاصة، ملاحظات سريرية..." : "Special instructions, clinical notes..."}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full h-12 mt-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {uploading ? (ar ? "جارٍ رفع الملفات..." : "Uploading files...") : ar ? "جارٍ الإرسال..." : "Sending..."}
            </>
          ) : (
            <>
              <Send className="size-4" />
              {ar ? "إرسال الحالة" : "Send Case"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

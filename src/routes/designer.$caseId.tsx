import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { useDesignerCases, useDesignerCase } from "@/lib/designerStore";
import { uploadCaseFile } from "@/lib/storagePipeline";
import type { OrderAttachment } from "@/lib/ordersStore";
import { cn } from "@/lib/utils";
import { Loader2, Upload, FileBox, User, Stethoscope, Hash } from "lucide-react";

export const Route = createFileRoute("/designer/$caseId")({
  component: DesignerCaseDetail,
});

export function DesignerCaseDetail() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { caseId } = Route.useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { cases } = useDesignerCases(user?.uid || "");
  const match = cases.find((c) => c.order.id === caseId);
  const labId = match?.labId ?? "";

  const { order, loading } = useDesignerCase(labId, caseId);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !order) return;
    setError(null);
    setUploading(true);
    try {
      const newDesigns: OrderAttachment[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadCaseFile({
          labId,
          caseId,
          file,
          fileName: file.name,
          dentistId: order.dentistId ?? "",
          designerId: user.uid,
          kind: "design",
        });
        newDesigns.push({ name: file.name, url: res.url, type: "stl" });
      }
      const merged = [...(order.designs ?? []), ...newDesigns];
      await setDoc(
        doc(db, "lab_orders", labId, "cases", caseId),
        { designs: merged },
        { merge: true },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || (ar ? "فشل رفع الملف" : "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "تفاصيل الحالة" : "Case details"} showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  if (!order) {
    return (
      <MobileShell>
        <TopBar title={ar ? "تفاصيل الحالة" : "Case details"} showBack />
        <div className="p-6 text-center text-slate-400">
          <p className="font-semibold">
            {ar ? "الحالة غير موجودة أو غير مسندة إليك" : "Case not found or not assigned to you"}
          </p>
          <Link to="/designer" className="text-primary text-xs font-bold mt-2 inline-block">
            {ar ? "العودة لقائمة الحالات" : "Back to my cases"}
          </Link>
        </div>
      </MobileShell>
    );
  }

  const stlFiles = [...(order.attachments ?? []), ...(order.designs ?? [])];

  return (
    <MobileShell>
      <TopBar title={`${ar ? "الحالة" : "Case"} #${order.caseId || order.orderNumber}`} showBack />

      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* Patient / doctor / case id */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 text-slate-400" />
            <span className="font-bold text-slate-800">
              {order.patient || (ar ? "غير محدد" : "Unspecified")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Stethoscope className="size-4" />
            {order.doctor}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Hash className="size-4" />
            <span dir="ltr">{order.id}</span>
          </div>
        </div>

        {/* Rx */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">
            {ar ? "الوصفة (Rx)" : "Rx"}
          </p>
          <p className="text-sm text-slate-700">
            {order.workType || (ar ? "غير محدد" : "Unspecified")}
          </p>
          {order.rxItems && order.rxItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {order.rxItems.map((it, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold"
                >
                  {it}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* .stl files */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">
            {ar ? "ملفات التصميم (.stl)" : "Design files (.stl)"}
          </p>
          {stlFiles.length === 0 ? (
            <p className="text-xs text-slate-400">{ar ? "لا توجد ملفات بعد" : "No files yet"}</p>
          ) : (
            <ul className="space-y-2">
              {stlFiles.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <FileBox className="size-4 text-sky-500 shrink-0" />
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 underline truncate"
                  >
                    {f.name}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".stl,.ply,.obj,model/stl"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full h-11 mt-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50",
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {ar ? "جارٍ الرفع..." : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="size-4" />
                {ar ? "رفع ملف التصميم النهائي" : "Upload finished design"}
              </>
            )}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

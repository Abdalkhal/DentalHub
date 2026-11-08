import { useState } from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { useClinics } from "@/lib/clinicsStore";
import {
  exportErrorMessage,
  exportStage,
  formatExportSize,
  hoursUntil,
  startDataExport,
  useDataExport,
} from "@/lib/dataExport";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

/** "تصدير بياناتي": lets a dentist take every patient file with them. */
export function DataExportCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics } = useClinics();
  const data = useDataExport(user?.uid);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const now = Date.now();
  const view = exportStage(data, now);
  const canRequest = view.stage === "idle" || view.stage === "failed";

  const start = async () => {
    if (!password) {
      setError(ar ? "أدخل كلمة المرور للتأكيد" : "Enter your password to confirm");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await startDataExport(password, clinicId);
      setPassword("");
    } catch (err) {
      setError(exportErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <p className="text-xs font-bold text-muted-foreground mb-2 px-1">{ar ? "بياناتي" : "My data"}</p>
      <div className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-3">
        <div className="flex items-start gap-3">
          <span className="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileArchive className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{ar ? "تصدير بياناتي" : "Export my data"}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {ar
                ? "ملف ZIP فيه قائمة المرضى بصيغة Excel، وملف PDF لكل مريض، وكل صور الأشعة والحالات."
                : "A ZIP with an Excel list of patients, a PDF for each patient, and all X-rays and case photos."}
            </p>
          </div>
        </div>

        {view.stage === "working" && (
          <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-800">
            <Loader2 className="size-4 animate-spin shrink-0" />
            {ar ? "يجري تجهيز ملفك. يمكنك إغلاق الصفحة وسيصلك إشعار عندما يجهز." : "Preparing your file. You can leave this page; you will be notified."}
          </p>
        )}

        {view.stage === "ready" && (
          <div className="rounded-xl bg-emerald-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-900">
              {ar
                ? `ملفك جاهز: ${data?.patients ?? 0} مريض، ${data?.files ?? 0} صورة وملف (${formatExportSize(data?.sizeBytes)}).`
                : `Ready: ${data?.patients ?? 0} patients, ${data?.files ?? 0} images and files (${formatExportSize(data?.sizeBytes)}).`}
            </p>
            {!!data?.missing && (
              <p className="text-[11px] text-amber-800">
                {ar
                  ? `تعذر العثور على ${data.missing} ملف. أسماؤها في «اقرأني.txt» داخل الملف.`
                  : `${data.missing} file(s) could not be found. They are listed in the file's readme.`}
              </p>
            )}
            <a
              href={view.url}
              download
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Download className="size-4" />
              {ar ? "تحميل الملف" : "Download file"}
            </a>
            <p className="text-[10px] text-emerald-800">
              {ar
                ? `يُحذف الرابط بعد ${hoursUntil(view.expiresAt, now)} ساعة. لا تشاركه مع أحد.`
                : `The link is removed in ${hoursUntil(view.expiresAt, now)} hour(s). Do not share it.`}
            </p>
          </div>
        )}

        {view.stage === "failed" && (
          <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {ar ? "تعذر تجهيز آخر ملف. حاول مرة أخرى." : "The last export failed. Please try again."}
          </p>
        )}

        {view.stage === "cooldown" && (
          <p className="rounded-xl bg-muted p-3 text-xs font-semibold text-muted-foreground">
            {ar
              ? `يمكنك طلب تصدير جديد بعد ${hoursUntil(view.nextAt, now)} ساعة.`
              : `You can request a new export in ${hoursUntil(view.nextAt, now)} hour(s).`}
          </p>
        )}

        {canRequest && (
          <>
            {clinics.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {[{ id: null as string | null, name: ar ? "كل العيادات" : "All clinics" }, ...clinics.map((c) => ({ id: c.id as string | null, name: c.name }))].map((c) => (
                  <button
                    key={c.id ?? "all"}
                    type="button"
                    onClick={() => setClinicId(c.id)}
                    className={cn(
                      "h-8 px-3 rounded-full border text-[11px] font-bold",
                      clinicId === c.id ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder={ar ? "كلمة المرور للتأكيد" : "Password to confirm"}
              className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileArchive className="size-4" />}
              {ar ? "تجهيز ملف بياناتي" : "Prepare my file"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

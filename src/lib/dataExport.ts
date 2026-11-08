// "تصدير بياناتي": a dentist asks for a ZIP of their patient records, built by
// functions/index.js (requestDataExport / buildDataExport). Identical in the
// web app and the native app (src/lib/dataExport.ts).
import { useEffect, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";

export type DataExport = {
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  clinicId?: string | null;
  requestedAt: number;
  downloadUrl?: string;
  expiresAt?: number;
  sizeBytes?: number;
  patients?: number;
  files?: number;
  missing?: number;
};

const HOUR = 60 * 60 * 1000;
// Same limits as functions/index.js.
const COOLDOWN = 24 * HOUR;
const STALE = 15 * 60 * 1000;

export type ExportStage =
  | { stage: "idle" }
  | { stage: "working" }
  | { stage: "failed" }
  // Ready to download, and/or when the next export may be requested.
  | { stage: "ready"; url: string; expiresAt: number; nextAt: number }
  | { stage: "cooldown"; nextAt: number };

export function exportStage(d: DataExport | null, now: number): ExportStage {
  if (!d) return { stage: "idle" };
  const nextAt = d.requestedAt + COOLDOWN;
  if (d.status === "pending" || d.status === "processing") {
    return now - d.requestedAt < STALE ? { stage: "working" } : { stage: "failed" };
  }
  if (d.status === "failed") return { stage: "failed" };
  if (d.status === "ready" && d.downloadUrl && (d.expiresAt ?? 0) > now) {
    return { stage: "ready", url: d.downloadUrl, expiresAt: d.expiresAt ?? 0, nextAt };
  }
  return now < nextAt ? { stage: "cooldown", nextAt } : { stage: "idle" };
}

export function useDataExport(uid: string | undefined): DataExport | null {
  const [data, setData] = useState<DataExport | null>(null);
  useEffect(() => {
    if (!uid) {
      setData(null);
      return;
    }
    return onSnapshot(
      doc(db, "data_exports", uid),
      (snap) => setData(snap.exists() ? (snap.data() as DataExport) : null),
      (err) => console.warn("Export status not loaded:", err),
    );
  }, [uid]);
  return data;
}

/** Re-enters the password, then asks the server to build the export. */
export async function startDataExport(password: string, clinicId: string | null): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("No user");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await user.getIdToken(true);
  await httpsCallable(getFunctions(app), "requestDataExport")({ clinicId });
}

export function exportErrorMessage(err: unknown, ar: boolean): string {
  const { code = "", message = "" } = (err ?? {}) as { code?: string; message?: string };
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return ar ? "كلمة المرور غير صحيحة" : "Incorrect password";
  }
  if (code === "auth/too-many-requests") {
    return ar ? "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً" : "Too many attempts. Wait a moment and try again";
  }
  if (message === "no-data") return ar ? "لا يوجد مرضى لتصديرهم" : "There are no patients to export";
  if (message === "once-a-day") return ar ? "يمكن التصدير مرة واحدة في اليوم" : "You can export once a day";
  if (message === "in-progress") return ar ? "يجري تجهيز ملفك الآن" : "Your file is being prepared";
  return ar ? "تعذر بدء التصدير. تحقق من الاتصال وحاول مجدداً" : "Could not start the export. Check your connection and retry";
}

export function formatExportSize(bytes: number | undefined): string {
  const mb = (bytes ?? 0) / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.max(mb, 0.1).toFixed(1)} MB`;
}

/** Whole hours from now, at least 1: "خلال 5 ساعات" reads fine rounded up. */
export function hoursUntil(at: number, now: number): number {
  return Math.max(1, Math.ceil((at - now) / HOUR));
}

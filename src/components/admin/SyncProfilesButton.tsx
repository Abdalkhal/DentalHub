import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

// Rebuilds the public directory copy (`public_profiles`) of every account.
// The Cloud Function keeps it in sync on every change; this is for accounts
// that existed before that function, or to repair drift.
export function SyncProfilesButton({ ar }: { ar: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [count, setCount] = useState(0);
  const run = async () => {
    setState("busy");
    try {
      const call = httpsCallable<Record<string, never>, { copied: number }>(
        getFunctions(),
        "backfillPublicProfiles",
      );
      const { data } = await call({});
      setCount(data.copied);
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "busy"}
      className="h-8 px-3 rounded-full text-[11px] font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60"
    >
      {state === "busy"
        ? ar
          ? "جارٍ المزامنة..."
          : "Syncing..."
        : state === "done"
          ? ar
            ? `تمت مزامنة ${count}`
            : `Synced ${count}`
          : state === "error"
            ? ar
              ? "فشلت المزامنة — أعد المحاولة"
              : "Sync failed — retry"
            : ar
              ? "مزامنة الملفات العامة"
              : "Sync public profiles"}
    </button>
  );
}

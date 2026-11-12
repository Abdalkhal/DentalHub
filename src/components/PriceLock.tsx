import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSession, useUserRole } from "@/lib/useAuth";
import { productsQueryKey } from "@/lib/products";
import { myPriceAccessKey, requestPriceAccess, resetPriceCache, useMyPriceAccess } from "@/lib/priceAccess";
import { cn } from "@/lib/utils";

/**
 * Shown instead of a price (and the add-to-cart button) on a product whose
 * office shows prices to approved doctors only. One click asks the office; the
 * request covers all of that office's products. Same as the native PriceLock.
 */
export function PriceLock({ officeId, compact = false, className }: { officeId?: string; compact?: boolean; className?: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: access, isLoading } = useMyPriceAccess(user ? officeId : undefined);
  const [busy, setBusy] = useState(false);
  const isDoctor = role?.accountType === "dentist";

  // Approved since these prices were read: read them again.
  useEffect(() => {
    if (access?.status !== "approved") return;
    resetPriceCache();
    void qc.invalidateQueries({ queryKey: productsQueryKey });
  }, [access?.status, qc]);

  const box = cn(
    "inline-flex items-center gap-1.5 rounded-xl font-bold",
    compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
    className,
  );
  const icon = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  if (!officeId) return null;
  if (user && (isLoading || access?.status === "approved")) {
    return <Loader2 className={cn(icon, "animate-spin text-primary")} />;
  }
  if (access) {
    // Pending, or declined: the doctor isn't told it was declined.
    return (
      <span className={cn(box, "bg-amber-50 text-amber-700")}>
        <Clock className={icon} />
        {ar ? "تم إرسال طلبك" : "Request sent"}
      </span>
    );
  }
  if (user && !isDoctor) {
    return (
      <span className={cn(box, "bg-slate-100 text-slate-500")}>
        <Lock className={icon} />
        {ar ? "السعر للأطباء المعتمدين" : "Price for approved doctors"}
      </span>
    );
  }

  const ask = async (e: React.MouseEvent) => {
    // Usually sits inside a clickable product card.
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const name = [role?.name, role?.surname].filter(Boolean).join(" ");
      await requestPriceAccess(officeId, name ? (ar ? `د. ${name}` : `Dr. ${name}`) : "", ar);
      await qc.invalidateQueries({ queryKey: myPriceAccessKey(officeId) });
      toast.success(ar ? "أُرسل طلبك، ستصلك رسالة عند الموافقة" : "Sent. You'll be notified when approved");
    } catch {
      toast.error(ar ? "تعذّر إرسال الطلب" : "Couldn't send the request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={ask}
      disabled={busy}
      className={cn(box, "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-60")}
    >
      {busy ? <Loader2 className={cn(icon, "animate-spin")} /> : <Lock className={icon} />}
      {!user ? (ar ? "سجّل الدخول لرؤية السعر" : "Sign in to see the price") : ar ? "اطلب السعر" : "Request price"}
    </button>
  );
}

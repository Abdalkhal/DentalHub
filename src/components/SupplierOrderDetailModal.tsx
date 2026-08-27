import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  Package,
  Building2,
  Phone,
  MapPin,
  Check,
  User,
  ReceiptText,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import { useProducts, useSignedImageUrls, productsQueryKey } from "@/lib/products";
import {
  updateOrderItemAvailability,
  confirmOrder,
  markOrderUnavailable,
  ordersQueryKey,
} from "@/lib/orders";
import type { OrderDoc } from "@/integrations/firebase/types";
import { toast } from "sonner";

const TEAL = "#0E6E66";

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

export function SupplierOrderDetailModal({
  order,
  onClose,
}: {
  order: OrderDoc;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [acting, setActing] = useState<"confirm" | "reject" | null>(null);

  const { data: products = [] } = useProducts();
  const productById = new Map(products.map((p) => [p.id, p]));
  const imagePaths = (order.items ?? [])
    .map((it) => productById.get(it.productId)?.images?.[0])
    .filter((x): x is string => !!x);
  const { data: imageUrlMap = {} } = useSignedImageUrls(imagePaths);
  const imageOf = (productId: string) => {
    const path = productById.get(productId)?.images?.[0];
    return path ? imageUrlMap[path] : undefined;
  };

  const storeName = role?.name || (ar ? "مكتب المستلزمات الطبية" : "Medical Supplies Store");
  const storePhone = role?.phone || "";
  const storeAddress = [role?.address, role?.city].filter(Boolean).join("، ");
  const doctorLocation = order.dentistAddress || "";
  const iqdTotal = (order.items ?? [])
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const usdTotal = (order.items ?? [])
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);

  const isPending = order.status === "pending";

  const handleAvailability = async (index: number, value: "available" | "not_available") => {
    setBusyIdx(index);
    try {
      await updateOrderItemAvailability(order.id, index, value);
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    } catch {
      toast.error(ar ? "فشل تحديث التوفر" : "Failed to update availability");
    } finally {
      setBusyIdx(null);
    }
  };

  const handleConfirm = async () => {
    setActing("confirm");
    try {
      await confirmOrder(order);
      toast.success(ar ? "تم تأكيد الطلب ونقله إلى فواتير الأطباء" : "Order confirmed and moved to doctor invoices");
      queryClient.invalidateQueries({ queryKey: [ordersQueryKey, "dentist"] });
      queryClient.invalidateQueries({ queryKey: [ordersQueryKey, "supplier"] });
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      onClose();
    } catch (e: unknown) {
      toast.error(ar ? "فشل تأكيد الطلب" : "Failed to confirm order");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    setActing("reject");
    try {
      await markOrderUnavailable(order.id);
      toast.success(ar ? "تم تحديد الطلب كغير متوفر" : "Order marked as unavailable");
      queryClient.invalidateQueries({ queryKey: [ordersQueryKey, "supplier"] });
      onClose();
    } catch (e: unknown) {
      toast.error(ar ? "فشل تحديث الطلب" : "Failed to update order");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-6 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom bg-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 bg-white border-b border-slate-200">
          <h3 className="font-display font-extrabold text-base text-slate-900">
            {ar ? "تفاصيل الطلب" : "Order Details"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Store header */}
          <div
            className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #0B5952)` }}
          >
            <div className="absolute -top-12 -end-12 size-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white/80 text-[11px] font-mono">
                    <ReceiptText className="size-3.5" />
                    {order.orderNumber || ""}
                  </div>
                  <p className="font-display font-extrabold text-xl mt-1.5 truncate">{storeName}</p>
                  <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                    <Building2 className="size-3.5 shrink-0" />
                    {ar ? "مكتب المستلزمات الطبية" : "Medical Supplies Store"}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                  {isPending
                    ? ar
                      ? "قيد الانتظار"
                      : "Pending"
                    : order.status === "confirmed"
                      ? ar
                        ? "تم التأكيد"
                        : "Confirmed"
                      : ar
                        ? "غير متوفر"
                        : "Unavailable"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/15 text-xs text-white/85">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  {storePhone || <span className="text-white/60">—</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {storeAddress || <span className="text-white/60">—</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <ReceiptText className="size-3.5 shrink-0" />
                  {fmtDate(order.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Doctor information */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <User className="size-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">
                {ar ? "معلومات الطبيب" : "Doctor Information"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="px-4 py-3 border-b sm:border-b-0 sm:border-e border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "اسم الطبيب" : "Doctor Name"}</p>
                <p className="text-sm font-semibold text-slate-800">{order.dentistName}</p>
              </div>
              <div className="px-4 py-3 border-b sm:border-b-0 border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "اسم العيادة" : "Clinic Name"}</p>
                <p className="text-sm font-semibold text-slate-800">{order.clinicName || order.dentistName}</p>
              </div>
              <div className="px-4 py-3 border-b sm:border-b-0 sm:border-e border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "رقم الهاتف" : "Phone Number"}</p>
                <p className="text-sm font-semibold text-slate-800" dir="ltr">{order.dentistPhone || "—"}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "الموقع / العنوان" : "Delivery Location"}</p>
                <p className="text-sm font-semibold text-slate-800">{doctorLocation || "—"}</p>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div
                  className="grid grid-cols-[minmax(180px,1.4fr)_48px_100px_120px_150px] items-center gap-2 px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100"
                  style={{ backgroundColor: `${TEAL}08` }}
                >
                  <span>{ar ? "المنتج" : "Product"}</span>
                  <span className="text-center">{ar ? "الكمية" : "Qty"}</span>
                  <span className="text-center">{ar ? "السعر" : "Price"}</span>
                  <span className="text-end">{ar ? "الإجمالي" : "Total"}</span>
                  <span className="text-center">{ar ? "التوفر" : "Availability"}</span>
                </div>

                {(order.items ?? []).map((item, idx) => {
                  const avail = item.availability;
                  return (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="grid grid-cols-[minmax(180px,1.4fr)_48px_100px_120px_150px] items-center gap-2 px-4 py-3 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {imageOf(item.productId) ? (
                          <img src={imageOf(item.productId)} alt="" className="size-11 rounded-lg object-cover bg-slate-100 shrink-0" />
                        ) : (
                          <span className="size-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="size-5 text-slate-400" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-slate-700 text-center">{item.quantity}</span>

                      <span className="text-xs text-slate-500 text-center">
                        {item.currency === "IQD" ? fmtIqd(item.price) : fmtUsd(item.price)}
                      </span>

                      <span className="text-sm font-display font-extrabold text-end" style={{ color: TEAL }}>
                        {item.currency === "IQD" ? fmtIqd(item.price * item.quantity) : fmtUsd(item.price * item.quantity)}
                      </span>

                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          type="button"
                          onClick={() => handleAvailability(idx, "available")}
                          disabled={busyIdx === idx || !isPending}
                          className="h-8 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition border disabled:opacity-40"
                          style={
                            avail === "available"
                              ? { backgroundColor: "#059669", color: "#fff", borderColor: "#059669" }
                              : { color: "#059669", borderColor: "#05966933", backgroundColor: "#0596690D" }
                          }
                        >
                          <Check className="size-3" />
                          {ar ? "متوفر" : "Avail."}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAvailability(idx, "not_available")}
                          disabled={busyIdx === idx || !isPending}
                          className="h-8 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition border disabled:opacity-40"
                          style={
                            avail === "not_available"
                              ? { backgroundColor: "#e11d48", color: "#fff", borderColor: "#e11d48" }
                              : { color: "#e11d48", borderColor: "#e11d4833", backgroundColor: "#e11d480D" }
                          }
                        >
                          <X className="size-3" />
                          {ar ? "غير متوفر" : "Unavail."}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
            <p className="text-sm font-bold text-slate-700">{ar ? "ملخص الطلب" : "Order summary"}</p>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{ar ? "الإجمالي بالدينار" : "Total (IQD)"}</span>
                <span className="font-semibold">{fmtIqd(iqdTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{ar ? "الإجمالي بالدولار" : "Total (USD)"}</span>
                <span className="font-semibold">{fmtUsd(usdTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        {isPending && (
          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={acting !== null}
                className="flex-1 h-12 rounded-2xl text-white font-display font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {acting === "confirm" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {ar ? "تم التأكيد" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={acting !== null}
                className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 text-rose-600 font-display font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-rose-50 transition disabled:opacity-60"
              >
                {acting === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                {ar ? "المنتج غير متوفر" : "Unavailable"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

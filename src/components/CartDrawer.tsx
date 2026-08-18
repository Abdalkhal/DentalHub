import { useState } from "react";
import {
  X,
  Trash2,
  ShoppingCart,
  Loader2,
  Printer,
  Share2,
  ReceiptText,
  StickyNote,
  TicketPercent,
  Check,
  Package,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, removeFromCart } from "@/lib/cartStore";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { useUserRole, useSession } from "@/lib/useAuth";
import { placeCartOrder } from "@/lib/orders";
import { findPromoCode, isPromoValid, computeDiscount, type DiscountResult } from "@/lib/promo";
import { toast } from "sonner";

const TEAL = "#0E6E66";
const DELIVERY_IQD = 0;
const TAX_RATE = 0; // percent

export function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -end-1 size-5 rounded-full bg-[#0E6E66] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const cart = useCart();
  const navigate = useNavigate();
  const { user } = useSession();
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<DiscountResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [draftNo] = useState(() => `DNT-${Math.floor(1000 + Math.random() * 9000)}`);

  if (!open) return null;

  const officeIds = [...new Set(cart.map((i) => i.officeId).filter(Boolean))];
  const officeNames = [...new Set(cart.map((i) => i.officeName).filter(Boolean))];
  const storeName =
    officeNames.length === 1
      ? officeNames[0]
      : ar
        ? `${officeNames.length} مكاتب`
        : `${officeNames.length} offices`;

  const today = new Date();
  const dateLabel = ar
    ? today.toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })
    : today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const iqdSubtotal = cart
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const usdSubtotal = cart
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const discountUSD = applied?.discountUSD ?? 0;
  const discountIQD = applied?.discountIQD ?? 0;

  const taxIQD = (iqdSubtotal - discountIQD) * (TAX_RATE / 100);
  const taxUSD = (usdSubtotal - discountUSD) * (TAX_RATE / 100);

  const iqdTotal = Math.max(0, iqdSubtotal - discountIQD) + DELIVERY_IQD + taxIQD;
  const usdTotal = Math.max(0, usdSubtotal - discountUSD) + taxUSD;

  const handleApplyPromo = async () => {
    setPromoError("");
    if (!promoInput.trim()) return;
    setApplying(true);
    try {
      const promo = await findPromoCode(promoInput);
      if (!promo) {
        setPromoError(ar ? "رمز الخصم غير صالح" : "Invalid discount code");
        setApplied(null);
        return;
      }
      if (!isPromoValid(promo)) {
        setPromoError(ar ? "انتهت صلاحية الرمز" : "This code has expired");
        setApplied(null);
        return;
      }
      const d = computeDiscount(promo, officeIds, iqdSubtotal, usdSubtotal);
      if (d.discountUSD === 0 && d.discountIQD === 0) {
        setPromoError(ar ? "الرمز غير مطبق على هذه السلة" : "Code not applicable to this cart");
        setApplied(null);
        return;
      }
      setApplied({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        currency: promo.currency,
        ...d,
      });
      toast.success(ar ? "تم تطبيق الخصم" : "Discount applied");
    } catch (e: any) {
      setPromoError(e?.message || String(e));
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    const lines = cart.map(
      (i) =>
        `• ${i.productName} ×${i.quantity} — ${
          i.currency === "IQD" ? fmtIqd(i.unitPrice * i.quantity) : fmtUsd(i.unitPrice * i.quantity)
        }`,
    );
    const text = [
      storeName,
      dateLabel,
      ...lines,
      ar ? `الإجمالي بالدينار: ${fmtIqd(iqdTotal)}` : `IQD total: ${fmtIqd(iqdTotal)}`,
      ar ? `الإجمالي بالدولار: ${fmtUsd(usdTotal)}` : `USD total: ${fmtUsd(usdTotal)}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: ar ? "سلة التسوق" : "Shopping Cart", text });
      } catch {}
    } else {
      try {
        await navigator.clipboard?.writeText(text);
        toast.success(ar ? "تم نسخ ملخص السلة" : "Cart summary copied");
      } catch {
        toast.error(ar ? "تعذرت المشاركة" : "Share failed");
      }
    }
  };

  const handleComplete = async () => {
    if (!user || cart.length === 0) return;
    setPlacing(true);
    try {
      await placeCartOrder(
        {
          id: user.uid,
          name: role?.name || (ar ? "طبيب أسنان" : "Dentist"),
          phone: role?.phone,
          address: role?.address,
          city: role?.city,
          clinicName: role?.clinicName,
        },
        {
          note: note.trim() || undefined,
          discount: applied
            ? {
                code: applied.code,
                discountUSD: applied.discountUSD,
                discountIQD: applied.discountIQD,
              }
            : undefined,
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["dentist-invoices", user.uid] });
      toast.success(ar ? "تم إرسال الطلب بنجاح" : "Order placed successfully");
      onClose();
      navigate({ to: "/orders" });
    } catch (e: any) {
      toast.error(ar ? `فشل إرسال الطلب: ${e?.message || e}` : `Order failed: ${e?.message || e}`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}14`, color: TEAL }}>
              <ShoppingCart className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight">{ar ? "سلة التسوق" : "Shopping Cart"}</h2>
              <p className="text-[11px] text-slate-400">
                {cart.length} {ar ? "منتجات" : "products"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="size-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${TEAL}14` }}>
            <ShoppingCart className="size-9" style={{ color: TEAL }} />
          </div>
          <p className="font-bold text-slate-700 text-lg">{ar ? "السلة فارغة" : "Cart is empty"}</p>
          <p className="text-sm text-slate-400 mt-1">
            {ar ? "أضف منتجات من كتالوج المستلزمات" : "Add products from the supplies catalog"}
          </p>
          <button
            onClick={() => {
              onClose();
              navigate({ to: "/supplies" });
            }}
            className="mt-6 h-11 px-6 rounded-xl text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
            style={{ backgroundColor: TEAL }}
          >
            <ShoppingCart className="size-4" />
            {ar ? "تصفح الكتالوج" : "Browse catalog"}
          </button>
        </div>
      ) : (
        <>
          <div id="cart-invoice" className="max-w-3xl mx-auto px-4 py-4 space-y-4 pb-40">
            {/* Invoice header */}
            <div className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${TEAL}, #0B5952)` }}>
              <div className="absolute -top-12 -end-12 size-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white/80 text-[11px] font-mono">
                    <ReceiptText className="size-3.5" />
                    {ar ? "رقم الفاتورة" : "Invoice #"} {draftNo}
                  </div>
                  <h3 className="font-display font-extrabold text-xl mt-1.5 truncate">{storeName}</h3>
                  <p className="text-xs text-white/80 mt-1">{dateLabel}</p>
                </div>
                <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                  {ar ? "مسودة" : "Draft"}
                </span>
              </div>
            </div>

            {/* Items table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  {/* header row */}
                  <div
                    className="grid grid-cols-[minmax(180px,1.6fr)_56px_96px_96px_108px_40px] items-center gap-2 px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100"
                    style={{ backgroundColor: `${TEAL}08` }}
                  >
                    <span>{ar ? "المنتج" : "Product"}</span>
                    <span className="text-center">{ar ? "الكمية" : "Qty"}</span>
                    <span className="text-center">{ar ? "السعر (د.ع)" : "Price (IQD)"}</span>
                    <span className="text-center">{ar ? "السعر ($)" : "Price ($)"}</span>
                    <span className="text-center">{ar ? "الإجمالي" : "Total"}</span>
                    <span />
                  </div>

                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(180px,1.6fr)_56px_96px_96px_108px_40px] items-center gap-2 px-4 py-3 border-b border-slate-50 last:border-0"
                    >
                      {/* Product name + image */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt=""
                            className="size-11 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="size-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="size-5 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                          {item.category && (
                            <p className="text-[10px] text-slate-400 truncate">{item.category}</p>
                          )}
                        </div>
                      </div>

                      {/* Qty */}
                      <span className="text-sm font-bold text-slate-700 text-center">{item.quantity}</span>

                      {/* IQD price */}
                      <span className="text-xs text-slate-500 text-center">
                        {item.currency === "IQD" ? item.unitPrice.toLocaleString() : "—"}
                      </span>

                      {/* USD price */}
                      <span className="text-xs text-slate-500 text-center">
                        {item.currency !== "IQD" ? `$${item.unitPrice.toFixed(2)}` : "—"}
                      </span>

                      {/* Total */}
                      <span className="text-sm font-display font-extrabold text-center" style={{ color: TEAL }}>
                        {item.currency === "IQD"
                          ? (item.unitPrice * item.quantity).toLocaleString()
                          : `$${(item.unitPrice * item.quantity).toFixed(2)}`}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="size-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition justify-self-center"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Left (discount + note) and Right (summary) */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                {/* Discount code */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <TicketPercent className="size-4" style={{ color: TEAL }} />
                    {ar ? "رمز الخصم" : "Discount code"}
                  </p>
                  {applied ? (
                    <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm" style={{ backgroundColor: `${TEAL}14` }}>
                      <span className="font-bold" style={{ color: TEAL }}>
                        {applied.code}
                        <span className="text-xs font-normal ms-2">
                          {applied.type === "percent"
                            ? `${applied.value}%`
                            : applied.currency === "IQD"
                              ? fmtIqd(applied.value)
                              : fmtUsd(applied.value)}
                        </span>
                      </span>
                      <button
                        onClick={() => {
                          setApplied(null);
                          setPromoInput("");
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-500"
                      >
                        {ar ? "إزالة" : "Remove"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mt-3">
                        <input
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder={ar ? "أدخل الرمز" : "Enter code"}
                          className="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#0E6E66]/20 focus:border-[#0E6E66] uppercase"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={applying}
                          className="h-10 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                          style={{ backgroundColor: TEAL }}
                        >
                          {applying ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          {ar ? "تطبيق" : "Apply"}
                        </button>
                      </div>
                      {promoError && <p className="text-[11px] text-rose-500 mt-1.5">{promoError}</p>}
                    </>
                  )}
                </div>

                {/* Note */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <StickyNote className="size-4" style={{ color: TEAL }} />
                    {ar ? "ملاحظة (اختياري)" : "Note (optional)"}
                  </p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={ar ? "أضف ملاحظة للطلب…" : "Add a note to your order…"}
                    className="mt-3 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E6E66]/20 focus:border-[#0E6E66] resize-none"
                  />
                </div>
              </div>

              {/* Right column — summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4 h-fit">
                <p className="text-sm font-bold text-slate-700">{ar ? "ملخص الطلب" : "Order summary"}</p>
                <div className="mt-3 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ar ? "الإجمالي بالدينار" : "Total (IQD)"}</span>
                    <span className="font-semibold">{fmtIqd(iqdSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ar ? "الإجمالي بالدولار" : "Total (USD)"}</span>
                    <span className="font-semibold">{fmtUsd(usdSubtotal)}</span>
                  </div>

                  {(discountUSD > 0 || discountIQD > 0) && (
                    <div className="flex items-center justify-between text-emerald-600">
                      <span className="flex items-center gap-1">
                        {ar ? "الخصم" : "Discount"}
                        {applied?.code && <span className="text-[10px] font-mono">({applied.code})</span>}
                      </span>
                      <span className="font-semibold">
                        -{discountIQD > 0 ? fmtIqd(discountIQD) : fmtUsd(discountUSD)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ar ? "تكلفة التوصيل" : "Delivery"}</span>
                    <span className="font-semibold" style={{ color: TEAL }}>
                      {DELIVERY_IQD === 0 ? (ar ? "مجاني" : "Free") : fmtIqd(DELIVERY_IQD)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ar ? "الضريبة" : "Tax"}</span>
                    <span className="font-semibold">{TAX_RATE === 0 ? "0%" : `${TAX_RATE}%`}</span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-2" />

                  <div className="flex items-center justify-between">
                    <span className="font-bold">{ar ? "المجموع (د.ع)" : "Subtotal (IQD)"}</span>
                    <span className="font-display font-extrabold" style={{ color: TEAL }}>
                      {fmtIqd(iqdTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{ar ? "المجموع ($)" : "Subtotal (USD)"}</span>
                    <span className="font-display font-extrabold" style={{ color: TEAL }}>
                      {fmtUsd(usdTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sticky bottom actions */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="h-12 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition"
            >
              <Share2 className="size-4" />
              <span className="hidden sm:inline">{ar ? "مشاركة" : "Share"}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-12 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition"
            >
              <Printer className="size-4" />
              <span className="hidden sm:inline">{ar ? "طباعة" : "Print"}</span>
            </button>
            <button
              onClick={handleComplete}
              disabled={placing}
              className="flex-1 h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition"
              style={{ backgroundColor: TEAL }}
            >
              {placing ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
              {placing ? (ar ? "جارٍ الإرسال..." : "Placing...") : ar ? "إتمام الطلب" : "Complete order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

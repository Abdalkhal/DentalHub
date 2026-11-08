import { useMemo, useState } from "react";
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
import { codeMessage, discountLabel, moneyRows, useCartPreview } from "@/lib/promo";
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
  const [codes, setCodes] = useState<string[]>([]);
  const previewItems = useMemo(
    () => cart.map((i) => ({ productId: i.productId, quantity: i.quantity || 1 })),
    [cart],
  );
  const preview = useCartPreview(previewItems, codes, open && !!user);
  const [draftNo] = useState(() => `DNT-${Math.floor(1000 + Math.random() * 9000)}`);

  if (!open) return null;

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

  // Until the server has answered, a row shows the price it was added at. The
  // order can't be placed on those: the button waits for the real total.
  const localIQD = cart
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const localUSD = cart
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const priced = preview.data;
  const totals = priced?.totals ?? {
    rawUSD: localUSD,
    rawIQD: localIQD,
    tierSavedUSD: 0,
    tierSavedIQD: 0,
    discountUSD: 0,
    discountIQD: 0,
    netUSD: localUSD,
    netIQD: localIQD,
  };
  const iqdTotal = totals.netIQD;
  const usdTotal = totals.netUSD;
  const lineByIndex = new Map(
    (priced?.offices ?? []).flatMap((o) => o.lines.map((l) => [l.index, l] as const)),
  );
  const discounted = (priced?.offices ?? []).filter((o) => o.discountUSD > 0 || o.discountIQD > 0);
  const summaryRows = moneyRows(
    totals,
    discounted.length === 1 ? discountLabel(discounted[0], ar) : ar ? "الخصومات" : "Discounts",
    ar,
    { alwaysNet: true },
  );
  const canOrder = !!priced && !preview.isFetching && !preview.isError;

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!codes.includes(code)) setCodes([...codes, code]);
    setPromoInput("");
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
          codes,
          expected: { usd: usdTotal, iqd: iqdTotal },
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["orders", "dentist", user.uid] });
      toast.success(ar ? "تم إرسال الطلب بنجاح" : "Order placed successfully");
      onClose();
      navigate({ to: "/orders" });
    } catch (e: any) {
      if (String(e?.message).includes("price-changed")) {
        toast.error(
          ar
            ? "تغيّر السعر أو الخصم منذ فتحت السلة. راجع الإجمالي الجديد ثم أكمل الطلب."
            : "A price or discount changed. Check the new total, then complete the order.",
        );
        preview.refetch();
        return;
      }
      toast.error(ar ? `فشل إرسال الطلب: ${e?.message || e}` : `Order failed: ${e?.message || e}`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto mx-auto w-full max-w-md lg:max-w-3xl">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-md lg:max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
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
        <div className="max-w-md lg:max-w-3xl mx-auto flex flex-col items-center justify-center py-24 text-center px-6">
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
          <div id="cart-invoice" className="max-w-md lg:max-w-3xl mx-auto px-4 py-4 space-y-4 pb-40">
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

            {/* Items */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden divide-y divide-slate-50">
              {cart.map((item, index) => {
                const line = lineByIndex.get(index);
                const unit = line?.price ?? item.unitPrice;
                const tiered = !!line && line.price < line.listPrice;
                return (
                <div key={item.id} className="px-3.5 py-3 flex items-center gap-3">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt=""
                      className="size-12 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="size-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Package className="size-5 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                    {item.category && (
                      <p className="text-[10px] text-slate-400 truncate">{item.category}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                      {tiered && (
                        <span className="text-slate-400 line-through">
                          {item.currency === "IQD" ? line.listPrice.toLocaleString() : `$${line.listPrice.toFixed(2)}`}
                        </span>
                      )}
                      <span className={tiered ? "font-bold text-emerald-600" : "text-slate-500"}>
                        {item.currency === "IQD" ? `${unit.toLocaleString()} د.ع` : `$${unit.toFixed(2)}`}
                      </span>
                      <span className="text-slate-300">×</span>
                      <span className="font-bold text-slate-700">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-display font-extrabold" style={{ color: TEAL }}>
                      {item.currency === "IQD"
                        ? (unit * item.quantity).toLocaleString()
                        : `$${(unit * item.quantity).toFixed(2)}`}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="mt-1 size-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition ms-auto"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Discount + note + summary */}
            <div className="grid grid-cols-1 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                {/* Discount code */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <TicketPercent className="size-4" style={{ color: TEAL }} />
                    {ar ? "رمز الخصم" : "Discount code"}
                  </p>
                  {codes.map((code) => {
                    const result = priced?.codes.find((r) => r.code === code);
                    const good = result?.status === "applied";
                    return (
                      <div
                        key={code}
                        className="mt-3 rounded-xl px-3 py-2.5 text-sm"
                        style={{ backgroundColor: good ? `${TEAL}14` : "#F8FAFC" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold font-mono" dir="ltr" style={{ color: good ? TEAL : "#475569" }}>
                            {code}
                          </span>
                          <button
                            onClick={() => setCodes(codes.filter((c) => c !== code))}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-500"
                          >
                            {ar ? "إزالة" : "Remove"}
                          </button>
                        </div>
                        {result && (
                          <p className={`text-[11px] mt-1 ${good ? "text-emerald-700" : result.status === "beaten" ? "text-slate-500" : "text-rose-500"}`}>
                            {codeMessage(result, ar)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {(
                    <>
                      <div className="flex gap-2 mt-3">
                        <input
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          dir="ltr"
                          placeholder={ar ? "أدخل الرمز" : "Enter code"}
                          className="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#0E6E66]/20 focus:border-[#0E6E66] uppercase"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={preview.isFetching}
                          className="h-10 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                          style={{ backgroundColor: TEAL }}
                        >
                          {preview.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          {ar ? "تطبيق" : "Apply"}
                        </button>
                      </div>
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
                  {summaryRows
                    .filter((r) => r.tone !== "total")
                    .map((r) => (
                      <div key={r.key} className={`flex items-center justify-between ${r.tone === "saving" ? "text-emerald-600" : ""}`}>
                        <span className={r.tone === "saving" ? "" : "text-slate-500"}>{r.label}</span>
                        <span className="font-semibold" dir="ltr">{r.value}</span>
                      </div>
                    ))}

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

                  {summaryRows
                    .filter((r) => r.tone === "total")
                    .map((r) => (
                      <div key={r.key} className="flex items-center justify-between">
                        <span className="font-bold">{r.label}</span>
                        <span className="font-display font-extrabold" style={{ color: TEAL }}>
                          {r.value}
                        </span>
                      </div>
                    ))}
                  {!!priced?.skipped.length && (
                    <p className="text-[11px] text-amber-600">
                      {ar
                        ? "بعض منتجات السلة لم تعد متوفرة ولن تدخل في الطلب."
                        : "Some cart items are no longer available and won't be ordered."}
                    </p>
                  )}
                  {preview.isError && (
                    <button onClick={() => preview.refetch()} className="text-[11px] font-bold text-rose-500">
                      {ar ? "تعذر حساب السعر. اضغط لإعادة المحاولة" : "Couldn't work out the price. Tap to retry"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sticky bottom actions */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 mx-auto w-full max-w-md lg:max-w-3xl">
          <div className="max-w-md lg:max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
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
              disabled={placing || (!!user && !canOrder)}
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

import { useMemo, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  MapPin,
  ShoppingCart,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useSignedImageUrls, type Product } from "@/lib/products";
import { ALL_COUNTRIES, countryCodeToFlag } from "@/data/countries";
import { SPEC_FIELDS, type SpecFieldId } from "@/data/specs";
import { SPECIALIZED_CATEGORIES, SPECIALIZED_FIELDS } from "@/data/specializedImplants";
import { addToCart } from "@/lib/cartStore";
import { addToPurchaseHistory } from "@/lib/quickOrders";
import { SURGICAL_GUIDE_TOOLS } from "@/components/ImplantFormModal";

export function ProductDetailsModal({
  product,
  onClose,
  isDoctorView = false,
  cart,
}: {
  product: Product;
  onClose: () => void;
  isDoctorView?: boolean;
  cart?: {
    officeId: string;
    officeName: string;
    officeCity?: string;
    inStock: boolean;
  } | null;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: urlMap = {} } = useSignedImageUrls(product.images);
  const images = product.images.map((p) => urlMap[p]).filter(Boolean) as string[];

  const { data: clinicalUrlMap = {} } = useSignedImageUrls(
    product.specializedImplant?.clinicalImages ?? [],
  );

  const spec = product.specializedImplant;
  const categoryMeta = spec ? SPECIALIZED_CATEGORIES.find((c) => c.id === spec.category) : null;
  const specializedEntries = useMemo(() => {
    if (!spec) return [];
    const out: { label: string; value: string }[] = [];
    const fieldDefs = SPECIALIZED_FIELDS[spec.category] ?? [];
    Object.entries(spec.fields ?? {}).forEach(([id, v]) => {
      const field = fieldDefs.find((f) => f.id === id);
      const label = field ? (ar ? field.ar : field.en) : id;
      if (Array.isArray(v)) {
        if (v.length > 0) {
          const parts = v.map((x) => {
            const opt = field?.options?.find((o) => o.value === x);
            return opt ? (ar ? (opt.ar ?? opt.value) : opt.value) : x;
          });
          out.push({ label, value: parts.join(" · ") });
        }
      } else if (typeof v === "string" && v) {
        const opt = field?.options?.find((o) => o.value === v);
        out.push({ label, value: opt ? (ar ? (opt.ar ?? opt.value) : opt.value) : v });
      }
    });
    return out;
  }, [spec, ar]);

  const country = product.country ? ALL_COUNTRIES.find((c) => c.code === product.country) : null;
  const originLabel =
    product.countryOrigin || (country ? `${countryCodeToFlag(country.code)} ${country.ar}` : null);

  const isIQD = product.currency === "IQD";
  const sym = isIQD ? "د.ع" : "$";
  const money = (n: number) =>
    isIQD ? `${Number(n).toLocaleString()} ${sym}` : `${sym}${n.toFixed(2)}`;

  const specEntries = useMemo(() => {
    const bags = [product.technicalSpecifications ?? {}, product.specs ?? {}];
    const out: { label: string; value: string }[] = [];
    bags.forEach((bag) => {
      (Object.entries(bag) as [SpecFieldId, string | string[]][]).forEach(([id, v]) => {
        const field = SPEC_FIELDS[id];
        if (!field) return;
        if (Array.isArray(v)) {
          if (v.length > 0) out.push({ label: ar ? field.ar : field.en, value: v.join(" · ") });
        } else if (typeof v === "string" && v) {
          const opt = field.options?.find((o) => o.value === v);
          out.push({ label: ar ? field.ar : field.en, value: opt?.ar ?? v });
        }
      });
    });
    return out;
  }, [product.specs, product.technicalSpecifications, ar]);

  const prev = () =>
    setActiveImg((i) => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length));
  const next = () => setActiveImg((i) => (images.length === 0 ? 0 : (i + 1) % images.length));

  const cartSpecs = useMemo(() => {
    const out: Record<string, string> = {};
    const bags = [product.technicalSpecifications ?? {}, product.specs ?? {}];
    bags.forEach((bag) => {
      (Object.entries(bag) as [SpecFieldId, string | string[]][]).forEach(([id, v]) => {
        const field = SPEC_FIELDS[id];
        const label = field ? (ar ? field.ar : field.en) : id;
        if (Array.isArray(v)) {
          if (v.length > 0) out[label] = v.join("، ");
        } else if (typeof v === "string" && v) {
          const opt = field?.options?.find((o) => o.value === v);
          out[label] = opt?.ar ?? v;
        }
      });
    });
    return out;
  }, [product.specs, product.technicalSpecifications, ar]);

  const handleAddToCart = () => {
    if (!cart) return;
    const name = ar ? product.ar || product.en : product.en || product.ar;
    addToCart({
      productId: product.id,
      productName: name,
      productImage: images[0],
      officeId: cart.officeId,
      officeName: cart.officeName,
      brand: product.brand,
      category: product.branch,
      specs: cartSpecs,
      unitPrice: product.price,
      currency: product.currency,
      quantity: qty,
    });
    addToPurchaseHistory({
      productId: product.id,
      productName: name,
      vendor: cart.officeName,
      brand: product.brand,
      unitPrice: product.price,
      image: images[0],
      qty,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQty(1);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-6 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-slate-100">
          <h3 className="font-display font-extrabold text-base text-slate-900">
            {ar ? "تفاصيل المنتج" : "Product Details"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Image gallery */}
          <div className="relative bg-slate-100">
            {images.length > 0 ? (
              <>
                <img src={images[activeImg]} alt="" className="w-full h-64 object-contain" />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      className="absolute start-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-700 hover:bg-white transition"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="absolute end-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-700 hover:bg-white transition"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImg(i)}
                          className={cn(
                            "h-2 rounded-full transition-all",
                            i === activeImg ? "w-4 bg-emerald-600" : "w-2 bg-slate-300",
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-64 flex items-center justify-center">
                <Package className="size-12 text-slate-300" />
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Name + brand */}
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900 leading-snug">
                {ar ? product.ar || product.en : product.en || product.ar}
              </h2>
              {product.brand && <p className="text-xs text-slate-500 mt-0.5">{product.brand}</p>}
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[11px] font-bold text-slate-400 mb-1">
                  {ar ? "الوصف" : "Description"}
                </p>
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Price & stock */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3">
              <div>
                <p className="text-[11px] font-bold text-emerald-700/70">
                  {ar ? "السعر" : "Price"}
                </p>
                <p className="font-display font-extrabold text-lg text-emerald-700">
                  {money(product.price)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[11px] font-bold text-emerald-700/70">
                  {ar ? "المخزون" : "Stock"}
                </p>
                <p
                  className={cn(
                    "font-display font-extrabold text-lg",
                    (product.stock ?? 0) > 0 ? "text-emerald-700" : "text-rose-600",
                  )}
                >
                  {product.stock ?? 0}
                </p>
              </div>
            </div>

            {/* Meta: origin + expiry */}
            {(originLabel || product.expiryDate) && (
              <div className="space-y-2">
                {originLabel && (
                  <div className="flex items-center gap-2 text-[13px] text-slate-600">
                    <MapPin className="size-4 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400 w-36 shrink-0">
                      {ar ? "بلد المنشأ" : "Country of Origin"}
                    </span>
                    <span>{originLabel}</span>
                  </div>
                )}
                {product.expiryDate && (
                  <div className="flex items-center gap-2 text-[13px] text-slate-600">
                    <Calendar className="size-4 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-400 w-36 shrink-0">
                      {ar ? "تاريخ انتهاء الصلاحية" : "Expiration Date"}
                    </span>
                    <span dir="ltr">{product.expiryDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Surgical guide system */}
            {product.surgicalGuide && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ar ? "نظام الدليل الجراحي" : "Surgical Guide System"}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      product.surgicalGuide === "Guided"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {product.surgicalGuide === "Guided"
                      ? ar
                        ? "موجّه"
                        : "Guided"
                      : ar
                        ? "غير موجّه"
                        : "Unguided"}
                  </span>
                </div>
                {product.surgicalGuide === "Guided" &&
                  product.surgicalGuideTools &&
                  product.surgicalGuideTools.length > 0 && (
                    <div className="px-3 py-2.5 space-y-2">
                      {product.surgicalGuideTools.map((tool) => {
                        const def = SURGICAL_GUIDE_TOOLS.find((t) => t.en === tool);
                        return (
                          <div
                            key={tool}
                            className="flex items-center gap-2 text-[13px] text-slate-700"
                          >
                            <span className="size-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Check className="size-3.5" />
                            </span>
                            {ar && def ? def.ar : tool}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* Surgical kit details */}
            {product.surgicalKit && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                  {ar ? "الكت الجراحي" : "Surgical Kit"}
                </div>
                <div className="p-3 space-y-1.5 text-[13px] text-slate-700">
                  {product.surgicalKit.kitType && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{ar ? "نوع الكت" : "Kit Type"}</span>
                      <span className="font-semibold text-end">{product.surgicalKit.kitType}</span>
                    </div>
                  )}
                  {product.surgicalKit.placementType && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{ar ? "بروتوكول الزرع" : "Placement"}</span>
                      <span className="font-semibold text-end">
                        {product.surgicalKit.placementType}
                      </span>
                    </div>
                  )}
                  {!!product.surgicalKit.toolsCount && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{ar ? "عدد الأدوات" : "Tools Count"}</span>
                      <span className="font-semibold">{product.surgicalKit.toolsCount}</span>
                    </div>
                  )}
                  {product.sku && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">SKU</span>
                      <span className="font-semibold font-mono" dir="ltr">
                        {product.sku}
                      </span>
                    </div>
                  )}
                  {product.surgicalKit.compatibility &&
                    product.surgicalKit.compatibility.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {product.surgicalKit.compatibility.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Specialized implant */}
            {spec && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 overflow-hidden">
                <div className="flex items-center justify-between bg-indigo-50 px-3 py-2">
                  <span className="text-xs font-bold text-indigo-600">
                    {ar ? "زرعة متخصصة" : "Specialized Implant"}
                  </span>
                  {categoryMeta && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      {ar ? categoryMeta.ar : categoryMeta.en}
                    </span>
                  )}
                </div>
                {specializedEntries.length > 0 && (
                  <div className="px-3 py-2.5 space-y-1.5">
                    {specializedEntries.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-slate-500">{s.label}</span>
                        <span className="font-semibold text-slate-800 text-end">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(spec.clinicalImages?.length ?? 0) > 0 && (
                  <div className="px-3 pb-3">
                    <p className="text-[11px] font-bold text-indigo-500 mb-1.5">
                      {ar ? "صور حالات العمل" : "Clinical Cases"}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {spec.clinicalImages!.map((path) => (
                        <img
                          key={path}
                          src={clinicalUrlMap[path]}
                          alt=""
                          className="aspect-square w-full rounded-lg object-cover bg-slate-100"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Volume discounts table */}
            {product.discountTiers && product.discountTiers.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  {ar ? "جدول الخصومات على الكمية" : "Volume Discounts"}
                </h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="text-start font-bold px-3 py-2">
                          {ar ? "من كمية" : "From"}
                        </th>
                        <th className="text-start font-bold px-3 py-2">{ar ? "إلى كمية" : "To"}</th>
                        <th className="text-center font-bold px-3 py-2">
                          {ar ? "الخصم %" : "Disc. %"}
                        </th>
                        <th className="text-end font-bold px-3 py-2">{ar ? "السعر" : "Price"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.discountTiers.map((t, i) => (
                        <tr key={i} className="border-t border-slate-100 text-slate-700">
                          <td className="px-3 py-2">{t.fromQty}</td>
                          <td className="px-3 py-2">{t.toQty > 0 ? t.toQty : "∞"}</td>
                          <td className="text-center px-3 py-2">
                            {t.discountPct > 0 ? `${t.discountPct}%` : "—"}
                          </td>
                          <td className="text-end px-3 py-2 font-semibold">
                            {t.price > 0 ? money(t.price) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Technical specifications */}
            {specEntries.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  {ar ? "المواصفات الفنية" : "Technical Specifications"}
                </h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {specEntries.map((s, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2 text-slate-500 font-semibold w-1/2">
                            {s.label}
                          </td>
                          <td className="px-3 py-2 text-slate-800">{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart footer (doctor view only) */}
        {isDoctorView && cart && (
          <div className="shrink-0 border-t border-slate-200 bg-white p-4 space-y-3">
            {/* Store profile */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
              <span className="size-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                {(cart.officeName || "؟").charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {cart.officeName || (ar ? "المكتب" : "Office")}
                </p>
                {cart.officeCity && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3" /> {cart.officeCity}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 border border-slate-200 h-12 px-1 w-32 shrink-0">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="size-9 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
                <span className="text-sm font-bold text-slate-800 min-w-6 text-center">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="size-9 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!cart.inStock}
                className={cn(
                  "flex-1 h-12 rounded-2xl bg-emerald-600 text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition hover:bg-emerald-700 active:scale-[0.98]",
                  !cart.inStock && "opacity-40",
                )}
              >
                {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
                {added
                  ? ar
                    ? "تمت الإضافة ✓"
                    : "Added ✓"
                  : ar
                    ? `أضف للسلة${qty > 1 ? ` (${qty})` : ""}`
                    : `Add to cart${qty > 1 ? ` (${qty})` : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

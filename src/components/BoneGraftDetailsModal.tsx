import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { doc, getDoc } from "firebase/firestore";
import { X, ChevronLeft, ChevronRight, Package, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useSignedImageUrls, type Product } from "@/lib/products";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";

export function BoneGraftDetailsModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);

  const { data: urlMap = {} } = useSignedImageUrls(product.images);
  const images = product.images.map((p) => urlMap[p]).filter(Boolean) as string[];

  const { data: clinicalUrlMap = {} } = useSignedImageUrls(product.boneGraft?.clinicalImages ?? []);

  const { data: supplier } = useQuery({
    queryKey: ["bone-graft-supplier", product.companyId],
    enabled: !!product.companyId,
    queryFn: async (): Promise<UserRoleDoc | null> => {
      const snap = await getDoc(doc(db, "user_roles", product.companyId!));
      if (!snap.exists()) return null;
      return snap.data() as UserRoleDoc;
    },
  });

  const goToProfile = () => {
    if (!product.companyId) return;
    navigate({ to: "/profile/$accountId", params: { accountId: product.companyId } });
  };

  const prev = () =>
    setActiveImg((i) => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length));
  const next = () => setActiveImg((i) => (images.length === 0 ? 0 : (i + 1) % images.length));

  const spec = product.boneGraft;

  const specRows = useMemo(() => {
    if (!spec) return [];
    const rows: { label: string; value: string }[] = [];
    const defs: { label: string; get: () => string }[] = [
      { label: ar ? "نوع المصدر" : "Graft Type", get: () => spec.graftType },
      { label: ar ? "الشكل الفيزيائي" : "Form", get: () => spec.form },
      { label: ar ? "مصدر المادة" : "Material Source", get: () => spec.materialSource },
      { label: ar ? "التركيب المادي" : "Composition", get: () => spec.composition },
      { label: ar ? "حجم الحبيبات" : "Particle Size", get: () => spec.particleSize },
      {
        label: ar ? "طريقة التعقيم" : "Sterilization Method",
        get: () => spec.sterilizationMethod,
      },
      { label: ar ? "مدة الصلاحية" : "Shelf Life", get: () => spec.shelfLife },
    ];
    defs.forEach((d) => {
      const v = d.get().trim();
      if (v) rows.push({ label: d.label, value: v });
    });
    return rows;
  }, [spec, ar]);

  const isIQD = product.currency === "IQD";
  const sym = isIQD ? "د.ع" : "$";
  const money = (n: number) =>
    isIQD ? `${Number(n).toLocaleString()} ${sym}` : `${sym}${n.toFixed(2)}`;

  const packSizes = spec?.packSizes ?? [];

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-6 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-slate-100">
          <h3 className="font-display font-extrabold text-base text-slate-900">
            {ar ? "تفاصيل البون كرافت" : "Bone Graft Details"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Supplier contact card */}
          {supplier && (
            <div className="mx-4 mt-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-3 flex items-center gap-3">
              <span className="size-11 rounded-full bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100 flex items-center justify-center font-bold shrink-0 overflow-hidden">
                {supplier.photoURL ? (
                  <img src={supplier.photoURL} alt="" className="size-full object-cover" />
                ) : (
                  (supplier.name || "؟").charAt(0)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{supplier.name}</p>
                {supplier.phone && (
                  <p
                    className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"
                    dir="ltr"
                  >
                    <Phone className="size-3 text-slate-400 shrink-0" />
                    <span className="truncate">{supplier.phone}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={goToProfile}
                className="shrink-0 h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition"
              >
                {ar ? "زيارة الملف الشخصي" : "Visit Profile"}
              </button>
            </div>
          )}

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

          <div className="px-4 pb-6 space-y-4">
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

            {/* Unit price */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3">
              <div>
                <p className="text-[11px] font-bold text-emerald-700/70">
                  {ar ? "سعر الوحدة الواحدة" : "Unit Price"}
                </p>
                <p className="font-display font-extrabold text-lg text-emerald-700">
                  {money(product.price)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[11px] font-bold text-emerald-700/70">
                  {ar ? "الحالة" : "Status"}
                </p>
                <p
                  className={cn(
                    "font-display font-extrabold text-lg",
                    (product.stock ?? 0) > 0 ? "text-emerald-700" : "text-rose-600",
                  )}
                >
                  {(product.stock ?? 0) > 0
                    ? ar
                      ? "متوفر"
                      : "In Stock"
                    : ar
                      ? "نفد"
                      : "Out of stock"}
                </p>
              </div>
            </div>

            {/* Specifications */}
            {spec && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  {ar ? "المواصفات والمميزات" : "Specifications & Features"}
                </h4>
                {specRows.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {specRows.map((s, i) => (
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
                )}
                {spec.features && spec.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {spec.features.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pack sizes / volumes */}
            {packSizes.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  {ar ? "الأحجام والأسعار" : "Pack Sizes & Pricing"}
                </h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {packSizes.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="size-4 text-slate-500" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate" dir="ltr">
                            {p.volume}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {p.priceUsd > 0 ? `$${p.priceUsd.toFixed(2)}` : "—"}
                            {p.priceIqd > 0 ? ` · ${p.priceIqd.toLocaleString()} د.ع` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-bold px-2 py-1 rounded-full",
                          p.available
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600",
                        )}
                      >
                        {p.available ? (ar ? "متوفر" : "Available") : ar ? "نفد" : "Out"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical case images */}
            {(spec?.clinicalImages?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  {ar ? "صور حالات العمل" : "Clinical Cases"}
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {spec!.clinicalImages!.map((path) => (
                    <img
                      key={path}
                      src={clinicalUrlMap[path] ?? ""}
                      alt=""
                      className="aspect-square w-full rounded-lg object-cover bg-slate-100"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

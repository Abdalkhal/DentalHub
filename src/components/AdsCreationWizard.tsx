import { useRef, useState } from "react";
import {
  X,
  Loader2,
  Megaphone,
  Tag,
  CalendarDays,
  Check,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useUpsertOffer } from "@/lib/offers";
import { useUserRole } from "@/lib/useAuth";
import { uploadProductImage } from "@/lib/products";
import { toast } from "sonner";

export type AdsType = "main" | "deals";

const DURATIONS = [3, 7, 15, 30];

const inputCls =
  "w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0052FF]/30 focus:border-[#0052FF]/40 transition";
const labelCls = "text-[11px] font-bold text-slate-500 mb-1.5 block";

export function AdsCreationWizard({ type, onClose }: { type: AdsType; onClose: () => void }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const upsert = useUpsertOffer();
  const { role } = useUserRole();
  const userId = role?.userId ?? "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [duration, setDuration] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isDeals = type === "deals";

  const handleFile = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const goNext = () => {
    setError("");
    if (!title.trim()) {
      setError(ar ? "الرجاء إدخال عنوان الإعلان" : "Please enter the ad title");
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const adId = crypto.randomUUID();
      let imageUrl = "";
      if (imageFile) imageUrl = await uploadProductImage(adId, imageFile);
      const expiry = new Date(Date.now() + duration * 86400000).toISOString();
      await upsert.mutateAsync({
        id: adId,
        supplierId: userId,
        title: title.trim(),
        description: subtitle.trim(),
        imageUrl,
        expiryDate: expiry,
        price: isDeals && price.trim() ? parseFloat(price) || undefined : undefined,
        currency: "USD",
        discountPct:
          isDeals && discountPct.trim() ? parseFloat(discountPct) || undefined : undefined,
        status: "pending",
      });
      toast.success(ar ? "تم إرسال الإعلان للمراجعة" : "Ad submitted for review");
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-8 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom bg-[#F1F5F9]">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "size-10 rounded-xl flex items-center justify-center shrink-0",
                isDeals ? "bg-rose-50 text-rose-500" : "bg-[#0052FF]/10 text-[#0052FF]",
              )}
            >
              {isDeals ? <Tag className="size-5" /> : <Megaphone className="size-5" />}
            </span>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-base text-slate-900 truncate">
                {isDeals
                  ? ar
                    ? "إعلان العروض والخصومات"
                    : "Deals & Offers Ad"
                  : ar
                    ? "إعلان الصفحة الرئيسية"
                    : "Main Page Ad"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {ar ? "أنشئ إعلانك في خطوتين" : "Create your ad in two steps"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  step >= s ? "bg-[#0052FF]" : "bg-slate-200",
                )}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-2">
            {ar ? `الخطوة ${step} من 2` : `Step ${step} of 2`}
            {step === 1
              ? ar
                ? " · المحتوى والصورة"
                : " · Content & Image"
              : ar
                ? " · المدة والإرسال"
                : " · Duration & Submit"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
          {step === 1 ? (
            <>
              {/* Title */}
              <div>
                <label className={labelCls}>{ar ? "عنوان الإعلان" : "Ad Title"}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    ar
                      ? isDeals
                        ? "مثال: خصم 30% على زراعات الوجنة"
                        : "مثال: أقوى زرعات متخصصة في العراق"
                      : isDeals
                        ? "e.g. 30% off zygomatic implants"
                        : "e.g. Top specialized implants in Iraq"
                  }
                  className={inputCls}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className={labelCls}>{ar ? "وصف قصير" : "Short Subtitle"}</label>
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value.slice(0, 300))}
                  rows={2}
                  placeholder={
                    ar ? "اكتب وصفاً مختصراً لإعلانك..." : "Write a short description..."
                  }
                  className={cn(inputCls, "h-auto py-3 resize-none")}
                />
              </div>

              {/* Deals specifics */}
              {isDeals && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{ar ? "نسبة الخصم %" : "Discount %"}</label>
                    <input
                      type="number"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      placeholder="30"
                      dir="ltr"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{ar ? "السعر بعد الخصم" : "Price After"}</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="$ 500"
                      dir="ltr"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Image upload */}
              <div>
                <label className={labelCls}>{ar ? "صورة/بانر الإعلان" : "Ad Image / Banner"}</label>
                {imagePreview ? (
                  <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={imagePreview} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(imagePreview);
                        setImagePreview("");
                        setImageFile(null);
                      }}
                      className="absolute top-2 end-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#0052FF]/50 hover:text-[#0052FF] transition"
                  >
                    <span className="size-11 rounded-full bg-[#0052FF]/10 flex items-center justify-center">
                      <ImageIcon className="size-5" />
                    </span>
                    <span className="text-xs font-bold">
                      {ar ? "اضغط لرفع صورة أو بانر" : "Tap to upload an image or banner"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      JPG, PNG · {ar ? "اختياري" : "Optional"}
                    </span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Duration */}
              <div>
                <label className={labelCls}>{ar ? "مدة عرض الإعلان" : "Ad Duration"}</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "h-14 rounded-2xl border text-sm font-bold transition flex flex-col items-center justify-center",
                        duration === d
                          ? "bg-[#0052FF] text-white border-[#0052FF] shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#0052FF]/40",
                      )}
                    >
                      <CalendarDays
                        className={cn("size-4", duration === d ? "text-white" : "text-slate-400")}
                      />
                      <span className="text-[13px]">
                        {d} {ar ? "يوم" : "days"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-2.5">
                <p className="text-xs font-bold text-slate-500">
                  {ar ? "ملخص الإعلان" : "Ad Summary"}
                </p>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">{ar ? "نوع الإعلان" : "Ad Type"}</span>
                  <span className="font-bold text-slate-800">
                    {isDeals
                      ? ar
                        ? "عروض وخصومات"
                        : "Deals & Offers"
                      : ar
                        ? "الصفحة الرئيسية"
                        : "Main Page"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">{ar ? "المدة" : "Duration"}</span>
                  <span className="font-bold text-slate-800">
                    {duration} {ar ? "يوم" : "days"}
                  </span>
                </div>
                {title.trim() && (
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-slate-500">{ar ? "العنوان" : "Title"}</span>
                    <span className="font-bold text-slate-800 text-end line-clamp-1">
                      {title.trim()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">{ar ? "الحالة" : "Status"}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {ar ? "قيد المراجعة" : "Pending review"}
                  </span>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="w-full h-13 min-h-12 rounded-2xl bg-[#0052FF] text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition hover:bg-[#0052FF]/90"
            >
              {ar ? "التالي" : "Next"}
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={busy}
                className="h-13 min-h-12 px-5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold transition hover:bg-slate-200 disabled:opacity-50"
              >
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex-1 h-13 min-h-12 rounded-2xl bg-[#0052FF] text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition hover:bg-[#0052FF]/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {busy
                  ? ar
                    ? "جارٍ الإرسال..."
                    : "Submitting..."
                  : ar
                    ? "إرسال الإعلان للمراجعة"
                    : "Submit Ad for Review"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

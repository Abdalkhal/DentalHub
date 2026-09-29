import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Megaphone, Phone, Send, User, X } from "lucide-react";
import { useSignedImageUrls } from "@/lib/products";
import type { Ad } from "@/lib/adsStore";
import { cn } from "@/lib/utils";

// Port of native-app/src/components/AdDetailModal.tsx: image carousel +
// thumbnails, title/publisher/description, then Call + WhatsApp using the
// ad's own contact number.
export function AdDetailModal({ ad, ar, onClose }: { ad: Ad; ar: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const { data: urlMap = {} } = useSignedImageUrls(ad.images);
  const images = ad.images.map((p) => urlMap[p]).filter((u): u is string => !!u);
  const digits = ad.contactPhone.replace(/\D/g, "");
  const current = Math.min(idx, Math.max(0, images.length - 1));

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  const openProfile = () => {
    onClose();
    navigate({ to: "/profile/$accountId", params: { accountId: ad.accountId } });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl bg-white md:max-w-2xl md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="flex-1 truncate text-base font-bold text-slate-800">{ar ? "تفاصيل الإعلان" : "Ad Details"}</h3>
          <button onClick={onClose} className="ms-2 size-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <X className="size-4 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="bg-slate-900">
            <div className="relative aspect-square max-h-[60vh] mx-auto bg-slate-900 flex items-center justify-center">
              {images.length > 0 ? (
                <img src={images[current]} alt="" className="size-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <Megaphone className="size-10" />
                  <p className="mt-2 text-xs">{ar ? "لا توجد صور" : "No images"}</p>
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <ChevronLeft className="size-5" />
                  </button>
                  <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <ChevronRight className="size-5" />
                  </button>
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                    {current + 1}/{images.length}
                  </span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setIdx(i)}
                    className={cn("size-14 shrink-0 overflow-hidden rounded-lg border-2", i === current ? "border-sky-400" : "border-transparent opacity-60")}
                  >
                    <img src={img} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="text-lg font-bold leading-snug text-slate-900">{ad.title}</p>
              <button onClick={openProfile} className="mt-3 flex items-center gap-2.5 text-start">
                {ad.accountPhoto ? (
                  <img src={ad.accountPhoto} alt="" className="size-12 rounded-full object-cover bg-slate-100" />
                ) : (
                  <span className="size-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="size-5 text-slate-400" />
                  </span>
                )}
                <span>
                  <span className="block text-sm font-bold text-slate-800">{ad.accountName}</span>
                  <span className="block text-[11px] font-semibold text-primary">{ar ? "عرض الحساب ›" : "View account ›"}</span>
                </span>
              </button>
            </div>

            {ad.description && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{ar ? "وصف تفصيلي" : "Detailed Description"}</p>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{ad.description}</p>
              </div>
            )}

            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
              {digits ? (
                <>
                  <a href={`tel:${digits}`} className="h-11 flex-1 rounded-xl bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-sky-200">
                    <Phone className="size-3.5" />
                    {ar ? "اتصال" : "Call"}
                  </a>
                  <a
                    href={`https://wa.me/${digits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 flex-1 rounded-xl bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600"
                  >
                    <Send className="size-3.5" />
                    {ar ? "واتساب" : "WhatsApp"}
                  </a>
                </>
              ) : (
                <p className="text-xs text-slate-400">{ar ? "لا يوجد رقم تواصل لهذا الإعلان" : "No contact number on this ad"}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

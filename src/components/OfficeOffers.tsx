import { useState } from "react";
import { Loader2, Megaphone, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useOffers, useUpsertOffer, useDeleteOffer, type Offer } from "@/lib/offers";
import { useSignedImageUrls } from "@/lib/products";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Mirrors native's OfficeOffers: existing offers can be edited or deleted,
// but new ones aren't created here — new promotions go through My Ads.
const OFFER_STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-rose-50 text-rose-700",
  expired: "bg-slate-100 text-slate-500",
};

function offerStatusLabel(status: string | undefined, ar: boolean): string {
  switch (status) {
    case "active":
      return ar ? "نشط" : "Active";
    case "pending":
      return ar ? "قيد المراجعة" : "Pending";
    case "rejected":
      return ar ? "مرفوض" : "Rejected";
    default:
      return ar ? "منتهي" : "Expired";
  }
}

function offerMoney(n: number, cur?: string): string {
  return cur === "IQD" ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

export function OfficeOffers({ supplierId }: { supplierId: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: offers = [], isLoading } = useOffers(supplierId);
  const deleteOffer = useDeleteOffer();
  const [editing, setEditing] = useState<Offer | null>(null);

  const allPaths = offers.filter((o) => o.imageUrl).map((o) => o.imageUrl);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);

  const handleDelete = async (offer: Offer) => {
    if (!confirm(`${ar ? "حذف العرض" : "Delete offer"}\n${offer.title}`)) return;
    await deleteOffer.mutateAsync(offer.id);
    toast.success(ar ? "تم حذف العرض" : "Offer deleted");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-600 md:text-base md:text-slate-800">
        {ar ? "عروضك" : "Your offers"} ({offers.length})
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : offers.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center text-muted-foreground">
          <Megaphone className="size-12 mb-3 opacity-20" />
          <p className="text-sm text-slate-400">{ar ? "لا توجد عروض بعد" : "No offers yet"}</p>
        </div>
      ) : (
        <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              role="button"
              tabIndex={0}
              onClick={() => setEditing(offer)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditing(offer);
              }}
              className="bg-card border border-border rounded-2xl p-3.5 shadow-soft cursor-pointer hover:shadow-card transition md:shadow-none md:hover:shadow-md md:hover:border-[#0E6E66]/40"
            >
              <div className="flex items-start gap-3">
                {offer.imageUrl && urlMap[offer.imageUrl] && (
                  <img
                    src={urlMap[offer.imageUrl]}
                    alt=""
                    className="size-14 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-slate-800">{offer.title}</p>
                  {offer.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{offer.description}</p>
                  )}
                  {offer.price != null && (
                    <p className="mt-1 font-display font-extrabold text-sm text-primary">
                      {offerMoney(offer.price, offer.currency)}
                    </p>
                  )}
                  {offer.expiryDate && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {ar ? "ينتهي" : "Expires"}: {offer.expiryDate}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      OFFER_STATUS_TONE[offer.status ?? "active"] ?? OFFER_STATUS_TONE.active,
                    )}
                  >
                    {offerStatusLabel(offer.status ?? "active", ar)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(offer);
                    }}
                    aria-label={ar ? "حذف" : "Delete"}
                    className="size-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {offer.status === "rejected" && offer.rejectReason && (
                <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-600">
                  {ar ? "السبب" : "Reason"}: {offer.rejectReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <OfferEditModal
          ar={ar}
          supplierId={supplierId}
          offer={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function OfferEditModal({
  ar,
  supplierId,
  offer,
  onClose,
}: {
  ar: boolean;
  supplierId: string;
  offer: Offer;
  onClose: () => void;
}) {
  const upsert = useUpsertOffer();
  const [title, setTitle] = useState(offer.title ?? "");
  const [description, setDescription] = useState(offer.description ?? "");
  const [price, setPrice] = useState(offer.price != null ? String(offer.price) : "");
  const [currency, setCurrency] = useState<"USD" | "IQD">(offer.currency === "IQD" ? "IQD" : "USD");
  const [expiryDate, setExpiryDate] = useState(offer.expiryDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim()) {
      setError(ar ? "أدخل عنوان العرض" : "Enter an offer title");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await upsert.mutateAsync({
        id: offer.id,
        supplierId,
        title: title.trim(),
        description: description.trim(),
        imageUrl: offer.imageUrl ?? "",
        expiryDate: expiryDate.trim(),
        price: price.trim() ? Number(price) : undefined,
        currency: price.trim() ? currency : undefined,
        discountPct: offer.discountPct,
        // Editing keeps the offer's current review status; only an admin
        // moves it between pending/active/rejected.
        status: offer.status ?? "pending",
        rejectReason: offer.rejectReason,
        createdAt: offer.createdAt,
      });
      toast.success(ar ? "تم حفظ العرض" : "Offer saved");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const fieldCls =
    "w-full h-12 rounded-xl bg-white border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 space-y-3 shadow-2xl animate-in slide-in-from-bottom md:rounded-3xl md:max-w-lg md:pb-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-extrabold text-lg text-slate-900">
            {ar ? "تعديل العرض" : "Edit offer"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={ar ? "عنوان العرض" : "Offer title"}
          className={fieldCls}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={ar ? "الوصف (اختياري)" : "Description (optional)"}
          rows={3}
          className={cn(fieldCls, "h-auto py-3 resize-none")}
        />
        <div className="flex gap-2">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder={ar ? "السعر (اختياري)" : "Price (optional)"}
            className={cn(fieldCls, "flex-1")}
          />
          {(["USD", "IQD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={cn(
                "h-12 px-4 rounded-xl text-sm font-bold border transition",
                currency === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              {c === "USD" ? "$" : "د.ع"}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">
            {ar ? "تاريخ الانتهاء (اختياري)" : "Expiry date (optional)"}
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={fieldCls}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
          >
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {ar ? "حفظ" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

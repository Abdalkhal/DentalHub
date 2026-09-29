import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone, Send, Trash2, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { SUPPORT_WHATSAPP_NUMBER } from "@/lib/constants/support";
import { useUserRole } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSignedImageUrls } from "@/lib/products";
import {
  useMyAds,
  useSubmitAd,
  useDeleteAd,
  uploadAdImage,
  removeAdImage,
  checkAdImageSafety,
  MAX_AD_IMAGES,
  type Ad,
} from "@/lib/adsStore";

export const Route = createFileRoute("/my-ads")({
  component: MyAdsPage,
});

// Support/admin WhatsApp Business number (same as the native app). Approval
// itself happens in the admin panel; this is only for arranging duration/payment.
const ADS_WHATSAPP_NUMBER = SUPPORT_WHATSAPP_NUMBER;

const STATUS_TONE: Record<Ad["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

function statusLabel(status: Ad["status"], ar: boolean): string {
  if (status === "active") return ar ? "نشط" : "Active";
  if (status === "rejected") return ar ? "مرفوض" : "Rejected";
  return ar ? "قيد المراجعة" : "Pending review";
}

function whatsappLink(accountName: string, title: string): string {
  const text = encodeURIComponent(
    `مرحباً، أرسلت للتو إعلاناً جديداً على Dent Hub.\nالحساب: ${accountName}\nعنوان الإعلان: ${title}`,
  );
  return `https://wa.me/${ADS_WHATSAPP_NUMBER}?text=${text}`;
}

function AdCard({ ad, ar, onDelete }: { ad: Ad; ar: boolean; onDelete: () => void }) {
  const { data: urlMap = {} } = useSignedImageUrls(ad.images);
  const thumb = ad.images[0] ? urlMap[ad.images[0]] : undefined;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
      {thumb ? (
        <img src={thumb} alt="" className="size-16 shrink-0 rounded-xl object-cover bg-slate-100" />
      ) : (
        <span className="size-16 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center">
          <Megaphone className="size-5 text-slate-300" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{ad.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{ad.description}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", STATUS_TONE[ad.status])}>
            {statusLabel(ad.status, ar)}
          </span>
          {ad.status === "rejected" && ad.rejectReason && (
            <span className="flex-1 truncate text-[10px] text-rose-500">{ad.rejectReason}</span>
          )}
        </div>
      </div>
      <button onClick={onDelete} className="size-8 shrink-0 rounded-lg bg-rose-50 flex items-center justify-center hover:bg-rose-100" aria-label={ar ? "حذف" : "Delete"}>
        <Trash2 className="size-3.5 text-rose-500" />
      </button>
    </div>
  );
}

function MyAdsPage() {
  return (
    <RoleGuard allowedRoles={["dentist", "supply", "implant", "lab"]}>
      <MyAdsContent />
    </RoleGuard>
  );
}

function MyAdsContent() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user, role } = useUserRole();
  const accountId = user?.uid ?? "";
  const accountName = [role?.name, role?.surname].filter(Boolean).join(" ").trim() || (user?.email ?? "");
  const accountType = role?.accountType ?? "dentist";

  const { data: myAds = [] } = useMyAds(accountId);
  const submitAd = useSubmitAd();
  const deleteAd = useDeleteAd();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const { data: draftUrlMap = {} } = useSignedImageUrls(images);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role?.phone) setContactPhone((prev) => prev || role.phone || "");
  }, [role?.phone]);

  const pendingAds = myAds.filter((a) => a.status === "pending");

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    if (images.length >= MAX_AD_IMAGES) {
      toast.error(ar ? `الحد الأقصى ${MAX_AD_IMAGES} صور` : `Max ${MAX_AD_IMAGES} images`);
      return;
    }
    setUploading(true);
    let path: string | null = null;
    try {
      path = await uploadAdImage(accountId, file);
      const safety = await checkAdImageSafety(path);
      if (!safety.safe) {
        toast.error(ar ? "الصورة غير مناسبة ولا يمكن استخدامها" : "This image is not allowed");
        return;
      }
      const uploaded = path;
      setImages((prev) => [...prev, uploaded]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ar ? "فشل رفع الصورة" : "Upload failed");
      if (path) await removeAdImage(path);
    } finally {
      setUploading(false);
    }
  };

  const removeDraftImage = async (path: string) => {
    setImages((prev) => prev.filter((p) => p !== path));
    await removeAdImage(path);
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error(ar ? "أدخل عنوان ووصف الإعلان" : "Enter a title and description");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error(ar ? "أدخل رقم تواصل يظهر مع الإعلان" : "Enter a contact number to show on the ad");
      return;
    }
    if (images.length === 0) {
      toast.error(ar ? "أضف صورة واحدة على الأقل" : "Add at least one image");
      return;
    }
    try {
      await submitAd.mutateAsync({
        accountId,
        accountType,
        accountName,
        accountPhoto: role?.photoURL || undefined,
        contactPhone: contactPhone.trim(),
        title: title.trim(),
        description: description.trim(),
        images,
      });
      setTitle("");
      setDescription("");
      setImages([]);
      toast.success(ar ? "تم إرسال إعلانك للمراجعة" : "Your ad was sent for review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ar ? "فشل الإرسال" : "Failed to submit");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return (
    <MobileShell wide>
      <TopBar title={ar ? "إعلاناتي" : "My Ads"} showBack wide maxW="4xl" />
      <div className="px-4 pt-4 pb-8 md:px-6 md:pt-8 lg:px-0 lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center gap-3 rounded-3xl p-4 md:p-6" style={{ backgroundColor: "#0052FF" }}>
          <span className="size-12 shrink-0 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Megaphone className="size-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-white md:text-lg">{ar ? "إعلاناتي" : "My Ads"}</p>
            <p className="mt-0.5 text-[11px] text-white/80 md:text-sm">
              {ar ? "أطلق إعلانك وصل للآلاف من الأطباء والعيادات" : "Launch your ad and reach thousands of dentists and clinics"}
            </p>
          </div>
        </div>

        {pendingAds.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3.5">
            <p className="text-xs font-bold text-sky-800">
              {ar
                ? `لديك ${pendingAds.length} إعلان قيد المراجعة، تواصل معنا على واتساب لتسريعها`
                : `You have ${pendingAds.length} ad(s) pending review — reach out on WhatsApp to speed it up`}
            </p>
            <a
              href={whatsappLink(accountName, pendingAds[0].title)}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start h-10 px-4 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-700"
            >
              <Send className="size-3.5" />
              {ar ? "تواصل على واتساب" : "Contact on WhatsApp"}
            </a>
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
            <p className="text-sm font-extrabold text-slate-800">{ar ? "إعلان جديد" : "New ad"}</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? "عنوان الإعلان" : "Ad title"} className={inputCls} />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ar ? "وصف الإعلان" : "Ad description"}
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder={ar ? "رقم التواصل الظاهر مع الإعلان" : "Contact number shown on the ad"}
              type="tel"
              dir="ltr"
              className={cn(inputCls, "text-left")}
            />

            <div className="flex flex-wrap gap-2">
              {images.map((path) => (
                <button key={path} onClick={() => removeDraftImage(path)} className="relative" aria-label={ar ? "إزالة الصورة" : "Remove image"}>
                  {draftUrlMap[path] ? (
                    <img src={draftUrlMap[path]} alt="" className="size-16 rounded-xl object-cover bg-slate-100" />
                  ) : (
                    <span className="block size-16 rounded-xl bg-slate-100" />
                  )}
                  <span className="absolute -right-1 -top-1 size-5 rounded-full bg-rose-500 flex items-center justify-center">
                    <X className="size-3 text-white" />
                  </span>
                </button>
              ))}
              {images.length < MAX_AD_IMAGES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="h-16 px-4 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-60"
                >
                  {uploading && <Loader2 className="size-3.5 animate-spin" />}
                  {ar ? "+ صورة" : "+ Image"}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onPickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">{ar ? `حتى ${MAX_AD_IMAGES} صور` : `Up to ${MAX_AD_IMAGES} images`}</p>

            <button
              onClick={submit}
              disabled={submitAd.isPending}
              className="h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60"
            >
              {submitAd.isPending && <Loader2 className="size-4 animate-spin" />}
              {ar ? "إرسال للمراجعة" : "Send for review"}
            </button>
          </div>

          {myAds.length > 0 && (
            <div>
              <p className="text-sm font-bold text-slate-600">
                {ar ? "إعلاناتك" : "Your ads"} ({myAds.length})
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {myAds.map((ad) => (
                  <AdCard key={ad.id} ad={ad} ar={ar} onDelete={() => deleteAd.mutate(ad)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

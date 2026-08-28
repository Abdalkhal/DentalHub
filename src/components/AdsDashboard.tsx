import { useMemo, useState } from "react";
import {
  Megaphone,
  Sparkles,
  Tag,
  Eye,
  MousePointerClick,
  Clock,
  Loader2,
  MessageCircle,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useOffers } from "@/lib/offers";
import { useUserRole } from "@/lib/useAuth";
import { useSignedImageUrls } from "@/lib/products";
import { toast } from "sonner";

type AdStatus = "all" | "active" | "pending" | "expired";

type AdItem = {
  id: string;
  title: string;
  description: string;
  image?: string;
  status: Exclude<AdStatus, "all">;
  views: number;
  clicks: number;
  expiryDate?: string;
};

const FILTERS: { key: AdStatus; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "expired", label: "منتهي" },
];

export function AdsDashboard() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const userId = role?.userId ?? "";
  const [filter, setFilter] = useState<AdStatus>("all");

  const { data: offers = [], isLoading } = useOffers(userId);

  const allImagePaths = useMemo(
    () => offers.filter((o) => o.imageUrl).map((o) => o.imageUrl),
    [offers],
  );
  const { data: urlMap = {} } = useSignedImageUrls(allImagePaths);

  const ads: AdItem[] = useMemo(
    () =>
      offers.map((o) => {
        const expired = o.expiryDate ? new Date(o.expiryDate).getTime() < Date.now() : false;
        return {
          id: o.id,
          title: o.title,
          description: o.description,
          image: o.imageUrl ? urlMap[o.imageUrl] : undefined,
          status: expired ? "expired" : "active",
          views: 0,
          clicks: 0,
          expiryDate: o.expiryDate,
        };
      }),
    [offers, urlMap],
  );

  const activeAds = ads.filter((a) => a.status === "active");
  const totalViews = activeAds.reduce((s, a) => s + a.views, 0);
  const totalClicks = activeAds.reduce((s, a) => s + a.clicks, 0);

  const counts: Record<AdStatus, number> = {
    all: ads.length,
    active: activeAds.length,
    pending: ads.filter((a) => a.status === "pending").length,
    expired: ads.filter((a) => a.status === "expired").length,
  };

  const filtered = filter === "all" ? ads : ads.filter((a) => a.status === filter);

  const comingSoon = () =>
    toast.info(ar ? "ميزة إدارة الحملات الإعلانية قريباً" : "Ad campaign management coming soon");

  const statusBadge = (s: AdItem["status"]) => {
    const map = {
      active: {
        cls: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        label: ar ? "نشط" : "Active",
      },
      pending: {
        cls: "bg-amber-50 text-amber-700 ring-amber-100",
        label: ar ? "قيد المراجعة" : "Pending",
      },
      expired: {
        cls: "bg-slate-100 text-slate-500 ring-slate-200",
        label: ar ? "منتهي" : "Expired",
      },
    } as const;
    const m = map[s];
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1",
          m.cls,
        )}
      >
        {s === "active" && <span className="size-1.5 rounded-full bg-current" />}
        {m.label}
      </span>
    );
  };

  return (
    <div className="min-h-full flex flex-col bg-[#F1F5F9]" dir="rtl">
      {/* Hero header */}
      <div
        className="px-5 pt-6 pb-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0052FF, #00A3FF)" }}
      >
        <div className="absolute -top-10 -end-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -start-8 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3.5">
          <span className="size-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
            <Megaphone className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-xl text-white">
              {ar ? "إعلاناتي" : "My Ads"}
            </h1>
            <p className="text-white/80 text-xs mt-0.5 truncate">
              {ar
                ? "أطلق إعلانك وصل للآلاف من الأطباء والعيادات"
                : "Launch your ad and reach thousands of dentists and clinics"}
            </p>
          </div>
        </div>
      </div>

      {/* Campaign setup cards */}
      <div className="-mt-7 px-4 space-y-3">
        <button
          type="button"
          onClick={comingSoon}
          className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md hover:border-[#0052FF]/40 transition text-start"
        >
          <span className="size-11 rounded-2xl bg-[#0052FF]/10 text-[#0052FF] flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">
              {ar ? "إعلان الصفحة الرئيسية" : "Main Page Ad"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ar
                ? "أبرز عيادتك أو متجرك في واجهة التطبيق الرئيسية"
                : "Showcase your clinic or store on the app's main screen"}
            </p>
          </div>
          <span className="shrink-0 h-8 px-3 rounded-full bg-[#0052FF] text-white text-[11px] font-bold flex items-center gap-1">
            {ar ? "ابدأ" : "Start"}
            <ArrowUpRight className="size-3.5" />
          </span>
        </button>

        <button
          type="button"
          onClick={comingSoon}
          className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md hover:border-[#0052FF]/40 transition text-start"
        >
          <span className="size-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <Tag className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">
              {ar ? "إعلان العروض والخصومات" : "Deals & Offers Ad"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ar
                ? "روّج لعروضك وخصوماتك لشرائح المستهدفين"
                : "Promote your deals and discounts to your target audience"}
            </p>
          </div>
          <span className="shrink-0 h-8 px-3 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1">
            {ar ? "ابدأ" : "Start"}
            <ArrowUpRight className="size-3.5" />
          </span>
        </button>
      </div>

      {/* Stats */}
      {activeAds.length > 0 && (
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <span className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Eye className="size-5" />
            </span>
            <div>
              <p className="font-display font-extrabold text-lg text-slate-900">{totalViews}</p>
              <p className="text-[11px] font-bold text-slate-500">{ar ? "المشاهدات" : "Views"}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <span className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MousePointerClick className="size-5" />
            </span>
            <div>
              <p className="font-display font-extrabold text-lg text-slate-900">{totalClicks}</p>
              <p className="text-[11px] font-bold text-slate-500">{ar ? "النقرات" : "Clicks"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-4 mt-5 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">{ar ? "إعلاناتي" : "My Ads"}</p>
      </div>
      <div className="px-4 mt-3 flex gap-2 overflow-x-auto -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition",
              filter === f.key
                ? "bg-[#0052FF] text-white border-[#0052FF] shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#0052FF]/40",
            )}
          >
            {ar ? f.label : f.label}
            <span
              className={cn(
                "ms-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                filter === f.key ? "bg-white/20" : "bg-slate-100 text-slate-500",
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Ads list / empty state */}
      <div className="px-4 mt-4 flex-1">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 text-[#0052FF] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <span className="size-20 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Megaphone className="size-9 text-slate-300" />
            </span>
            <p className="font-display font-bold text-lg text-slate-800 mt-5">
              {ar ? "لا توجد إعلانات بعد" : "No ads yet"}
            </p>
            <p className="text-sm text-slate-500 mt-1.5 max-w-[240px] leading-relaxed">
              {ar
                ? "ابدأ بإطلاق أول إعلان لك وعُرضه على آلاف المستخدمين"
                : "Launch your first ad and reach thousands of users"}
            </p>
            <button
              type="button"
              onClick={comingSoon}
              className="mt-5 h-11 px-6 rounded-2xl bg-[#0052FF] text-white text-sm font-bold flex items-center gap-2 shadow-lg hover:opacity-90 transition"
            >
              <Plus className="size-4" />
              {ar ? "إنشاء إعلان" : "Create Ad"}
            </button>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {filtered.map((ad) => (
              <div
                key={ad.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="flex gap-3 p-3.5">
                  {ad.image ? (
                    <img
                      src={ad.image}
                      alt=""
                      className="size-20 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                  ) : (
                    <span className="size-20 rounded-xl bg-gradient-to-br from-[#0052FF]/15 to-[#00A3FF]/15 flex items-center justify-center shrink-0">
                      <Megaphone className="size-7 text-[#0052FF]/40" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 line-clamp-2">{ad.title}</p>
                      {statusBadge(ad.status)}
                    </div>
                    {ad.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {ad.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="size-3.5 text-slate-400" /> {ad.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="size-3.5 text-slate-400" /> {ad.clicks}
                      </span>
                      {ad.expiryDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5 text-slate-400" />
                          <span dir="ltr">
                            {new Date(ad.expiryDate).toLocaleDateString(ar ? "ar-IQ" : "en-GB")}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp support CTA */}
      <div className="px-4 pt-5 pb-28">
        <a
          href="https://wa.me/9640000000000?text=مرحباً،%20أريد%20الاستفسار%20عن%20الإعلانات"
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-2xl p-4 flex items-center gap-3.5 text-white shadow-lg hover:opacity-95 transition"
          style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
        >
          <span className="size-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <MessageCircle className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">
              {ar ? "تواصل معنا عبر واتساب" : "Chat with us on WhatsApp"}
            </p>
            <p className="text-white/80 text-[11px] mt-0.5">
              {ar
                ? "فريق الدعم جاهز للإجابة على استفساراتك حول الإعلانات"
                : "Our support team is ready to answer your ad questions"}
            </p>
          </div>
          <ArrowUpRight className="size-5 shrink-0" />
        </a>
      </div>
    </div>
  );
}

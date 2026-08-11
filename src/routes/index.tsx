import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/useAuth";
import { setPatientStoreUser } from "@/lib/patientsStore";
import { setClinicStoreUser } from "@/lib/clinicStore";
import { NotificationBell } from "@/components/NotificationBell";
import { getSnapshot } from "@/lib/ordersStore";
import { useQuickOrders } from "@/lib/quickOrders";
import { useImplantOffers } from "@/lib/implantOffers";
import dentalImplant from "@/assets/dental-implant.png";
import dentalSupplies from "@/assets/dental-supplies-icon.png";
import dentalBridge from "@/assets/dental-bridge.png";
import { BRANDS } from "@/data/brands";
import { BrandLogo } from "@/components/BrandLogo";
import { useProductSearch, type SearchResult } from "@/lib/search";
import {
  Bell, Globe, Search, ChevronLeft, ChevronRight,
  ClipboardList, Plus, Sparkles, Stethoscope, User, Package, Megaphone,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

type Role = "supply" | "lab" | "implant";
type Banner = { id: string; title: string; subtitle: string; price: string; image?: string; role: Role };

const ROLE_META: Record<Role, { ar: string; en: string }> = {
  supply: { ar: "عروض المستلزمات", en: "Supplies Offers" },
  lab: { ar: "عروض المختبر", en: "Lab Offers" },
  implant: { ar: "عروض الزرعات", en: "Implant Offers" },
};

const DEFAULT_BANNER: Banner = { id: "default", role: "lab", title: "", subtitle: "", price: "" };

function loadBanners(): Banner[] {
  if (typeof window === "undefined") return [];
  const out: Banner[] = [];
  (Object.keys(ROLE_META) as Role[]).forEach((role) => {
    try {
      const raw = localStorage.getItem(`dh_store_${role}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { promos?: Array<Omit<Banner, "role">> };
      (parsed.promos ?? []).forEach((p) => out.push({ ...p, role }));
    } catch {}
  });
  return out;
}

function Home() {
  const { t, lang, dir, toggle } = useI18n();
  const { user } = useSession();
  const [userBanners, setUserBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const uid = user?.uid || "";
    setPatientStoreUser(uid);
    setClinicStoreUser(uid);
  }, [user?.uid]);

  useEffect(() => {
    setUserBanners(loadBanners());
    const on = () => setUserBanners(loadBanners());
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const banners = userBanners.length ? userBanners : [DEFAULT_BANNER];
  const banner = banners[idx] ?? banners[0];
  const next = () => setIdx((i) => (i + 1) % banners.length);
  const prev = () => setIdx((i) => (i - 1 + banners.length) % banners.length);

  const [caseCount, setCaseCount] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const { results: searchResults, loading: searchLoading } = useProductSearch(searchQ);

  useEffect(() => {
    const upd = () => setCaseCount(getSnapshot().filter((o) => o.status !== "completed").length);
    upd();
    window.addEventListener("storage", upd);
    return () => window.removeEventListener("storage", upd);
  }, []);

  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const quickItems = useQuickOrders();
  const { offers: implantOffers = [] } = useImplantOffers();
  const latestOffer = implantOffers[0];
  const quickPages = quickItems.length > 0 ? Array.from({ length: Math.ceil(quickItems.length / 3) }, (_, i) => quickItems.slice(i * 3, i * 3 + 3)) : [];
  const [quickPage, setQuickPage] = useState(0);

  const categories = [
    { to: "/implants", title: lang === "ar" ? "زراعة الأسنان" : "Dental Implants", img: dentalImplant, ring: "ring-amber-200" },
    { to: "/supplies", title: lang === "ar" ? "مستلزمات طبية" : "Dental Supplies", img: dentalSupplies, ring: "ring-emerald-200" },
    { to: "/labs", title: lang === "ar" ? "المختبرات" : "Laboratories", img: dentalBridge, ring: "ring-sky-200" },
    { to: "/clinic", title: lang === "ar" ? "عيادتي" : "My Clinic", img: null, ring: "ring-violet-200", icon: Stethoscope },
  ];

  return (
    <MobileShell>
      {/* Top Nav */}
      <header className="px-3 pt-4 pb-2 bg-gradient-to-b from-sky-50 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="h-9 px-2.5 rounded-full bg-white border border-slate-200 flex items-center gap-1 text-xs font-bold text-slate-700 shadow-sm">
              <span>{lang === "ar" ? "EN" : "AR"}</span>
              <Globe className="size-3.5 text-slate-400" />
            </button>
            <NotificationBell userId={user?.uid || ""} />
          </div>

          <Link className="flex items-center gap-1.5 font-display font-extrabold text-lg" to="/">
            <span className="text-primary">Dental</span>
            <span className="text-slate-800">Hub</span>
          </Link>

          <Link to="/account" className="flex flex-col items-center gap-0.5 shrink-0">
            <span className="size-11 rounded-full overflow-hidden ring-2 ring-primary shadow-sm bg-primary/10 flex items-center justify-center">
              <User className="size-5 text-primary" />
            </span>
            <span className="text-[10px] font-bold text-slate-700">{lang === "ar" ? "حسابي" : "Account"}</span>
          </Link>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن زراعة، مادة، مختبر..." : "Search implants, materials, labs..."}
            className="w-full h-12 rounded-2xl bg-white border border-slate-200 ps-4 pe-11 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
          />
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 end-4 text-slate-400 pointer-events-none" />

          {searchQ.length >= 2 && (
            <div className="absolute top-full start-0 end-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 max-h-72 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">{lang === "ar" ? "جارٍ البحث..." : "Searching..."}</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {lang === "ar" ? "لا توجد نتائج" : "No results found"}
                </div>
              ) : (
                searchResults.map((r) => (
                  <Link
                    key={`${r.type}-${r.id}`}
                    to={r.route}
                    onClick={() => setSearchQ("")}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/50 transition border-b border-slate-50 last:border-0"
                  >
                    <span className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                      {r.type === "product" ? "P" : r.type === "lab" ? "L" : r.type === "office" ? "O" : "!"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{lang === "ar" ? r.titleAr : r.titleEn}</p>
                      {r.subtitle && <p className="text-[11px] text-slate-400">{r.subtitle}</p>}
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                      {r.type === "product" ? (lang === "ar" ? "منتج" : "Product") :
                       r.type === "lab" ? (lang === "ar" ? "مختبر" : "Lab") :
                       r.type === "office" ? (lang === "ar" ? "مكتب" : "Office") : r.type}
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero banner */}
      <section className="px-3 mt-3">
        <div className="relative rounded-3xl overflow-hidden min-h-[190px] shadow-card" style={{ background: "linear-gradient(135deg, #6bb2ee 0%, #3d86dd 50%, #1f5fb8 100%)" }}>
          <div className="absolute -top-16 -end-14 size-52 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -start-14 size-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute top-3 end-3 z-10">
            <span className="inline-flex items-center justify-center size-14 rounded-full bg-white/20 text-white text-[11px] font-extrabold text-center leading-tight shadow-lg ring-2 ring-white/40">
              {lang === "ar" ? "خصم\nخاص" : "Special\nOffer"}
            </span>
          </div>
          <div className="relative flex items-center gap-3 p-4 pt-5">
            <div className="flex-1 min-w-0 text-white">
              <h2 className="font-display font-extrabold text-[22px] leading-tight drop-shadow-sm">
                {banner.title || (lang === "ar" ? ROLE_META[banner.role].ar : ROLE_META[banner.role].en)}
              </h2>
              <p className="mt-2 text-white/95 text-sm leading-snug">
                {banner.subtitle || (lang === "ar" ? "خصم حتى 15% على أدوات المختبرات" : "Up to 15% off lab tools")}
              </p>
              {banner.price && <div className="mt-1 font-display font-extrabold text-2xl text-yellow-300 drop-shadow">{banner.price}</div>}
              <Link to="/supplies" className="mt-3 inline-flex h-10 px-5 rounded-full bg-white/20 text-white text-sm font-bold shadow-md hover:bg-white/30 transition items-center">
                {lang === "ar" ? "تسوق الآن" : "Shop now"}
              </Link>
            </div>
            <div className="shrink-0 w-[130px] h-[140px] flex items-center justify-center">
              <img src={banner.image || dentalBridge} alt="" loading="lazy" className="max-w-full max-h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
          {banners.length > 1 && (
            <>
              <button onClick={prev} aria-label="prev" className="absolute top-1/2 -translate-y-1/2 start-2 size-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white"><PrevIcon className="size-4" /></button>
              <button onClick={next} aria-label="next" className="absolute top-1/2 -translate-y-1/2 end-2 size-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white"><NextIcon className="size-4" /></button>
            </>
          )}
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50")} aria-label={`slide ${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-3 mt-4">
        <ul className="grid grid-cols-4 gap-2">
          {categories.map((c) => (
              <li key={c.to}>
                <Link to={c.to} className="flex flex-col items-center justify-between h-full min-h-[120px] p-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
                  <span className={cn("size-14 rounded-full flex items-center justify-center ring-2 bg-slate-50 overflow-hidden", c.ring)}>
                    {c.img ? (
                      <img src={c.img} alt="" loading="lazy" className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : c.icon ? (
                      <c.icon className="size-6 text-slate-600" />
                    ) : null}
                  </span>
                  <p className="mt-2 text-center font-display font-bold text-[11px] leading-snug text-slate-700">{c.title}</p>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {/* Brands */}
      <section className="px-3 mt-4">
        <BrandsStrip lang={lang} />
      </section>

      {/* Track Cases */}
      <section className="px-3 mt-4">
        <Link className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-2xl p-3.5" to="/track-cases">
          <span className="size-11 rounded-2xl bg-sky-100 ring-1 ring-sky-200 shadow-sm text-sky-600 flex items-center justify-center">
            <ClipboardList className="size-5" strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-extrabold text-sm">{lang === "ar" ? "تتبع حالاتك" : "Track your cases"}</p>
            <p className="text-[11px] text-slate-500">{lang === "ar" ? "تابع حالة الطلبات من المختبر" : "Follow your lab order status"}</p>
            <p className="text-[11px] font-bold text-primary mt-0.5">{lang === "ar" ? "عرض جميع الحالات ›" : "View all cases ›"}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white border border-slate-200 px-3 py-2 text-center shadow-sm">
            <p className="font-display font-extrabold text-xl text-slate-800">{caseCount}</p>
            <p className="text-[10px] text-slate-500">{lang === "ar" ? "حالات" : "cases"}</p>
          </div>
        </Link>
      </section>

      {/* Dual quick-section cards */}
      <section className="px-3 mt-4 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Quick Orders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-extrabold text-[13px]">{lang === "ar" ? "الطلبات السريعة" : "Quick Orders"}</p>
              <Link to="/quick-orders" className="text-[10px] font-bold text-primary">{lang === "ar" ? "عرض الكل" : "View all"}</Link>
            </div>
            {quickItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-3">
                <span className="size-10 rounded-full bg-sky-50 flex items-center justify-center">
                  <ClipboardList className="size-5 text-primary" strokeWidth={2.2} />
                </span>
                <p className="mt-2 text-[10.5px] font-bold text-slate-700">{lang === "ar" ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                <p className="mt-0.5 text-[9.5px] text-slate-400 leading-snug">{lang === "ar" ? "ستظهر أكثر منتجاتك المطلوبة هنا" : "Your most ordered items appear here"}</p>
              </div>
            ) : (
              <>
                <div onScroll={(e) => { const el = e.currentTarget; const w = el.clientWidth || 1; const p = Math.round(Math.abs(el.scrollLeft) / w); if (p !== quickPage) setQuickPage(p); }} className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1">
                  {quickPages.map((page, pi) => (
                    <ul key={pi} className="shrink-0 w-full snap-start flex items-start justify-around gap-1 px-1">
                      {page.map((it) => (
                        <li key={`${it.name}-${it.vendor}`} className="flex flex-col items-center gap-1 w-[31%]">
                          {it.image ? <img src={it.image} alt="" loading="lazy" className="h-11 w-full object-contain" /> : <span className="h-11 w-full rounded-xl bg-slate-50 flex items-center justify-center"><Package className="size-5 text-slate-400" /></span>}
                          <p className="text-[9px] font-semibold text-slate-700 text-center leading-tight h-6 overflow-hidden">{it.name}</p>
                          <p className="text-[8px] text-slate-400 text-center leading-none truncate w-full">{it.vendor}</p>
                          <button className="rounded-full bg-sky-50 border border-primary/25 text-primary text-[9px] font-bold px-2 py-[3px] active:scale-95 transition">+ {lang === "ar" ? "إعادة" : "Reorder"}</button>
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-1 pt-2">
                  {quickPages.map((_, i) => (
                    <span key={i} className={cn("rounded-full transition-all", i === quickPage ? "size-2 bg-primary" : "size-1.5 bg-slate-300")} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative bg-white border border-slate-200 rounded-2xl p-3 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="font-display font-extrabold text-[13px]">{lang === "ar" ? "عروض خاصة" : "Special Offers"}</p>
              <Link to="/offers" className="text-[10px] font-bold text-primary">{lang === "ar" ? "عرض الكل" : "View all"}</Link>
            </div>
            {latestOffer ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center h-16">
                  <img src={latestOffer.imageUrl || "/photo/implant.jpg"} alt="" loading="lazy" className="max-h-full object-contain" />
                </div>
                <p className="text-[10px] font-semibold text-slate-700 truncate text-center">{latestOffer.title}</p>
                {latestOffer.description && <p className="text-[9px] text-slate-400 line-clamp-1 text-center">{latestOffer.description}</p>}
                {latestOffer.price != null && (
                  <p className="font-display font-extrabold text-primary text-sm text-center">
                    {latestOffer.currency === "IQD" ? `${latestOffer.price.toLocaleString()} د.ع` : `$${latestOffer.price}`}
                  </p>
                )}
                {latestOffer.expiryDate && (
                  <p className="text-[9px] text-slate-400 text-center">{lang === "ar" ? "ينتهي" : "Expires"}: {latestOffer.expiryDate}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Megaphone className="size-8 text-slate-300 mb-1.5" />
                <p className="text-[10px] font-semibold text-slate-400">{lang === "ar" ? "لا توجد عروض حالياً" : "No offers yet"}</p>
              </div>
            )}
            <Sparkles className="absolute -top-2 -end-2 size-8 text-primary/10" />
          </div>
        </div>
      </section>
    </MobileShell>
  );
}

function BrandsStrip({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const featured = BRANDS.slice(0, 6);
  return (
    <>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-display font-extrabold text-sm text-slate-800">{ar ? "البراندات" : "Brands"}</h3>
        <Link to="/brands" className="text-xs font-bold text-primary hover:underline">{ar ? "المزيد >" : "More >"}</Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {featured.map((b) => (
          <Link key={b.id} to="/brands/$brandId" params={{ brandId: b.id }} className="shrink-0 w-28 bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center shadow-sm hover:shadow-md transition">
            <span className="size-16 rounded-xl bg-slate-50 flex items-center justify-center mb-1.5 overflow-hidden">
              <BrandLogo brand={b} className="w-full h-full" />
            </span>
            <p className="text-[11px] font-bold text-slate-700 text-center leading-tight line-clamp-2">{ar ? b.ar : b.name}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

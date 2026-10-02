import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSession, useUserRole, useLabStaffClaim } from "@/lib/useAuth";
import { setClinicsStoreUser } from "@/lib/clinicsStore";
import { NotificationBell } from "@/components/NotificationBell";
import { useOrders } from "@/lib/ordersStore";
import { useDentistCases, filterLegacyOrders } from "@/lib/caseTracking";
import { useQuickOrders } from "@/lib/quickOrders";
import { useImplantOffers } from "@/lib/implantOffers";
import dentalImplant from "@/assets/dental-implant.png";
import dentalSupplies from "@/assets/dental-supplies-icon.png";
import dentalBridge from "@/assets/dental-bridge.png";
import clinicHero from "@/assets/clinic-hero.jpg";
import { BRANDS } from "@/data/brands";
import { BrandLogo } from "@/components/BrandLogo";
import { AdDetailModal } from "@/components/AdDetailModal";
import { useVendorAccounts } from "@/lib/search";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import { useActiveAds, type Ad } from "@/lib/adsStore";
import { useQuickOrderActions } from "@/lib/quickOrders";
import { useCart, openCart } from "@/lib/cartStore";
import {
  Globe, Search, ChevronLeft, ChevronRight, X, MapPin, FlaskConical, ShoppingCart,
  ClipboardList, Sparkles, Stethoscope, User, Package, Megaphone,
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

// Same as native's Home tab: a vendor lands on its own dashboard, not the
// dentist marketplace.
const VENDOR_HOME: Partial<Record<string, "/supplies" | "/implants" | "/labs/dashboard">> = {
  supply: "/supplies",
  implant: "/implants",
  lab: "/labs/dashboard",
};

function Home() {
  const { role } = useUserRole();
  const { claim: labStaff } = useLabStaffClaim();
  const navigate = useNavigate();
  // Invited lab staff have no user_roles doc, only a claim — they land on
  // their design-cases screen, as on native.
  const vendorHome = labStaff
    ? "/designer"
    : role?.accountType
      ? VENDOR_HOME[role.accountType]
      : undefined;
  useEffect(() => {
    if (vendorHome) navigate({ to: vendorHome, replace: true });
  }, [vendorHome, navigate]);
  if (vendorHome) return null;
  return <DentistHome />;
}

function DentistHome() {
  const { lang, dir, toggle } = useI18n();
  const { user } = useSession();
  const [userBanners, setUserBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Resolves (and migrates, on first run) this account's clinic list, then
    // points patients/appointments/clinic-finance at whichever clinic is
    // active — see clinicsStore.ts's pointStoresAt.
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  useEffect(() => {
    setUserBanners(loadBanners());
    const on = () => setUserBanners(loadBanners());
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  // Approved ads first (each slot opens its full Ad on click), then any
  // legacy local promo banners — same order as the native home.
  const { data: activeAds = [] } = useActiveAds();
  const adImagePaths = useMemo(
    () => activeAds.map((a) => a.images[0]).filter((p): p is string => !!p),
    [activeAds],
  );
  const { data: adImageUrls } = useSignedImageUrls(adImagePaths);
  const adsForBanner = useMemo(() => {
    const urls = adImageUrls ?? {};
    return activeAds.filter((a) => a.images[0] && urls[a.images[0]]);
  }, [activeAds, adImageUrls]);
  const banners: Banner[] = useMemo(() => {
    const urls = adImageUrls ?? {};
    const fromAds: Banner[] = adsForBanner.map((a) => ({
      id: a.id,
      role: "supply",
      title: a.title,
      subtitle: a.description,
      price: "",
      image: urls[a.images[0]],
    }));
    return [...fromAds, ...userBanners];
  }, [adsForBanner, adImageUrls, userBanners]);
  const [viewingAd, setViewingAd] = useState<Ad | null>(null);

  const safeIdx = banners.length ? idx % banners.length : 0;
  const banner = banners[safeIdx];
  const bannerAd = safeIdx < adsForBanner.length ? adsForBanner[safeIdx] : null;
  const next = () => setIdx((i) => (i + 1) % banners.length);
  const prev = () => setIdx((i) => (i - 1 + banners.length) % banners.length);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const [searchQ, setSearchQ] = useState("");
  const { data: allProducts = [] } = useProducts();
  const { data: vendorAccounts = [] } = useVendorAccounts();
  const searchTerm = searchQ.trim().toLowerCase();
  const accountResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return vendorAccounts
      .filter((a) => [a.name, a.location].filter(Boolean).some((v) => v.toLowerCase().includes(searchTerm)))
      .slice(0, 5);
  }, [searchTerm, vendorAccounts]);
  const productResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return allProducts
      .filter((p) => [p.en, p.ar, p.brand].filter(Boolean).some((v) => v!.toLowerCase().includes(searchTerm)))
      .slice(0, 8);
  }, [searchTerm, allProducts]);
  const { role } = useUserRole();
  const dentistName =
    role?.accountType === "dentist"
      ? [role.name, role.surname].filter(Boolean).join(" ").trim()
      : "";
  const localOrders = useOrders();
  const { cases: dentistCases } = useDentistCases(user?.uid ?? "");

  const caseCount = useMemo(() => {
    const remote = dentistCases.map((c) => c.order);
    const remoteIds = new Set(remote.map((o) => o.id));
    const legacy = filterLegacyOrders(localOrders, remoteIds, dentistName);
    const all = Array.from(new Map([...remote, ...legacy].map((o) => [o.id, o])).values());
    return all.filter((o) => o.status !== "completed").length;
  }, [dentistCases, localOrders, dentistName]);

  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const quickItems = useQuickOrders();
  const { reorder } = useQuickOrderActions(quickItems, lang === "ar");
  const cartCount = useCart().length;
  const { offers: implantOffers = [] } = useImplantOffers();
  const latestOffer = implantOffers[0];
  const quickPages = quickItems.length > 0 ? Array.from({ length: Math.ceil(quickItems.length / 3) }, (_, i) => quickItems.slice(i * 3, i * 3 + 3)) : [];
  const [quickPage, setQuickPage] = useState(0);

  const categories = [
    { to: "/implants", title: lang === "ar" ? "زراعة الأسنان" : "Dental Implants", img: dentalImplant, ring: "ring-amber-200" },
    { to: "/supplies", title: lang === "ar" ? "مستلزمات طبية" : "Dental Supplies", img: dentalSupplies, ring: "ring-emerald-200" },
    { to: "/labs", title: lang === "ar" ? "المختبرات" : "Laboratories", img: dentalBridge, ring: "ring-sky-200" },
    { to: "/clinic", title: lang === "ar" ? "عيادتي" : "My Clinic", img: clinicHero, ring: "ring-violet-200", icon: Stethoscope },
  ];

  return (
    <MobileShell wide>
      {/* Top Nav — phone: two stacked rows (identity row, then search).
          md:+ : one utility bar, with the search as its centrepiece and the
          actions pushed to the end edge. */}
      <header className="px-3 pt-4 pb-2 bg-gradient-to-b from-sky-50 to-transparent md:px-6 md:pt-6 md:pb-5 md:flex md:items-center md:gap-5 lg:px-8 lg:max-w-7xl lg:mx-auto lg:w-full">
        <div className="flex items-center justify-between gap-2 md:contents">
          <div className="flex items-center gap-2 md:order-3">
            {role?.accountType === "dentist" && (
              <button
                type="button"
                onClick={openCart}
                className="relative size-10 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                aria-label={lang === "ar" ? "السلة" : "Cart"}
              >
                <ShoppingCart className="size-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -end-1 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            )}
            <button onClick={toggle} className="h-9 px-2.5 rounded-full bg-white border border-slate-200 flex items-center gap-1 text-xs font-bold text-slate-700 shadow-sm md:h-10 md:px-3.5">
              <span>{lang === "ar" ? "EN" : "AR"}</span>
              <Globe className="size-3.5 text-slate-400" />
            </button>
            <NotificationBell userId={user?.uid || ""} />
          </div>

          {/* The fixed lg:+ header already carries the wordmark, so it only
              needs to appear here on phones and tablets. */}
          <Link className="flex items-center gap-1.5 font-display font-extrabold text-lg md:order-1 md:text-xl lg:hidden" to="/">
            <span className="text-primary">Dental</span>
            <span className="text-slate-800">Hub</span>
          </Link>

          <Link to="/account" className="flex flex-col items-center gap-0.5 shrink-0 md:order-4 md:flex-row md:gap-2.5 md:bg-white md:border md:border-slate-200 md:rounded-full md:ps-1 md:pe-4 md:py-1 md:shadow-sm md:hover:bg-slate-50 md:transition">
            <span className="size-11 rounded-full overflow-hidden ring-2 ring-primary shadow-sm bg-primary/10 flex items-center justify-center md:size-9 md:ring-1">
              <User className="size-5 text-primary md:size-4" />
            </span>
            <span className="text-[10px] font-bold text-slate-700 md:text-[13px]">{lang === "ar" ? "حسابي" : "Account"}</span>
          </Link>
        </div>

        {/* Search */}
        <div className="mt-3 relative md:order-2 md:mt-0 md:flex-1 md:max-w-2xl">
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن زراعة، مادة، مختبر..." : "Search implants, materials, labs..."}
            className="w-full h-12 rounded-2xl bg-white border border-slate-200 ps-4 pe-11 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm md:h-11 md:rounded-full md:text-[15px]"
          />
          {searchQ.length > 0 ? (
            <button
              type="button"
              onClick={() => setSearchQ("")}
              className="absolute top-1/2 -translate-y-1/2 end-3 size-6 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300"
              aria-label={lang === "ar" ? "مسح" : "Clear"}
            >
              <X className="size-3 text-slate-600" />
            </button>
          ) : (
            <Search className="size-4 absolute top-1/2 -translate-y-1/2 end-4 text-slate-400 pointer-events-none" />
          )}

          {searchTerm.length >= 2 && (
            <div className="absolute top-full start-0 end-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 max-h-96 overflow-y-auto">
              {accountResults.length === 0 && productResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {lang === "ar" ? "لا توجد نتائج" : "No results found"}
                </div>
              ) : (
                <>
                  {accountResults.map((a) => (
                    <Link
                      key={`acc-${a.id}`}
                      to="/profile/$accountId"
                      params={{ accountId: a.id }}
                      onClick={() => setSearchQ("")}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/50 transition border-b border-slate-50 last:border-0"
                    >
                      <span className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        {a.category === "labs" ? <Stethoscope className="size-[18px]" /> : a.category === "implants" ? <FlaskConical className="size-[18px]" /> : <Package className="size-[18px]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{a.name}</p>
                        {a.location && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="size-2.5 shrink-0" />
                            {a.location}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                  {productResults.map((p) => (
                    <Link
                      key={`prod-${p.id}`}
                      to="/products/$productId"
                      params={{ productId: p.id }}
                      onClick={() => setSearchQ("")}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/50 transition border-b border-slate-50 last:border-0"
                    >
                      <span className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="size-[18px] text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{lang === "ar" ? p.ar || p.en : p.en || p.ar}</p>
                        <p className="text-[11px] text-slate-400 truncate">{p.brand || (lang === "ar" ? "المورد" : "Supplier")}</p>
                      </div>
                      <span className="text-sm font-extrabold text-primary shrink-0">
                        {p.currency === "IQD" ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`}
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* On phones these sections stay a plain vertical stack (this wrapper is
          class-less below lg). At lg:+ it becomes a 3-column dashboard grid:
          full-width hero, full-width category and brand rows, then a final
          row of three cards — which is what turns this from a stretched phone
          screen into a marketplace home. */}
      <div className="md:px-3 lg:px-8 lg:max-w-7xl lg:mx-auto lg:w-full lg:grid lg:grid-cols-3 lg:gap-5 lg:mt-6 lg:items-start">
      {/* Hero banner */}
      <section className="px-3 mt-3 md:mt-4 lg:col-span-3 lg:px-0 lg:mt-0">
        {banner ? (
          <div
            role={bannerAd ? "button" : undefined}
            tabIndex={bannerAd ? 0 : undefined}
            onClick={() => bannerAd && setViewingAd(bannerAd)}
            onKeyDown={(e) => { if (e.key === "Enter" && bannerAd) setViewingAd(bannerAd); }}
            className={cn(
              "relative rounded-3xl overflow-hidden min-h-[190px] shadow-card bg-[#2563EB] flex items-end md:min-h-[280px] lg:min-h-[340px] lg:rounded-[32px]",
              bannerAd && "cursor-pointer",
            )}
          >
            {/* Ad image fills the whole card with a dark scrim, text on top —
                same as the native home banner. */}
            {banner.image ? (
              <>
                <img src={banner.image} alt="" className="absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/40 to-slate-900/20" />
              </>
            ) : (
              <>
                <div className="absolute -top-16 -end-14 size-52 rounded-full bg-white/15 pointer-events-none md:size-96 md:-top-32 md:-end-24" />
                <div className="absolute -bottom-20 -start-14 size-48 rounded-full bg-white/10 pointer-events-none md:size-80 md:-bottom-32" />
              </>
            )}
            <div className="relative w-full p-5 pb-8 text-white md:p-10 md:pb-12 lg:px-16">
              <h2 className="font-display font-extrabold text-[22px] leading-tight drop-shadow line-clamp-2 md:text-[40px] lg:text-[48px] md:max-w-3xl">
                {banner.title || (lang === "ar" ? ROLE_META[banner.role].ar : ROLE_META[banner.role].en)}
              </h2>
              {banner.price && <div className="mt-2 font-display font-extrabold text-lg text-yellow-300 drop-shadow md:mt-3 md:text-3xl">{banner.price}</div>}
              {bannerAd && (
                <span className="mt-3 inline-flex h-9 px-4 rounded-full bg-white/20 backdrop-blur text-white text-xs font-bold items-center md:mt-5 md:h-11 md:px-6 md:text-sm">
                  {lang === "ar" ? "عرض التفاصيل" : "View details"}
                </span>
              )}
            </div>
            {banners.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute top-1/2 -translate-y-1/2 start-2 size-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white"><PrevIcon className="size-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute top-1/2 -translate-y-1/2 end-2 size-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white"><NextIcon className="size-4" /></button>
              </>
            )}
            {banners.length > 1 && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                {banners.map((_, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={cn("h-1.5 rounded-full transition-all", i === safeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50")} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden min-h-[190px] shadow-card bg-gradient-to-r from-blue-600 to-sky-400 md:min-h-[280px] lg:min-h-[340px] lg:rounded-[32px]">
            <div className="absolute -top-16 -end-14 size-52 rounded-full bg-white/15 blur-2xl pointer-events-none md:size-96 md:-top-32 md:-end-24" />
            <div className="absolute -bottom-20 -start-14 size-48 rounded-full bg-white/10 blur-2xl pointer-events-none md:size-80 md:-bottom-32" />
            <div className="relative flex items-center gap-3 p-4 pt-5 md:p-10 md:gap-10 lg:px-16">
              <div className="flex-1 min-w-0 text-white">
                <h2 className="font-display font-extrabold text-[22px] leading-tight drop-shadow-sm md:text-[40px] lg:text-[52px] md:max-w-xl">
                  {lang === "ar" ? "هل تريد زيادة مبيعاتك؟" : "Want to increase your sales?"}
                </h2>
                <p className="mt-2 text-white/95 text-sm leading-snug md:mt-4 md:text-lg md:max-w-lg">
                  {lang === "ar" ? "أعلن معنا ليصل منتجك لجميع أطباء الأسنان" : "Advertise with us to reach all dentists"}
                </p>
                <Link to="/my-ads" className="mt-3 inline-flex h-10 px-5 rounded-full bg-white/20 text-white text-sm font-bold shadow-md hover:bg-white/30 transition items-center md:mt-7 md:h-12 md:px-8 md:text-base md:bg-white md:text-blue-700 md:hover:bg-white/90">
                  {lang === "ar" ? "تواصل للإعلان" : "Contact to advertise"}
                </Link>
              </div>
              <div className="shrink-0 w-[130px] h-[140px] flex items-center justify-center md:w-[300px] md:h-[300px] lg:w-[360px] lg:h-[340px]">
                <Megaphone className="size-20 text-white/40 drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] md:size-44" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="px-3 mt-4 lg:col-span-3 lg:px-0 lg:mt-0">
        <ul className="grid grid-cols-4 gap-2 md:gap-4">
          {categories.map((c) => (
              <li key={c.to}>
                <Link to={c.to} className="flex flex-col items-center justify-between h-full min-h-[120px] p-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition md:min-h-[190px] md:p-6 md:justify-center md:gap-4 md:shadow-none md:hover:shadow-lg md:hover:border-primary/30">
                  <span className={cn("size-14 rounded-full flex items-center justify-center ring-2 bg-slate-50 overflow-hidden md:size-24 md:ring-4", c.ring)}>
                    {c.img ? (
                      <img src={c.img} alt="" loading="lazy" className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : c.icon ? (
                      <c.icon className="size-6 text-slate-600 md:size-10" />
                    ) : null}
                  </span>
                  <p className="mt-2 text-center font-display font-bold text-[11px] leading-snug text-slate-700 md:mt-0 md:text-base md:text-slate-800">{c.title}</p>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {/* Brands */}
      <section className="px-3 mt-4 lg:col-span-3 lg:px-0 lg:mt-0">
        <BrandsStrip lang={lang} />
      </section>

      {/* Track Cases — a horizontal banner on phones; at lg:+ it becomes the
          first card of the closing three-up row, so it stands as its own
          panel rather than another full-width stripe. */}
      <section className="px-3 mt-4 lg:col-span-1 lg:px-0 lg:mt-0 lg:h-full">
        <Link className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-2xl p-3.5 lg:h-full lg:flex-col lg:items-start lg:justify-center lg:gap-4 lg:p-6 lg:bg-white lg:border-slate-200 lg:hover:shadow-lg lg:hover:border-primary/30 lg:transition" to="/track-cases">
          <span className="size-11 rounded-2xl bg-sky-100 ring-1 ring-sky-200 shadow-sm text-sky-600 flex items-center justify-center lg:size-14">
            <ClipboardList className="size-5 lg:size-7" strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0 lg:flex-none">
            <p className="font-display font-extrabold text-sm lg:text-lg">{lang === "ar" ? "تتبع حالاتك" : "Track your cases"}</p>
            <p className="text-[11px] text-slate-500 lg:text-sm lg:mt-1">{lang === "ar" ? "تابع حالة الطلبات من المختبر" : "Follow your lab order status"}</p>
            <p className="text-[11px] font-bold text-primary mt-0.5 lg:text-sm lg:mt-3">{lang === "ar" ? "عرض جميع الحالات ›" : "View all cases ›"}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white border border-slate-200 px-3 py-2 text-center shadow-sm lg:w-full lg:bg-sky-50 lg:border-sky-100 lg:flex lg:items-baseline lg:justify-center lg:gap-2 lg:py-3">
            <p className="font-display font-extrabold text-xl text-slate-800 lg:text-4xl">{caseCount}</p>
            <p className="text-[10px] text-slate-500 lg:text-sm">{lang === "ar" ? "حالات" : "cases"}</p>
          </div>
        </Link>
      </section>

      {/* Dual quick-section cards */}
      <section className="px-3 mt-4 pb-6 lg:col-span-2 lg:px-0 lg:mt-0 lg:pb-0 lg:h-full">
        <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:h-full">
          {/* Quick Orders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col md:p-5 md:shadow-none">
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-extrabold text-[13px] md:text-lg">{lang === "ar" ? "الطلبات السريعة" : "Quick Orders"}</p>
              <Link to="/quick-orders" className="text-[10px] font-bold text-primary md:text-sm">{lang === "ar" ? "عرض الكل" : "View all"}</Link>
            </div>
            {quickItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-3">
                <span className="size-10 rounded-full bg-sky-50 flex items-center justify-center md:size-16">
                  <ClipboardList className="size-5 text-primary md:size-8" strokeWidth={2.2} />
                </span>
                <p className="mt-2 text-[10.5px] font-bold text-slate-700 md:mt-3 md:text-base">{lang === "ar" ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                <p className="mt-0.5 text-[9.5px] text-slate-400 leading-snug md:mt-1 md:text-sm">{lang === "ar" ? "لا توجد طلبات مستلزمات سابقة حتى الآن" : "No previous supply orders yet"}</p>
              </div>
            ) : (
              <>
                <div onScroll={(e) => { const el = e.currentTarget; const w = el.clientWidth || 1; const p = Math.round(Math.abs(el.scrollLeft) / w); if (p !== quickPage) setQuickPage(p); }} className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1">
                  {quickPages.map((page, pi) => (
                    <ul key={pi} className="shrink-0 w-full snap-start flex items-start justify-around gap-1 px-1">
                      {page.map((it) => (
                        <li key={`${it.name}-${it.vendor}`} className="flex flex-col items-center gap-1 w-[31%]">
                          <Link to="/products/$productId" params={{ productId: it.productId }} className="w-full flex flex-col items-center gap-1">
                            {it.image ? <img src={it.image} alt="" loading="lazy" className="h-11 w-full object-contain" /> : <span className="h-11 w-full rounded-xl bg-slate-50 flex items-center justify-center"><Package className="size-5 text-slate-400" /></span>}
                            <p className="text-[9px] font-semibold text-slate-700 text-center leading-tight h-6 overflow-hidden">{it.name}</p>
                            <p className="text-[8px] text-slate-400 text-center leading-none truncate w-full">{it.brand}</p>
                          </Link>
                          <button type="button" onClick={() => reorder(it)} className="rounded-full bg-sky-50 border border-primary/25 text-primary text-[9px] font-bold px-2 py-[3px] active:scale-95 transition hover:bg-sky-100">+ {lang === "ar" ? "إعادة" : "Reorder"}</button>
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
          <div className="relative bg-white border border-slate-200 rounded-2xl p-3 shadow-sm overflow-hidden md:p-5 md:shadow-none md:flex md:flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="font-display font-extrabold text-[13px] md:text-lg">{lang === "ar" ? "عروض خاصة" : "Special Offers"}</p>
              <Link to="/offers" className="text-[10px] font-bold text-primary md:text-sm">{lang === "ar" ? "عرض الكل" : "View all"}</Link>
            </div>
            {latestOffer ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center h-16 md:h-40">
                  <img src={latestOffer.imageUrl || "/photo/implant.jpg"} alt="" loading="lazy" className="max-h-full object-contain" />
                </div>
                <p className="text-[10px] font-semibold text-slate-700 truncate text-center md:text-base">{latestOffer.title}</p>
                {latestOffer.description && <p className="text-[9px] text-slate-400 line-clamp-1 text-center">{latestOffer.description}</p>}
                {latestOffer.price != null && (
                  <p className="font-display font-extrabold text-primary text-sm text-center md:text-2xl">
                    {latestOffer.currency === "IQD" ? `${latestOffer.price.toLocaleString()} د.ع` : `$${latestOffer.price}`}
                  </p>
                )}
                {latestOffer.expiryDate && (
                  <p className="text-[9px] text-slate-400 text-center">{lang === "ar" ? "ينتهي" : "Expires"}: {latestOffer.expiryDate}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center md:flex-1 md:py-10">
                <Megaphone className="size-8 text-slate-300 mb-1.5 md:size-14 md:mb-3" />
                <p className="text-[10px] font-semibold text-slate-400 md:text-base">{lang === "ar" ? "لا توجد عروض حالياً" : "No offers yet"}</p>
              </div>
            )}
            <Sparkles className="absolute -top-2 -end-2 size-8 text-primary/10" />
          </div>
        </div>
      </section>
      </div>
      {viewingAd && <AdDetailModal ad={viewingAd} ar={lang === "ar"} onClose={() => setViewingAd(null)} />}
    </MobileShell>
  );
}

function BrandsStrip({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const featured = BRANDS.slice(0, 6);
  return (
    <>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-display font-extrabold text-sm text-slate-800 md:text-xl">{ar ? "البراندات" : "Brands"}</h3>
        <Link to="/brands" className="text-xs font-bold text-primary hover:underline md:text-sm">{ar ? "المزيد >" : "More >"}</Link>
      </div>
      {/* A swipeable strip is right on a phone; on a wide screen there is room
          to lay all six out at once, so the scroll container becomes a grid. */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:pb-0">
        {featured.map((b) => (
          <Link key={b.id} to="/brands/$brandId" params={{ brandId: b.id }} className="shrink-0 w-28 bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center shadow-sm hover:shadow-md transition md:w-auto md:shrink md:p-5 md:gap-2 md:shadow-none md:hover:shadow-lg md:hover:border-primary/30">
            <span className="size-16 rounded-xl bg-slate-50 flex items-center justify-center mb-1.5 overflow-hidden md:size-20 md:mb-0">
              <BrandLogo brand={b} className="w-full h-full" />
            </span>
            <p className="text-[11px] font-bold text-slate-700 text-center leading-tight line-clamp-2 md:text-sm">{ar ? b.ar : b.name}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

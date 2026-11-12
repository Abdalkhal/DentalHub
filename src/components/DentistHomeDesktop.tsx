import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRANDS } from "@/data/brands";
import { BrandLogo } from "@/components/BrandLogo";
import { useDentistOrders } from "@/lib/orders";
import { useSeenOrderIds } from "@/lib/orderSeen";
import { useDmUnreadTotal } from "@/lib/directMessages";
import type { QuickOrderItem } from "@/lib/quickOrders";
import type { useImplantOffers } from "@/lib/implantOffers";

type Offer = ReturnType<typeof useImplantOffers>["offers"][number];

export type HomeBanner = { id: string; title: string; price: string; image?: string; fallbackTitle: string };
export type HomeCategory = { to: string; title: string; sub: string; img: string; tint: string; ring: string };

// The dentist home at laptop widths (lg:+). Same data as the phone layout —
// it is handed everything by DentistHome — arranged as a dashboard instead of
// a stretched phone column.
export function DentistHomeDesktop({
  ar,
  rtl,
  uid,
  dentistName,
  banners,
  bannerIdx,
  bannerClickable,
  onBannerOpen,
  onBannerPrev,
  onBannerNext,
  onBannerPick,
  categories,
  caseCount,
  quickItems,
  onReorder,
  latestOffer,
}: {
  ar: boolean;
  rtl: boolean;
  uid: string;
  dentistName: string;
  banners: HomeBanner[];
  bannerIdx: number;
  bannerClickable: boolean;
  onBannerOpen: () => void;
  onBannerPrev: () => void;
  onBannerNext: () => void;
  onBannerPick: (i: number) => void;
  categories: HomeCategory[];
  caseCount: number;
  quickItems: QuickOrderItem[];
  onReorder: (it: QuickOrderItem) => void;
  latestOffer?: Offer;
}) {
  const Fwd = rtl ? ArrowLeft : ArrowRight;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;

  const { data: orders = [] } = useDentistOrders(uid || undefined);
  const seen = useSeenOrderIds(uid || undefined);
  const unseenOrders = orders.filter((o) => !seen.has(o.id)).length;
  const unreadMessages = useDmUnreadTotal(uid || undefined);

  const banner = banners[bannerIdx];
  const today = new Date().toLocaleDateString(ar ? "ar-IQ" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="hidden lg:block px-8 py-7 max-w-[1440px] mx-auto w-full">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-6 mb-6">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-400">{today}</p>
          <h1 className="mt-1 font-display font-extrabold text-[30px] leading-tight text-slate-900 truncate">
            {dentistName
              ? ar
                ? `مرحباً، د. ${dentistName}`
                : `Welcome, Dr. ${dentistName}`
              : ar
                ? "مرحباً بك"
                : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {ar ? "كل ما تحتاجه عيادتك في مكان واحد." : "Everything your clinic needs, in one place."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/clinic"
            className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-slate-300 hover:shadow-sm flex items-center transition"
          >
            {ar ? "عيادتي" : "My clinic"}
          </Link>
          <Link
            to="/supplies"
            className="h-11 px-5 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] shadow-lg shadow-blue-600/25 flex items-center gap-2 transition"
          >
            <ShoppingBag className="size-4" />
            {ar ? "تسوّق المستلزمات" : "Shop supplies"}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* ── Hero ── */}
        <section className="col-span-8">
          {banner ? (
            <div
              role={bannerClickable ? "button" : undefined}
              tabIndex={bannerClickable ? 0 : undefined}
              onClick={() => bannerClickable && onBannerOpen()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && bannerClickable) onBannerOpen();
              }}
              className={cn(
                "group relative h-[360px] rounded-[28px] overflow-hidden bg-[#0B1220] flex items-end shadow-xl shadow-slate-900/10",
                bannerClickable && "cursor-pointer",
              )}
            >
              {banner.image ? (
                <>
                  <img
                    src={banner.image}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/90 via-[#0B1220]/35 to-transparent" />
                </>
              ) : (
                <HeroGlow />
              )}
              <div className="relative w-full p-9 text-white">
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/15 backdrop-blur text-[11px] font-bold">
                  <Sparkles className="size-3" />
                  {ar ? "إعلان مميز" : "Featured"}
                </span>
                <h2 className="mt-3 font-display font-extrabold text-[38px] leading-[1.15] max-w-2xl line-clamp-2 drop-shadow">
                  {banner.title || banner.fallbackTitle}
                </h2>
                {banner.price && (
                  <p className="mt-2 font-display font-extrabold text-2xl text-amber-300">{banner.price}</p>
                )}
                {bannerClickable && (
                  <span className="mt-5 inline-flex h-11 px-5 rounded-xl bg-white text-slate-900 text-sm font-bold items-center gap-2 transition group-hover:gap-3">
                    {ar ? "عرض التفاصيل" : "View details"}
                    <Fwd className="size-4" />
                  </span>
                )}
              </div>
              {banners.length > 1 && (
                <div className="absolute bottom-8 end-9 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`${i + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBannerPick(i);
                        }}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === bannerIdx ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70",
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBannerPrev();
                      }}
                      className="size-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition"
                    >
                      <PrevIcon className="size-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBannerNext();
                      }}
                      className="size-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition"
                    >
                      <NextIcon className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-[360px] rounded-[28px] overflow-hidden bg-[#0B1220] flex items-center shadow-xl shadow-slate-900/10">
              <HeroGlow />
              <div className="relative flex-1 min-w-0 p-10 text-white">
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-bold">
                  <Megaphone className="size-3" />
                  {ar ? "مساحة إعلانية" : "Ad space"}
                </span>
                <h2 className="mt-4 font-display font-extrabold text-[40px] leading-[1.15] max-w-lg">
                  {ar ? "هل تريد زيادة مبيعاتك؟" : "Want to increase your sales?"}
                </h2>
                <p className="mt-3 text-base text-slate-300 max-w-md">
                  {ar ? "أعلن معنا ليصل منتجك لجميع أطباء الأسنان" : "Advertise with us to reach all dentists"}
                </p>
                <Link
                  to="/my-ads"
                  className="mt-6 inline-flex h-11 px-6 rounded-xl bg-white text-slate-900 text-sm font-bold items-center gap-2 hover:gap-3 transition-all"
                >
                  {ar ? "تواصل للإعلان" : "Contact to advertise"}
                  <Fwd className="size-4" />
                </Link>
              </div>
              <div className="relative shrink-0 w-[300px] h-full flex items-center justify-center">
                <span className="size-52 rounded-[40px] rotate-6 bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] shadow-2xl shadow-blue-500/40 flex items-center justify-center">
                  <Megaphone className="size-24 text-white -rotate-6" strokeWidth={1.5} />
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── At-a-glance column ── */}
        <section className="col-span-4 flex flex-col gap-5">
          <Link
            to="/track-cases"
            className="group relative flex-1 rounded-[28px] overflow-hidden bg-gradient-to-br from-[#2563EB] to-[#1E40AF] p-6 text-white shadow-xl shadow-blue-600/20 flex flex-col"
          >
            <div className="pointer-events-none absolute -top-16 -end-16 size-48 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -start-10 size-44 rounded-full bg-[#22D3EE]/20 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="size-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
                <ClipboardList className="size-5" />
              </span>
              <span className="size-9 rounded-full bg-white/15 flex items-center justify-center transition group-hover:bg-white group-hover:text-[#2563EB]">
                <Fwd className="size-4" />
              </span>
            </div>
            <div className="relative mt-auto pt-4">
              <p className="font-display font-extrabold text-[56px] leading-none tabular-nums">{caseCount}</p>
              <p className="mt-2 text-base font-bold">{ar ? "حالات قيد العمل في المختبر" : "Cases in progress at the lab"}</p>
              <p className="mt-0.5 text-[13px] text-blue-100">
                {ar ? "تابع حالة كل طلب لحظة بلحظة" : "Follow every order's status live"}
              </p>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-5">
            <StatTile
              to="/orders"
              icon={<ShoppingBag className="size-5" />}
              tone="bg-emerald-50 text-emerald-600"
              value={unseenOrders}
              label={ar ? "طلبات جديدة" : "New orders"}
            />
            <StatTile
              to="/messages"
              icon={<MessageCircle className="size-5" />}
              tone="bg-violet-50 text-violet-600"
              value={unreadMessages}
              label={ar ? "رسائل غير مقروءة" : "Unread messages"}
            />
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="col-span-12 mt-2">
          <SectionHead title={ar ? "تسوّق حسب القسم" : "Browse by section"} />
          <ul className="grid grid-cols-4 gap-5">
            {categories.map((c) => (
              <li key={c.to}>
                <Link
                  to={c.to}
                  className="group relative block h-[168px] rounded-3xl bg-white border border-slate-200/80 p-5 overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.07] hover:border-transparent"
                >
                  <div className={cn("pointer-events-none absolute -bottom-12 -end-10 size-44 rounded-full transition-transform duration-500 group-hover:scale-125", c.tint)} />
                  <div className="relative flex h-full flex-col">
                    <p className="font-display font-extrabold text-lg text-slate-900">{c.title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-slate-500 max-w-[62%]">{c.sub}</p>
                    <span className="mt-auto size-9 rounded-full bg-slate-900 text-white flex items-center justify-center transition group-hover:bg-[#2563EB]">
                      <Fwd className="size-4" />
                    </span>
                  </div>
                  <span className={cn("absolute bottom-4 end-4 size-[88px] rounded-full overflow-hidden bg-white ring-4 shadow-md", c.ring)}>
                    <img src={c.img} alt="" loading="lazy" className="size-full object-cover" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Brands ── */}
        <section className="col-span-12 mt-2">
          <SectionHead title={ar ? "أشهر البراندات" : "Top brands"} to="/brands" more={ar ? "كل البراندات" : "All brands"} Fwd={Fwd} />
          <div className="grid grid-cols-6 gap-5">
            {BRANDS.slice(0, 6).map((b) => (
              <Link
                key={b.id}
                to="/brands/$brandId"
                params={{ brandId: b.id }}
                className="group rounded-3xl bg-white border border-slate-200/80 p-4 flex flex-col items-center gap-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.07] hover:border-transparent"
              >
                <span className="w-full aspect-[4/3] rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                  <BrandLogo brand={b} className="w-full h-full" />
                </span>
                <p className="text-sm font-bold text-slate-700 text-center truncate w-full group-hover:text-[#2563EB]">
                  {ar ? b.ar : b.name}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Quick orders ── */}
        <section className="col-span-7 mt-2 rounded-3xl bg-white border border-slate-200/80 p-6 flex flex-col">
          <SectionHead
            title={ar ? "الطلبات السريعة" : "Quick orders"}
            sub={ar ? "أعد طلب ما تشتريه دائماً بضغطة واحدة" : "Reorder your regulars in one click"}
            to="/quick-orders"
            more={ar ? "عرض الكل" : "View all"}
            Fwd={Fwd}
          />
          {quickItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
              <span className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <ClipboardList className="size-6 text-[#2563EB]" />
              </span>
              <p className="mt-3 text-base font-bold text-slate-700">{ar ? "لا توجد طلبات بعد" : "No orders yet"}</p>
              <p className="mt-1 text-sm text-slate-400">
                {ar ? "ستظهر هنا المواد التي تطلبها بشكل متكرر" : "Items you order often will show up here"}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-4 gap-4">
              {quickItems.slice(0, 4).map((it) => (
                <li key={`${it.name}-${it.vendor}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 flex flex-col">
                  <Link to="/products/$productId" params={{ productId: it.productId }} className="block">
                    <span className="h-24 w-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                      {it.image ? (
                        <img src={it.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Package className="size-7 text-slate-300" />
                      )}
                    </span>
                    <p className="mt-2.5 text-[13px] font-bold text-slate-800 leading-snug line-clamp-2 min-h-[2.4em]">{it.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400 truncate">{it.brand || it.vendor}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onReorder(it)}
                    className="mt-3 h-9 rounded-xl bg-white border border-slate-200 text-[13px] font-bold text-[#2563EB] flex items-center justify-center gap-1.5 transition hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] active:scale-[0.98]"
                  >
                    <Plus className="size-4" />
                    {ar ? "إعادة الطلب" : "Reorder"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Special offer ── */}
        <section className="col-span-5 mt-2 relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-orange-100 p-6 flex flex-col">
          <Sparkles className="pointer-events-none absolute -top-3 -end-3 size-24 text-orange-200/60" />
          <SectionHead
            title={ar ? "عروض خاصة" : "Special offers"}
            sub={ar ? "أحدث عروض وكلاء الزرعات" : "Latest from implant dealers"}
            to="/offers"
            more={ar ? "عرض الكل" : "View all"}
            Fwd={Fwd}
            tone="text-orange-700"
          />
          {latestOffer ? (
            <Link to="/offers" className="relative flex-1 flex items-center gap-5 rounded-2xl bg-white/80 backdrop-blur p-4 transition hover:bg-white hover:shadow-lg">
              <span className="size-32 shrink-0 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                <img src={latestOffer.imageUrl || "/photo/implant.jpg"} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-lg text-slate-900 line-clamp-2">{latestOffer.title}</p>
                {latestOffer.description && (
                  <p className="mt-1 text-[13px] text-slate-500 line-clamp-2">{latestOffer.description}</p>
                )}
                {latestOffer.price != null && (
                  <p className="mt-2 font-display font-extrabold text-2xl text-orange-600">
                    {latestOffer.currency === "IQD" ? `${latestOffer.price.toLocaleString()} د.ع` : `$${latestOffer.price}`}
                  </p>
                )}
                {latestOffer.expiryDate && (
                  <p className="mt-1 text-xs text-slate-400">
                    {ar ? "ينتهي" : "Expires"}: {latestOffer.expiryDate}
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div className="relative flex-1 flex flex-col items-center justify-center text-center py-10">
              <span className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Megaphone className="size-6 text-orange-500" />
              </span>
              <p className="mt-3 text-base font-bold text-slate-700">{ar ? "لا توجد عروض حالياً" : "No offers yet"}</p>
              <p className="mt-1 text-sm text-slate-500">{ar ? "تابعنا، العروض الجديدة تظهر هنا أولاً" : "New offers appear here first"}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HeroGlow() {
  return (
    <>
      <div className="pointer-events-none absolute -top-32 -end-24 size-[26rem] rounded-full bg-[#2563EB]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 start-10 size-[22rem] rounded-full bg-[#22D3EE]/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />
    </>
  );
}

function StatTile({
  to,
  icon,
  tone,
  value,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  tone: string;
  value: number;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-3xl bg-white border border-slate-200/80 p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.07] hover:border-transparent"
    >
      <span className={cn("size-10 rounded-xl flex items-center justify-center", tone)}>{icon}</span>
      <p className="mt-4 font-display font-extrabold text-3xl leading-none text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-slate-500">{label}</p>
    </Link>
  );
}

function SectionHead({
  title,
  sub,
  to,
  more,
  Fwd,
  tone = "text-[#2563EB]",
}: {
  title: string;
  sub?: string;
  to?: string;
  more?: string;
  Fwd?: typeof ArrowLeft;
  tone?: string;
}) {
  return (
    <div className="relative flex items-end justify-between gap-4 mb-4">
      <div>
        <h3 className="font-display font-extrabold text-xl text-slate-900">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-slate-500">{sub}</p>}
      </div>
      {to && more && (
        <Link to={to} className={cn("text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all", tone)}>
          {more}
          {Fwd && <Fwd className="size-4" />}
        </Link>
      )}
    </div>
  );
}

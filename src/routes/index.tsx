import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useSession, useUserRole, getAccountDashboard } from "@/lib/useAuth";
import { FlaskConical, UserCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import dentalImplant from "@/assets/dental-implant.png";
import dentalSupplies from "@/assets/dental-supplies-icon.png";
import dentalBridge from "@/assets/dental-bridge.png";

export const Route = createFileRoute("/")({
  component: Home,
});

const BANNERS = [
  {
    ar: { kicker: "عروض زرعات", title: "Alfa Gate", price: "$399", sub: "تجهيز فوري — الموصل" },
    en: { kicker: "Implant Offers", title: "Alfa Gate", price: "$399", sub: "In stock — Mosul" },
    image: dentalImplant,
  },
  {
    ar: {
      kicker: "عروض المختبر",
      title: "Zirconia −15%",
      price: "−15%",
      sub: "مختبر النور — يونيو",
    },
    en: { kicker: "Lab Offers", title: "Zirconia −15%", price: "−15%", sub: "Al-Noor Lab — June" },
    image: dentalBridge,
  },
  {
    ar: {
      kicker: "عروض المستلزمات",
      title: "ProTaper Gold",
      price: "$65",
      sub: "مكتب بوابة الموصل",
    },
    en: {
      kicker: "Supplies Offers",
      title: "ProTaper Gold",
      price: "$65",
      sub: "Mosul Gate Office",
    },
    image: dentalSupplies,
  },
];

function Home() {
  const { t, lang, dir } = useI18n();
  const { user, loading } = useSession();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const banner = BANNERS[idx];
  const next = () => setIdx((i) => (i + 1) % BANNERS.length);
  const prev = () => setIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (role && !roleLoading) {
      const target = getAccountDashboard(role.role);
      if (target !== "/") navigate({ to: target });
    }
  }, [role, roleLoading, navigate]);

  if (loading || !user || roleLoading) {
    return (
      <MobileShell>
        <TopBar title="DentalHub" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  const sections = [
    {
      to: "/supplies",
      icon: null,
      image: dentalSupplies,
      title: t("supplies"),
      sub: t("supplies_sub"),
      tint: "bg-[oklch(0.93_0.06_250)]",
      ring: "ring-[oklch(0.82_0.1_250)]",
      iconColor: "text-[oklch(0.45_0.18_256)]",
    },
    {
      to: "/labs",
      icon: null,
      image: dentalBridge,
      title: t("labs"),
      sub: t("labs_sub"),
      tint: "bg-[oklch(0.93_0.06_175)]",
      ring: "ring-[oklch(0.8_0.09_175)]",
      iconColor: "text-[oklch(0.45_0.15_175)]",
    },
    {
      to: "/implants",
      icon: null,
      image: dentalImplant,
      title: t("implants"),
      sub: t("implants_sub"),
      tint: "bg-[oklch(0.93_0.06_30)]",
      ring: "ring-[oklch(0.85_0.1_30)]",
      iconColor: "text-[oklch(0.5_0.18_30)]",
    },
    {
      to: "/account",
      icon: UserCircle2,
      image: null,
      title: t("account"),
      sub: t("account_sub"),
      tint: "bg-[oklch(0.93_0.06_300)]",
      ring: "ring-[oklch(0.82_0.1_300)]",
      iconColor: "text-[oklch(0.45_0.18_300)]",
    },
  ] as const;

  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <MobileShell>
      <TopBar variant="home" showSearch />

      {/* Banner carousel — bold blue offer card */}
      <section className="px-4 mt-2">
        <div
          className="relative rounded-3xl overflow-hidden min-h-[180px] shadow-card"
          style={{
            background: "linear-gradient(135deg, #4aa3e8 0%, #2f7fd1 55%, #1e5fb3 100%)",
          }}
        >
          {/* decorative blobs */}
          <div className="absolute -top-14 -end-14 size-44 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -start-10 size-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-4 p-4">
            {/* image tile */}
            <div className="shrink-0 size-[112px] rounded-2xl bg-white flex items-center justify-center shadow-[0_10px_25px_-8px_rgba(0,0,0,0.35)] ring-4 ring-white/30">
              <img
                src={banner.image}
                alt=""
                loading="lazy"
                className="size-[92px] object-contain drop-shadow"
              />
            </div>

            {/* text side */}
            <div className="flex-1 min-w-0 text-white">
              <h2 className="font-display font-extrabold text-[26px] leading-[1.05] tracking-tight drop-shadow-sm">
                {lang === "ar" ? banner.ar.kicker : banner.en.kicker}
              </h2>
              <p className="font-display font-extrabold text-white/95 text-[20px] leading-tight mt-1">
                {lang === "ar" ? banner.ar.title : banner.en.title}
              </p>
              <div className="mt-2 inline-flex items-center font-display font-extrabold text-[26px] leading-none text-[#ffd54a] drop-shadow">
                {lang === "ar" ? banner.ar.price : banner.en.price}
              </div>
              <div className="mt-2.5">
                <span className="inline-block px-3 py-1 rounded-full bg-[#0b3b6f] text-white text-[11px] font-bold shadow-sm">
                  {lang === "ar" ? banner.ar.sub : banner.en.sub}
                </span>
              </div>
            </div>
          </div>

          {/* side nav arrows */}
          <button
            onClick={prev}
            aria-label="prev"
            className="absolute top-1/2 -translate-y-1/2 start-1.5 size-8 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition"
          >
            <PrevIcon className="size-4" />
          </button>
          <button
            onClick={next}
            aria-label="next"
            className="absolute top-1/2 -translate-y-1/2 end-1.5 size-8 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition"
          >
            <NextIcon className="size-4" />
          </button>
        </div>

        {/* dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-6 bg-[#2f7fd1]" : "w-1.5 bg-border",
              )}
              aria-label={`slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Sections grid */}
      <section className="px-4 mt-5">
        <ul className="grid grid-cols-2 gap-3">
          {sections.map(({ to, icon: Icon, image, title, sub, tint, ring, iconColor }) => (
            <li key={to}>
              <Link
                to={to}
                className="group block bg-card border border-border rounded-3xl p-4 h-full shadow-soft hover:shadow-card hover:-translate-y-0.5 transition"
              >
                <span
                  className={cn(
                    "size-16 rounded-2xl flex items-center justify-center mb-3 overflow-hidden ring-1 shadow-sm transition-transform group-hover:scale-105",
                    tint,
                    ring,
                  )}
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-12 object-contain drop-shadow-sm"
                    />
                  ) : Icon ? (
                    <Icon className={cn("size-8", iconColor)} strokeWidth={2} />
                  ) : null}
                </span>
                <p className="font-display font-bold text-foreground leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Lab quick action */}
      <section className="px-4 mt-5">
        <Link
          to="/labs/cases"
          className="flex items-center gap-3 bg-primary-soft/60 border border-primary/15 rounded-2xl p-4"
        >
          <span className="size-12 rounded-2xl bg-[oklch(0.93_0.06_250)] ring-1 ring-[oklch(0.82_0.1_250)] shadow-sm text-[oklch(0.45_0.18_256)] flex items-center justify-center">
            <FlaskConical className="size-6 drop-shadow-sm" strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="font-display font-bold text-sm">{t("track_cases")}</p>
            <p className="text-xs text-muted-foreground">{t("cases")}</p>
          </div>
          <span className="text-primary font-bold text-sm">›</span>
        </Link>
      </section>
    </MobileShell>
  );
}

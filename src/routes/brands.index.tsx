import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { BrandLogo } from "@/components/BrandLogo";
import { BRANDS } from "@/data/brands";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/brands/")({
  component: BrandsIndex,
  head: () => ({
    meta: [
      { title: "دليل البراندات | DentalHub" },
      {
        name: "description",
        content: "دليل أبجدي لجميع براندات مواد وأجهزة الأسنان مع المكاتب الموفرة والأسعار.",
      },
      { property: "og:title", content: "دليل البراندات | DentalHub" },
      {
        property: "og:description",
        content: "تصفح البراندات العالمية حسب الحروف واعرف أسعارها في المكاتب.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BrandsIndex() {
  const { lang } = useI18n();
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = BRANDS.filter((b) =>
      !term || `${b.name} ${b.ar}`.toLowerCase().includes(term)
    ).sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, typeof BRANDS>();
    for (const b of list) {
      const letter = b.name[0].toUpperCase();
      map.set(letter, [...(map.get(letter) ?? []), b]);
    }
    return [...map.entries()];
  }, [q]);

  return (
    <MobileShell>
      <TopBar title={lang === "ar" ? "البراندات" : "Brands"} showBack />
      <div className="px-4 pt-4 pb-8">
        <div className="relative">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن براند..." : "Search a brand..."}
            className="w-full h-12 rounded-2xl bg-card border border-border ps-11 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary shadow-sm"
          />
        </div>

        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            {lang === "ar" ? "لا توجد نتائج" : "No results"}
          </p>
        )}

        {groups.map(([letter, list]) => (
          <section key={letter} className="mt-5">
            <h2 className="font-display font-extrabold text-sm text-primary mb-2">{letter}</h2>
            <ul className="grid grid-cols-3 gap-3">
              {list.map((b) => {
                const itemCount = b.products.length;
                return (
                  <li key={b.id}>
                    <Link
                      to="/brands/$brandId"
                      params={{ brandId: b.id }}
                      className="flex flex-col h-full rounded-[20px] bg-card border border-border p-3 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition"
                    >
                      <span className="flex-1 flex items-center justify-center min-h-[88px] rounded-[14px] bg-slate-50 p-2">
                        <BrandLogo brand={b} className="w-full h-full" />
                      </span>
                      <div className="mt-2 text-center">
                        <p className="text-[13px] font-bold text-foreground truncate leading-tight">
                          {lang === "ar" ? b.ar : b.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {lang === "ar" ? b.countryAr : b.countryEn}
                        </p>
                      </div>
                      <div className="mt-2 flex justify-center">
                        <span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {itemCount} {lang === "ar" ? "صنف" : "items"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </MobileShell>
  );
}

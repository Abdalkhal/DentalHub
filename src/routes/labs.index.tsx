import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { CITIES } from "@/data/offices";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star, Clock, MapPin, SearchX, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/labs/")({
  component: LabsIndex,
});

type LabItem = {
  id: string;
  name: { ar: string; en: string };
  cityId: string;
  city: string;
  rating: number;
  itemsCount: number;
  area: string;
};

function resolveCityId(cityValue: string | undefined | null): string {
  if (!cityValue) return "baghdad";
  const t = cityValue.trim().toLowerCase();
  const m = CITIES.find((c) => c.id === t || c.en.toLowerCase() === t || c.ar === cityValue.trim());
  return m ? m.id : "baghdad";
}

function getCityName(cityId: string, ar: boolean): string {
  const m = CITIES.find((c) => c.id === cityId);
  return m ? (ar ? m.ar : m.en) : "Baghdad";
}

function LabsIndex() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [city, setCity] = useState("all");
  const [sort, setSort] = useState<"default" | "rating" | "items">("default");

  const { data: labs = [] } = useQuery({
    queryKey: ["labs-directory"],
    queryFn: async (): Promise<LabItem[]> => {
      const snap = await getDocs(collection(db, "user_roles"));
      return snap.docs
        .map((d) => d.data() as UserRoleDoc)
        .filter((u) => u.accountType === "lab")
        .map((u) => ({
          id: u.userId,
          name: { ar: u.name || "", en: u.name || "" },
          cityId: resolveCityId(u.city),
          city: u.city || "",
          rating: 0,
          itemsCount: 0,
          area: u.address || "",
        }));
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let list = labs.filter((item) => {
      if (city !== "all" && item.cityId !== city) return false;
      return true;
    });
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "items") list = [...list].sort((a, b) => b.itemsCount - a.itemsCount);
    return list;
  }, [labs, city, sort]);

  return (
    <MobileShell>
      <TopBar title={t("labs")} showBack />
      <div className="px-4 pt-4">
        {/* City filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
          <button onClick={() => setCity("all")} className={cn("shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition", city === "all" ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:bg-accent")}>{ar ? "كل المدن" : "All cities"}</button>
          {CITIES.map((c) => (
            <button key={c.id} onClick={() => setCity(c.id)} className={cn("shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition", city === c.id ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:bg-accent")}>{ar ? c.ar : c.en}</button>
          ))}
        </div>

        {/* Sort chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-1">
          {([
            { key: "default", ar: "الكل", en: "All" },
            { key: "rating", ar: "الأعلى تقييماً", en: "Top rated" },
            { key: "items", ar: "الأكثر تنوعاً", en: "Most items" },
          ] as const).map((c) => (
            <button key={c.key} onClick={() => setSort(c.key)} className={cn("shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition", sort === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent")}>{ar ? c.ar : c.en}</button>
          ))}
        </div>

        <h2 className="font-display font-bold text-base mb-3">{ar ? "المختبرات" : "Laboratories"}</h2>
        {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <SearchX className="size-8 mb-2" />
            <p className="text-sm">{ar ? "لا توجد مختبرات" : "No labs found"}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link to="/labs/$labId" params={{ labId: item.id }} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 shadow-soft hover:shadow-card transition">
                  <span className="size-12 rounded-2xl bg-[oklch(0.95_0.05_250)] text-[oklch(0.45_0.18_250)] flex items-center justify-center font-display font-extrabold text-lg">{(ar ? item.name.ar : item.name.en).charAt(0)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground truncate">{ar ? item.name.ar : item.name.en}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{getCityName(item.cityId, ar)}</span>
                      {item.rating > 0 && <span className="inline-flex items-center gap-1 text-amber-500"><Star className="size-3 fill-current" /><span className="font-semibold">{item.rating}</span></span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}

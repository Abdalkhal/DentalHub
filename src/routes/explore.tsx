import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { Search, FlaskConical, Package, Stethoscope, MapPin } from "lucide-react";

type Category = "all" | "supplies" | "implants" | "labs";

type ResultItem = {
  id: string;
  name: { ar: string; en: string };
  category: Category;
  location: { ar: string; en: string };
  route: string;
  params: Record<string, string>;
};

const CATEGORIES: { id: Category; ar: string; en: string }[] = [
  { id: "all", ar: "الكل", en: "All" },
  { id: "supplies", ar: "المستلزمات الطبية", en: "Medical Supplies" },
  { id: "implants", ar: "شركات الزرعات", en: "Implant Companies" },
  { id: "labs", ar: "المختبرات", en: "Labs" },
];

const CATEGORY_META: Record<Category, { icon: typeof Package; color: string }> = {
  supplies: { icon: Package, color: "text-emerald-600 bg-emerald-50" },
  implants: { icon: FlaskConical, color: "text-violet-600 bg-violet-50" },
  labs: { icon: Stethoscope, color: "text-sky-600 bg-sky-50" },
  all: { icon: Search, color: "" },
};

export const Route = createFileRoute("/explore")({
  component: Explore,
});

function Explore() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const { user } = useSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["explore-accounts"],
    queryFn: async (): Promise<ResultItem[]> => {
      const snap = await getDocs(collection(db, "user_roles"));
      const results: ResultItem[] = [];

      for (const d of snap.docs) {
        const u = d.data() as UserRoleDoc;
        const name = u.name || u.surname || "";
        if (!name) continue;

        let cat: Category;
        let route: string;
        let params: Record<string, string>;

        if (u.accountType === "supply" || (u.accountType as string) === "medical_supplies") {
          cat = "supplies";
          route = "/profile/$accountId";
          params = { accountId: u.userId };
        } else if (u.accountType === "implant" || (u.accountType as string) === "dental_implants") {
          cat = "implants";
          route = "/profile/$accountId";
          params = { accountId: u.userId };
        } else if (u.accountType === "lab") {
          cat = "labs";
          route = "/labs/$labId";
          params = { labId: u.userId };
        } else {
          continue;
        }

        const city = u.city || u.address || "";
        results.push({
          id: u.userId,
          name: { ar: name, en: name },
          category: cat,
          location: { ar: city, en: city },
          route,
          params,
        });
      }

      return results;
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (user && item.id === user.uid) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.ar.toLowerCase().includes(q) ||
        item.name.en.toLowerCase().includes(q) ||
        item.location.ar.toLowerCase().includes(q) ||
        item.location.en.toLowerCase().includes(q)
      );
    });
  }, [items, category, searchQuery, user]);

  const handleSelect = (item: ResultItem) => {
    (
      navigate as unknown as (opts: {
        to: string;
        params: Record<string, string>;
        state: Record<string, unknown>;
      }) => void
    )({
      to: item.route,
      params: item.params,
      state: { isVisitor: true },
    });
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "استكشاف" : "Explore"} />

      <div className="px-4 pt-4 space-y-4">
        <div className="relative">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ar ? "ابحث عن مكتب أو مختبر…" : "Search for office or lab…"}
            className="w-full h-11 rounded-2xl bg-card border border-border ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "px-3.5 h-8 rounded-full text-xs font-semibold border transition",
                category === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent",
              )}
            >
              {ar ? c.ar : c.en}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} {ar ? "نتيجة" : "result"}
          {filtered.length !== 1 ? (ar ? "" : "s") : ""}
        </p>

        <div className="space-y-2 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Search className="size-10 mx-auto mb-3 text-muted-foreground/40" />
              {ar ? "لا توجد نتائج مطابقة" : "No matching results"}
            </div>
          ) : (
            filtered.map((item) => {
              const meta = CATEGORY_META[item.category];
              const Icon = meta.icon;
              return (
                <button
                  key={`${item.category}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full text-start bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-md hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer flex items-start gap-3"
                >
                  <span
                    className={cn(
                      "size-11 rounded-2xl flex items-center justify-center shrink-0",
                      meta.color,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm truncate">
                      {ar ? item.name.ar : item.name.en}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ar
                        ? CATEGORIES.find((c) => c.id === item.category)?.ar
                        : CATEGORIES.find((c) => c.id === item.category)?.en}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      <span>{ar ? item.location.ar : item.location.en}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </MobileShell>
  );
}

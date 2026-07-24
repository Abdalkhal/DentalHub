import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Search, MapPin, Eye, Building2, Stethoscope, FlaskConical, Package } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";

type AccountType = "implant" | "supply" | "dentist";
type Category = "all" | AccountType;

type RegisteredAccount = {
  id: string;
  name_ar: string;
  name_en: string;
  type: AccountType;
  city_ar: string;
  city_en: string;
};

const CATEGORIES: { id: Category; ar: string; en: string }[] = [
  { id: "all", ar: "الكل", en: "All" },
  { id: "implant", ar: "شركات الزرعات", en: "Implant Companies" },
  { id: "supply", ar: "مستلزمات طبية", en: "Medical Supplies" },
  { id: "dentist", ar: "أطباء الأسنان", en: "Dentists" },
];

const CATEGORY_ROUTES: Record<AccountType, string> = {
  implant: "/profile/$accountId",
  supply: "/profile/$accountId",
  dentist: "/profile/$accountId",
};

const CATEGORY_META: Record<Category, { icon: typeof Building2; color: string }> = {
  all: { icon: Building2, color: "text-sky-600 bg-sky-50" },
  implant: { icon: FlaskConical, color: "text-violet-600 bg-violet-50" },
  supply: { icon: Package, color: "text-emerald-600 bg-emerald-50" },
  dentist: { icon: Stethoscope, color: "text-amber-600 bg-amber-50" },
};

const STORAGE_KEYS = [
  "registered_companies",
  "dental_companies",
  "registered_accounts",
  "companies",
  "dentists",
];

const FALLBACK_ACCOUNTS: RegisteredAccount[] = [
  {
    id: "am-al-rabieen",
    name_ar: "شركة أم الربيعين",
    name_en: "Am Al-Rabieen Company",
    type: "implant",
    city_ar: "بغداد",
    city_en: "Baghdad",
  },
  {
    id: "dentist-sample-1",
    name_ar: "دكتور أسامة",
    name_en: "Dr. Osama",
    type: "dentist",
    city_ar: "بغداد",
    city_en: "Baghdad",
  },
];

const normalize = (str: string) =>
  str.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").trim();

const mapTypeToCategoryId = (raw: string): AccountType | null => {
  const v = raw.toLowerCase();
  if (v === "implant" || v === "implants" || v === "implant_company") return "implant";
  if (v === "supply" || v === "supplies" || v === "supply_company" || v === "medical_supplies")
    return "supply";
  if (v === "dentist" || v === "doctors" || v === "doctor" || v === "dentistry") return "dentist";
  return null;
};

function sanitizeAccounts(accounts: RegisteredAccount[]): RegisteredAccount[] {
  const seen = new Map<string, RegisteredAccount>();
  for (const a of accounts) {
    const normalizedType = mapTypeToCategoryId(a.type);
    if (!normalizedType) continue;
    const fixed = { ...a, type: normalizedType as AccountType };
    if (seen.has(a.id)) {
      const existing = seen.get(a.id)!;
      if (existing.type === "implant") continue;
      if (fixed.type === "implant") {
        seen.set(a.id, fixed);
      } else {
        seen.set(a.id, fixed);
      }
    } else {
      seen.set(a.id, fixed);
    }
  }
  return Array.from(seen.values());
}

function loadLocalAccounts(): RegisteredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw) as RegisteredAccount[];
        if (data.length > 0) {
          const sanitized = sanitizeAccounts(data);
          if (
            sanitized.length !== data.length ||
            sanitized.some((a, i) => a.type !== data[i]?.type)
          ) {
            localStorage.setItem(key, JSON.stringify(sanitized));
          }
          return sanitized;
        }
      }
    }
    localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(FALLBACK_ACCOUNTS));
    return FALLBACK_ACCOUNTS;
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/labs/explore")({
  component: LabsExplore,
});

function LabsExplore() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const { data: firestoreAccounts = [] } = useQuery({
    queryKey: ["registered-accounts"],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, "user_roles"));
        return snap.docs
          .map((d) => d.data() as UserRoleDoc)
          .filter(
            (u) =>
              u.accountType === "implant" ||
              u.accountType === "supply" ||
              u.accountType === "dentist",
          )
          .map((u) => {
            const normalizedType = mapTypeToCategoryId(u.accountType ?? "");
            if (!normalizedType) return null;
            return {
              id: u.userId,
              name_ar: u.name || u.surname || "",
              name_en: u.name || u.surname || "",
              type: normalizedType as AccountType,
              city_ar: u.address || "",
              city_en: u.address || "",
            } as RegisteredAccount;
          })
          .filter((e): e is RegisteredAccount => e !== null);
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const localAccounts = useMemo(() => loadLocalAccounts(), []);

  const accounts = useMemo(() => {
    const seen = new Set(firestoreAccounts.map((a) => a.id));
    return [...firestoreAccounts, ...localAccounts.filter((a) => !seen.has(a.id))];
  }, [firestoreAccounts, localAccounts]);

  const filtered = useMemo(() => {
    let result = accounts;
    if (category !== "all") {
      result = result.filter((a) => a.type === category);
    }
    if (!searchQuery.trim()) return result;
    const q = normalize(searchQuery);
    return result.filter((a) => {
      const nameAr = normalize(a.name_ar);
      const nameEn = normalize(a.name_en);
      const cityAr = normalize(a.city_ar);
      const cityEn = normalize(a.city_en);
      return nameAr.includes(q) || nameEn.includes(q) || cityAr.includes(q) || cityEn.includes(q);
    });
  }, [accounts, category, searchQuery]);

  const handleViewProfile = (item: RegisteredAccount) => {
    const route = CATEGORY_ROUTES[item.type];
    const paramKey = "accountId";
    (
      navigate as unknown as (opts: {
        to: string;
        params: Record<string, string>;
        state: Record<string, unknown>;
      }) => void
    )({
      to: route,
      params: { [paramKey]: item.id },
      state: { isVisitor: true },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
          <Building2 className="size-5 text-sky-500" />
          {ar ? "استكشاف الحسابات" : "Explore Accounts"}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {ar ? "ابحث عن الشركات المسجلة" : "Search registered companies"}
        </p>
      </div>

      <div className="relative">
        <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            ar
              ? "ابحث عن اسم الشركة للوصول إلى ملفها"
              : "Search company name to access their profile"
          }
          className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              category === c.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            {ar ? c.ar : c.en}
          </button>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">
          <Search className="size-10 mx-auto mb-3 text-slate-300" />
          <p>
            {ar
              ? "ابحث عن اسم الشركة للوصول إلى ملفها"
              : "Search for a company name to access their profile"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">
          <Search className="size-10 mx-auto mb-3 text-slate-300" />
          <p>{ar ? "لا توجد نتائج مطابقة" : "No matching results"}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            {filtered.length} {ar ? "نتيجة" : "result"}
            {filtered.length !== 1 ? (ar ? "" : "s") : ""}
          </p>

          <div className="space-y-3">
            {filtered.map((item) => {
              const meta = CATEGORY_META[item.type] ?? {
                icon: Building2,
                color: "text-slate-400 bg-slate-100",
              };
              const Icon = meta.icon;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "size-11 rounded-2xl flex items-center justify-center shrink-0",
                        meta.color,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm text-slate-800 truncate">
                        {ar ? item.name_ar : item.name_en}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                            meta.color,
                          )}
                        >
                          {ar
                            ? CATEGORIES.find((c) => c.id === item.type)?.ar
                            : CATEGORIES.find((c) => c.id === item.type)?.en}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="size-3" />
                          {ar ? item.city_ar : item.city_en}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewProfile(item)}
                    className="mt-3 w-full h-10 rounded-xl bg-sky-50 text-sky-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-sky-100 transition"
                  >
                    <Eye className="size-3.5" />
                    {ar ? "عرض الملف" : "View Profile"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

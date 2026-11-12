import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, MapPin, Package, Search, Stethoscope, X } from "lucide-react";
import { PriceLock } from "@/components/PriceLock";
import { useI18n } from "@/lib/i18n";
import { useVendorAccounts } from "@/lib/search";
import { useProductSearch } from "@/lib/products";

// Desktop header search: vendors + products, same sources and result rules as
// the search on the dentist home (accounts by name/location, products by term).
export function GlobalSearch() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = q.trim().toLowerCase();
  const { data: vendorAccounts = [] } = useVendorAccounts();
  const accounts = useMemo(() => {
    if (term.length < 2) return [];
    return vendorAccounts
      .filter((a) => [a.name, a.location].filter(Boolean).some((v) => v.toLowerCase().includes(term)))
      .slice(0, 5);
  }, [term, vendorAccounts]);
  const { data: found = [] } = useProductSearch(term.length >= 2 ? term : "");
  const products = useMemo(() => found.slice(0, 8), [found]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    // "/" focuses the search, like most web apps — ignored while typing elsewhere.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const close = () => {
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <Search className="size-[18px] absolute top-1/2 -translate-y-1/2 start-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={ar ? "ابحث عن زراعة، مادة، مختبر..." : "Search implants, materials, labs..."}
        className="w-full h-11 rounded-2xl bg-slate-100/80 border border-transparent ps-11 pe-12 text-sm text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-[#2563EB]/40 focus:ring-4 focus:ring-[#2563EB]/10 [&::-webkit-search-cancel-button]:hidden"
      />
      {q ? (
        <button
          type="button"
          onClick={close}
          aria-label={ar ? "مسح" : "Clear"}
          className="absolute top-1/2 -translate-y-1/2 end-3 size-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
        >
          <X className="size-3 text-slate-600" />
        </button>
      ) : (
        <kbd className="absolute top-1/2 -translate-y-1/2 end-3 h-6 min-w-6 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-400 flex items-center justify-center pointer-events-none">
          /
        </kbd>
      )}

      {open && term.length >= 2 && (
        <div className="absolute top-full inset-x-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 z-50 max-h-[28rem] overflow-y-auto p-1.5">
          {accounts.length === 0 && products.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">{ar ? "لا توجد نتائج" : "No results found"}</p>
          ) : (
            <>
              {accounts.map((a) => (
                <Link
                  key={`acc-${a.id}`}
                  to="/profile/$accountId"
                  params={{ accountId: a.id }}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  <span className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {a.category === "labs" ? (
                      <Stethoscope className="size-[18px]" />
                    ) : a.category === "implants" ? (
                      <FlaskConical className="size-[18px]" />
                    ) : (
                      <Package className="size-[18px]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.name}</p>
                    {a.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="size-3 shrink-0" />
                        {a.location}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              {products.map((p) => (
                <Link
                  key={`prod-${p.id}`}
                  to="/products/$productId"
                  params={{ productId: p.id }}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  <span className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Package className="size-[18px] text-slate-500" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{ar ? p.ar || p.en : p.en || p.ar}</p>
                    <p className="text-xs text-slate-400 truncate">{p.brand || (ar ? "المورد" : "Supplier")}</p>
                  </div>
                  {p.priceLocked ? (
                    <PriceLock officeId={p.companyId} compact />
                  ) : (
                    <span className="text-sm font-extrabold text-[#2563EB] shrink-0">
                      {p.currency === "IQD" ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`}
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

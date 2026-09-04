import { useEffect, useState } from "react";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { Product } from "@/lib/products";

export type SearchResult = {
  type: "product" | "office" | "lab" | "offer";
  id: string;
  titleAr: string;
  titleEn: string;
  subtitle?: string;
  imageUrl?: string;
  route: string;
  data: unknown;
};

export function useProductSearch(queryText: string, debounceMs = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchTerm = useDebounce(queryText.trim().toLowerCase(), debounceMs);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    const searchProducts = async () => {
      try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, limit(30));

        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);

        const term = searchTerm;
        const matched = all.filter((p) => {
          const ar = (p.ar ?? "").toLowerCase();
          const en = (p.en ?? "").toLowerCase();
          const brand = (p.brand ?? "").toLowerCase();
          const cat = (p.category ?? "").toLowerCase();
          return (
            ar.includes(term) ||
            en.includes(term) ||
            brand.includes(term) ||
            cat.includes(term)
          );
        }).slice(0, 20);

        setResults(
          matched.map((p) => ({
            type: "product" as const,
            id: p.id,
            titleAr: p.ar ?? "",
            titleEn: p.en ?? "",
            subtitle: p.brand,
            imageUrl: p.images?.[0],
            route: `/supplies/${p.companyId}/${p.branch ?? "general"}`,
            data: p,
          })),
        );
      } catch (err) {
        console.warn("Product search failed:", err);
      }
    };

    const searchAccounts = async () => {
      try {
        const accountsRef = collection(db, "user_roles");
        const snap = await getDocs(query(accountsRef, limit(30)));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);

        const term = searchTerm;
        const matched = all.filter((a) => {
          const name = (a.name ?? "").toLowerCase();
          const city = (a.city ?? "").toLowerCase();
          const address = (a.address ?? "").toLowerCase();
          return name.includes(term) || city.includes(term) || address.includes(term);
        }).slice(0, 5);

        const accountResults = matched.map((a) => ({
          type: (a.accountType === "lab" ? "lab" : "office") as "lab" | "office",
          id: a.userId ?? a.id,
          titleAr: a.name ?? "",
          titleEn: a.name ?? "",
          subtitle: a.city,
          imageUrl: a.photoURL,
          route: a.accountType === "lab" ? `/labs/${a.userId}` : `/profile/${a.userId}`,
          data: a,
        }));

        setResults((prev) => [...prev, ...accountResults]);
      } catch (err) {
        console.warn("Account search failed:", err);
      }
    };

    Promise.all([searchProducts(), searchAccounts()]).then(() => setLoading(false));
  }, [searchTerm]);

  return { results, loading, searchTerm };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

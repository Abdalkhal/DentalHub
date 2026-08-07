import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Heart, Package, Trash2 } from "lucide-react";

export const Route = createFileRoute("/favorites/")({
  component: FavoritesPage,
});

type FavItem = {
  id: string;
  title: string;
  price: number;
  currency: "USD" | "IQD";
  vendor: string;
  imageUrl?: string;
  addedAt: string;
};

function loadFavorites(): FavItem[] {
  try { return JSON.parse(localStorage.getItem("dh:favorites") || "[]"); } catch { return []; }
}
function saveFavorites(d: FavItem[]) {
  localStorage.setItem("dh:favorites", JSON.stringify(d));
}

function FavoritesPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [items, setItems] = useState<FavItem[]>(loadFavorites);

  useEffect(() => {
    const onStorage = () => setItems(loadFavorites());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const remove = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    saveFavorites(updated);
    toast.success(ar ? "تمت إزالة العنصر" : "Removed from favorites");
  };

  return (
    <MobileShell>
      <div className="px-3 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-extrabold text-lg">{ar ? "المفضلة" : "Favorites"}</h1>
          <span className="text-xs text-slate-500">{items.length} {ar ? "عنصر" : "items"}</span>
        </div>
        {items.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Heart className="size-16 mx-auto mb-4 text-slate-300" />
            <p className="font-semibold text-lg">{ar ? "قائمة المفضلة فارغة حالياً" : "Your favorites list is empty"}</p>
            <p className="text-sm mt-1">{ar ? "تصفح المنتجات وأضف ما يعجبك" : "Browse products and add what you like"}</p>
            <Link to="/supplies" className="mt-4 inline-flex h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold items-center gap-1.5"><Package className="size-4" />{ar ? "تصفح المنتجات" : "Browse Products"}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="size-12 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">{item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : <Package className="size-5 text-slate-400" />}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.vendor}</p>
                  <p className="font-extrabold text-sm text-primary mt-1">{item.currency === "IQD" ? `${item.price.toLocaleString()} د.ع` : `$${item.price.toFixed(2)}`}</p>
                </div>
                <button onClick={() => remove(item.id)} className="size-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 shrink-0"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

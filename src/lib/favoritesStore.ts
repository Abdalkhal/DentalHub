import { createLocalStore } from "./createLocalStore";
import { toast } from "sonner";

export type FavItem = {
  id: string;
  title: string;
  vendor: string;
  price: number;
  currency: "USD" | "IQD";
  imageUrl?: string;
  addedAt: string;
};

const favorites = createLocalStore<FavItem[]>("dh:favorites", []);

export function useFavorites() {
  return favorites.useStore();
}

export function isFavorited(id: string): boolean {
  return favorites.getSnapshot().some((item) => item.id === id);
}

export function useIsFavorited(id: string): boolean {
  return useFavorites().some((item) => item.id === id);
}

export function toggleFavorite(item: FavItem, lang?: string): boolean {
  const list = favorites.getSnapshot();
  const exists = list.findIndex((i) => i.id === item.id);
  const ar = lang === "ar";
  if (exists >= 0) {
    favorites.set(list.filter((i) => i.id !== item.id));
    toast.success(ar ? "تمت إزالة العنصر من المفضلة" : "Removed from favorites");
    return false;
  }
  favorites.set([...list, item]);
  toast.success(ar ? "تمت إضافة العنصر إلى المفضلة" : "Added to favorites");
  return true;
}

export function removeFavorite(id: string, lang?: string): void {
  const list = favorites.getSnapshot();
  const ar = lang === "ar";
  favorites.set(list.filter((i) => i.id !== id));
  toast.success(ar ? "تمت إزالة العنصر" : "Removed from favorites");
}

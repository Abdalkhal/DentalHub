import { createLocalStore } from "./createLocalStore";
import { toast } from "@/lib/toast";

export type FavItem = {
  id: string;
  title: string;
  vendor: string;
  price: number;
  currency: "USD" | "IQD";
  imageUrl?: string;
  addedAt: string;
};

const favorites = createLocalStore<FavItem[]>("dh:favorites", [], {
  migrate: (data) => (Array.isArray(data) ? (data as FavItem[]) : []),
});

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
    toast.success(ar ? "ØªÙ…Øª Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¹Ù†ØµØ± Ù…Ù† Ø§Ù„Ù…ÙØ¶Ù„Ø©" : "Removed from favorites");
    return false;
  }
  favorites.set([...list, item]);
  toast.success(ar ? "ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù†ØµØ± Ø¥Ù„Ù‰ Ø§Ù„Ù…ÙØ¶Ù„Ø©" : "Added to favorites");
  return true;
}

export function removeFavorite(id: string, lang?: string): void {
  const list = favorites.getSnapshot();
  const ar = lang === "ar";
  favorites.set(list.filter((i) => i.id !== id));
  toast.success(ar ? "ØªÙ…Øª Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¹Ù†ØµØ±" : "Removed from favorites");
}


import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsFavorited, toggleFavorite, type FavItem } from "@/lib/favoritesStore";
import { useI18n } from "@/lib/i18n";

export function FavoriteButton({
  item,
  size,
  className,
}: {
  item: FavItem;
  size?: "sm" | "md";
  className?: string;
}) {
  const { lang } = useI18n();
  const liked = useIsFavorited(item.id);

  const dims = size === "sm" ? "size-8" : "size-10";
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(item, lang);
      }}
      className={cn(dims, "rounded-xl flex items-center justify-center transition", liked ? "bg-rose-100 text-rose-500" : "bg-white/20 text-white hover:bg-white/30", className)}
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn(iconSize, liked && "fill-current")} />
    </button>
  );
}

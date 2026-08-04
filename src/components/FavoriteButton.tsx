import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type FavItem = {
  id: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  to: string;
  params: Record<string, string>;
};

export function FavoriteButton({
  item,
  size,
  className,
}: {
  item: FavItem;
  size?: "sm" | "md";
  className?: string;
}) {
  const [liked, setLiked] = useState(false);

  const dims = size === "sm" ? "size-8" : "size-10";
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <button
      onClick={() => setLiked(!liked)}
      className={cn(dims, "rounded-xl flex items-center justify-center transition", liked ? "bg-rose-100 text-rose-500" : "bg-white/20 text-white hover:bg-white/30", className)}
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn(iconSize, liked && "fill-current")} />
    </button>
  );
}

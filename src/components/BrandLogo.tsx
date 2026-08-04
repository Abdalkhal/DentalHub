import type { Brand } from "@/data/brands";
import { cn } from "@/lib/utils";

/** Crisp typographic brand mark rendered as vector text (no raster logos). */
export function BrandLogo({ brand, className }: { brand: Brand; className?: string }) {
  const words = brand.name.split(" ");
  return (
    <span
      className={cn(
        "flex flex-col items-center justify-center text-center leading-none select-none",
        className
      )}
      style={{ color: brand.color }}
      aria-label={brand.name}
    >
      {words.map((w, i) => (
        <span
          key={i}
          className={cn(
            "font-display font-extrabold tracking-tight",
            words.length > 1 ? "text-[11px]" : "text-lg"
          )}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

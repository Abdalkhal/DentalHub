import { useState } from "react";
import type { Brand } from "@/data/brands";
import { cn } from "@/lib/utils";

/** Brand logo image when available, otherwise a crisp typographic mark. */
export function BrandLogo({ brand, className }: { brand: Brand; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (brand.image && !failed) {
    return (
      <span
        className={cn("flex items-center justify-center overflow-hidden select-none", className)}
        aria-label={brand.name}
      >
        <img
          src={brand.image}
          alt={brand.name}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

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

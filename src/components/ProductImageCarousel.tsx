import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
  showIndex?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
};

/** Instagram-style swipeable image carousel with index badge, dots and hover arrows. */
export function ProductImageCarousel({
  urls,
  alt,
  className,
  imageClassName,
  showIndex = true,
  showDots = true,
  showArrows = true,
}: Props) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (urls.length === 0) return null;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(Math.max(0, Math.min(urls.length - 1, next)));
  };

  const scrollTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const multi = urls.length > 1;

  return (
    <div className={cn("relative group overflow-hidden", className)}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none h-full"
      >
        {urls.map((u, i) => (
          <img
            key={`${u}-${i}`}
            src={u}
            alt={`${alt} ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
            className={cn("snap-center shrink-0 w-full object-cover", imageClassName)}
          />
        ))}
      </div>

      {showIndex && multi && (
        <span className="absolute top-2 end-2 z-10 rounded-full bg-black/55 text-white text-[10px] font-bold px-2 py-0.5 backdrop-blur-sm">
          {idx + 1}/{urls.length}
        </span>
      )}

      {showArrows && multi && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(Math.max(0, idx - 1));
            }}
            className="absolute start-2 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white/85 text-slate-700 hidden md:flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition hover:bg-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(Math.min(urls.length - 1, idx + 1));
            }}
            className="absolute end-2 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white/85 text-slate-700 hidden md:flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition hover:bg-white"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}

      {showDots && multi && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 pointer-events-none">
          {urls.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full transition-all",
                i === idx ? "bg-white w-2.5" : "bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

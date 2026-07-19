import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Globe, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  showSearch?: boolean;
  showBack?: boolean;
  variant?: "home" | "page";
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
};

export function TopBar({
  title,
  showSearch = false,
  showBack = false,
  variant = "page",
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: Props) {
  const { t, lang, toggle, dir } = useI18n();
  const router = useRouter();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 px-4 pt-5 pb-4",
        variant === "home"
          ? "bg-gradient-to-b from-primary-soft/70 to-transparent"
          : "bg-background/90 backdrop-blur border-b border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => router.history.back()}
              className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent"
              aria-label={t("back")}
            >
              <BackIcon className="size-4" />
            </button>
          )}
          {variant === "home" ? (
            <Link to="/" className="flex items-center gap-1 font-display font-extrabold text-lg">
              <span className="text-foreground">Dental</span>
              <span className="text-primary">Hub</span>
            </Link>
          ) : (
            <h1 className="font-display font-bold text-base truncate">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-card border border-border text-xs font-semibold text-foreground hover:bg-accent"
          >
            <Globe className="size-3.5" />
            {lang === "ar" ? "AR/EN" : "EN/AR"}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="mt-4 relative">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder ?? t("search_placeholder")}
            className="w-full h-11 rounded-2xl bg-card border border-border ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
          />
        </div>
      )}
    </header>
  );
}

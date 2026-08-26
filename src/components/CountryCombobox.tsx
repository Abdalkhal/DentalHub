import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type CountryEntry,
  ALL_COUNTRIES,
  countryCodeToFlag,
  sortCountries,
  filterCountries,
} from "@/data/countries";

type CountryComboboxProps = {
  value: string;
  onChange: (code: string) => void;
  lang: "ar" | "en";
  placeholder?: string;
  className?: string;
};

export function CountryCombobox({
  value,
  onChange,
  lang,
  placeholder,
  className,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const sorted = useMemo(() => sortCountries(ALL_COUNTRIES, lang), [lang]);

  const filtered = useMemo(() => filterCountries(sorted, query), [sorted, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selected = ALL_COUNTRIES.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-12 justify-between rounded-xl bg-slate-50 border-border px-4 font-normal text-sm hover:bg-slate-100",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <span className="text-lg shrink-0 leading-none">
                  {countryCodeToFlag(selected.code)}
                </span>
                <span className="truncate">{lang === "ar" ? selected.ar : selected.en}</span>
              </>
            ) : (
              (placeholder ?? (lang === "ar" ? "اختر البلد..." : "Select country..."))
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[80] w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={lang === "ar" ? "ابحث عن بلد..." : "Search country..."}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{lang === "ar" ? "لا توجد نتائج" : "No results found"}</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.code}
                  value={c.code}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <span className="text-lg shrink-0 leading-none">{countryCodeToFlag(c.code)}</span>
                  <span className="flex-1 truncate">{lang === "ar" ? c.ar : c.en}</span>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === c.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

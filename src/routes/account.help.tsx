import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { MessageCircle, Phone, Mail, ChevronDown, Search } from "lucide-react";
import { helpTopics } from "@/data/help-topics";

export const Route = createFileRoute("/account/help")({
  component: HelpPage,
});

function HelpPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState("");

  const channels = [
    {
      icon: MessageCircle,
      label: ar ? "محادثة مباشرة" : "Live chat",
      sub: ar ? "متاح الآن" : "Available now",
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      icon: Phone,
      label: ar ? "اتصال هاتفي" : "Call us",
      sub: "+964 770 000 0000",
      tone: "bg-blue-100 text-blue-600",
    },
    {
      icon: Mail,
      label: ar ? "البريد الإلكتروني" : "Email",
      sub: "support@dentalhub.app",
      tone: "bg-violet-100 text-violet-600",
    },
  ];

  const query = q.trim().toLowerCase();

  const filteredTopics = useMemo(() => {
    if (!query) return helpTopics;
    return helpTopics.filter((t) => {
      const txt = `${t.title.ar} ${t.title.en} ${t.intro.ar} ${t.intro.en}`.toLowerCase();
      return txt.includes(query);
    });
  }, [query]);

  const allFaqs = useMemo(
    () =>
      helpTopics.flatMap((t) =>
        t.faqs.map((f) => ({
          slug: t.slug,
          topic: ar ? t.title.ar : t.title.en,
          q: ar ? f.q.ar : f.q.en,
          a: ar ? f.a.ar : f.a.en,
        })),
      ),
    [ar],
  );

  const filteredFaqs = useMemo(() => {
    if (!query) return allFaqs.slice(0, 4);
    return allFaqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(query));
  }, [allFaqs, query]);

  return (
    <MobileShell>
      <TopBar title={ar ? "مركز المساعدة" : "Help center"} showBack />
      <div className="px-4 pt-4 space-y-4">
        <div className="relative">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? "ابحث في المساعدة…" : "Search help…"}
            className="w-full h-11 rounded-2xl bg-card border border-border ps-10 pe-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
          />
        </div>

        {!query && (
          <section>
            <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
              {ar ? "تواصل معنا" : "Contact us"}
            </p>
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
              {channels.map((c, i) => (
                <li key={i}>
                  <button className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-accent transition">
                    <span
                      className={`size-9 rounded-xl flex items-center justify-center ${c.tone}`}
                    >
                      <c.icon className="size-[18px]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{c.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.sub}</p>
                    </div>
                    <span className="text-muted-foreground">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "تصفّح حسب الموضوع" : "Browse topics"}
          </p>
          {filteredTopics.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              {ar ? "لا توجد نتائج" : "No results"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTopics.map((t) => (
                <Link
                  key={t.slug}
                  to="/account/help/topic/$slug"
                  params={{ slug: t.slug }}
                  className="bg-card border border-border rounded-2xl p-3 shadow-soft flex flex-col items-start gap-2 hover:bg-accent transition"
                >
                  <span className={`size-9 rounded-xl flex items-center justify-center ${t.tone}`}>
                    <t.icon className="size-[18px]" />
                  </span>
                  <span className="text-xs font-semibold text-start">
                    {ar ? t.title.ar : t.title.en}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {query ? (ar ? "نتائج الأسئلة" : "FAQ results") : ar ? "الأسئلة الشائعة" : "FAQs"}
          </p>
          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              {ar ? "لا توجد نتائج" : "No results"}
            </p>
          ) : (
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
              {filteredFaqs.map((f, i) => {
                const isOpen = open === i;
                return (
                  <li key={`${f.slug}-${i}`}>
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-start"
                    >
                      <span className="flex-1 text-sm font-semibold">{f.q}</span>
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
                        <Link
                          to="/account/help/topic/$slug"
                          params={{ slug: f.slug }}
                          className="inline-block text-[11px] font-semibold text-primary"
                        >
                          {ar ? `المزيد في: ${f.topic} ›` : `More in: ${f.topic} ›`}
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </MobileShell>
  );
}

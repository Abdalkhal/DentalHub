import { createFileRoute, notFound } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { helpTopics } from "@/data/help-topics";

export const Route = createFileRoute("/account/help/topic/$slug")({
  component: TopicPage,
  notFoundComponent: () => (
    <MobileShell>
      <TopBar title="—" showBack />
      <div className="px-4 pt-6 text-sm text-muted-foreground">Not found</div>
    </MobileShell>
  ),
  loader: ({ params }) => {
    const topic = helpTopics.find((t) => t.slug === params.slug);
    if (!topic) throw notFound();
    return { slug: topic.slug };
  },
});

function TopicPage() {
  const { slug } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const topic = helpTopics.find((t) => t.slug === slug)!;
  const [open, setOpen] = useState<number | null>(0);
  const Icon = topic.icon;

  return (
    <MobileShell>
      <TopBar title={ar ? topic.title.ar : topic.title.en} showBack />
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex items-start gap-3">
          <span className={`size-11 rounded-xl flex items-center justify-center ${topic.tone}`}>
            <Icon className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold">{ar ? topic.title.ar : topic.title.en}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              {ar ? topic.intro.ar : topic.intro.en}
            </p>
          </div>
        </div>

        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "الأسئلة الشائعة" : "FAQs"}
          </p>
          <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
            {topic.faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={i}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-start"
                  >
                    <span className="flex-1 text-sm font-semibold">{ar ? f.q.ar : f.q.en}</span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">
                      {ar ? f.a.ar : f.a.en}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </MobileShell>
  );
}

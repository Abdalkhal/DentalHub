import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { OfficeOffers } from "@/components/OfficeOffers";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";

// An office's own offers: add, edit and delete them (reached from More → عروضي).
export const Route = createFileRoute("/my-offers")({
  head: () => ({ meta: [{ title: "عروضي | Dent Hub" }, { name: "robots", content: "noindex" }] }),
  component: MyOffersPage,
});

function MyOffersPage() {
  const { lang } = useI18n();
  const { user } = useSession();
  return (
    <MobileShell wide>
      <TopBar title={lang === "ar" ? "عروضي" : "My Offers"} showBack wide />
      <div className="px-4 pt-4 pb-10 md:px-6 md:pt-6 lg:px-8 lg:max-w-5xl lg:mx-auto">
        {user && <OfficeOffers supplierId={user.uid} />}
      </div>
    </MobileShell>
  );
}

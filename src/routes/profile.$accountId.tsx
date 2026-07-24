import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useProducts } from "@/lib/products";
import { useOffers } from "@/lib/offers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MapPin, Phone, Package, Megaphone, Eye } from "lucide-react";

export const Route = createFileRoute("/profile/$accountId")({
  component: ProfilePage,
});

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  dentist: { ar: "طبيب أسنان", en: "Dentist" },
  supply: { ar: "مكتب مستلزمات", en: "Supplies Office" },
  implant: { ar: "شركة زرعات", en: "Implant Company" },
};

const CATEGORY_COLORS: Record<string, string> = {
  implant: "text-violet-600 bg-violet-50",
  supply: "text-emerald-600 bg-emerald-50",
  dentist: "text-amber-600 bg-amber-50",
};

const ACCOUNT_TYPE_LETTER: Record<string, string> = {
  implant: "ز",
  supply: "م",
  dentist: "ط",
};

function ProfilePage() {
  const { accountId } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";

  const { data: account, isLoading } = useQuery({
    queryKey: ["profile-account", accountId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "user_roles", accountId));
      if (!snap.exists()) return null;
      return snap.data() as UserRoleDoc;
    },
  });

  const { data: offers = [] } = useOffers(accountId);

  const { data: allProducts = [] } = useProducts();
  const products = useMemo(
    () => allProducts.filter((p) => p.companyId === accountId),
    [allProducts, accountId],
  );

  if (isLoading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "جاري التحميل..." : "Loading..."} showBack />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (!account) {
    return (
      <MobileShell>
        <TopBar title={ar ? "غير موجود" : "Not found"} showBack />
        <div className="p-6 text-center text-sm text-muted-foreground">
          {ar ? "الحساب غير موجود" : "Account not found"}
        </div>
      </MobileShell>
    );
  }

  const displayName = account.name || account.surname || "";
  const displayRole = ROLE_LABELS[account.accountType]?.[lang] ?? account.accountType;
  const categoryColor = CATEGORY_COLORS[account.accountType] ?? "text-slate-600 bg-slate-50";
  const typeLetter =
    ACCOUNT_TYPE_LETTER[account.accountType] ??
    (displayName ? displayName.charAt(0).toUpperCase() : "?");

  const formatPhone = (raw?: string | null): string => {
    if (!raw) return "";
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("964") && d.length >= 10) {
      const local = d.slice(3);
      return `+964 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return `+${d}`;
  };

  const getWhatsAppLink = (raw?: string | null): string => {
    if (!raw) return "";
    return `https://wa.me/${raw.replace(/\D/g, "")}`;
  };

  const getMapsUrl = (): string => {
    if (account.mapUrl) return account.mapUrl;
    if (account.latitude != null && account.longitude != null)
      return `https://www.google.com/maps?q=${account.latitude},${account.longitude}`;
    if (account.address)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(account.address)}`;
    return "";
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "الملف الشخصي" : "Profile"} showBack />
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex items-start gap-4">
          <span
            className={`size-14 rounded-2xl flex items-center justify-center shrink-0 font-display font-extrabold text-xl ${categoryColor}`}
          >
            {account.photoURL ? (
              <img src={account.photoURL} alt="" className="size-full object-cover rounded-2xl" />
            ) : (
              typeLetter
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-lg">{displayName}</p>
            <span
              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${categoryColor}`}
            >
              {displayRole}
            </span>
            {account.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                <Phone className="size-3 shrink-0" />
                {formatPhone(account.phone)}
              </p>
            )}
            {account.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <MapPin className="size-3 shrink-0" />
                {account.address}
              </p>
            )}
          </div>
        </div>

        {(account.phone || getMapsUrl()) && (
          <div className="flex gap-2">
            {account.phone && (
              <a
                href={getWhatsAppLink(account.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 rounded-xl bg-green-50 text-green-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-green-100 transition"
              >
                <Phone className="size-4" />
                {ar ? "واتساب" : "WhatsApp"}
              </a>
            )}
            {getMapsUrl() && (
              <a
                href={getMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-100 transition"
              >
                <MapPin className="size-4" />
                {ar ? "الموقع" : "Location"}
              </a>
            )}
          </div>
        )}

        {offers.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base flex items-center gap-1.5 mb-3">
              <Megaphone className="size-4 text-primary" />
              {ar ? "العروض والإعلانات" : "Offers & Ads"}
            </h2>
            <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="snap-start shrink-0 w-[78%] rounded-2xl p-3.5 text-white shadow-card space-y-2"
                  style={{
                    backgroundImage: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                  }}
                >
                  {offer.imageUrl && (
                    <img
                      src={offer.imageUrl}
                      alt=""
                      className="w-full h-32 object-cover rounded-xl"
                      loading="lazy"
                    />
                  )}
                  <p className="text-[10px] opacity-90 leading-relaxed line-clamp-2">
                    {offer.description}
                  </p>
                  <p className="font-display font-extrabold text-base leading-tight line-clamp-2">
                    {offer.title}
                  </p>
                  {offer.price != null && (
                    <div className="inline-flex items-center bg-white text-slate-900 font-bold text-xs px-2 py-0.5 rounded-md">
                      {offer.currency === "IQD"
                        ? `${offer.price.toLocaleString()} IQD`
                        : `$${offer.price}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {products.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base flex items-center gap-1.5 mb-3">
              <Package className="size-4 text-primary" />
              {ar ? "المنتجات" : "Products"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {products.slice(0, 6).map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-3 shadow-soft">
                  <p className="font-display font-bold text-sm truncate">{ar ? p.ar : p.en}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.brand}</p>
                  <p className="text-xs font-semibold mt-1">
                    {p.currency === "IQD" ? `${p.price.toLocaleString()} IQD` : `$${p.price}`}
                  </p>
                </div>
              ))}
            </div>
            {products.length > 6 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {ar
                  ? `و ${products.length - 6} منتجات أخرى`
                  : `And ${products.length - 6} more products`}
              </p>
            )}
          </div>
        )}

        {offers.length === 0 && products.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Eye className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>{ar ? "لا توجد عروض أو منتجات بعد" : "No offers or products yet"}</p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

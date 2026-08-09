import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { resetAdminStore } from "@/lib/adminStore";
import { useIsAdmin } from "@/lib/useAuth";
import { auth } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { RotateCcw, Settings2, LogOut, ShieldAlert } from "lucide-react";
import { BranchesTab } from "@/components/admin/BranchesTab";
import { OfficesTab } from "@/components/admin/OfficesTab";
import { LabsTab } from "@/components/admin/LabsTab";
import { ProductsTab } from "@/components/admin/ProductsTab";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "branches" | "offices" | "labs" | "products";

function AdminPage() {
  const { lang } = useI18n();
  const [tab, setTab] = useState<Tab>("branches");
  const { user, loading, isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const tabs: { key: Tab; ar: string; en: string }[] = [
    { key: "branches", ar: "الفروع", en: "Branches" },
    { key: "offices", ar: "المكاتب", en: "Offices" },
    { key: "labs", ar: "المختبرات", en: "Labs" },
    { key: "products", ar: "المنتجات", en: "Products" },
  ];

  if (loading || !user) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "لوحة الإدارة" : "Admin panel"} showBack />
        <div className="p-8 text-center text-sm text-muted-foreground">…</div>
      </MobileShell>
    );
  }

  if (!isAdmin) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "لوحة الإدارة" : "Admin panel"} showBack />
        <div className="p-6 text-center space-y-3">
          <ShieldAlert className="size-10 text-destructive mx-auto" />
          <p className="font-display font-bold">
            {lang === "ar" ? "لا تملك صلاحية المدير" : "You are not an admin"}
          </p>
          <p className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "اطلب من مدير النظام منحك صلاحية إدارية للوصول إلى هذه اللوحة."
              : "Ask the system admin to grant you admin role to access this panel."}
          </p>
          <Button variant="outline" size="sm" onClick={() => signOut(auth)}>
            <LogOut className="size-4" /> {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </Button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title={lang === "ar" ? "لوحة الإدارة" : "Admin panel"} showBack />
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Settings2 className="size-3.5" />
            {lang === "ar" ? "تعديل البيانات بدون كود" : "Edit data without code"}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut(auth).then(() => navigate({ to: "/auth" }))}
              className="text-xs font-semibold inline-flex items-center gap-1"
            >
              <LogOut className="size-3" /> {lang === "ar" ? "خروج" : "Sign out"}
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    lang === "ar"
                      ? "إعادة تعيين الفروع/المكاتب/المختبرات؟"
                      : "Reset branches/offices/labs?",
                  )
                )
                  resetAdminStore();
              }}
              className="text-xs text-destructive font-semibold inline-flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> {lang === "ar" ? "إعادة تعيين" : "Reset"}
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold border transition ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {lang === "ar" ? t.ar : t.en}
            </button>
          ))}
        </div>

        {tab === "branches" && <BranchesTab />}
        {tab === "offices" && <OfficesTab />}
        {tab === "labs" && <LabsTab />}
        {tab === "products" && <ProductsTab />}

        <Link to="/" className="block mt-6 text-center text-xs text-muted-foreground underline">
          {lang === "ar" ? "العودة إلى الرئيسية" : "Back to home"}
        </Link>
      </div>
    </MobileShell>
  );
}

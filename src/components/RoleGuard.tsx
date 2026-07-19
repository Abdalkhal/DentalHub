import { useNavigate, Link } from "@tanstack/react-router";
import { useUserRole, getAccountDashboard } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { ShieldAlert, ArrowRight, ArrowLeft, LogIn } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { auth } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import type { AccountType } from "@/integrations/firebase/types";
import type { ReactNode } from "react";

const ROLE_LABELS: Record<AccountType, { ar: string; en: string }> = {
  dentist: { ar: "طبيب أسنان", en: "Dentist" },
  supply: { ar: "مكتب مستلزمات", en: "Supplies Office" },
  lab: { ar: "مختبر", en: "Laboratory" },
  implant: { ar: "شركة زرعات", en: "Implant Company" },
};

type Props = {
  allowedRoles: AccountType[];
  children: ReactNode;
};

export function RoleGuard({ allowedRoles, children }: Props) {
  const { lang, dir } = useI18n();
  const { role, loading } = useUserRole();
  const navigate = useNavigate();
  const ar = lang === "ar";
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <MobileShell>
        <TopBar title="" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (role && allowedRoles.includes(role.accountType)) {
    return <>{children}</>;
  }

  const userLabel = role
    ? ar
      ? ROLE_LABELS[role.accountType].ar
      : ROLE_LABELS[role.accountType].en
    : "";
  const allowedLabels = allowedRoles
    .map((r) => (ar ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en))
    .join(", ");

  const handleGoToDashboard = () => {
    if (role) {
      navigate({ to: getAccountDashboard(role.role), replace: true });
    } else {
      navigate({ to: "/login", replace: true });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate({ to: "/login", replace: true });
  };

  return (
    <MobileShell hideBottomNav>
      <TopBar title="" showBack />
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="size-20 rounded-full bg-rose-100 flex items-center justify-center mb-6">
          <ShieldAlert className="size-10 text-rose-500" />
        </div>
        <h2 className="font-display font-extrabold text-xl text-foreground mb-2">
          {ar ? "وصول غير مصرح به" : "Access Denied"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-2">
          {ar
            ? `حسابك مسجل كـ "${userLabel}". هذه الصفحة مخصصة لـ: ${allowedLabels}`
            : `Your account is registered as "${userLabel}". This page is only for: ${allowedLabels}`}
        </p>
        <p className="text-xs text-muted-foreground/70 max-w-sm leading-relaxed mb-8">
          {ar
            ? "إذا كنت تعتقد أن هناك خطأ، يرجى تسجيل الخروج وتسجيل الدخول بنوع الحساب الصحيح."
            : "If you believe this is an error, please sign out and log in with the correct account type."}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleGoToDashboard}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-card"
          >
            <BackIcon className="size-4" />
            {ar ? "الذهاب إلى لوحة التحكم" : "Go to your dashboard"}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full h-12 rounded-2xl bg-slate-100 text-slate-700 font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 hover:text-rose-600 transition"
          >
            <LogIn className="size-4" />
            {ar ? "تسجيل الخروج والدخول بحساب آخر" : "Sign out and use another account"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

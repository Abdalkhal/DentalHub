// A suspended account sees this instead of the app. The admin's decision takes
// effect here at once; the server also disables the sign-in (functions/adminConsole.js).
import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { LogOut, ShieldAlert } from "lucide-react";
import { auth } from "@/integrations/firebase/client";
import { useUserRole } from "@/lib/useAuth";

const OPEN_PATHS = [/^\/admin-standalone/, /^\/book\//, /^\/privacy/];

export function SuspendedGate({ children }: { children: ReactNode }) {
  const { role } = useUserRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (role?.accountStatus !== "suspended" || OPEN_PATHS.some((re) => re.test(pathname))) return <>{children}</>;
  const reason = (role as { suspendedReason?: string }).suspendedReason;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-4 font-display text-lg font-extrabold text-slate-900">تم إيقاف حسابك</h1>
        {reason && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{reason}</p>}
        <p className="mt-3 text-sm leading-6 text-slate-500">بياناتك محفوظة ولم يُحذف منها شيء. للاستفسار تواصل مع الدعم.</p>
        <button type="button" onClick={() => void signOut(auth)} className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200">
          <LogOut className="size-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

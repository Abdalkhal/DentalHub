import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useIsAdmin, fetchUserRoleDoc } from "@/lib/useAuth";
import { AdminStandaloneApp } from "@/components/admin/AdminStandaloneApp";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin-standalone/")({
  component: AdminStandalonePage,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("بيانات الدخول غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4" dir="rtl">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex flex-col items-center text-center">
          <span className="size-14 rounded-2xl bg-[#0052FF] text-white flex items-center justify-center">
            <ShieldCheck className="size-7" />
          </span>
          <h1 className="font-display font-extrabold text-lg text-slate-900 mt-3">
            لوحة تحكم المدير
          </h1>
          <p className="text-xs text-slate-500 mt-1">دخول مخصص لمدراء النظام فقط</p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@dentalhub.com"
            className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
            dir="ltr"
          />
        </div>
        {error && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-xl bg-[#0052FF] text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          دخول
        </button>
      </form>
    </div>
  );
}

function AdminStandalonePage() {
  const { user, loading, isAdmin } = useIsAdmin();
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    if (user) {
      fetchUserRoleDoc(user.uid).then((r) => {
        if (r?.name) setAdminName(r.name);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center" dir="rtl">
        <Loader2 className="size-8 text-white animate-spin" />
      </div>
    );
  }

  if (!user) return <AdminLogin />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl space-y-3">
          <ShieldCheck className="size-12 text-rose-500 mx-auto" />
          <p className="font-display font-bold text-lg text-slate-900">لا تملك صلاحية المدير</p>
          <p className="text-xs text-slate-500">هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم</p>
          <button
            onClick={() => signOut(auth)}
            className="mx-auto h-10 px-5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition"
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return <AdminStandaloneApp adminName={adminName} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { useIsAdmin, fetchUserRoleDoc } from "@/lib/useAuth";
import { AdminStandaloneApp } from "@/components/admin/AdminStandaloneApp";
import { ShieldCheck, Loader2, LogOut, KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin-standalone/")({
  component: AdminStandalonePage,
});

const ADMIN_EMAIL = "admin@dentalhub.com";
const ADMIN_PASSWORD = "admin123";

function AdminLogin() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("بيانات الدخول غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  const seedAdmin = async () => {
    setError("");
    setInfo("");
    setSeeding(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      await setDoc(doc(db, "user_roles", cred.user.uid), {
        userId: cred.user.uid,
        role: "admin",
        accountType: "dentist",
        name: "مدير النظام",
        surname: "Admin",
        email: ADMIN_EMAIL,
        accountStatus: "active",
        createdAt: serverTimestamp(),
      });
      setInfo(`تم إنشاء حساب المدير بنجاح — ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setInfo(
          `الحساب ${ADMIN_EMAIL} موجود مسبقاً — استخدم بيانات الدخول التالية: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`,
        );
      } else if (code === "auth/operation-not-allowed") {
        setError(
          "إنشاء المستخدم معطّل في إعدادات Firebase Authentication (Email/Password). فعّله من لوحة Firebase ثم أعد المحاولة.",
        );
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSeeding(false);
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
        {info && (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 leading-relaxed">
            {info}
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
        <div className="text-center">
          <button
            type="button"
            onClick={seedAdmin}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0052FF] transition disabled:opacity-60"
          >
            {seeding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <KeyRound className="size-3.5" />
            )}
            إنشاء حساب المدير الافتراضي (مرة واحدة)
          </button>
        </div>
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

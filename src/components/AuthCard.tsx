import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { auth, db } from "@/integrations/firebase/client";
import type { AccountType } from "@/integrations/firebase/types";
import { fetchUserRoleDoc, getAccountDashboard } from "@/lib/useAuth";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { LoginForm } from "./auth/LoginForm";
import { RegisterForm } from "./auth/RegisterForm";
import { AccountTypeSelector } from "./auth/AccountTypeSelector";

interface AuthCardProps {
  defaultMode: "login" | "register";
}

export function AuthCard({ defaultMode }: AuthCardProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [accountType, setAccountType] = useState<AccountType>("dentist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    setError(null);
  }, [mode, accountType]);

  const handleLogin = async (email: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const roleDoc = await fetchUserRoleDoc(cred.user.uid);
      if (!roleDoc) {
        setError(
          ar
            ? "لم يتم العثور على صلاحيات لهذا الحساب. يرجى التسجيل أولاً."
            : "No role found for this account. Please register first.",
        );
        await auth.signOut();
        return;
      }
      const path = getAccountDashboard(roleDoc.role);
      navigate({ to: path });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (
        msg.includes("invalid-credential") ||
        msg.includes("user-not-found") ||
        msg.includes("wrong-password")
      ) {
        setError(ar ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Invalid email or password");
      } else if (msg.includes("too-many-requests")) {
        setError(
          ar ? "طلبات كثيرة جداً. حاول مرة أخرى لاحقاً." : "Too many attempts. Try again later.",
        );
      } else {
        setError(msg || (ar ? "حدث خطأ. حاول مرة أخرى." : "An error occurred."));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (data: Record<string, string>) => {
    const isDentist = accountType === "dentist";
    setBusy(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const nameToSave = isDentist ? data.name : data.clinicName;
      const roleData: Record<string, unknown> = {
        userId: cred.user.uid,
        role: accountType,
        accountType,
        name: nameToSave,
        email: data.email,
        phone: data.phone || null,
        clinicName: data.clinicName || null,
        city: data.city || null,
        createdAt: serverTimestamp(),
      };
      if (isDentist) {
        roleData.surname = data.surname;
        roleData.gender = data.gender;
        roleData.clinicName = data.clinicName || null;
        roleData.speciality = data.speciality || null;
      }
      await setDoc(doc(db, "user_roles", cred.user.uid), roleData);
      navigate({ to: getAccountDashboard(accountType) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("email-already-in-use")) {
        setError(ar ? "هذا البريد الإلكتروني مسجل مسبقاً" : "This email is already registered");
      } else if (msg.includes("weak-password")) {
        setError(
          ar
            ? "كلمة المرور ضعيفة جداً. استخدم 6 أحرف على الأقل."
            : "Password too weak. Use at least 6 characters.",
        );
      } else {
        setError(msg || (ar ? "حدث خطأ. حاول مرة أخرى." : "An error occurred."));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-svh bg-[oklch(0.98_0.01_250)] px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-[440px]">
        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div className="inline-flex mx-auto size-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white items-center justify-center shadow-xl shadow-sky-500/30 mb-4">
            <svg viewBox="0 0 28 28" fill="currentColor" className="size-10">
              <path d="M14 2C9.5 2 7 4.5 7 8c0 2.5.6 4 .6 6.5s-.6 5-.6 7.5c0 2.5 1.2 4 3 4s2-2 2.5-4 .6-3.5 1.5-3.5 1 1 2 3.5 1.5 4 2.5 4 3-1.5 3-4c0-2.5-.6-5-.6-7.5S21 8 21 8c0-3.5-2.5-6-7-6z" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">
            <span className="text-sky-500">Dental</span>
            <span className="text-slate-800">Hub</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            {ar
              ? "المنصة المتكاملة لأطباء وموردي طب الأسنان"
              : "The complete platform for dentists & dental suppliers"}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl mb-6">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 h-12 rounded-xl text-sm font-bold transition-all duration-300",
                mode === m
                  ? "bg-white text-slate-900 shadow-md scale-[1.02]"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50",
              )}
            >
              {m === "login"
                ? ar
                  ? "تسجيل الدخول"
                  : "Sign in"
                : ar
                  ? "إنشاء حساب"
                  : "Create account"}
            </button>
          ))}
        </div>

        {/* Account type selector */}
        <AccountTypeSelector accountType={accountType} onSelect={setAccountType} />

        {/* Form */}
        <div className="bg-white rounded-3xl border border-border p-5 shadow-sm space-y-4">
          {mode === "login" ? (
            <LoginForm
              busy={busy}
              error={error}
              onLogin={handleLogin}
              onClearError={clearError}
            />
          ) : (
            <RegisterForm
              accountType={accountType}
              busy={busy}
              error={error}
              onRegister={handleRegister}
              onClearError={clearError}
            />
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground mt-6 max-w-xs mx-auto leading-relaxed">
          {mode === "login"
            ? ar
              ? "ليس لديك حساب؟ اختر تبويب 'إنشاء حساب' أعلاه."
              : "Don't have an account? Switch to 'Create account' above."
            : ar
              ? "أول حساب يتم إنشاؤه يصبح مدير النظام تلقائياً."
              : "The first account created becomes the system admin automatically."}
        </p>
      </div>
    </div>
  );
}

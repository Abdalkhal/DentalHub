import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { auth, db } from "@/integrations/firebase/client";
import { fetchUserRoleDoc, getAccountDashboard, type LabStaffRole } from "@/lib/useAuth";
import type { AccountType } from "@/integrations/firebase/types";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { CITIES } from "@/data/offices";
import heroBg from "@/assets/login/hero-bg.jpg";
import iconDentist from "@/assets/login/icon-dentist.png";
import iconSupply from "@/assets/login/icon-supply.png";
import iconLab from "@/assets/login/icon-lab.png";
import iconImplant from "@/assets/login/icon-implant.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

// Same look as the app's login screen (native login.tsx).
const ROLES: {
  id: AccountType;
  ar: string;
  en: string;
  icon: string;
  iconHex: string;
  activeBg: string;
  activeText: string;
}[] = [
  { id: "dentist", ar: "الطبيب", en: "Dentist", icon: iconDentist, iconHex: "#0284C7", activeBg: "bg-sky-50", activeText: "text-sky-700" },
  { id: "supply", ar: "مستلزمات الأسنان", en: "Dental Supplies", icon: iconSupply, iconHex: "#059669", activeBg: "bg-emerald-50", activeText: "text-emerald-700" },
  { id: "lab", ar: "المختبرات", en: "Laboratories", icon: iconLab, iconHex: "#7C3AED", activeBg: "bg-violet-50", activeText: "text-violet-700" },
  { id: "implant", ar: "شركات الزراعة", en: "Implant Companies", icon: iconImplant, iconHex: "#D97706", activeBg: "bg-amber-50", activeText: "text-amber-700" },
];

function LoginInput({
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  icon,
  rightIcon,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  onEnter?: () => void;
}) {
  return (
    <div className="flex h-14 w-full items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition">
      {icon}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir={type === "email" || type === "password" ? "ltr" : undefined}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
      />
      {rightIcon}
    </div>
  );
}

export function AuthPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType>("dentist");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [city, setCity] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError(
        ar ? "الرجاء إدخال البريد الإلكتروني وكلمة المرور" : "Please enter email and password",
      );
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError(ar ? "الرجاء إدخال الاسم" : "Please enter your name");
      return;
    }
    if (mode === "signup" && accountType === "dentist" && !gender) {
      setError(ar ? "الرجاء اختيار الجنس" : "Please select your gender");
      return;
    }
    if (mode === "signup" && password.trim().length < 6) {
      setError(
        ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters",
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (mode === "signin") {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const roleDoc = await fetchUserRoleDoc(cred.user.uid);
        if (!roleDoc) {
          // Invited lab staff (designers/ceramists added from "كادر
          // المختبر") deliberately have no `user_roles` doc — only a custom
          // claim set server-side by `inviteLabMember`. Check that before
          // concluding there's no account at all.
          const staffClaims = (await cred.user.getIdTokenResult()).claims as {
            role?: LabStaffRole;
            labId?: string;
          };
          const isLabStaff =
            accountType === "lab" &&
            !!staffClaims.labId &&
            ["ADMIN", "DESIGNER", "TECHNICIAN"].includes(staffClaims.role ?? "");
          if (isLabStaff) {
            navigate({ to: "/designer" });
            return;
          }
          setError(
            ar
              ? "لم يتم العثور على صلاحيات لهذا الحساب. يرجى التسجيل أولاً."
              : "No role found for this account. Please register first.",
          );
          await auth.signOut();
          setBusy(false);
          return;
        }
        if (roleDoc.accountType !== accountType) {
          setError(
            ar
              ? "عذراً، هذا الحساب غير مسجل تحت هذا النوع. يرجى اختيار نوع الحساب الصحيح."
              : "Sorry, this account is not registered under this type. Please select the correct account type.",
          );
          await auth.signOut();
          setBusy(false);
          return;
        }
        navigate({ to: getAccountDashboard(roleDoc.role) });
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const roleData: Record<string, unknown> = {
          userId: cred.user.uid,
          role: accountType,
          accountType,
          name: name.trim(),
          email: email.trim(),
          city: city || null,
          createdAt: serverTimestamp(),
        };
        if (accountType === "dentist") {
          roleData.surname = title.trim() || null;
          roleData.gender = gender;
          roleData.clinicName = clinicName.trim() || null;
        }
        await setDoc(doc(db, "user_roles", cred.user.uid), roleData);
        navigate({ to: getAccountDashboard(accountType) });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (
        msg.includes("invalid-credential") ||
        msg.includes("user-not-found") ||
        msg.includes("wrong-password")
      ) {
        setError(ar ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Invalid email or password");
      } else if (msg.includes("email-already-in-use")) {
        setError(ar ? "هذا البريد الإلكتروني مسجل مسبقاً" : "This email is already registered");
      } else if (msg.includes("weak-password")) {
        setError(ar ? "كلمة المرور ضعيفة جداً" : "Password too weak");
      } else if (msg.includes("too-many-requests")) {
        setError(
          ar ? "طلبات كثيرة جداً. حاول مرة أخرى لاحقاً." : "Too many attempts. Try again later.",
        );
      } else if (msg.includes("network-request-failed")) {
        setError(
          ar
            ? "تعذر الاتصال بخوادم المصادقة. تحقق من اتصال الإنترنت، وأوقف مانع الإعلانات (مثل uBlock أو Brave Shield) مؤقتاً، وحاول في وضع التصفح المتخفي."
            : "Could not reach the authentication servers. Check your internet connection, temporarily disable any ad blocker (e.g. uBlock / Brave Shield), and try in an incognito window.",
        );
      } else {
        setError(msg || (ar ? "حدث خطأ. حاول مرة أخرى." : "An error occurred."));
      }
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError(ar ? "أدخل بريدك الإلكتروني أولاً" : "Enter your email first");
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success(
        ar ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك" : "Password reset link sent to your email",
      );
    } catch {
      toast.error(
        ar
          ? "تعذر إرسال رابط إعادة التعيين — تحقق من البريد الإلكتروني"
          : "Could not send reset link — check the email",
      );
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-svh bg-white md:bg-slate-100 md:flex md:items-center md:justify-center md:p-8" dir={ar ? "rtl" : "ltr"}>
      <div className="w-full md:max-w-[440px] md:overflow-hidden md:rounded-[32px] md:shadow-2xl bg-white">
        {/* Hero — the banner already carries the logo and welcome text. */}
        <div className="h-[260px] w-full overflow-hidden">
          <img src={heroBg} alt="Dent Hub" className="size-full object-cover" />
        </div>

        {/* Sheet */}
        <div className="relative -mt-6 rounded-t-[32px] bg-white px-5 pb-10 pt-7 shadow-[0_-6px_16px_rgba(15,23,42,0.08)]">
          <p className="mb-3 text-center text-xs font-bold text-slate-400">
            {ar ? "اختر نوع حسابك للمتابعة" : "Choose your account type to continue"}
          </p>
          <div className="mb-6 flex justify-between gap-2">
            {ROLES.map((opt) => {
              const active = accountType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAccountType(opt.id);
                    clearError();
                  }}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "size-14 flex items-center justify-center overflow-hidden rounded-2xl border-2 transition",
                      active ? opt.activeBg : "border-transparent bg-slate-50 hover:bg-slate-100",
                    )}
                    style={active ? { borderColor: opt.iconHex } : undefined}
                  >
                    <img src={opt.icon} alt="" className="size-[34px] object-contain" />
                  </span>
                  <span
                    className={cn(
                      "text-center text-[10px] font-bold leading-tight",
                      active ? opt.activeText : "text-slate-500",
                    )}
                  >
                    {ar ? opt.ar : opt.en}
                  </span>
                </button>
              );
            })}
          </div>

          {mode === "signup" && (
            <div className="mb-3 space-y-3">
              <LoginInput
                value={name}
                onChange={(v) => {
                  setName(v);
                  clearError();
                }}
                placeholder={
                  accountType === "dentist"
                    ? ar
                      ? "الاسم الكامل"
                      : "Full name"
                    : ar
                      ? "اسم المكتب / الشركة / المختبر"
                      : "Office / Company / Lab name"
                }
                icon={<User className="size-[18px] text-slate-400" />}
              />

              {accountType === "dentist" && (
                <>
                  <LoginInput
                    value={title}
                    onChange={setTitle}
                    placeholder={ar ? "اللقب (اختياري)" : "Surname (optional)"}
                  />
                  <div>
                    <p className="mb-2 px-1 text-xs font-semibold text-slate-500">{ar ? "الجنس" : "Gender"}</p>
                    <div className="flex gap-2">
                      {(["male", "female"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setGender(g);
                            clearError();
                          }}
                          className={cn(
                            "h-12 flex-1 rounded-full border-2 text-sm font-semibold transition",
                            gender === g
                              ? "border-sky-500 bg-sky-50 text-sky-700"
                              : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100",
                          )}
                        >
                          {g === "male" ? (ar ? "ذكر" : "Male") : ar ? "أنثى" : "Female"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <LoginInput
                    value={clinicName}
                    onChange={setClinicName}
                    placeholder={ar ? "اسم العيادة (اختياري)" : "Clinic name (optional)"}
                  />
                </>
              )}

              <div>
                <p className="mb-2 px-1 text-xs font-semibold text-slate-500">
                  {ar ? "المحافظة / المدينة" : "Governorate / City"}
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {CITIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCity(c.id)}
                      className={cn(
                        "h-8 shrink-0 rounded-full border px-3 text-[11px] font-bold transition",
                        city === c.id
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {ar ? c.ar : c.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <LoginInput
              type="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                clearError();
              }}
              placeholder={ar ? "رقم الهاتف / البريد الإلكتروني" : "Phone number / Email"}
              autoComplete="email"
              icon={<Mail className="size-[18px] text-slate-400" />}
            />
            <LoginInput
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(v) => {
                setPassword(v);
                clearError();
              }}
              onEnter={handleSubmit}
              placeholder={ar ? "كلمة المرور" : "Password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              icon={<Lock className="size-[18px] text-slate-400" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={ar ? "إظهار كلمة المرور" : "Show password"}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
                </button>
              }
            />
          </div>

          {mode === "signin" && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={forgotPassword}
                disabled={resetBusy}
                className="text-xs font-bold text-primary hover:underline disabled:opacity-60"
              >
                {resetBusy ? (ar ? "جارٍ الإرسال..." : "Sending...") : ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold leading-relaxed text-rose-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className={cn(
              "mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white transition",
              busy
                ? "bg-slate-300"
                : "bg-[#2563EB] shadow-[0_6px_14px_rgba(37,99,235,0.3)] hover:bg-[#1D4ED8] active:scale-[0.98]",
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? (ar ? "تسجيل الدخول" : "Sign in") : ar ? "إنشاء حساب" : "Sign up"}
                {ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </>
            )}
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">{ar ? "أو" : "or"}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                clearError();
              }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-primary/30 text-sm font-bold text-primary hover:bg-primary/5 transition"
            >
              <User className="size-4" />
              {ar ? "إنشاء حساب جديد" : "Create new account"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                clearError();
              }}
              className="w-full py-2 text-center text-xs font-semibold text-slate-500"
            >
              {ar ? "لديك حساب بالفعل؟ " : "Already have an account? "}
              <span className="font-bold text-primary">{ar ? "تسجيل الدخول" : "Sign in"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

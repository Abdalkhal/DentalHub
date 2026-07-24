import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode, useEffect } from "react";
import { Lock, Mail, Loader2, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { CITIES } from "@/data/offices";
import { DENTAL_SPECIALITIES } from "@/lib/constants/dentalSpecialities";
import { auth, db } from "@/integrations/firebase/client";
import type { AccountType } from "@/integrations/firebase/types";
import { fetchUserRoleDoc, getAccountDashboard } from "@/lib/useAuth";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <ellipse
        cx="20"
        cy="19"
        rx="8"
        ry="11"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M20 8c-4 0-6.5 1.2-8 2.8C10.5 12.4 10 14.2 10 15.5c0 1.8.4 3 .8 4.5.4 1.5.6 2.8.7 4.5.2 2.2.5 4.5 1.2 6.5.35 1 .8 1.8 1.3 2.3.5.5 1.1.7 1.8.7.73 0 1.3-.4 1.7-1 .4-.6.7-1.5.9-2.5.2-1 .4-2 .7-2.8.3-.8.8-1.2 1.6-1.2s1.3.4 1.6 1.2c.3.8.5 1.8.7 2.8.2 1 .5 1.9.9 2.5.4.6.97 1 1.7 1 .7 0 1.3-.2 1.8-.7.5-.5.95-1.3 1.3-2.3.7-2 1-4.3 1.2-6.5.1-1.7.3-3 .7-4.5.4-1.5.8-2.7.8-4.5 0-1.3-.5-3.1-2-4.7C26.5 9.2 24 8 20 8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M15 16c1-.8 2.8-1.2 5-1.2s4 .4 5 1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

function SupplyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <rect
        x="6"
        y="13"
        width="28"
        height="21"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M11 13V9a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 29 9v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 19v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 23h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LabIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <path
        d="M4 30h32"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M8 30c-1.3 0-2-.9-2-2 0-1.3.5-2.2.5-3.5 0-1.2-.4-2-.4-3 0-2 1.9-3.5 4.2-3.5s4.2 1.5 4.2 3.5c0 1-.4 1.8-.4 3 0 1.3.5 2.2.5 3.5 0 1.1-.7 2-2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M16 30c-1.4 0-2.2-1-2.2-2.2 0-1.4.6-2.4.6-3.8 0-1.3-.5-2.2-.5-3.4 0-2.2 2.1-3.9 4.6-3.9s4.6 1.7 4.6 3.9c0 1.2-.5 2.1-.5 3.4 0 1.4.6 2.4.6 3.8 0 1.2-.8 2.2-2.2 2.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.05"
      />
      <path
        d="M25 30c-1.3 0-2-.9-2-2 0-1.3.5-2.2.5-3.5 0-1.2-.4-2-.4-3 0-2 1.9-3.5 4.2-3.5s4.2 1.5 4.2 3.5c0 1-.4 1.8-.4 3 0 1.3.5 2.2.5 3.5 0 1.1-.7 2-2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.05"
      />
    </svg>
  );
}

function ImplantIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <path
        d="M13 14c0-3.2 2.6-5.8 5.8-5.8h2.4c3.2 0 5.8 2.6 5.8 5.8 0 1.4-.4 2.3-.4 3.5 0 1 .4 1.7-.2 2.3-.6.6-1.5.5-2.3.5h-5.8c-.8 0-1.7.1-2.3-.5-.6-.6-.2-1.3-.2-2.3 0-1.2-.4-2.1-.4-3.5z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path d="M15 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M15.5 22l-1.2 11c-.1.9.5 1.7 1.4 1.7h8.3c.9 0 1.5-.8 1.4-1.7L24.5 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.4 27h9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.8 31.5h8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regName, setRegName] = useState("");
  const [regSurname, setRegSurname] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regClinicName, setRegClinicName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regClinicNameDentist, setRegClinicNameDentist] = useState("");
  const [regSpeciality, setRegSpeciality] = useState("");

  const clearError = () => setError(null);

  useEffect(() => {
    setError(null);
  }, [mode, accountType]);

  useEffect(() => {
    if (accountType !== "dentist") {
      setRegName("");
      setRegSurname("");
      setRegGender("");
    }
  }, [accountType]);

  const options: {
    id: AccountType;
    arLabel: string;
    enLabel: string;
    arDesc: string;
    enDesc: string;
    icon: (p: { className?: string }) => ReactNode;
    color: string;
  }[] = [
    {
      id: "dentist",
      arLabel: "طبيب أسنان",
      enLabel: "Dentist",
      arDesc: "تصفح المواد واطلب من المكاتب",
      enDesc: "Browse supplies & order from offices",
      icon: ToothIcon,
      color: "sky",
    },
    {
      id: "supply",
      arLabel: "مكتب مستلزمات",
      enLabel: "Supplies Office",
      arDesc: "أدر منتجاتك وعروضك وطلباتك",
      enDesc: "Manage your products, offers & orders",
      icon: SupplyIcon,
      color: "emerald",
    },
    {
      id: "lab",
      arLabel: "مختبر",
      enLabel: "Laboratory",
      arDesc: "استلم وتابع حالات الأطباء",
      enDesc: "Receive & track dentist cases",
      icon: LabIcon,
      color: "violet",
    },
    {
      id: "implant",
      arLabel: "شركة زرعات",
      enLabel: "Implant Company",
      arDesc: "أدر علاماتك التجارية ومنتجاتك",
      enDesc: "Manage your brands & products",
      icon: ImplantIcon,
      color: "amber",
    },
  ];

  const handleLogin = async () => {
    if (loginEmail.trim().length < 5 || loginPassword.trim().length < 4) {
      setError(
        ar ? "الرجاء إدخال البريد الإلكتروني وكلمة المرور" : "Please enter your email and password",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const roleDoc = await fetchUserRoleDoc(cred.user.uid);
      if (!roleDoc) {
        setError(
          ar
            ? "لم يتم العثور على صلاحيات لهذا الحساب. يرجى التسجيل أولاً."
            : "No role found for this account. Please register first.",
        );
        await auth.signOut();
        setBusy(false);
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

  const handleRegister = async () => {
    const isDentist = accountType === "dentist";
    if (isDentist && regName.trim().length < 2) {
      setError(ar ? "الرجاء إدخال الاسم" : "Please enter your name");
      return;
    }
    if (regEmail.trim().length < 5) {
      setError(ar ? "الرجاء إدخال بريد إلكتروني صحيح" : "Please enter a valid email");
      return;
    }
    if (regPassword.trim().length < 6) {
      setError(
        ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      const nameToSave = isDentist ? regName.trim() : regClinicName.trim();
      const roleData: Record<string, unknown> = {
        userId: cred.user.uid,
        role: accountType,
        accountType,
        name: nameToSave,
        email: regEmail.trim(),
        phone: regPhone.trim() || null,
        clinicName: regClinicName.trim() || null,
        city: regCity || null,
        createdAt: serverTimestamp(),
      };
      if (isDentist) {
        roleData.surname = regSurname.trim();
        roleData.gender = regGender;
        roleData.clinicName = regClinicNameDentist.trim() || null;
        roleData.speciality = regSpeciality || null;
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

  const colorMap: Record<
    string,
    { bg: string; ring: string; text: string; border: string; icon: string; glow: string }
  > = {
    sky: {
      bg: "bg-sky-50",
      ring: "ring-sky-500",
      text: "text-sky-700",
      border: "border-sky-500",
      icon: "text-sky-500",
      glow: "shadow-sky-500/25",
    },
    emerald: {
      bg: "bg-emerald-50",
      ring: "ring-emerald-500",
      text: "text-emerald-700",
      border: "border-emerald-500",
      icon: "text-emerald-500",
      glow: "shadow-emerald-500/25",
    },
    violet: {
      bg: "bg-violet-50",
      ring: "ring-violet-500",
      text: "text-violet-700",
      border: "border-violet-500",
      icon: "text-violet-500",
      glow: "shadow-violet-500/25",
    },
    amber: {
      bg: "bg-amber-50",
      ring: "ring-amber-500",
      text: "text-amber-700",
      border: "border-amber-500",
      icon: "text-amber-500",
      glow: "shadow-amber-500/25",
    },
  };

  const activeColor = colorMap[options.find((o) => o.id === accountType)?.color ?? "sky"];

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
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-sky-400" />
            {ar ? "نوع الحساب" : "Account type"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const active = accountType === opt.id;
              const c = colorMap[opt.color];
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAccountType(opt.id)}
                  className={cn(
                    "group flex flex-col items-center gap-2.5 rounded-2xl px-3 py-5 border-2 transition-all duration-300 ease-out",
                    active
                      ? `${c.bg} ${c.border} shadow-md scale-[1.03]`
                      : "border-transparent bg-slate-50 hover:bg-slate-100 hover:border-slate-200 hover:scale-[1.02]",
                  )}
                >
                  <div
                    className={cn(
                      "size-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                      active
                        ? `${c.bg} ring-2 ${c.ring} ${c.glow} shadow-lg`
                        : "bg-white ring-1 ring-slate-200 group-hover:ring-slate-300",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-8 transition-all duration-300",
                        active ? `${c.icon}` : "text-slate-400 group-hover:text-slate-600",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold leading-tight text-center transition-colors duration-300",
                      active ? `${c.text}` : "text-slate-600",
                    )}
                  >
                    {ar ? opt.arLabel : opt.enLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight text-center px-0.5 opacity-70">
                    {ar ? opt.arDesc : opt.enDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl border border-border p-5 shadow-sm space-y-4">
          {mode === "login" ? (
            <>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  dir="ltr"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    clearError();
                  }}
                  placeholder={ar ? "البريد الإلكتروني" : "Email"}
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                  autoComplete="username"
                />
              </div>

              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  dir="ltr"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    clearError();
                  }}
                  placeholder={ar ? "كلمة المرور" : "Password"}
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-12 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </>
          ) : (
            <>
              {accountType === "dentist" ? (
                <>
                  <div className="relative">
                    <User className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                    <input
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        clearError();
                      }}
                      placeholder={ar ? "الاسم الكامل" : "Full name"}
                      className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                    />
                  </div>

                  <div className="relative">
                    <User className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                    <input
                      value={regSurname}
                      onChange={(e) => {
                        setRegSurname(e.target.value);
                        clearError();
                      }}
                      placeholder={ar ? "اللقب (اختياري)" : "Surname (optional)"}
                      className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                    />
                  </div>

                  <div className="flex gap-2">
                    {(["male", "female"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setRegGender(g)}
                        className={cn(
                          "flex-1 h-12 rounded-xl text-sm font-semibold border-2 transition-all duration-300",
                          regGender === g
                            ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm scale-[1.02]"
                            : "border-transparent bg-slate-50 text-slate-500 hover:bg-sky-50/30 hover:border-sky-200",
                        )}
                      >
                        {g === "male" ? (ar ? "ذكر" : "Male") : ar ? "أنثى" : "Female"}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      value={regClinicNameDentist}
                      onChange={(e) => {
                        setRegClinicNameDentist(e.target.value);
                        clearError();
                      }}
                      placeholder={ar ? "اسم العيادة" : "Clinic name"}
                      className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={regSpeciality}
                      onChange={(e) => {
                        setRegSpeciality(e.target.value);
                        clearError();
                      }}
                      className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 appearance-none"
                    >
                      <option value="">{ar ? "التخصص" : "Speciality"}</option>
                      {DENTAL_SPECIALITIES.map((s, i) => (
                        <option key={i} value={s.en}>
                          {ar ? s.ar : s.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <input
                    value={regClinicName}
                    onChange={(e) => {
                      setRegClinicName(e.target.value);
                      clearError();
                    }}
                    placeholder={
                      ar ? "اسم المكتب / المختبر / الشركة" : "Office / Lab / Company name"
                    }
                    className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                  />
                </div>
              )}

              {accountType !== "dentist" && (
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none"
                  >
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  <input
                    type="tel"
                    dir="ltr"
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value);
                      clearError();
                    }}
                    placeholder={ar ? "رقم الهاتف" : "Phone number"}
                    className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                  />
                </div>
              )}

              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <select
                  value={regCity}
                  onChange={(e) => {
                    setRegCity(e.target.value);
                    clearError();
                  }}
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 appearance-none"
                >
                  <option value="">{ar ? "المحافظة / المدينة" : "Governorate / City"}</option>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {ar ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  dir="ltr"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    clearError();
                  }}
                  placeholder={ar ? "البريد الإلكتروني" : "Email"}
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input
                  type={showRegPassword ? "text" : "password"}
                  dir="ltr"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    clearError();
                  }}
                  placeholder={
                    ar ? "كلمة المرور (6 أحرف على الأقل)" : "Password (min 6 characters)"
                  }
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-12 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </>
          )}

          {error && (
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-center text-xs font-semibold leading-relaxed border animate-in fade-in slide-in-from-top-2",
                error.includes("خطأ") ||
                  error.includes("غير") ||
                  error.includes("Invalid") ||
                  error.includes("incorrect") ||
                  error.includes("weak") ||
                  error.includes("registered")
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200",
              )}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={mode === "login" ? handleLogin : handleRegister}
            disabled={busy}
            className={cn(
              "w-full h-14 rounded-2xl font-display font-bold text-base transition-all duration-300 flex items-center justify-center gap-2",
              busy
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 active:scale-[0.98] shadow-lg shadow-sky-500/25",
            )}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
            {busy
              ? ar
                ? "جارٍ المعالجة…"
                : "Working…"
              : mode === "login"
                ? ar
                  ? "تسجيل الدخول"
                  : "Sign in"
                : ar
                  ? "إنشاء حساب"
                  : "Sign up"}
          </button>
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

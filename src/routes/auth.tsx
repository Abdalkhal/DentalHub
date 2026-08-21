import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { auth, db } from "@/integrations/firebase/client";
import { fetchUserRoleDoc, getAccountDashboard } from "@/lib/useAuth";
import type { AccountType } from "@/integrations/firebase/types";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { CITIES } from "@/data/offices";
import { DENTAL_SPECIALITIES } from "@/lib/constants/dentalSpecialities";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const ACCOUNT_OPTIONS: {
  id: AccountType;
  arLabel: string;
  enLabel: string;
  arDesc: string;
  enDesc: string;
  color: string;
}[] = [
  {
    id: "dentist",
    arLabel: "طبيب أسنان",
    enLabel: "Dentist",
    arDesc: "تصفح المواد واطلب من المكاتب",
    enDesc: "Browse supplies & order from offices",
    color: "sky",
  },
  {
    id: "supply",
    arLabel: "مكتب مستلزمات",
    enLabel: "Supplies Office",
    arDesc: "أدر منتجاتك وعروضك وطلباتك",
    enDesc: "Manage your products, offers & orders",
    color: "emerald",
  },
  {
    id: "lab",
    arLabel: "مختبر",
    enLabel: "Laboratory",
    arDesc: "استلم وتابع حالات الأطباء",
    enDesc: "Receive & track dentist cases",
    color: "violet",
  },
  {
    id: "implant",
    arLabel: "شركة زرعات",
    enLabel: "Implant Company",
    arDesc: "أدر علاماتك التجارية ومنتجاتك",
    enDesc: "Manage your brands & products",
    color: "amber",
  },
];

const COLOR_MAP: Record<
  string,
  { bg: string; ring: string; text: string; border: string; icon: string; glow: string }
> = {
  sky: {
    bg: "bg-sky-50",
    ring: "ring-sky-500",
    text: "text-sky-700",
    border: "border-sky-500",
    icon: "text-sky-500",
    glow: "shadow-sky-500/20",
  },
  emerald: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-500",
    text: "text-emerald-700",
    border: "border-emerald-500",
    icon: "text-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  violet: {
    bg: "bg-violet-50",
    ring: "ring-violet-500",
    text: "text-violet-700",
    border: "border-violet-500",
    icon: "text-violet-500",
    glow: "shadow-violet-500/20",
  },
  amber: {
    bg: "bg-amber-50",
    ring: "ring-amber-500",
    text: "text-amber-700",
    border: "border-amber-500",
    icon: "text-amber-500",
    glow: "shadow-amber-500/20",
  },
};

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <ellipse
        cx="16"
        cy="15"
        rx="6.5"
        ry="9"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M16 6c-3.2 0-5.3 1-6.5 2.3-1.2 1.3-1.6 2.7-1.6 3.7 0 1.5.3 2.5.6 3.7.3 1.2.5 2.3.6 3.7.2 1.8.4 3.7 1 5.3.3.8.7 1.5 1.1 1.9.4.4.9.6 1.5.6.6 0 1.1-.3 1.4-.8.3-.5.6-1.2.7-2 .2-.8.3-1.7.6-2.3.2-.7.7-1 1.3-1s1.1.3 1.3 1c.3.6.4 1.5.6 2.3.1.8.4 1.5.7 2 .3.5.8.8 1.4.8.6 0 1.1-.2 1.5-.6.4-.4.8-1.1 1.1-1.9.6-1.6.9-3.5 1-5.3.1-1.4.3-2.5.6-3.7.3-1.2.6-2.2.6-3.7 0-1-.4-2.4-1.6-3.7C21.3 7 19.2 6 16 6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 13c1-.7 2.3-1 4-1s2.8.3 4 1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

function SupplyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect
        x="5"
        y="10"
        width="22"
        height="17"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M9 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M16 15v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LabIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M3 24h26"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M7 24c-1.1 0-1.7-.8-1.7-1.7 0-1.1.4-1.9.4-3 0-1-.3-1.6-.3-2.5 0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3c0 .9-.3 1.5-.3 2.5 0 1.1.4 1.9.4 3 0 .9-.6 1.7-1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
      <path
        d="M13.5 24c-1.2 0-1.8-.8-1.8-1.8 0-1.2.5-2 .5-3.2 0-1.1-.4-1.8-.4-2.8 0-1.8 1.8-3.2 3.8-3.2s3.8 1.4 3.8 3.2c0 1-.4 1.7-.4 2.8 0 1.2.5 2 .5 3.2 0 1-.6 1.8-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.04"
      />
      <path
        d="M20.5 24c-1.1 0-1.7-.8-1.7-1.7 0-1.1.4-1.9.4-3 0-1-.3-1.6-.3-2.5 0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3c0 .9-.3 1.5-.3 2.5 0 1.1.4 1.9.4 3 0 .9-.6 1.7-1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.04"
      />
    </svg>
  );
}

function ImplantIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M10.5 11c0-2.8 2.2-5 5-5h1c2.8 0 5 2.2 5 5 0 1.2-.3 2-.3 3 0 .9.3 1.5-.2 2-.5.5-1.3.4-2 .4h-5c-.7 0-1.5.1-2-.4-.5-.5-.2-1.1-.2-2 0-1-.3-1.8-.3-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path d="M12.5 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M13 18.5l-1 9.5c-.1.8.4 1.5 1.2 1.5h7.1c.8 0 1.3-.7 1.2-1.5L20.5 18.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 23h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13.4 27h5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<AccountType, (p: { className?: string }) => React.JSX.Element> = {
  dentist: ToothIcon,
  supply: SupplyIcon,
  lab: LabIcon,
  implant: ImplantIcon,
};

function AuthPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType>("dentist");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);
  const activeColor = COLOR_MAP[ACCOUNT_OPTIONS.find((o) => o.id === accountType)?.color ?? "sky"];

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
    if (mode === "signup" && accountType === "dentist" && !dob.trim()) {
      setError(ar ? "الرجاء إدخال تاريخ الميلاد" : "Please enter your date of birth");
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
          roleData.surname = title.trim();
          roleData.gender = gender;
          roleData.dob = dob;
          roleData.clinicName = clinicName.trim() || null;
          roleData.speciality = speciality || null;
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

  return (
    <MobileShell>
      <TopBar title={ar ? "تسجيل الدخول" : "Sign in"} showBack />
      <div className="px-4 pt-2">
        <p className="text-xs text-muted-foreground text-center leading-relaxed bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          {ar
            ? "يمكنك تسجيل الدخول باستخدام رقم الهاتف أو البريد الإلكتروني"
            : "You can sign in using your phone number or email"}
        </p>
      </div>
      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Account type selector — 4 cards */}
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-sky-400" />
            {ar ? "نوع الحساب" : "Account type"}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {ACCOUNT_OPTIONS.map((opt) => {
              const active = accountType === opt.id;
              const c = COLOR_MAP[opt.color];
              const Icon = ICONS[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAccountType(opt.id);
                    clearError();
                  }}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-2xl px-2 py-4 border-2 transition-all duration-300 ease-out",
                    active
                      ? `${c.bg} ${c.border} shadow-md scale-[1.03]`
                      : "border-transparent bg-slate-50 hover:bg-slate-100 hover:border-slate-200 hover:scale-[1.02]",
                  )}
                >
                  <div
                    className={cn(
                      "size-11 rounded-xl flex items-center justify-center transition-all duration-300",
                      active
                        ? `${c.bg} ring-2 ${c.ring} ${c.glow} shadow-lg`
                        : "bg-white ring-1 ring-slate-200 group-hover:ring-slate-300",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-7 transition-all duration-300",
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
                  <span className="text-[10px] text-muted-foreground/70 leading-tight text-center">
                    {ar ? opt.arDesc : opt.enDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign in / Sign up tabs */}
        <div className="flex gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                clearError();
              }}
              className={cn(
                "flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-300",
                mode === m
                  ? "bg-white text-slate-900 shadow-md scale-[1.02]"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50",
              )}
            >
              {m === "signin"
                ? ar
                  ? "تسجيل دخول"
                  : "Sign in"
                : ar
                  ? "إنشاء حساب"
                  : "Create account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-3">
          {mode === "signup" && (
            <>
              <div className="relative">
                <User className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
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
                  className="w-full h-12 rounded-xl bg-slate-50 border border-border ps-10 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>

              {accountType === "dentist" && (
                <>
                  <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        clearError();
                      }}
                      placeholder={
                        ar
                          ? "اللقب (اختياري) - أدخل اللقب أو اسم العشيرة"
                          : "Last name (optional) — enter surname or family name"
                      }
                      className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block px-1">
                      {ar ? "الجنس" : "Gender"}
                    </label>
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
                            "flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition-all duration-300",
                            gender === g
                              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm scale-[1.02]"
                              : "border-transparent bg-slate-50 text-slate-500 hover:bg-sky-50/30 hover:border-sky-200",
                          )}
                        >
                          {g === "male" ? (ar ? "ذكر" : "Male") : ar ? "أنثى" : "Female"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block px-1">
                      {ar ? "تاريخ الميلاد" : "Date of birth"}
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => {
                        setDob(e.target.value);
                        clearError();
                      }}
                      className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      value={clinicName}
                      onChange={(e) => {
                        setClinicName(e.target.value);
                        clearError();
                      }}
                      placeholder={ar ? "اسم العيادة" : "Clinic name"}
                      className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                    <select
                      value={speciality}
                      onChange={(e) => {
                        setSpeciality(e.target.value);
                        clearError();
                      }}
                      className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition appearance-none"
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
              )}

              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    clearError();
                  }}
                  className="w-full h-12 rounded-xl bg-slate-50 border border-border ps-10 pe-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition appearance-none"
                >
                  <option value="">{ar ? "المحافظة / المدينة" : "Governorate / City"}</option>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {ar ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              placeholder={ar ? "رقم الهاتف / البريد الإلكتروني" : "Phone number / Email"}
              className="w-full h-12 rounded-xl bg-slate-50 border border-border ps-10 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              dir="ltr"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              placeholder={ar ? "كلمة المرور" : "Password"}
              className="w-full h-12 rounded-xl bg-slate-50 border border-border ps-10 pe-10 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {error && (
            <p
              className={cn(
                "text-xs font-semibold text-center rounded-xl px-4 py-2.5 leading-relaxed",
                error.includes("خطأ") ||
                  error.includes("غير") ||
                  error.includes("Invalid") ||
                  error.includes("incorrect") ||
                  error.includes("weak") ||
                  error.includes("registered")
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className={cn(
              "w-full h-12 rounded-xl font-display font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2",
              busy
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 active:scale-[0.98] shadow-lg shadow-sky-500/25",
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {busy
              ? ar
                ? "جارٍ المعالجة…"
                : "Working…"
              : mode === "signin"
                ? ar
                  ? "تسجيل الدخول"
                  : "Sign in"
                : ar
                  ? "إنشاء حساب"
                  : "Sign up"}
          </button>

          {mode === "signup" && (
            <p className="text-[11px] text-muted-foreground text-center">
              {ar
                ? "أول حساب يتم إنشاؤه يصبح مدير النظام تلقائياً."
                : "The first account created becomes the system admin automatically."}
            </p>
          )}
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground underline">
          {ar ? "العودة إلى الرئيسية" : "Back to home"}
        </Link>
      </div>
    </MobileShell>
  );
}

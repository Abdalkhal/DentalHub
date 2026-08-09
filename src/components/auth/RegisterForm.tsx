import { useState, useEffect } from "react";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { CITIES } from "@/data/offices";
import { DENTAL_SPECIALITIES } from "@/lib/constants/dentalSpecialities";
import type { AccountType } from "@/integrations/firebase/types";

type RegisterFormProps = {
  accountType: AccountType;
  busy: boolean;
  error: string | null;
  onRegister: (data: Record<string, string>) => Promise<void>;
  onClearError: () => void;
};

export function RegisterForm({ accountType, busy, error, onRegister, onClearError }: RegisterFormProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const isDentist = accountType === "dentist";

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [clinicNameDentist, setClinicNameDentist] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDentist) {
      setName("");
      setSurname("");
      setGender("");
    }
  }, [accountType]);

  const displayError = fieldError || error;

  const collectData = (): Record<string, string> => ({
    name: name.trim(),
    surname: surname.trim(),
    gender,
    email: email.trim(),
    password,
    clinicName: isDentist ? clinicNameDentist.trim() : clinicName.trim(),
    phone: phone.trim(),
    city,
    speciality,
  });

  const handleSubmit = async () => {
    if (isDentist && name.trim().length < 2) {
      setFieldError(ar ? "الرجاء إدخال الاسم" : "Please enter your name");
      return;
    }
    if (email.trim().length < 5) {
      setFieldError(ar ? "الرجاء إدخال بريد إلكتروني صحيح" : "Please enter a valid email");
      return;
    }
    if (password.trim().length < 6) {
      setFieldError(
        ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters",
      );
      return;
    }
    setFieldError(null);
    await onRegister(collectData());
  };

  return (
    <>
      {isDentist ? (
        <>
          <div className="relative">
            <User className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError(null);
                onClearError();
              }}
              placeholder={ar ? "الاسم الكامل" : "Full name"}
              className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
            />
          </div>

          <div className="relative">
            <User className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
            <input
              value={surname}
              onChange={(e) => {
                setSurname(e.target.value);
                setFieldError(null);
                onClearError();
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
                onClick={() => setGender(g)}
                className={cn(
                  "flex-1 h-12 rounded-xl text-sm font-semibold border-2 transition-all duration-300",
                  gender === g
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
              value={clinicNameDentist}
              onChange={(e) => {
                setClinicNameDentist(e.target.value);
                setFieldError(null);
                onClearError();
              }}
              placeholder={ar ? "اسم العيادة" : "Clinic name"}
              className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
            />
          </div>

          <div className="relative">
            <select
              value={speciality}
              onChange={(e) => {
                setSpeciality(e.target.value);
                setFieldError(null);
                onClearError();
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
            value={clinicName}
            onChange={(e) => {
              setClinicName(e.target.value);
              setFieldError(null);
              onClearError();
            }}
            placeholder={
              ar ? "اسم المكتب / المختبر / الشركة" : "Office / Lab / Company name"
            }
            className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
          />
        </div>
      )}

      {!isDentist && (
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
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFieldError(null);
              onClearError();
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
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setFieldError(null);
            onClearError();
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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
            onClearError();
          }}
          placeholder={ar ? "البريد الإلكتروني" : "Email"}
          className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
          autoComplete="email"
        />
      </div>

      <div className="relative">
        <Lock className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
        <input
          type={showPassword ? "text" : "password"}
          dir="ltr"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldError(null);
            onClearError();
          }}
          placeholder={
            ar ? "كلمة المرور (6 أحرف على الأقل)" : "Password (min 6 characters)"
          }
          className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-12 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute end-3 top-1/2 -translate-y-1/2 size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {displayError && (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-center text-xs font-semibold leading-relaxed border animate-in fade-in slide-in-from-top-2",
            displayError.includes("خطأ") ||
              displayError.includes("غير") ||
              displayError.includes("Invalid") ||
              displayError.includes("incorrect") ||
              displayError.includes("weak") ||
              displayError.includes("registered")
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-amber-50 text-amber-700 border-amber-200",
          )}
        >
          {displayError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
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
          : ar
            ? "إنشاء حساب"
            : "Sign up"}
      </button>
    </>
  );
}

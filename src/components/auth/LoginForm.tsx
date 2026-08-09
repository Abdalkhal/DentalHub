import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type LoginFormProps = {
  busy: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onClearError: () => void;
};

export function LoginForm({ busy, error, onLogin, onClearError }: LoginFormProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const displayError = fieldError || error;

  const handleSubmit = async () => {
    if (email.trim().length < 5 || password.trim().length < 4) {
      setFieldError(
        ar
          ? "الرجاء إدخال البريد الإلكتروني وكلمة المرور"
          : "Please enter your email and password",
      );
      return;
    }
    setFieldError(null);
    await onLogin(email.trim(), password);
  };

  return (
    <>
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
          autoComplete="username"
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
          placeholder={ar ? "كلمة المرور" : "Password"}
          className="w-full h-14 rounded-2xl bg-slate-50 border border-border ps-12 pe-12 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
          autoComplete="current-password"
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
            ? "تسجيل الدخول"
            : "Sign in"}
      </button>
    </>
  );
}

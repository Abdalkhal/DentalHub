// Email verification screen. A new account must confirm its email before it
// can use the app: until then this full screen replaces every page (except
// the public ones). State and actions live in lib/emailVerification.ts.
import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Check, Inbox, Loader2, LogOut, MailCheck, MousePointerClick, PencilLine, RefreshCw } from "lucide-react";
import { auth } from "@/integrations/firebase/client";
import { useUserRole } from "@/lib/useAuth";
import { checkEmail, emailError } from "@/lib/authValidation";
import {
  changeUnverifiedEmail,
  mustVerifyAccount,
  refreshVerification,
  resendSecondsLeft,
  sendVerificationEmail,
  syncVerification,
  useVerification,
} from "@/lib/emailVerification";

// Reachable without a confirmed email: sign-in itself and the public pages.
const OPEN_PATHS = [/^\/auth/, /^\/login/, /^\/book\//, /^\/privacy/];

/** Wraps the app: shows the verification screen instead of `children` when needed. */
export function VerifyEmailGate({ children }: { children: ReactNode }) {
  const { user, role } = useUserRole();
  const mustVerify = mustVerifyAccount(role as Parameters<typeof mustVerifyAccount>[0]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    syncVerification(user, mustVerify);
  }, [user, user?.emailVerified, mustVerify]);
  const v = useVerification();
  if (!v.restricted || OPEN_PATHS.some((re) => re.test(pathname))) return <>{children}</>;
  return <VerifyEmailScreen email={v.email} />;
}

function VerifyEmailScreen({ email }: { email: string }) {
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState(resendSecondsLeft());
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Tick the resend countdown, and quietly re-check every few seconds so the
  // app opens by itself once the link has been clicked (here or on a phone).
  useEffect(() => {
    const t = setInterval(() => setLeft(resendSecondsLeft()), 1000);
    const poll = setInterval(() => void refreshVerification(true), 5000);
    const onVisible = () => document.visibilityState === "visible" && void refreshVerification(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const check = async () => {
    setChecking(true);
    const ok = await refreshVerification(true);
    setChecking(false);
    if (ok) toast.success("تم تأكيد بريدك، أهلاً بك في Dent Hub ✅");
    else toast.error("لم يتم التأكيد بعد. افتح الرابط في رسالة البريد أولاً.");
  };

  const resend = async () => {
    setSending(true);
    const r = await sendVerificationEmail();
    setSending(false);
    setLeft(resendSecondsLeft());
    if (r === "sent") toast.success("أرسلنا رسالة تأكيد جديدة");
    else if (r === "too-many") toast.error("طلبات كثيرة، حاول بعد قليل");
    else if (r === "error") toast.error("تعذّر الإرسال، تحقق من الاتصال");
  };

  const change = async () => {
    const ec = checkEmail(newEmail);
    if (!ec.ok) return toast.error(emailError(ec));
    if (!password) return toast.error("أدخل كلمة المرور للتأكيد");
    setBusy(true);
    const r = await changeUnverifiedEmail(ec.email, password);
    setBusy(false);
    if (r === "sent") {
      toast.success(`أرسلنا رابط التأكيد إلى ${ec.email}`);
      setChanging(false);
      setPassword("");
    } else
      toast.error(
        r === "wrong-password" ? "كلمة المرور غير صحيحة" : r === "in-use" ? "هذا البريد مستخدم في حساب آخر" : "تعذّر تغيير البريد",
      );
  };

  const steps = [
    { Icon: Inbox, text: "افتح بريدك الإلكتروني" },
    { Icon: MousePointerClick, text: "اضغط رابط «تأكيد البريد» في رسالة Dent Hub" },
    { Icon: ArrowLeft, text: "ارجع هنا — يفتح حسابك تلقائياً" },
  ];

  return (
    <div dir="rtl" className="min-h-dvh bg-[#F4F7FB] font-arabic">
      <div className="relative overflow-hidden bg-[radial-gradient(120%_100%_at_80%_0%,#3B82F6_0%,#1D4ED8_55%,#1E3A8A_100%)] px-6 pb-20 pt-14 text-center text-white">
        <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto mb-5 size-24">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20 [animation-duration:2.4s]" />
          <span className="relative flex size-24 items-center justify-center rounded-full bg-white text-[#1D4ED8] shadow-[0_16px_40px_-14px_rgba(0,0,0,0.5)]">
            <MailCheck className="size-11" />
          </span>
        </div>
        <h1 className="relative text-2xl font-extrabold">تحقق من بريدك الإلكتروني</h1>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/85">
          لحماية حسابك، أرسلنا رابط تأكيد إلى
          <span dir="ltr" className="mt-1 block text-base font-bold text-white">
            {email}
          </span>
        </p>
      </div>

      <div className="relative mx-auto -mt-12 w-full max-w-md px-4 pb-10">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_40px_-26px_rgba(30,58,138,0.5)]">
          <ol className="space-y-3">
            {steps.map(({ Icon, text }, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Icon className="size-[18px]" />
                </span>
                <span className="text-sm font-semibold text-slate-700">{text}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] font-bold text-white shadow-[0_10px_22px_-10px_rgba(29,78,216,0.9)] disabled:opacity-60"
          >
            {checking ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} أكّدت بريدي، متابعة
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={sending || left > 0}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {left > 0 ? `إعادة الإرسال بعد ${left} ثانية` : "إعادة إرسال الرسالة"}
          </button>
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs leading-relaxed text-amber-800">
            لم تصلك خلال دقيقتين؟ تحقق من مجلد الرسائل غير المرغوبة (Spam) أو «الترويجات».
          </p>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4">
          {changing ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-800">تغيير البريد</p>
              <input
                dir="ltr"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="البريد الصحيح"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-right text-sm outline-none focus:border-sky-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور الحالية"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setChanging(false)} className="h-10 rounded-xl border border-slate-200 text-xs font-bold">
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={change}
                  disabled={busy}
                  className="flex h-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "إرسال للبريد الجديد"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-50 text-xs font-bold text-slate-700"
              >
                <PencilLine className="size-4" /> البريد خطأ؟ غيّره
              </button>
              <button
                type="button"
                onClick={() => void auth.signOut()}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-50 text-xs font-bold text-rose-600"
              >
                <LogOut className="size-4" /> تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// "Confirm your email" — the dialog opened by ensureVerified() (or the banner)
// and the reminder banner for the home screens. See lib/emailVerification.ts.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, MailCheck, MailWarning, RefreshCw, X } from "lucide-react";
import { useUserRole } from "@/lib/useAuth";
import { checkEmail, emailError } from "@/lib/authValidation";
import {
  changeUnverifiedEmail,
  closeVerifyGate,
  mustVerifyAccount,
  openVerifyGate,
  refreshVerification,
  resendSecondsLeft,
  sendVerificationEmail,
  syncVerification,
  useVerification,
} from "@/lib/emailVerification";
import { cn } from "@/lib/utils";

/** Mounted once at the root: keeps the state in step and renders the dialog. */
export function VerifyEmailHost() {
  const { user, role } = useUserRole();
  const mustVerify = mustVerifyAccount(role as Parameters<typeof mustVerifyAccount>[0]);
  useEffect(() => {
    syncVerification(user, mustVerify);
  }, [user, user?.emailVerified, mustVerify]);
  // Back from the mail app/tab: pick up a confirmation made meanwhile.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshVerification(mustVerify);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mustVerify]);
  const v = useVerification();
  return v.gateOpen && v.unverified ? <VerifyDialog email={v.email} restricted={v.restricted} mustVerify={mustVerify} /> : null;
}

function VerifyDialog({ email, restricted, mustVerify }: { email: string; restricted: boolean; mustVerify?: boolean }) {
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState(resendSecondsLeft());
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLeft(resendSecondsLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const check = async () => {
    setChecking(true);
    const ok = await refreshVerification(mustVerify);
    setChecking(false);
    if (ok) {
      toast.success("تم تأكيد بريدك، حسابك مفعّل بالكامل ✅");
      closeVerifyGate();
    } else toast.error("لم يتم التأكيد بعد. افتح الرابط في رسالة البريد ثم حاول مرة أخرى.");
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
      toast.success(`أرسلنا رابط التأكيد إلى ${ec.email}. بعد فتحه يتغير بريد حسابك إليه.`);
      setChanging(false);
      setPassword("");
    } else
      toast.error(
        r === "wrong-password" ? "كلمة المرور غير صحيحة" : r === "in-use" ? "هذا البريد مستخدم في حساب آخر" : "تعذّر تغيير البريد",
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm md:items-center md:p-6" onClick={closeVerifyGate}>
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <MailCheck className="size-7" />
          </span>
          <button type="button" onClick={closeVerifyGate} className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <X className="size-4" />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-slate-900">{restricted ? "أكّد بريدك أولاً" : "أكّد بريدك الإلكتروني"}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {restricted ? "لنشر المنتجات وإرسال الطلبات والحالات يجب تأكيد بريدك. " : ""}
          أرسلنا رابط التأكيد إلى{" "}
          <b dir="ltr" className="text-slate-900">
            {email}
          </b>
          . افتح الرسالة واضغط الرابط، ثم ارجع هنا.
        </p>
        <p className="mt-2 text-xs text-slate-500">لم تصلك؟ تحقق من مجلد الرسائل غير المرغوبة (Spam).</p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white disabled:opacity-60"
          >
            {checking ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} أكّدت بريدي
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={sending || left > 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {left > 0 ? `إعادة الإرسال بعد ${left} ث` : "إعادة إرسال الرسالة"}
          </button>
        </div>

        {changing ? (
          <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3">
            <input
              dir="ltr"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="البريد الصحيح"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور الحالية"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setChanging(false)} className="h-10 rounded-xl border border-slate-200 bg-white text-xs font-bold">
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
          <button type="button" onClick={() => setChanging(true)} className="mt-3 w-full text-center text-xs font-bold text-sky-700">
            البريد مكتوب خطأ؟ غيّره
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Reminder while the email isn't confirmed. "restricted" (in the page shell,
 * every screen) is for new accounts that can't publish yet; "reminder" (home
 * only) is the gentler nudge for older accounts, which aren't restricted.
 */
export function VerifyEmailBanner({ className, mode }: { className?: string; mode: "restricted" | "reminder" }) {
  const v = useVerification();
  if (!v.unverified || v.restricted !== (mode === "restricted")) return null;
  return (
    <button
      type="button"
      onClick={openVerifyGate}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-start",
        className,
      )}
    >
      <MailWarning className="size-5 shrink-0 text-amber-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-amber-900">أكّد بريدك الإلكتروني</span>
        <span className="block truncate text-xs text-amber-800">
          {v.restricted ? "لتفعيل النشر وإرسال الطلبات والحالات" : "لحماية حسابك واسترجاعه عند الحاجة"}
        </span>
      </span>
      <span className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">تأكيد</span>
    </button>
  );
}

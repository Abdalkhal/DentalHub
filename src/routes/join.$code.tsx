import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { JoinCodePanel } from "@/components/ClinicTeam";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { auth, db } from "@/integrations/firebase/client";
import { checkEmail, checkPassword, emailError, passwordError } from "@/lib/authValidation";
import { setClinicsStoreUser } from "@/lib/clinicsStore";
import { lookupStaffInvite, PENDING_STAFF_CODE } from "@/lib/clinicTeam";
import { sendVerificationEmail } from "@/lib/emailVerification";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";

export const Route = createFileRoute("/join/$code")({
  head: () => ({ meta: [{ title: "الانضمام إلى عيادة | Dent Hub" }, { name: "robots", content: "noindex" }] }),
  component: JoinPage,
});

const ACCOUNT_LABEL: Record<string, [string, string]> = {
  dentist: ["طبيب أسنان", "Dentist"],
  secretary: ["سكرتارية", "Secretary"],
  supply: ["مكتب مستلزمات", "Supply office"],
  implant: ["شركة زرعات", "Implant company"],
  lab: ["مختبر", "Lab"],
};

const inputCls = "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

/** A secretary's account starts here: they have none until the doctor invites them. */
function StaffSignup({ code, clinicName, ownerName, ar }: { code: string; clinicName: string; ownerName: string; ar: boolean }) {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = checkEmail(f.email);
    const passwordCheck = checkPassword(f.password);
    if (!f.name.trim()) return setError(ar ? "اكتب اسمك" : "Enter your name");
    if (!f.phone.trim()) return setError(ar ? "اكتب رقم هاتفك" : "Enter your phone number");
    if (!emailCheck.ok) return setError(emailError(emailCheck, ar));
    if (!passwordCheck.ok) return setError(passwordError(passwordCheck, ar));
    setBusy(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailCheck.email, f.password);
      localStorage.setItem(PENDING_STAFF_CODE, code);
      await setDoc(doc(db, "user_roles", cred.user.uid), {
        userId: cred.user.uid,
        role: "secretary",
        accountType: "secretary",
        name: f.name.trim(),
        phone: f.phone.trim(),
        email: emailCheck.email,
        mustVerifyEmail: true,
        city: null,
        createdAt: serverTimestamp(),
      });
      void sendVerificationEmail(cred.user);
      navigate({ to: "/secretary", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("email-already-in-use")
          ? ar ? "هذا البريد مسجل مسبقاً. سجّل الدخول به." : "This email is already registered. Sign in instead."
          : msg.includes("weak-password")
            ? ar ? "كلمة المرور ضعيفة" : "Password too weak"
            : ar ? "تعذر إنشاء الحساب. تحقق من الاتصال وحاول مجدداً" : "Couldn't create the account. Check your connection and retry",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-violet-950">{clinicName}</p>
          <p className="text-[11px] text-violet-900">{ar ? `دعوة للعمل في السكرتارية من ${ownerName}` : `Secretary invite from ${ownerName}`}</p>
        </div>
      </div>
      <input value={f.name} onChange={set("name")} placeholder={ar ? "الاسم الكامل" : "Full name"} autoComplete="name" className={inputCls} />
      <input value={f.phone} onChange={set("phone")} placeholder={ar ? "رقم الهاتف" : "Phone number"} inputMode="tel" autoComplete="tel" dir="ltr" className={inputCls} />
      <input value={f.email} onChange={set("email")} placeholder={ar ? "البريد الإلكتروني" : "Email"} type="email" autoComplete="email" dir="ltr" className={inputCls} />
      <input value={f.password} onChange={set("password")} placeholder={ar ? "كلمة المرور" : "Password"} type="password" autoComplete="new-password" dir="ltr" className={inputCls} />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : ar ? "إنشاء الحساب" : "Create account"}
      </button>
      <Link
        to="/auth"
        onClick={() => localStorage.setItem(PENDING_STAFF_CODE, code)}
        className="block py-1 text-center text-xs font-bold text-primary"
      >
        {ar ? "لدي حساب سكرتارية، تسجيل الدخول" : "I have a secretary account, sign in"}
      </Link>
    </form>
  );
}

/** Where an invite link lands. */
function JoinPage() {
  const { code } = Route.useParams();
  const upper = code.toUpperCase();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user, role, loading } = useUserRole();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ clinicName: string; ownerName: string } | null>(null);
  const [error, setError] = useState("");
  const isStaff = role?.accountType === "secretary";

  useEffect(() => {
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  // Signed out: only a secretary's invite can be answered here. A doctor signs in first.
  useEffect(() => {
    if (loading || user) return;
    lookupStaffInvite(upper)
      .then((r) => {
        if (r.secretary) setInvite({ clinicName: r.clinicName ?? "", ownerName: r.ownerName ?? "" });
        else navigate({ to: "/auth", replace: true });
      })
      .catch(() => setError(ar ? "الرمز غير صحيح أو انتهت صلاحيته" : "This code is invalid or has expired"));
  }, [loading, user, upper, ar, navigate]);

  return (
    <MobileShell wide hideBottomNav={!user || isStaff}>
      <TopBar title={ar ? "الانضمام إلى عيادة" : "Join a clinic"} showBack={!!user && !isStaff} wide />
      <div className="px-3 pt-3 pb-6 space-y-3 md:px-6 md:pt-6 lg:max-w-xl lg:mx-auto">
        {user && (
          // A link opened on a phone that's signed in to another account
          // answers as that account; say which, and let them switch.
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">{ar ? "أنت مسجل الآن باسم" : "Signed in as"}</p>
              <p className="truncate text-sm font-bold">
                {role?.name || user.email || ""}
                {role?.accountType && ACCOUNT_LABEL[role.accountType]
                  ? ` · ${ACCOUNT_LABEL[role.accountType][ar ? 0 : 1]}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-foreground hover:bg-muted"
            >
              <LogOut className="size-3.5" />
              {ar ? "حساب آخر" : "Other account"}
            </button>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          {user ? (
            <JoinCodePanel ar={ar} initialCode={upper} onJoined={isStaff ? () => navigate({ to: "/secretary" }) : undefined} />
          ) : invite ? (
            <StaffSignup code={upper} clinicName={invite.clinicName} ownerName={invite.ownerName} ar={ar} />
          ) : error ? (
            <p className="py-6 text-center text-xs font-medium text-destructive">{error}</p>
          ) : (
            <Loader2 className="mx-auto my-6 size-5 animate-spin text-primary" />
          )}
        </div>
        {user && (
          <Link to={isStaff ? "/secretary" : "/clinic/doctors"} className="block text-center text-xs font-bold text-primary">
            {isStaff ? (ar ? "فتح مساحة العمل" : "Open my workspace") : ar ? "فتح أطباء العيادة" : "Open Clinic Doctors"}
          </Link>
        )}
      </div>
    </MobileShell>
  );
}

import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import {
  LogOut,
  Settings,
  MessageCircle,
  Info,
  Users,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  MapPin,
  Phone,
  Check,
} from "lucide-react";
import { auth, db } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { storage } from "@/integrations/firebase/client";
import { doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

function getMapsUrl(role: {
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  address?: string | null;
}): string {
  if (role.mapUrl) return role.mapUrl;
  if (role.latitude != null && role.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${role.latitude},${role.longitude}`;
  }
  const addr = role.address || "Mosul, Iraq";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

export const Route = createFileRoute("/account")({
  component: Account,
});

const roleLabels: Record<string, { ar: string; en: string }> = {
  dentist: { ar: "طبيب أسنان", en: "Dentist" },
  supply: { ar: "مكتب مستلزمات", en: "Supplies Office" },
  implant: { ar: "شركة زرعات", en: "Implant Company" },
  lab: { ar: "مختبر", en: "Laboratory" },
};

function Account() {
  const { t, lang, dir } = useI18n();
  const { role, loading } = useUserRole();
  const navigate = useNavigate();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState(role?.photoURL ?? "");

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isOnAccountRoot = pathname === "/account";

  if (!isOnAccountRoot) return <Outlet />;

  const displayName = role?.name || t("account_name");
  const displayRole = role
    ? (roleLabels[role.accountType]?.[lang] ?? role.accountType)
    : lang === "ar"
      ? "طبيب أسنان"
      : "Dentist";
  const displayInitial = role?.name ? role.name.charAt(0) : lang === "ar" ? "أ" : "A";
  const displayPhone = role?.phone || null;
  const displayAddress = role?.address || null;

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !role) return;
    const file = files[0];
    setUploading(true);
    try {
      const path = `profile_pictures/${role.userId}/${crypto.randomUUID()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "user_roles", role.userId), { photoURL: url });
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
      setPhotoURL(url);
    } catch (e: any) {
      alert(
        lang === "ar" ? `فشل رفع الصورة: ${e.message || e}` : `Upload failed: ${e.message || e}`,
      );
    } finally {
      setUploading(false);
    }
  };

  const isSupplier = role?.accountType === "supply" || role?.accountType === "implant";

  const rows: Array<{
    icon: typeof Settings;
    label: string;
    tone: string;
    to?: string;
    onClick?: () => void;
  }> = [
    ...(isSupplier
      ? [
          {
            icon: Users,
            label: lang === "ar" ? "فواتير الأطباء" : "Doctor Invoices",
            tone: "bg-[oklch(0.93_0.06_220)] ring-[oklch(0.82_0.1_220)] text-[oklch(0.45_0.18_220)]",
            onClick: () => navigate({ to: "/doctor-invoices" }),
          },
        ]
      : []),
    {
      icon: Settings,
      label: t("settings"),
      tone: "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)]",
      to: "/account/settings",
    },

    {
      icon: MessageCircle,
      label: lang === "ar" ? "تواصل معنا" : "Contact us",
      tone: "bg-[oklch(0.93_0.06_85)] ring-[oklch(0.82_0.1_85)] text-[oklch(0.5_0.16_75)]",
      onClick: () => {
        setShowContact(true);
      },
    },
    {
      icon: Info,
      label: t("about"),
      tone: "bg-[oklch(0.93_0.06_300)] ring-[oklch(0.82_0.1_300)] text-[oklch(0.45_0.18_300)]",
      to: "/account/about",
    },
  ];

  const [showContact, setShowContact] = useState(false);

  const formatPhoneForDisplay = (raw: string | undefined | null): string => {
    if (!raw) return "+964 770 000 0000";
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("964") && digits.length >= 10) {
      const local = digits.slice(3);
      return `+964 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return `+${digits}`;
  };

  const getWhatsAppLink = (raw: string | undefined | null): string => {
    if (!raw) return "https://wa.me/9647700000000";
    const digits = raw.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  };

  return (
    <MobileShell>
      <TopBar title={t("tab_account")} />
      <div className="px-4 pt-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative size-14 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition group"
          >
            {photoURL ? (
              <img src={photoURL} alt="" className="size-full object-cover" />
            ) : (
              displayInitial
            )}
            <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              {uploading ? (
                <Loader2 className="size-5 text-white animate-spin" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files)}
            />
          </button>
          <div className="min-w-0">
            <p className="font-display font-bold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Phone className="size-3 shrink-0" />
              {displayPhone || (lang === "ar" ? "لم يتم إضافة رقم هاتف" : "No phone number added")}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <MapPin className="size-3 shrink-0" />
              {displayAddress ||
                (lang === "ar" ? "لم يتم تحديد العنوان بعد" : "No address set yet")}
            </p>
          </div>
        </div>

        <ul className="mt-4 bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
          {rows.map((r, i) => {
            const inner = (
              <>
                <span
                  className={`size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center ${r.tone}`}
                >
                  <r.icon className="size-5 drop-shadow-sm" strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-sm font-semibold">{r.label}</span>
                <Chevron className="size-4 text-muted-foreground" />
              </>
            );
            return (
              <li key={i}>
                {r.to ? (
                  <Link
                    to={r.to}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-accent transition-colors"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    onClick={r.onClick}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-accent transition-colors"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <button
          onClick={async () => {
            await signOut(auth);
            navigate({ to: "/login" });
          }}
          className="mt-4 w-full h-11 rounded-xl border border-destructive/30 text-destructive font-display font-bold inline-flex items-center justify-center gap-2"
        >
          <LogOut className="size-4" />
          {t("logout")}
        </button>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setShowContact(false)}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">
                {lang === "ar" ? "تواصل معنا" : "Contact us"}
              </h3>
              <button
                onClick={() => setShowContact(false)}
                className="size-9 rounded-xl bg-muted hover:bg-slate-200 flex items-center justify-center"
              >
                <Chevron className="size-4 rotate-90" />
              </button>
            </div>

            <div className="space-y-3">
              <a
                href={getWhatsAppLink(role?.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-50 hover:bg-green-100 transition"
              >
                <span className="size-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                  <Phone className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{formatPhoneForDisplay(role?.phone)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ar" ? "افتح في واتساب" : "Open in WhatsApp"}
                  </p>
                </div>
              </a>

              <a
                href={getMapsUrl(role ?? {})}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 transition-colors cursor-pointer z-50 pointer-events-auto"
              >
                <span className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {role?.address || (lang === "ar" ? "الموصل، العراق" : "Mosul, Iraq")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ar" ? "الموقع الجغرافي للمكتب" : "Office location"}
                  </p>
                </div>
              </a>
            </div>

            <button
              onClick={() => setShowContact(false)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2"
            >
              <Check className="size-5" />
              {lang === "ar" ? "تم" : "Done"}
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

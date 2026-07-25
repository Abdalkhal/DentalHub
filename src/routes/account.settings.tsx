import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/useAuth";
import { auth, db } from "@/integrations/firebase/client";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { storage } from "@/integrations/firebase/client";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  MapPin,
  Bell,
  Lock,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  Check,
  Globe,
  ChevronLeft,
  ChevronRight,
  Camera,
  DollarSign,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/account/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const { role, loading } = useUserRole();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [address, setAddress] = useState("");
  const [labDescription, setLabDescription] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapUrl, setMapUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoURL, setPhotoURL] = useState(role?.photoURL ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const localDigitsFromStored = (stored: string | undefined | null): string => {
    if (!stored) return "";
    const digits = stored.replace(/\D/g, "");
    if (digits.startsWith("964") && digits.length >= 10) return digits.slice(3).slice(-10);
    if (digits.startsWith("0")) return digits.slice(1).slice(0, 10);
    return digits.slice(0, 10);
  };

  useEffect(() => {
    if (role) {
      setName(role.name || "");
      setPhone(localDigitsFromStored(role.phone));
      setAddress(role.address || "");
      setLabDescription(role.labDescription || "");
      setNotificationsEnabled(role.notificationsEnabled !== false);
      setLatitude(role.latitude ?? null);
      setLongitude(role.longitude ?? null);
      setMapUrl(role.mapUrl || "");
      setPhotoURL(role.photoURL || "");
    }
  }, [role]);

  const handlePhoneChange = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
      setPhoneError(
        ar
          ? "الرجاء كتابة الرقم بدون الصفر في البداية"
          : "Please enter the number without leading zero",
      );
    } else {
      setPhoneError("");
    }
    if (digits.length > 10) digits = digits.slice(0, 10);
    setPhone(digits);
  };

  const handleSave = async () => {
    if (!role) return;
    if (!name.trim()) {
      toast.error(ar ? "الاسم مطلوب" : "Name is required");
      return;
    }
    if (phone && phone.length !== 10) {
      setPhoneError(ar ? "يجب إدخال 10 أرقام بالضبط" : "Exactly 10 digits required");
      return;
    }
    setSaving(true);
    try {
      const cleanPhone = phone ? "964" + phone : null;
      await updateDoc(doc(db, "user_roles", role.userId), {
        name: name.trim(),
        phone: cleanPhone,
        address: address.trim() || null,
        labDescription: labDescription.trim() || null,
        notificationsEnabled,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        mapUrl: mapUrl.trim() || null,
        updatedAt: new Date(),
      });
      await queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success(ar ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
    } catch (e: any) {
      toast.error(ar ? `فشل الحفظ: ${e.message || e}` : `Save failed: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!passwordCurrent || !passwordNew || !passwordConfirm) {
      setPasswordError(ar ? "جميع الحقول مطلوبة" : "All fields are required");
      return;
    }
    if (passwordNew.length < 6) {
      setPasswordError(
        ar
          ? "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
          : "New password must be at least 6 characters",
      );
      return;
    }
    if (passwordNew !== passwordConfirm) {
      setPasswordError(ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No user");
      const cred = EmailAuthProvider.credential(user.email, passwordCurrent);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passwordNew);
      toast.success(ar ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully");
      setShowPasswordFields(false);
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
    } catch (e: any) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setPasswordError(ar ? "كلمة المرور الحالية غير صحيحة" : "Current password is incorrect");
      } else {
        setPasswordError(
          ar ? `فشل تغيير كلمة المرور: ${e.message || e}` : `Failed: ${e.message || e}`,
        );
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeletePw, setShowDeletePw] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError(ar ? "أدخل كلمة المرور للتأكيد" : "Enter your password to confirm");
      return;
    }
    setDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No user");
      const cred = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, cred);
      if (role) await deleteDoc(doc(db, "user_roles", role.userId));
      await deleteUser(user);
      toast.success(ar ? "تم حذف الحساب بنجاح" : "Account deleted successfully");
      setShowDeleteConfirm(false);
    } catch (e: any) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setDeleteError(ar ? "كلمة المرور غير صحيحة" : "Incorrect password");
      } else if (e.code === "auth/requires-recent-login") {
        setDeleteError(
          ar
            ? "يجب تسجيل الدخول حديثاً للحذف. سجل الخروج ثم ادخل مجدداً."
            : "Please sign out and sign in again before deleting",
        );
      } else {
        setDeleteError(
          ar ? `فشل حذف الحساب: ${e.message || e}` : `Delete failed: ${e.message || e}`,
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "الإعدادات" : "Settings"} showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  const inputClass =
    "w-full h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition";

  return (
    <MobileShell>
      <TopBar title={ar ? "الإعدادات" : "Settings"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Section 1: Office Profile */}
        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "إعدادات المكتب" : "Office Profile"}
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => document.getElementById("avatar-input")?.click()}
                  disabled={uploadingPhoto}
                  className="relative size-14 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition group"
                >
                  {photoURL ? (
                    <img src={photoURL} alt="" className="size-full object-cover" />
                  ) : (
                    <span>{role?.name ? role.name.charAt(0) : ar ? "ش" : "U"}</span>
                  )}
                  <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Camera className="size-5 text-white" />
                  </span>
                </button>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSelectedFile(URL.createObjectURL(file));
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setCropModalOpen(true);
                    e.target.value = "";
                  }}
                />
                <div>
                  <p className="font-display font-bold text-sm">
                    {role?.name || (ar ? "المستخدم" : "User")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {uploadingPhoto
                      ? ar
                        ? "جارٍ رفع الصورة…"
                        : "Uploading…"
                      : ar
                        ? "اضغط على الصورة لتغييرها"
                        : "Tap the image to change it"}
                  </p>
                </div>
              </div>
              <Field
                icon={Building2}
                iconTone="bg-blue-100 text-blue-600"
                label={ar ? "اسم المكتب / المتجر" : "Store / Office Name"}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ar ? "أدخل اسم المكتب" : "Enter office name"}
                  className={inputClass}
                />
              </Field>
              <Field
                icon={Phone}
                iconTone="bg-emerald-100 text-emerald-600"
                label={ar ? "رقم الهاتف" : "Phone Number"}
              >
                <div
                  dir="ltr"
                  className="flex items-stretch rounded-xl border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary transition"
                >
                  <span className="flex items-center justify-center px-3 bg-muted/50 border-r border-border text-sm font-bold text-muted-foreground select-none rounded-s-xl">
                    +964
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder={ar ? "7701234567 (10 أرقام)" : "7701234567 (10 digits)"}
                    className="w-full h-11 bg-transparent px-4 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none text-left"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-destructive font-medium mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="size-3.5" />
                    {phoneError}
                  </p>
                )}
                {!phoneError && phone.length > 0 && phone.length < 10 && (
                  <p className="text-xs text-amber-600 font-medium mt-1.5">
                    {ar
                      ? `متبقي ${10 - phone.length} أرقام`
                      : `${10 - phone.length} digits remaining`}
                  </p>
                )}
              </Field>
              <Field
                icon={MapPin}
                iconTone="bg-amber-100 text-amber-600"
                label={ar ? "العنوان التفصيلي" : "Detailed Address"}
              >
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={ar ? "المحافظة، المنطقة / الحي" : "Governorate, Area / District"}
                  className={inputClass}
                />
              </Field>
              <Field
                icon={FileText}
                iconTone="bg-violet-100 text-violet-600"
                label={ar ? "وصف المختبر والتقنيات المستخدمة" : "Lab Description & Technologies"}
              >
                <textarea
                  value={labDescription}
                  onChange={(e) => setLabDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    ar
                      ? "اكتب وصفاً لمختبرك والتقنيات التي تستخدمها..."
                      : "Describe your lab and the technologies you use..."
                  }
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-ring/40 resize-none placeholder:text-muted-foreground/60"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Section 2: Company Location */}
        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "موقع الشركة على الخريطة" : "Company Location"}
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            <a
              href="https://www.google.com/maps/search/?api=1&query=companies"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-4 text-start hover:bg-accent transition-colors cursor-pointer"
            >
              <span className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <MapPin className="size-5" />
              </span>
              <span className="flex-1 text-sm font-semibold">
                {ar ? "تحديد موقع الشركة الحالي" : "Determine Current Company Location"}
              </span>
              {mapUrl ? (
                <span className="text-xs text-blue-600 font-medium">{ar ? "رابط" : "Link"}</span>
              ) : null}
              {dir === "rtl" ? (
                <ChevronLeft className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </a>
            <div className="border-t border-border px-4 py-3">
              <Field
                icon={Globe}
                iconTone="bg-blue-100 text-blue-600"
                label={ar ? "رابط خرائط جوجل (بديل)" : "Google Maps Link (alternative)"}
              >
                <input
                  value={mapUrl}
                  onChange={(e) => {
                    setMapUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setLatitude(null);
                      setLongitude(null);
                    }
                  }}
                  placeholder={ar ? "الصق رابط خرائط جوجل هنا" : "Paste your Google Maps link here"}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Section 3: Security */}
        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "الأمان" : "Security"}
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            <button
              onClick={() => setShowPasswordFields(!showPasswordFields)}
              className="w-full flex items-center gap-3 px-4 py-4 text-start hover:bg-accent transition-colors"
            >
              <span className="size-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Lock className="size-5" />
              </span>
              <span className="flex-1 text-sm font-semibold">
                {ar ? "تغيير كلمة المرور" : "Change Password"}
              </span>
              <span
                className="text-muted-foreground text-lg transition-transform duration-200"
                style={{ transform: showPasswordFields ? "rotate(90deg)" : "" }}
              >
                ›
              </span>
            </button>

            {showPasswordFields && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={passwordCurrent}
                    onChange={(e) => {
                      setPasswordCurrent(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder={ar ? "كلمة المرور الحالية" : "Current password"}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={passwordNew}
                    onChange={(e) => {
                      setPasswordNew(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder={ar ? "كلمة المرور الجديدة" : "New password"}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => {
                      setPasswordConfirm(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder={ar ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
                    className={inputClass}
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1">
                    <ShieldAlert className="size-3.5" />
                    {passwordError}
                  </p>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="w-full h-11 rounded-xl bg-violet-600 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {changingPassword ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {ar ? "تحديث كلمة المرور" : "Update Password"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Preferences */}
        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "التفضيلات" : "Preferences"}
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="size-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Bell className="size-5" />
              </span>
              <span className="flex-1 text-sm font-semibold">
                {ar ? "تفعيل الإشعارات" : "Enable Notifications"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  notificationsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${
                    notificationsEnabled
                      ? ar
                        ? "end-0.5"
                        : "start-[22px]"
                      : ar
                        ? "end-[22px]"
                        : "start-0.5"
                  }`}
                  style={{
                    ...(notificationsEnabled
                      ? { [ar ? "right" : "left"]: "22px" }
                      : { [ar ? "right" : "left"]: "2px" }),
                  }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Service Pricing */}
        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "إدارة أسعار الخدمات" : "Service Pricing Management"}
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            {PRICING_ITEMS.map((item, i) => (
              <PricingRow key={item.key} item={item} index={i} ar={ar} />
            ))}
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 active:scale-[0.99] transition"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {ar ? "حفظ التغييرات" : "Save Changes"}
        </button>

        {/* Section 5: Danger Zone */}
        <section>
          <p className="text-xs font-bold text-muted-foreground mb-2 px-1">
            {ar ? "إجراءات الحساب" : "Account Actions"}
          </p>
          <div className="bg-card border border-destructive/20 rounded-2xl overflow-hidden shadow-soft">
            <button
              onClick={() => {
                setShowDeleteConfirm(true);
                setDeletePassword("");
                setDeleteError("");
              }}
              className="w-full flex items-center gap-3 px-4 py-4 text-start hover:bg-destructive/5 transition-colors"
            >
              <span className="size-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-destructive">
                  {ar ? "حذف الحساب" : "Delete Account"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ar
                    ? "حذف نهائي للبيانات ولا يمكن التراجع"
                    : "Permanently delete your data. This cannot be undone."}
                </p>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-sm bg-background rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="size-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="size-5" />
                </span>
                <div>
                  <p className="font-display font-extrabold text-sm">
                    {ar ? "تأكيد حذف الحساب" : "Confirm Account Deletion"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ar ? "هذا الإجراء لا يمكن التراجع عنه" : "This action cannot be undone"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {ar
                  ? "سيتم حذف جميع بياناتك نهائياً من النظام. أدخل كلمة المرور للمتابعة."
                  : "All your data will be permanently removed. Enter your password to continue."}
              </p>

              <div className="relative">
                <input
                  type={showDeletePw ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError("");
                  }}
                  placeholder={ar ? "أدخل كلمة المرور للتأكيد" : "Enter password to confirm"}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePw(!showDeletePw)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showDeletePw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {deleteError && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-2">
                  <ShieldAlert className="size-3.5" />
                  {deleteError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-muted/40">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-border bg-card font-display font-bold text-sm hover:bg-accent transition"
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {ar ? "تأكيد الحذف" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropModalOpen && selectedFile && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => !uploadingPhoto && setCropModalOpen(false)}
        >
          <div
            className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <h3 className="font-display font-bold text-lg">{ar ? "قص الصورة" : "Crop Image"}</h3>
            </div>

            <div className="relative w-full h-80 bg-black">
              <Cropper
                image={selectedFile}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_: Area, area: Area) => setCroppedAreaPixels(area)}
              />
            </div>

            <div className="px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {ar ? "تكبير" : "Zoom"}
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setCropModalOpen(false);
                  setSelectedFile(null);
                }}
                className="flex-1 h-11 rounded-xl border border-border bg-card font-display font-bold text-sm hover:bg-accent transition"
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!croppedAreaPixels || !role) return;
                  setUploadingPhoto(true);
                  try {
                    const canvas = document.createElement("canvas");
                    const image = new Image();
                    await new Promise<void>((resolve, reject) => {
                      image.onload = () => resolve();
                      image.onerror = reject;
                      image.src = selectedFile!;
                    });
                    const size = 256;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d")!;
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    const sx = croppedAreaPixels.x;
                    const sy = croppedAreaPixels.y;
                    const sWidth = croppedAreaPixels.width;
                    const sHeight = croppedAreaPixels.height;
                    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, size, size);
                    const blob = await new Promise<Blob>((resolve) =>
                      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9),
                    );
                    const path = `profile_pictures/${role.userId}/${crypto.randomUUID()}.jpg`;
                    const storageRef = ref(storage, path);
                    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
                    const url = await getDownloadURL(storageRef);
                    await updateDoc(doc(db, "user_roles", role.userId), {
                      photoURL: url,
                      updatedAt: new Date(),
                    });
                    if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
                    await queryClient.invalidateQueries({ queryKey: ["user-role"] });
                    setPhotoURL(url);
                    setCropModalOpen(false);
                    setSelectedFile(null);
                    toast.success(ar ? "تم حفظ الصورة بنجاح" : "Image saved successfully");
                  } catch (e: any) {
                    toast.error(
                      ar ? `فشل حفظ الصورة: ${e.message || e}` : `Save failed: ${e.message || e}`,
                    );
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
                disabled={uploadingPhoto}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {uploadingPhoto ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                {ar ? "تأكيد" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

const PRICING_ITEMS = [
  { key: "zirconia", ar: "زيركون", en: "Zirconia", price: 80000 },
  { key: "emax", ar: "إيماكس", en: "E-max", price: 65000 },
  { key: "pfm", ar: "PFM", en: "PFM", price: 45000 },
  { key: "all_ceramic", ar: "سيراميك بالكامل", en: "All Ceramic", price: 55000 },
  { key: "implant_pricing", ar: "زرعات", en: "Implants", price: 120000 },
];

function PricingRow({
  item,
  index,
  ar,
}: {
  item: (typeof PRICING_ITEMS)[number];
  index: number;
  ar: boolean;
}) {
  const [value, setValue] = useState(String(item.price));
  const [editing, setEditing] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5",
        index !== PRICING_ITEMS.length - 1 && "border-b border-border",
      )}
    >
      <span className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        <DollarSign className="size-4" />
      </span>
      <span className="flex-1 text-sm font-semibold text-foreground">{ar ? item.ar : item.en}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 h-9 rounded-lg border border-border bg-card px-2 text-sm font-bold text-end focus:outline-none focus:ring-2 focus:ring-ring/40"
            autoFocus
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(false);
            }}
          />
          <span className="text-[11px] text-muted-foreground font-medium">
            {ar ? "د.ع" : "IQD"}
          </span>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-accent transition"
        >
          <span className="font-display font-extrabold text-sm text-foreground">
            {Number(value).toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {ar ? "د.ع" : "IQD"}
          </span>
        </button>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  iconTone,
  label,
  children,
}: {
  icon: typeof Building2;
  iconTone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`size-7 rounded-lg flex items-center justify-center ${iconTone}`}>
          <Icon className="size-[15px]" />
        </span>
        <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

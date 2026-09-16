import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { router } from 'expo-router';
import { Bell, Camera, Link2, Lock, MapPin, Trash2, User } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { auth, db, storage } from '@/integrations/firebase/client';
import { useUserRole } from '@/lib/useAuth';
import { randomUUID } from '@/lib/randomId';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

// h-11 previously clipped the tops/descenders of Arabic glyphs (e.g. "ق")
// on Android — a fixed-height single-line TextInput there doesn't
// vertically center its text on its own. h-12 (matching the shared Input
// component) plus an explicit textAlignVertical: 'center' on each field
// fixes it.
const inputCls = 'h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800';

export default function SettingsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { role, loading } = useUserRole();
  const isDentist = role?.accountType === 'dentist';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mapUrl, setMapUrl] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!role) return;
    setName(role.name || '');
    setPhone(role.phone || '');
    setAddress(role.address || '');
    setDescription(role.labDescription || '');
    setNotificationsEnabled(role.notificationsEnabled !== false);
    setMapUrl(role.mapUrl || '');
    setPhotoURL(role.photoURL || '');
  }, [role]);

  if (loading) return <Spinner />;
  if (!role) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-slate-500">
          {ar ? 'يجب تسجيل الدخول أولاً' : 'Please sign in first'}
        </Text>
      </Screen>
    );
  }

  const pickPhoto = async () => {
    // `allowsEditing` hands off to the OS's own native crop/adjust screen
    // (drag to reposition, pinch to zoom, drag the handles to resize) before
    // returning — the same "confirm the crop first" step social apps use —
    // instead of uploading the picked image exactly as selected. No `aspect`
    // passed on purpose: locking it to [1, 1] pinned the crop box to a fixed
    // square, which also constrained how far you could zoom/reposition a
    // photo shot from far away — leaving it free-form lets the user resize
    // and zoom the crop however they need before confirming.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (res.canceled || !res.assets?.length) return;
    setUploadingPhoto(true);
    try {
      const asset = res.assets[0];
      const path = `profile_pictures/${role.userId}/${randomUUID()}.jpg`;
      const blob = await (await fetch(asset.uri)).blob();
      await uploadBytes(ref(storage, path), blob, { contentType: asset.mimeType || 'image/jpeg' });
      const url = await getDownloadURL(ref(storage, path));
      await updateDoc(doc(db, 'user_roles', role.userId), { photoURL: url });
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
      setPhotoURL(url);
      toast.success(ar ? 'تم حفظ الصورة' : 'Photo saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error(ar ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'user_roles', role.userId), {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        labDescription: description.trim() || null,
        notificationsEnabled,
        mapUrl: mapUrl.trim() || null,
      });
      toast.success(ar ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwordCurrent || !passwordNew || !passwordConfirm) {
      toast.error(ar ? 'جميع الحقول مطلوبة' : 'All fields are required');
      return;
    }
    if (passwordNew.length < 6) {
      toast.error(ar ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
      return;
    }
    if (passwordNew !== passwordConfirm) {
      toast.error(ar ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('No user');
      const cred = EmailAuthProvider.credential(user.email, passwordCurrent);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passwordNew);
      toast.success(ar ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setShowPasswordFields(false);
      setPasswordCurrent('');
      setPasswordNew('');
      setPasswordConfirm('');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error(ar ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      ar ? 'حذف الحساب' : 'Delete account',
      ar
        ? 'سيتم حذف جميع بياناتك نهائياً من النظام. هل أنت متأكد؟'
        : 'All your data will be permanently removed. Are you sure?',
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: ar ? 'حذف' : 'Delete', style: 'destructive', onPress: deleteAccount },
      ],
    );
  };

  const deleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user');
      await deleteDoc(doc(db, 'user_roles', role.userId));
      await deleteUser(user);
      router.replace('/login');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        toast.error(
          ar
            ? 'يجب تسجيل الدخول حديثاً للحذف. سجّل الخروج ثم ادخل مجدداً.'
            : 'Please sign out and sign in again before deleting',
        );
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    }
  };

  return (
    <Screen>
      <View className="items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        <Pressable onPress={pickPhoto} disabled={uploadingPhoto} className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
          {photoURL ? (
            <Image source={{ uri: photoURL }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <User size={30} color="#3B82F6" />
          )}
          <View className="absolute bottom-0 h-6 w-full items-center justify-center bg-black/40">
            <Camera size={13} color="#FFFFFF" />
          </View>
        </Pressable>
        <Text className="text-xs text-slate-500">
          {uploadingPhoto ? (ar ? 'جارٍ رفع الصورة…' : 'Uploading…') : ar ? 'اضغط على الصورة لتغييرها' : 'Tap the photo to change it'}
        </Text>
      </View>

      <View className="mt-4 gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        <Field label={ar ? 'الاسم' : 'Name'}>
          <TextInput
            value={name}
            onChangeText={setName}
            className={inputCls}
            style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left', textAlignVertical: 'center' }}
          />
        </Field>
        <Field label={ar ? 'رقم الهاتف' : 'Phone number'}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+9647701234567"
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={{ writingDirection: 'ltr', textAlign: 'left', textAlignVertical: 'center' }}
          />
        </Field>
        <Field label={ar ? 'العنوان التفصيلي' : 'Detailed address'}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={ar ? 'المحافظة، المنطقة / الحي' : 'Governorate, area / district'}
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left', textAlignVertical: 'center' }}
          />
        </Field>
        {!isDentist && (
          <Field label={ar ? 'عن المكتب / الشركة' : 'About the store / company'}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder={ar ? 'اكتب نبذة عن مكتبك أو شركتك...' : 'Write about your store or company...'}
              placeholderTextColor="#94A3B8"
              className="min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
              style={{ textAlignVertical: 'top', writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
            />
          </Field>
        )}
      </View>

      {/* Company location: there is no in-app draggable-pin map (that needs a
          maps SDK + API key and native rebuild — a separate infrastructure
          step, ask if you want it built). What actually sets the location
          today is pasting a Google Maps link you copied after dropping a
          pin there yourself. */}
      <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
        {(!!role.address || !!mapUrl) && (
          <Pressable
            onPress={() =>
              Linking.openURL(mapUrl || role.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(role.address || '')}`)
            }
            className="flex-row items-center gap-3 border-b border-slate-100 px-4 py-3.5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <MapPin size={19} color="#D97706" />
            </View>
            <Text className="flex-1 text-sm font-bold text-slate-800">{ar ? 'عرض الموقع على الخريطة' : 'View location on map'}</Text>
          </Pressable>
        )}
        <View className="gap-1.5 px-4 py-3.5">
          <Field label={ar ? 'رابط خرائط جوجل' : 'Google Maps link'}>
            <TextInput
              value={mapUrl}
              onChangeText={setMapUrl}
              placeholder={ar ? 'الصق رابط خرائط جوجل هنا' : 'Paste your Google Maps link here'}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              className={inputCls}
              style={{ writingDirection: 'ltr', textAlign: 'left', textAlignVertical: 'center' }}
            />
          </Field>
          <View className="mt-0.5 flex-row items-start gap-1.5">
            <Link2 size={12} color="#94A3B8" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[11px] leading-relaxed text-slate-400">
              {ar
                ? 'افتح خرائط جوجل، حدّد موقعك، ثم مشاركة → نسخ الرابط، والصقه هنا واحفظ.'
                : 'Open Google Maps, pin your location, then Share → Copy link, and paste it here.'}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card px-4 py-3.5 shadow-sm">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
          <Bell size={19} color="#0284C7" />
        </View>
        <Text className="flex-1 text-sm font-bold text-slate-800">{ar ? 'تفعيل الإشعارات' : 'Enable notifications'}</Text>
        <Pressable onPress={() => setNotificationsEnabled((v) => !v)}>
          <View className={cn('h-7 w-12 justify-center rounded-full p-0.5', notificationsEnabled ? 'bg-primary' : 'bg-slate-300')}>
            <View className={cn('h-6 w-6 rounded-full bg-white', notificationsEnabled ? 'self-end' : 'self-start')} />
          </View>
        </Pressable>
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        className="mt-4 h-12 items-center justify-center rounded-2xl bg-primary"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        <Text className="text-sm font-extrabold text-primary-foreground">
          {saving ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'حفظ التغييرات' : 'Save changes'}
        </Text>
      </Pressable>

      <View className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
        <Pressable
          onPress={() => setShowPasswordFields((v) => !v)}
          className="flex-row items-center gap-3 px-4 py-3.5"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Lock size={19} color="#7C3AED" />
          </View>
          <Text className="flex-1 text-sm font-bold text-slate-800">{ar ? 'تغيير كلمة المرور' : 'Change password'}</Text>
        </Pressable>

        {showPasswordFields && (
          <View className="gap-2.5 border-t border-slate-100 px-4 py-3.5">
            <TextInput
              value={passwordCurrent}
              onChangeText={setPasswordCurrent}
              secureTextEntry
              placeholder={ar ? 'كلمة المرور الحالية' : 'Current password'}
              placeholderTextColor="#94A3B8"
              className={inputCls}
              style={{ writingDirection: 'ltr', textAlign: 'left', textAlignVertical: 'center' }}
            />
            <TextInput
              value={passwordNew}
              onChangeText={setPasswordNew}
              secureTextEntry
              placeholder={ar ? 'كلمة المرور الجديدة' : 'New password'}
              placeholderTextColor="#94A3B8"
              className={inputCls}
              style={{ writingDirection: 'ltr', textAlign: 'left', textAlignVertical: 'center' }}
            />
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              placeholder={ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
              placeholderTextColor="#94A3B8"
              className={inputCls}
              style={{ writingDirection: 'ltr', textAlign: 'left', textAlignVertical: 'center' }}
            />
            <Pressable
              onPress={changePassword}
              disabled={changingPassword}
              className="h-11 items-center justify-center rounded-xl bg-violet-600"
              style={{ opacity: changingPassword ? 0.6 : 1 }}
            >
              <Text className="text-sm font-bold text-white">
                {changingPassword ? (ar ? 'جارٍ التحديث...' : 'Updating...') : ar ? 'تحديث كلمة المرور' : 'Update password'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        onPress={confirmDeleteAccount}
        className="mt-4 flex-row items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5"
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
          <Trash2 size={19} color="#E11D48" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-rose-600">{ar ? 'حذف الحساب' : 'Delete account'}</Text>
          <Text className="mt-0.5 text-[11px] text-rose-400">
            {ar ? 'حذف نهائي للبيانات ولا يمكن التراجع' : 'Permanently deletes your data. Cannot be undone.'}
          </Text>
        </View>
      </Pressable>
    </Screen>
  );
}

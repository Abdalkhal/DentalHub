import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Pressable, View } from 'react-native';
import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Bell, BellRing, CalendarCheck2, CalendarX2, CheckCheck, MessageCircle, Package, TicketPercent, Truck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text, Button } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useUserRole } from '@/lib/useAuth';
import { registerPush, isPushSupported, pushPermissionGranted } from '@/lib/push';
import { openNotificationTarget } from '@/lib/notificationRoute';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type NotifType = 'order_new' | 'order_status' | 'message' | 'case_message' | 'booking_new' | 'booking_cancelled' | 'data_export' | 'clinic_team' | 'discount';

type Notif = {
  id: string;
  title?: string;
  body?: string;
  type?: NotifType;
  isRead?: boolean;
  createdAt?: number;
  orderId?: string;
  invoiceId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  chatWith?: string;
  forRole?: 'doctor' | 'lab';
  senderId?: string;
};

const TYPE_META: Record<NotifType, { icon: LucideIcon; tone: string; color: string }> = {
  order_new: { icon: Package, tone: 'bg-sky-100', color: '#0284C7' },
  order_status: { icon: Truck, tone: 'bg-amber-100', color: '#D97706' },
  message: { icon: MessageCircle, tone: 'bg-emerald-100', color: '#059669' },
  case_message: { icon: MessageCircle, tone: 'bg-violet-100', color: '#7C3AED' },
  booking_new: { icon: CalendarCheck2, tone: 'bg-teal-100', color: '#0E6E66' },
  booking_cancelled: { icon: CalendarX2, tone: 'bg-rose-100', color: '#E11D48' },
  data_export: { icon: Package, tone: 'bg-blue-100', color: '#2563EB' },
  clinic_team: { icon: MessageCircle, tone: 'bg-blue-100', color: '#2563EB' },
  discount: { icon: TicketPercent, tone: 'bg-emerald-100', color: '#0E6E66' },
};

// The server adds notification types as features grow. An app that doesn't
// know one yet shows it as a plain notification: looking it up used to give
// undefined and the whole app closed the moment the list rendered.
const FALLBACK_META = { icon: Bell, tone: 'bg-slate-100', color: '#64748B' };
const metaOf = (type: unknown) => TYPE_META[type as NotifType] ?? FALLBACK_META;

function createdMs(v: unknown): number {
  if (typeof v === 'number') return v;
  const o = v as { toMillis?: () => number } | null;
  return o && typeof o.toMillis === 'function' ? o.toMillis() : 0;
}

function timeAgo(ts: number | undefined, ar: boolean): string {
  if (!ts) return '';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return ar ? 'الآن' : 'now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return ar ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return ar ? `منذ ${hours} س` : `${hours}h ago`;
  return ar ? `منذ ${Math.floor(hours / 24)} يوم` : `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const [notes, setNotes] = useState<Notif[]>([]);
  const [enabling, setEnabling] = useState(false);
  // null while checking. This used to be a plain `false` on every visit —
  // never read from the phone — so the "Enable" banner came back even after
  // notifications were enabled.
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const pushSupported = isPushSupported();

  // Real state on open: if the phone already allows notifications, register
  // this device silently (refreshing a missing or stale server record) and
  // only offer "Enable" when it is actually off or registration failed.
  useEffect(() => {
    if (!user?.uid || !pushSupported) {
      setPushOn(false);
      return;
    }
    let live = true;
    (async () => {
      if (!(await pushPermissionGranted())) {
        if (live) setPushOn(false);
        return;
      }
      const { token } = await registerPush(user.uid);
      if (live) setPushOn(!!token);
    })();
    return () => {
      live = false;
    };
  }, [user?.uid, pushSupported]);

  useEffect(() => {
    if (!user?.uid) return;
    // Single equality filter only (no orderBy) so this works with the
    // automatic single-field index; we sort client-side. See useOrders in
    // lib/orders.ts for the same pattern.
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data() as Omit<Notif, 'id'> & { createdAt?: unknown };
          return {
            ...x,
            id: d.id,
            title: typeof x.title === 'string' ? x.title : undefined,
            body: typeof x.body === 'string' ? x.body : undefined,
            senderName: typeof x.senderName === 'string' ? x.senderName : undefined,
            senderPhotoURL: typeof x.senderPhotoURL === 'string' && x.senderPhotoURL ? x.senderPhotoURL : undefined,
            createdAt: createdMs(x.createdAt),
          };
        });
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setNotes(list);
      },
      () => setNotes([]),
    );
    return unsub;
  }, [user?.uid]);

  const unreadCount = useMemo(() => notes.filter((n) => !n.isRead).length, [notes]);

  const enable = async () => {
    if (!user) return;
    setEnabling(true);
    const { token, reason } = await registerPush(user.uid);
    setEnabling(false);
    if (token) {
      setPushOn(true);
      toast.success(ar ? 'تم تفعيل إشعارات الجهاز' : 'Push notifications enabled');
    } else if (reason === 'permission-denied') {
      // Once declined, Android/iOS won't show the prompt again — only the
      // system settings can turn it back on. A dialog, not a toast: the toast
      // was easy to miss, so tapping "Enable" looked like it did nothing.
      Alert.alert(
        ar ? 'الإشعارات متوقفة' : 'Notifications are off',
        ar
          ? 'فعّل الإشعارات لتطبيق Dent Hub من إعدادات الهاتف، ثم ارجع واضغط "تفعيل".'
          : 'Turn on notifications for Dent Hub in your phone settings, then come back and tap "Enable".',
        [
          { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: ar ? 'فتح الإعدادات' : 'Open settings', onPress: () => void Linking.openSettings() },
        ],
      );
    } else {
      Alert.alert(
        ar ? 'تعذر تفعيل الإشعارات' : 'Could not enable notifications',
        ar
          ? `حاول مرة أخرى بعد التأكد من الاتصال بالإنترنت.${reason ? `
(${reason})` : ''}`
          : `Check your internet connection and try again.${reason ? `
(${reason})` : ''}`,
      );
    }
  };

  const markRead = (id: string) => updateDoc(doc(db, 'notifications', id), { isRead: true }).catch(() => {});

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notes.filter((n) => !n.isRead).forEach((n) => batch.update(doc(db, 'notifications', n.id), { isRead: true }));
    await batch.commit().catch(() => {});
  };

  const openNotif = (n: Notif) => {
    markRead(n.id);
    // Already on the list: a notification with no screen of its own stays here.
    if (!n.type || !(n.type in TYPE_META)) return;
    openNotificationTarget(n);
  };

  return (
    <Screen>
      {pushOn === false && (
        <View className="flex-row items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3.5">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-100">
            <BellRing size={20} color="#0369A1" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-extrabold text-slate-900">
              {ar ? 'إشعارات الجهاز' : 'Push notifications'}
            </Text>
            <Text className="text-[11px] text-slate-500">
              {pushSupported
                ? ar
                  ? 'فعّل للتنبيه عند تحديث الحالات'
                  : 'Get alerted when cases update'
                : ar
                  ? 'غير متاحة في هذه النسخة التجريبية (Expo Go) — تعمل فقط في نسخة التطبيق المبنية'
                  : "Not available in this preview (Expo Go) — works only in the app's built version"}
            </Text>
          </View>
          {pushSupported && (
            <Button size="sm" title={ar ? 'تفعيل' : 'Enable'} loading={enabling} onPress={enable} />
          )}
        </View>
      )}

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-600">
          {ar ? 'الإشعارات' : 'Notifications'} {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} className="flex-row items-center gap-1">
            <CheckCheck size={13} color="#0284C7" />
            <Text className="text-[11px] font-bold text-primary">
              {ar ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </Text>
          </Pressable>
        )}
      </View>

      {notes.length === 0 ? (
        <View className="items-center py-16">
          <Bell size={40} color="#CBD5E1" strokeWidth={1.5} />
          <Text className="mt-3 text-sm text-slate-400">{ar ? 'لا توجد إشعارات حاليًا' : 'No notifications yet'}</Text>
        </View>
      ) : (
        <View className="mt-3 gap-2.5 pb-6">
          {notes.map((n) => {
            const meta = metaOf(n.type);
            const Icon = meta.icon;
            const unread = !n.isRead;
            return (
              <Pressable
                key={n.id}
                onPress={() => openNotif(n)}
                className={cn(
                  'flex-row gap-3 rounded-2xl border p-3.5',
                  unread ? 'border-sky-100 bg-sky-50/50' : 'border-slate-200 bg-card',
                )}
              >
                <View className="relative shrink-0">
                  {n.senderPhotoURL ? (
                    <Image
                      source={{ uri: n.senderPhotoURL }}
                      className={cn('h-11 w-11 rounded-2xl', unread ? 'border-2 border-sky-200' : 'border-2 border-slate-200')}
                    />
                  ) : (
                    <View className={cn('h-11 w-11 items-center justify-center rounded-2xl', meta.tone)}>
                      <Icon size={20} color={meta.color} />
                    </View>
                  )}
                  {unread && (
                    <View className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text
                      numberOfLines={2}
                      className={cn('flex-1 text-[13px] leading-snug text-slate-800', unread && 'font-bold')}
                    >
                      {n.title ?? '—'}
                    </Text>
                    <Text className="shrink-0 text-[10px] text-slate-400">{timeAgo(n.createdAt, ar)}</Text>
                  </View>
                  {!!n.senderName && (
                    <View className="mt-0.5 flex-row items-center gap-1">
                      <View className="h-1 w-1 rounded-full bg-slate-300" />
                      <Text className="text-[11px] font-semibold text-slate-500">{n.senderName}</Text>
                    </View>
                  )}
                  {!!n.body && (
                    <Text numberOfLines={2} className={cn('mt-1 text-xs leading-relaxed', unread ? 'text-slate-700' : 'text-slate-500')}>
                      {n.body}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

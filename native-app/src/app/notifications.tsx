import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { BellRing } from 'lucide-react-native';

import { Screen, Card, Text, Button } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useUserRole } from '@/lib/useAuth';
import { registerPush } from '@/lib/push';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';

type Notif = {
  id: string;
  title?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: number;
};

export default function NotificationsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const [notes, setNotes] = useState<Notif[]>([]);
  const [enabling, setEnabling] = useState(false);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notif, 'id'>) })));
    });
    return unsub;
  }, [user?.uid]);

  const enable = async () => {
    if (!user) return;
    setEnabling(true);
    const token = await registerPush(user.uid);
    setEnabling(false);
    if (token) {
      setPushOn(true);
      toast.success(ar ? 'تم تفعيل إشعارات الجهاز' : 'Push notifications enabled');
    } else {
      toast.error(ar ? 'تعذر تفعيل الإشعارات' : 'Could not enable notifications');
    }
  };

  return (
    <Screen>
      {!pushOn && (
        <View className="flex-row items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3.5">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-100">
            <BellRing size={20} color="#0369A1" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-extrabold text-slate-900">
              {ar ? 'إشعارات الجهاز' : 'Push notifications'}
            </Text>
            <Text className="text-[11px] text-slate-500">
              {ar ? 'فعّل للتنبيه عند تحديث الحالات' : 'Get alerted when cases update'}
            </Text>
          </View>
          <Button size="sm" title={ar ? 'تفعيل' : 'Enable'} loading={enabling} onPress={enable} />
        </View>
      )}

      {notes.length === 0 ? (
        <Text className="mt-10 text-center text-slate-500">
          {ar ? 'لا توجد إشعارات' : 'No notifications'}
        </Text>
      ) : (
        <View className="mt-4 space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className={n.isRead ? 'opacity-60' : undefined}>
              <Text className="text-sm font-bold text-slate-800">{n.title ?? '—'}</Text>
              {!!n.body && <Text className="mt-1 text-xs text-slate-500">{n.body}</Text>}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

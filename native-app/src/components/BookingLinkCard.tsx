// Entry to the booking link from the clinic hub, with the pending count.
// Mirrors the web's src/components/booking/BookingLinkCard.tsx.
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarCheck2, ChevronLeft } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { usePendingBookingCount } from '@/lib/bookingInbox';

export function BookingLinkCard({ uid }: { uid: string | undefined }) {
  const pending = usePendingBookingCount(uid);
  return (
    <Pressable
      onPress={() => router.push('/clinic-booking' as never)}
      className="mt-4 flex-row items-center gap-3 overflow-hidden rounded-2xl p-4"
      style={{ backgroundColor: '#0E6E66' }}
    >
      <View className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/10" />
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
        <CalendarCheck2 size={22} color="#fff" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-white">رابط الحجز للمرضى</Text>
        <Text numberOfLines={1} className="text-xs text-white/80">
          {pending > 0 ? `${pending} طلب حجز بانتظار ردك` : 'يحجز المرضى من إنستغرام وواتساب بدون تسجيل'}
        </Text>
      </View>
      {pending > 0 && (
        <View className="h-7 min-w-7 items-center justify-center rounded-full bg-rose-500 px-2">
          <Text className="text-xs font-bold text-white">{pending}</Text>
        </View>
      )}
      <ChevronLeft size={20} color="rgba(255,255,255,0.7)" />
    </Pressable>
  );
}

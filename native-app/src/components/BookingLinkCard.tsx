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
    // A quiet white card in the clinic's blue: the summary above holds the main action.
    <Pressable
      onPress={() => router.push('/clinic-booking' as never)}
      className="mt-3 flex-row items-center gap-3 rounded-[18px] border bg-white px-3.5 py-3"
      style={{ borderColor: '#DCE7F5', shadowColor: '#1E3A8A', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#E8F1FE' }}>
        <CalendarCheck2 size={20} color="#1D6FE8" />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-extrabold" style={{ color: '#0F2747' }}>
          رابط الحجز للمرضى
        </Text>
        <Text numberOfLines={1} className="text-[11px]" style={{ color: '#5B6B82' }}>
          {pending > 0 ? `${pending} طلب حجز بانتظار ردك` : 'يحجز المرضى من إنستغرام وواتساب بدون تسجيل'}
        </Text>
      </View>
      {pending > 0 && (
        <View className="h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5">
          <Text className="text-[11px] font-bold text-white">{pending}</Text>
        </View>
      )}
      <ChevronLeft size={18} color="#94A3B8" />
    </Pressable>
  );
}

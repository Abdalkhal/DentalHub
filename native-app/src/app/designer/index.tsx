import { FlatList, Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Layers, PenTool } from 'lucide-react-native';

import { Screen, Spinner, Text } from '@/components/ui';
import { useDesignerCases } from '@/lib/designerStore';
import { getStatusColor, getStatusLabel } from '@/lib/caseTracking';
import { useSession } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Native counterpart of the web app's `/designer` route. Lists only the cases
 * assigned to the signed-in designer — `useDesignerCases` queries on
 * `designerId`, which is also what the Firestore rules enforce, so an
 * unassigned case is invisible here and unreadable server-side.
 */
export default function DesignerIndexScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, loading: authLoading } = useSession();
  const { cases, loading } = useDesignerCases(user?.uid || '');

  if (authLoading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;
  if (loading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <FlatList
        data={cases}
        keyExtractor={({ order }) => order.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item: { order } }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/designer/[caseId]', params: { caseId: order.id } })
            }
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-sky-50">
              <Layers size={20} color="#0284C7" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-slate-800" numberOfLines={1}>
                {order.patient || (ar ? 'غير محدد' : 'Unspecified')}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                {order.doctor} · {ar ? 'الحالة' : 'Case'} #{order.caseId || order.orderNumber}
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
                {order.workType}
              </Text>
            </View>
            <View className={cn('shrink-0 rounded-full px-2.5 py-1', getStatusColor(order.status))}>
              <Text className="text-[10px] font-bold text-white">
                {getStatusLabel(order.status, lang)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <PenTool size={44} color="#CBD5E1" strokeWidth={1.4} />
            <Text className="mt-3 text-sm font-semibold text-slate-400">
              {ar ? 'لا توجد حالات مسندة إليك' : 'No cases assigned to you'}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">
              {ar ? 'ستظهر الحالات المسندة إليك هنا' : 'Cases assigned to you will appear here'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

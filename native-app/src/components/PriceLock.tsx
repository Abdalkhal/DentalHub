import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Lock } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useSession, useUserRole } from '@/lib/useAuth';
import { productsQueryKey } from '@/lib/products';
import { myPriceAccessKey, requestPriceAccess, resetPriceCache, useMyPriceAccess } from '@/lib/priceAccess';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/**
 * Shown instead of a price (and the add-to-cart button) on a product whose
 * office shows prices to approved doctors only. One tap asks the office; the
 * request covers all of that office's products.
 */
export function PriceLock({ officeId, compact = false, className }: { officeId?: string; compact?: boolean; className?: string }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const qc = useQueryClient();
  const { data: access, isLoading } = useMyPriceAccess(user ? officeId : undefined);
  const [busy, setBusy] = useState(false);
  const isDoctor = role?.accountType === 'dentist';

  // Approved since these prices were read: read them again.
  useEffect(() => {
    if (access?.status !== 'approved') return;
    resetPriceCache();
    void qc.invalidateQueries({ queryKey: productsQueryKey });
  }, [access?.status, qc]);

  const box = cn(
    'flex-row items-center gap-1.5 self-start rounded-xl',
    compact ? 'px-2 py-1' : 'px-3 py-2',
    className,
  );
  const label = cn('font-bold', compact ? 'text-xs' : 'text-sm');

  if (!officeId) return null;
  if (user && (isLoading || access?.status === 'approved')) {
    return <ActivityIndicator size="small" color="#0E6E66" />;
  }
  if (access) {
    // Pending, or declined: the doctor isn't told it was declined.
    return (
      <View className={cn(box, 'bg-amber-50')}>
        <Clock size={compact ? 13 : 15} color="#B45309" />
        <Text className={cn(label, 'text-amber-700')}>{ar ? 'تم إرسال طلبك' : 'Request sent'}</Text>
      </View>
    );
  }
  if (user && !isDoctor) {
    return (
      <View className={cn(box, 'bg-slate-100')}>
        <Lock size={compact ? 13 : 15} color="#64748B" />
        <Text className={cn(label, 'text-slate-500')}>{ar ? 'السعر للأطباء المعتمدين' : 'Price for approved doctors'}</Text>
      </View>
    );
  }

  const ask = async () => {
    if (!user) {
      router.push('/login' as never);
      return;
    }
    setBusy(true);
    try {
      const name = [role?.name, role?.surname].filter(Boolean).join(' ');
      await requestPriceAccess(officeId, name ? (ar ? `د. ${name}` : `Dr. ${name}`) : '', ar);
      await qc.invalidateQueries({ queryKey: myPriceAccessKey(officeId) });
      toast.success(ar ? 'أُرسل طلبك، ستصلك رسالة عند الموافقة' : "Sent. You'll be notified when approved");
    } catch {
      toast.error(ar ? 'تعذّر إرسال الطلب' : "Couldn't send the request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={ask}
      disabled={busy}
      accessibilityRole="button"
      className={cn(box, 'border border-primary/30 bg-primary/10 active:opacity-70')}
    >
      {busy ? <ActivityIndicator size="small" color="#0E6E66" /> : <Lock size={compact ? 13 : 15} color="#0E6E66" />}
      <Text className={cn(label, 'text-primary')}>
        {!user ? (ar ? 'سجّل الدخول لرؤية السعر' : 'Sign in to see the price') : ar ? 'اطلب السعر' : 'Request price'}
      </Text>
    </Pressable>
  );
}

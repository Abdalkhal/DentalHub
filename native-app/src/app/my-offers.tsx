// An office's own offers: add, edit and delete them (reached from More → عروضي).
import { Screen } from '@/components/ui';
import { OfficeOffers } from '@/components/OfficeOffers';
import { useSession } from '@/lib/useAuth';

export default function MyOffersScreen() {
  const { user } = useSession();
  return <Screen>{!!user && <OfficeOffers supplierId={user.uid} />}</Screen>;
}

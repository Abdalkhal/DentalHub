import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell, Search, ScanBarcode } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { addToCart } from '@/lib/cartStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const BRANCH_LABEL: Record<string, { ar: string; en: string }> = {
  general: { ar: 'مواد عامة', en: 'General' },
  operative: { ar: 'معالجة', en: 'Operative' },
  endodontic: { ar: 'علاج الجذور', en: 'Endo' },
  prosthodontic: { ar: 'التركيبات', en: 'Prostho' },
  surgery: { ar: 'جراحة', en: 'Surgery' },
  ortho: { ar: 'تقويم', en: 'Ortho' },
  pedodontic: { ar: 'أطفال', en: 'Pedo' },
  periodontic: { ar: 'لثة', en: 'Perio' },
  equipment: { ar: 'معدات', en: 'Equipment' },
  burs: { ar: 'مبردات', en: 'Burs' },
  sterilization: { ar: 'تعقيم', en: 'Steril.' },
  bone_graft: { ar: 'بون كرافت', en: 'Bone Graft' },
  'lab-materials': { ar: 'مواد مختبر', en: 'Lab' },
};

type CardItem = {
  id: string;
  name: string;
  brand: string;
  price: string;
  imageUrl?: string;
  inStock: boolean;
  stock?: number;
  branch?: string;
  companyId?: string;
  currency: 'USD' | 'IQD';
  rawPrice: number;
};

function fmtPrice(price: number, currency: string): string {
  return currency === 'IQD' ? `${price.toLocaleString()} د.ع` : `$${price.toFixed(2)}`;
}

export default function SuppliesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { data: products = [], isLoading } = useProducts();

  const { brand } = useLocalSearchParams<{ brand?: string }>();
  const [q, setQ] = useState(brand ? String(brand) : '');
  const [branch, setBranch] = useState('all');

  const branches = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.branch && set.add(p.branch));
    return Array.from(set).sort();
  }, [products]);

  const allPaths = useMemo(() => products.flatMap((p) => p.images), [products]);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (branch !== 'all' && p.branch !== branch) return false;
      if (!term) return true;
      return [p.en, p.ar, p.brand].filter(Boolean).some((v) => v!.toLowerCase().includes(term));
    });
  }, [products, q, branch]);

  const items: CardItem[] = filtered.map((p) => ({
    id: p.id,
    name: ar ? p.ar || p.en : p.en || p.ar,
    brand: p.brand || (ar ? 'المورد' : 'Supplier'),
    price: fmtPrice(p.price, p.currency),
    imageUrl: p.images[0] ? urlMap[p.images[0]] : undefined,
    inStock: p.stock == null || p.stock > 0,
    stock: p.stock,
    branch: p.branch,
    companyId: p.companyId,
    currency: p.currency,
    rawPrice: p.price,
  }));

  const addToCartBtn = (it: CardItem) => {
    if (!it.inStock) return;
    const officeName = products.find((p) => p.id === it.id)?.brand || (ar ? 'المورد' : 'Supplier');
    addToCart({
      productId: it.id,
      productName: it.name,
      productImage: it.imageUrl,
      officeId: it.companyId || '',
      officeName,
      brand: it.brand,
      category: it.branch,
      unitPrice: it.rawPrice,
      currency: it.currency,
      quantity: 1,
    });
    toast.success(ar ? 'تمت إضافة المنتج إلى السلة' : 'Added to cart');
  };

  const renderCard = ({ item }: { item: CardItem }) => (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/product-detail/[productId]', params: { productId: item.id } })
      }
      className="mb-3 w-[48.5%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <ProductImage uri={item.imageUrl} className="h-32 w-full bg-slate-100" iconSize={34} />
      <View className="p-3">
        <Text className="text-sm font-bold text-slate-800" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
          {item.brand}
        </Text>
        <Text className="mt-1 text-sm font-extrabold text-primary">{item.price}</Text>
        <Pressable
          onPress={() => addToCartBtn(item)}
          disabled={!item.inStock}
          className={cn(
            'mt-2 h-9 items-center justify-center rounded-xl',
            item.inStock ? 'bg-[#2563EB]' : 'bg-slate-100',
          )}
        >
          <Text className={cn('text-[11px] font-bold', item.inStock ? 'text-white' : 'text-slate-400')}>
            {item.inStock ? (ar ? 'أضف للسلة' : 'Add to cart') : ar ? 'نفد' : 'Out of stock'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const header = (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-extrabold text-slate-800">
          {ar ? 'المستلزمات الطبية' : 'Medical Supplies'}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/notifications')}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
          >
            <Bell size={17} color="#334155" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/scan')}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
          >
            <ScanBarcode size={18} color="#334155" />
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View className="relative mt-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={ar ? 'ابحث بالاسم أو البراند…' : 'Search by name or brand…'}
          placeholderTextColor="#94A3B8"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-700 shadow-sm"
        />
        <View className="absolute bottom-0 right-3 top-0 justify-center">
          <Search size={17} color="#94A3B8" />
        </View>
      </View>

      {/* Filter chips */}
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        <Chip
          active={branch === 'all'}
          label={ar ? 'الكل' : 'All'}
          onPress={() => setBranch('all')}
        />
        {branches.map((b) => {
          const meta = BRANCH_LABEL[b];
          return (
            <Chip
              key={b}
              active={branch === b}
              label={meta ? (ar ? meta.ar : meta.en) : b}
              onPress={() => setBranch(b)}
            />
          );
        })}
      </View>

      {/* Bone graft banner */}
      <Pressable
        onPress={() => router.push('/bone-grafts')}
        className="mt-3 flex-row items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5"
      >
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-slate-900">{ar ? 'البون كرافت' : 'Bone Graft'}</Text>
          <Text className="text-[11px] text-slate-500">
            {ar ? 'مواد ترقيع العظم من الموردين' : 'Bone grafting materials from suppliers'}
          </Text>
        </View>
        <Text className="text-lg text-slate-400">›</Text>
      </Pressable>

      {/* Specialized implants shortcut */}
      <Pressable
        onPress={() => router.push('/specialized-implants')}
        className="mt-2 flex-row items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3.5"
      >
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-slate-900">
            {ar ? 'الزرعات المتخصصة' : 'Specialized Implants'}
          </Text>
          <Text className="text-[11px] text-slate-500">
            {ar ? 'حلول متقدمة للحالات المعقدة' : 'Advanced solutions for complex cases'}
          </Text>
        </View>
        <Text className="text-lg text-slate-400">›</Text>
      </Pressable>

      <View className="mb-3 mt-5 flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-slate-700">
          {ar ? 'المنتجات' : 'Products'} ({filtered.length})
        </Text>
      </View>
    </View>
  );

  if (isLoading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Search size={44} color="#CBD5E1" />
            <Text className="mt-3 text-sm text-slate-400">
              {ar ? 'لا توجد منتجات' : 'No products found'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-8 items-center justify-center rounded-full border px-3',
        active ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-200 bg-white',
      )}
    >
      <Text className={cn('text-[11px] font-bold', active ? 'text-white' : 'text-slate-600')}>{label}</Text>
    </Pressable>
  );
}

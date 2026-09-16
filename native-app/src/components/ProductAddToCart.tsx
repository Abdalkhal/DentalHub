import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { addToCart } from '@/lib/cartStore';
import { addToPurchaseHistory } from '@/lib/quickOrders';
import { cn } from '@/lib/utils';

// Faithful port of the web ProductAddToCart component
// (src/components/ProductAddToCart.tsx): a quantity stepper plus one
// full-width "أضف للسلة" button that calls the real cart store and purchase
// history, then flips to a silent "تمت الإضافة" checkmark for 1.5s (no
// toast — matches web exactly).

type Props = {
  productId: string;
  productName: string;
  productImage?: string;
  officeId: string;
  officeName: string;
  brand?: string;
  category?: string;
  specs?: Record<string, string>;
  unitPrice: number;
  currency: 'USD' | 'IQD';
  inStock: boolean;
  ar: boolean;
};

export function ProductAddToCart({
  productId,
  productName,
  productImage,
  officeId,
  officeName,
  brand,
  category,
  specs,
  unitPrice,
  currency,
  inStock,
  ar,
}: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({
      productId,
      productName,
      productImage,
      officeId,
      officeName,
      brand,
      category,
      specs,
      unitPrice,
      currency,
      quantity: qty,
    });
    addToPurchaseHistory({
      productId,
      productName,
      vendor: officeName,
      brand,
      unitPrice,
      image: productImage,
      qty,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQty(1);
    }, 1500);
  };

  return (
    <View className="mt-2 gap-1.5">
      <View className="h-9 flex-row items-center justify-between rounded-lg border border-slate-200 bg-slate-50">
        <Pressable
          onPress={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          className={cn('h-9 w-9 items-center justify-center', qty <= 1 && 'opacity-30')}
        >
          <Minus size={15} color="#475569" />
        </Pressable>
        <Text className="min-w-6 text-center text-sm font-bold text-primary">{qty}</Text>
        <Pressable onPress={() => setQty((q) => q + 1)} className="h-9 w-9 items-center justify-center">
          <Plus size={15} color="#475569" />
        </Pressable>
      </View>

      <Pressable
        onPress={handleAdd}
        disabled={!inStock}
        className={cn('h-9 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary', !inStock && 'opacity-40')}
      >
        {added ? <Check size={14} color="#FFFFFF" /> : <ShoppingCart size={14} color="#FFFFFF" />}
        <Text className="text-xs font-bold text-white">
          {added
            ? ar ? 'تمت الإضافة' : 'Added'
            : ar
              ? `أضف للسلة${qty > 1 ? ` (${qty})` : ''}`
              : `Add to cart${qty > 1 ? ` (${qty})` : ''}`}
        </Text>
      </Pressable>
    </View>
  );
}

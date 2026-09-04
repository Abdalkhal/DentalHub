import { Pressable, View } from "react-native";
import { Card, Text } from "@/components/ui";
import { ProductImage } from "@/components/ProductImage";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/products";

type Props = {
  product: Product;
  imageUrl?: string;
  onPress: () => void;
};

export function ProductCard({ product, imageUrl, onPress }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const isIQD = product.currency === "IQD";
  const price = isIQD
    ? `${Number(product.price).toLocaleString()} د.ع`
    : `$${Number(product.price).toFixed(2)}`;
  const name = product.ar || product.en;
  const hasStock = product.stock != null;
  const inStock = !hasStock || product.stock > 0;

  return (
    <Pressable onPress={onPress} className="w-[48%]">
      <Card className="overflow-hidden p-0">
        <ProductImage uri={imageUrl} className="h-32 w-full bg-slate-100" iconSize={34} />
        {hasStock && (
          <View
            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 ${
              inStock ? "bg-emerald-600/90" : "bg-rose-500/90"
            }`}
          >
            <Text className="text-[9px] font-bold text-white">
              {inStock ? (ar ? `متوفر ${product.stock}` : `${product.stock} in stock`) : ar ? "نفد" : "Out"}
            </Text>
          </View>
        )}
        <View className="p-3">
          <Text className="text-sm font-bold" numberOfLines={2}>
            {name}
          </Text>
          {!!product.brand && (
            <Text className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
              {product.brand}
            </Text>
          )}
          <Text className="mt-1 text-sm font-extrabold text-primary">{price}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

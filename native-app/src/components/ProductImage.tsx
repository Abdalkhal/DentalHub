import { useState } from "react";
import { Image, View, type ImageResizeMode } from "react-native";
import { Package } from "lucide-react-native";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  uri?: string | null;
  className?: string;
  resizeMode?: ImageResizeMode;
  iconSize?: number;
};

// Renders a product photo from a (signed) URL when present and loadable,
// otherwise a crisp lucide placeholder — never a broken layout.
export function ProductImage({
  uri,
  className,
  resizeMode = "cover",
  iconSize = 28,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const show = typeof uri === "string" && uri.length > 0 && !failed;

  if (!show) {
    return (
      <View className={cn("items-center justify-center bg-slate-100", className)}>
        <Package size={iconSize} color="#CBD5E1" strokeWidth={1.6} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      onError={() => setFailed(true)}
      className={className}
      resizeMode={resizeMode}
    />
  );
}

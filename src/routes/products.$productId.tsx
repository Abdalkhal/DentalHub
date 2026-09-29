import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Package } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { ProductDetailsModal } from "@/components/ProductDetailsModal";
import { useProducts } from "@/lib/products";
import { useI18n } from "@/lib/i18n";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetailsPage,
});

// Same content as the product sheet opened from a supplier's profile — the
// native app's product screen is a port of that sheet, so this page reuses it.
function ProductDetailsPage() {
  const { productId } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const router = useRouter();
  const { data: products = [], isLoading } = useProducts();
  const product = products.find((p) => p.id === productId);

  const { data: supplier } = useQuery({
    queryKey: ["product-supplier", product?.companyId],
    enabled: !!product?.companyId,
    queryFn: async (): Promise<UserRoleDoc | null> => {
      const snap = await getDoc(doc(db, "public_profiles", product!.companyId!));
      return snap.exists() ? (snap.data() as UserRoleDoc) : null;
    },
  });

  if (isLoading || !product) {
    return (
      <MobileShell wide>
        <TopBar title={ar ? "المنتج" : "Product"} showBack wide maxW="4xl" />
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <Package className="size-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-semibold">{ar ? "المنتج غير موجود" : "Product not found"}</p>
          </div>
        )}
      </MobileShell>
    );
  }

  const name = ar ? product.ar || product.en : product.en || product.ar;

  return (
    <MobileShell wide>
      <TopBar title={name} showBack wide maxW="4xl" />
      <ProductDetailsModal
        asPage
        product={product}
        onClose={() => router.history.back()}
        isDoctorView
        cart={{
          officeId: product.companyId || "",
          officeName: supplier?.name || (ar ? "المكتب" : "Office"),
          officeCity: supplier?.city || "",
          inStock: product.inStock ?? true,
        }}
      />
    </MobileShell>
  );
}

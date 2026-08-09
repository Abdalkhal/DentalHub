import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAdminStore } from "@/lib/adminStore";
import {
  useProducts,
  useUpsertProduct,
  useDeleteProduct,
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  MAX_PRODUCT_IMAGES,
  type Product,
  type Currency,
} from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Plus, X, Check, Upload, ImageOff } from "lucide-react";
import { FieldRow, Card, SectionTitle } from "./AdminHelpers";

export function ProductsTab() {
  const { lang } = useI18n();
  const { branches } = useAdminStore();
  const { data: products = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const del = useDeleteProduct();
  type FormState = {
    id: string;
    branch: string;
    ar: string;
    en: string;
    brand: string;
    price: string;
    currency: Currency;
    stock: string;
    inStock: boolean;
    images: string[];
  };

  const empty: FormState = {
    id: "",
    branch: branches[0]?.slug ?? "",
    ar: "",
    en: "",
    brand: "",
    price: "0",
    currency: "USD",
    stock: "0",
    inStock: true,
    images: [],
  };
  const [form, setForm] = useState<FormState>(empty);
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [uploading, setUploading] = useState(false);

  const filtered =
    filterBranch === "all" ? products : products.filter((p) => p.branch === filterBranch);
  const { data: formUrls = {} } = useSignedImageUrls(form.images);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !form.id) {
      if (!form.id)
        alert(
          lang === "ar"
            ? "أدخل ID أولاً قبل رفع الصور"
            : "Enter an ID first before uploading images",
        );
      return;
    }
    const remaining = MAX_PRODUCT_IMAGES - form.images.length;
    if (remaining <= 0) {
      alert(
        lang === "ar"
          ? `الحد الأقصى ${MAX_PRODUCT_IMAGES} صور`
          : `Max ${MAX_PRODUCT_IMAGES} images`,
      );
      return;
    }
    setUploading(true);
    try {
      const arr = Array.from(files).slice(0, remaining);
      const paths: string[] = [];
      for (const f of arr) paths.push(await uploadProductImage(form.id.trim(), f));
      setForm((s) => ({ ...s, images: [...s.images, ...paths] }));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{lang === "ar" ? "إضافة منتج" : "Add product"}</SectionTitle>
        <FieldRow>
          <Input
            placeholder="id"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
          >
            {branches.map((b) => (
              <option key={b.slug} value={b.slug}>
                {lang === "ar" ? b.ar : b.en}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow>
          <Input
            placeholder="الاسم بالعربية"
            value={form.ar}
            onChange={(e) => setForm({ ...form, ar: e.target.value })}
          />
          <Input
            placeholder="English name"
            value={form.en}
            onChange={(e) => setForm({ ...form, en: e.target.value })}
          />
        </FieldRow>
        <FieldRow>
          <Input
            placeholder="Brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </FieldRow>

        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {form.images.length === 0 && (
              <div className="size-16 rounded-xl bg-surface border border-border flex items-center justify-center">
                <ImageOff className="size-5 text-muted-foreground" />
              </div>
            )}
            {form.images.map((path) => {
              const url = formUrls[path];
              return (
                <div
                  key={path}
                  className="relative size-16 rounded-xl overflow-hidden border border-border bg-surface"
                >
                  {url ? <img src={url} className="size-full object-cover" alt="" /> : null}
                  <button
                    type="button"
                    aria-label="remove image"
                    onClick={async () => {
                      await removeProductImage(path);
                      setForm((s) => ({ ...s, images: s.images.filter((p) => p !== path) }));
                    }}
                    className="absolute top-0.5 end-0.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <label
              className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-semibold ${form.images.length >= MAX_PRODUCT_IMAGES ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent"}`}
            >
              <Upload className="size-3.5" />
              {uploading
                ? lang === "ar"
                  ? "جاري الرفع…"
                  : "Uploading…"
                : lang === "ar"
                  ? `إضافة صور (${form.images.length}/${MAX_PRODUCT_IMAGES})`
                  : `Add images (${form.images.length}/${MAX_PRODUCT_IMAGES})`}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={form.images.length >= MAX_PRODUCT_IMAGES}
                onChange={async (e) => {
                  await handleUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-[10px] text-muted-foreground">
              {lang === "ar" ? "الصور تُخزّن سحابياً ودائمة" : "Stored in the cloud · persistent"}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
          />
          {lang === "ar" ? "متوفر في المخزن" : "In stock"}
        </label>
        <Button
          size="sm"
          className="w-full"
          disabled={upsert.isPending}
          onClick={async () => {
            if (!form.id || !form.ar || !form.en || !form.branch) return;
            if (products.some((p) => p.id === form.id.trim())) {
              alert(lang === "ar" ? "ID موجود" : "ID exists");
              return;
            }
            try {
              await upsert.mutateAsync({
                id: form.id.trim(),
                branch: form.branch,
                ar: form.ar.trim(),
                en: form.en.trim(),
                brand: form.brand.trim(),
                price: Number(form.price) || 0,
                currency: "USD",
                stock: 0,
                inStock: form.inStock,
                images: form.images,
              });
              setForm({ ...empty, branch: form.branch });
            } catch (err) {
              alert((err as Error).message);
            }
          }}
        >
          <Plus className="size-4" /> {lang === "ar" ? "إضافة" : "Add"}
        </Button>
      </Card>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <button
          onClick={() => setFilterBranch("all")}
          className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold border ${filterBranch === "all" ? "bg-foreground text-background border-foreground" : "bg-card border-border"}`}
        >
          {lang === "ar" ? "الكل" : "All"}
        </button>
        {branches.map((b) => (
          <button
            key={b.slug}
            onClick={() => setFilterBranch(b.slug)}
            className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold border ${filterBranch === b.slug ? "bg-foreground text-background border-foreground" : "bg-card border-border"}`}
          >
            {lang === "ar" ? b.ar : b.en}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground text-center py-4">…</p>}

      <ul className="space-y-2">
        {filtered.map((p) => (
          <ProductRow key={p.id} product={p} />
        ))}
      </ul>
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { lang } = useI18n();
  const upsert = useUpsertProduct();
  const del = useDeleteProduct();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [e, setE] = useState({
    ar: product.ar,
    en: product.en,
    brand: product.brand,
    price: String(product.price),
    currency: product.currency || ("USD" as Currency),
    stock: String(product.stock ?? 0),
    inStock: product.inStock,
    images: product.images,
  });
  const { data: urlMap = {} } = useSignedImageUrls(e.images);
  const firstUrl = urlMap[product.images[0]];

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PRODUCT_IMAGES - e.images.length;
    if (remaining <= 0) {
      alert(lang === "ar" ? `الحد ${MAX_PRODUCT_IMAGES}` : `Max ${MAX_PRODUCT_IMAGES}`);
      return;
    }
    setUploading(true);
    try {
      const arr = Array.from(files).slice(0, remaining);
      const paths: string[] = [];
      for (const f of arr) paths.push(await uploadProductImage(product.id, f));
      setE((s) => ({ ...s, images: [...s.images, ...paths] }));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <li className="bg-card border border-border rounded-xl p-3">
      {editing ? (
        <div className="space-y-2">
          <FieldRow>
            <Input value={e.ar} onChange={(x) => setE({ ...e, ar: x.target.value })} />
            <Input value={e.en} onChange={(x) => setE({ ...e, en: x.target.value })} />
          </FieldRow>
          <FieldRow>
            <Input value={e.brand} onChange={(x) => setE({ ...e, brand: x.target.value })} />
            <Input
              type="number"
              value={e.price}
              onChange={(x) => setE({ ...e, price: x.target.value })}
            />
          </FieldRow>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {e.images.length === 0 && (
                <div className="size-14 rounded-xl bg-surface border border-border flex items-center justify-center">
                  <ImageOff className="size-5 text-muted-foreground" />
                </div>
              )}
              {e.images.map((path) => {
                const url = urlMap[path];
                return (
                  <div
                    key={path}
                    className="relative size-14 rounded-xl overflow-hidden border border-border bg-surface"
                  >
                    {url ? <img src={url} className="size-full object-cover" alt="" /> : null}
                    <button
                      type="button"
                      onClick={async () => {
                        await removeProductImage(path);
                        setE((s) => ({ ...s, images: s.images.filter((p) => p !== path) }));
                      }}
                      className="absolute top-0.5 end-0.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <label
              className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-semibold ${e.images.length >= MAX_PRODUCT_IMAGES ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent"}`}
            >
              <Upload className="size-3.5" />
              {uploading
                ? lang === "ar"
                  ? "جاري الرفع…"
                  : "Uploading…"
                : lang === "ar"
                  ? `إضافة صور (${e.images.length}/${MAX_PRODUCT_IMAGES})`
                  : `Add images (${e.images.length}/${MAX_PRODUCT_IMAGES})`}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={e.images.length >= MAX_PRODUCT_IMAGES}
                onChange={async (x) => {
                  await handleUpload(x.target.files);
                  x.target.value = "";
                }}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={e.inStock}
              onChange={(x) => setE({ ...e, inStock: x.target.checked })}
            />
            {lang === "ar" ? "متوفر" : "In stock"}
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={upsert.isPending}
              onClick={async () => {
                await upsert.mutateAsync({
                  ...product,
                  ar: e.ar,
                  en: e.en,
                  brand: e.brand,
                  price: Number(e.price) || 0,
                  currency: e.currency,
                  stock: Number(e.stock) || 0,
                  inStock: e.inStock,
                  images: e.images,
                });
                setEditing(false);
              }}
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setE({
                  ar: product.ar,
                  en: product.en,
                  brand: product.brand,
                  price: String(product.price),
                  currency: product.currency || "USD",
                  stock: String(product.stock ?? 0),
                  inStock: product.inStock,
                  images: product.images,
                });
                setEditing(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
            {firstUrl ? (
              <img src={firstUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImageOff className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate">
              {lang === "ar" ? product.ar : product.en}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {product.brand} · ${product.price} · {product.branch} · {product.images.length}{" "}
              {lang === "ar" ? "صورة" : "img"} ·{" "}
              {product.inStock
                ? lang === "ar"
                  ? "متوفر"
                  : "in stock"
                : lang === "ar"
                  ? "نافد"
                  : "out"}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={del.isPending}
            onClick={() => {
              if (confirm(lang === "ar" ? "حذف؟" : "Delete?")) del.mutate(product.id);
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      )}
    </li>
  );
}

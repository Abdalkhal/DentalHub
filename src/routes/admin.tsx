import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useAdminStore, branchesApi, officesApi, labsApi, resetAdminStore } from "@/lib/adminStore";
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
import { useIsAdmin } from "@/lib/useAuth";
import { auth } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Pencil,
  Plus,
  RotateCcw,
  X,
  Check,
  Settings2,
  Upload,
  ImageOff,
  LogOut,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "branches" | "offices" | "labs" | "products";

function AdminPage() {
  const { lang } = useI18n();
  const [tab, setTab] = useState<Tab>("branches");
  const { user, loading, isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const tabs: { key: Tab; ar: string; en: string }[] = [
    { key: "branches", ar: "الفروع", en: "Branches" },
    { key: "offices", ar: "المكاتب", en: "Offices" },
    { key: "labs", ar: "المختبرات", en: "Labs" },
    { key: "products", ar: "المنتجات", en: "Products" },
  ];

  if (loading || !user) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "لوحة الإدارة" : "Admin panel"} showBack />
        <div className="p-8 text-center text-sm text-muted-foreground">…</div>
      </MobileShell>
    );
  }

  if (!isAdmin) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "لوحة الإدارة" : "Admin panel"} showBack />
        <div className="p-6 text-center space-y-3">
          <ShieldAlert className="size-10 text-destructive mx-auto" />
          <p className="font-display font-bold">
            {lang === "ar" ? "لا تملك صلاحية المدير" : "You are not an admin"}
          </p>
          <p className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "اطلب من مدير النظام منحك صلاحية إدارية للوصول إلى هذه اللوحة."
              : "Ask the system admin to grant you admin role to access this panel."}
          </p>
          <Button variant="outline" size="sm" onClick={() => signOut(auth)}>
            <LogOut className="size-4" /> {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </Button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title={lang === "ar" ? "لوحة الإدارة" : "Admin panel"} showBack />
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Settings2 className="size-3.5" />
            {lang === "ar" ? "تعديل البيانات بدون كود" : "Edit data without code"}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut(auth).then(() => navigate({ to: "/auth" }))}
              className="text-xs font-semibold inline-flex items-center gap-1"
            >
              <LogOut className="size-3" /> {lang === "ar" ? "خروج" : "Sign out"}
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    lang === "ar"
                      ? "إعادة تعيين الفروع/المكاتب/المختبرات؟"
                      : "Reset branches/offices/labs?",
                  )
                )
                  resetAdminStore();
              }}
              className="text-xs text-destructive font-semibold inline-flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> {lang === "ar" ? "إعادة تعيين" : "Reset"}
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold border transition ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {lang === "ar" ? t.ar : t.en}
            </button>
          ))}
        </div>

        {tab === "branches" && <BranchesTab />}
        {tab === "offices" && <OfficesTab />}
        {tab === "labs" && <LabsTab />}
        {tab === "products" && <ProductsTab />}

        <Link to="/" className="block mt-6 text-center text-xs text-muted-foreground underline">
          {lang === "ar" ? "العودة إلى الرئيسية" : "Back to home"}
        </Link>
      </div>
    </MobileShell>
  );
}

// ------------------- Reusable form bits -------------------
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 shadow-soft space-y-2">
      {children}
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display font-bold text-sm mb-2">{children}</h3>;
}

// ------------------- Branches -------------------
function BranchesTab() {
  const { lang } = useI18n();
  const { branches } = useAdminStore();
  const [form, setForm] = useState({ slug: "", ar: "", en: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ ar: "", en: "" });

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{lang === "ar" ? "إضافة فرع" : "Add branch"}</SectionTitle>
        <Input
          placeholder="slug (e.g. ortho)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
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
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            if (!form.slug || !form.ar || !form.en) return;
            if (
              branchesApi.add({ slug: form.slug.trim(), ar: form.ar.trim(), en: form.en.trim() })
            ) {
              setForm({ slug: "", ar: "", en: "" });
            } else alert(lang === "ar" ? "هذا الـ slug موجود" : "Slug already exists");
          }}
        >
          <Plus className="size-4" /> {lang === "ar" ? "إضافة" : "Add"}
        </Button>
      </Card>

      <ul className="space-y-2">
        {branches.map((b) => (
          <li key={b.slug} className="bg-card border border-border rounded-xl p-3">
            {editing === b.slug ? (
              <div className="space-y-2">
                <FieldRow>
                  <Input
                    value={edit.ar}
                    onChange={(e) => setEdit({ ...edit, ar: e.target.value })}
                  />
                  <Input
                    value={edit.en}
                    onChange={(e) => setEdit({ ...edit, en: e.target.value })}
                  />
                </FieldRow>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      branchesApi.update(b.slug, edit);
                      setEditing(null);
                    }}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm">{lang === "ar" ? b.ar : b.en}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {b.slug} · {lang === "ar" ? b.en : b.ar}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(b.slug);
                    setEdit({ ar: b.ar, en: b.en });
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        lang === "ar"
                          ? "حذف؟ سيُحذف منتجاته أيضاً"
                          : "Delete? Its products will be removed",
                      )
                    )
                      branchesApi.remove(b.slug);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------- Offices -------------------
function OfficesTab() {
  const { lang } = useI18n();
  const { offices } = useAdminStore();
  const [form, setForm] = useState({
    id: "",
    ar: "",
    en: "",
    cityAr: "",
    cityEn: "",
    areaAr: "",
    areaEn: "",
    rating: "4.5",
    itemsCount: "100",
  });

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{lang === "ar" ? "إضافة مكتب" : "Add office"}</SectionTitle>
        <Input
          placeholder="id (unique)"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
        />
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
            placeholder="المدينة (AR)"
            value={form.cityAr}
            onChange={(e) => setForm({ ...form, cityAr: e.target.value })}
          />
          <Input
            placeholder="City (EN)"
            value={form.cityEn}
            onChange={(e) => setForm({ ...form, cityEn: e.target.value })}
          />
        </FieldRow>
        <FieldRow>
          <Input
            placeholder="المنطقة (AR)"
            value={form.areaAr}
            onChange={(e) => setForm({ ...form, areaAr: e.target.value })}
          />
          <Input
            placeholder="Area (EN)"
            value={form.areaEn}
            onChange={(e) => setForm({ ...form, areaEn: e.target.value })}
          />
        </FieldRow>
        <FieldRow>
          <Input
            type="number"
            step="0.1"
            placeholder="Rating"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Items"
            value={form.itemsCount}
            onChange={(e) => setForm({ ...form, itemsCount: e.target.value })}
          />
        </FieldRow>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            if (!form.id || !form.ar || !form.en) return;
            const ok = officesApi.add({
              id: form.id.trim(),
              ar: form.ar.trim(),
              en: form.en.trim(),
              city: { ar: form.cityAr, en: form.cityEn },
              area: { ar: form.areaAr, en: form.areaEn },
              rating: Number(form.rating) || 0,
              itemsCount: Number(form.itemsCount) || 0,
            });
            if (ok)
              setForm({
                id: "",
                ar: "",
                en: "",
                cityAr: "",
                cityEn: "",
                areaAr: "",
                areaEn: "",
                rating: "4.5",
                itemsCount: "100",
              });
            else alert(lang === "ar" ? "ID موجود" : "ID already exists");
          }}
        >
          <Plus className="size-4" /> {lang === "ar" ? "إضافة" : "Add"}
        </Button>
      </Card>

      {offices.length === 0 && (
        <p className="text-xs text-center text-muted-foreground py-4">
          {lang === "ar" ? "لا توجد مكاتب" : "No offices"}
        </p>
      )}
      <ul className="space-y-2">
        {offices.map((o) => (
          <OfficeRow key={o.id} office={o} />
        ))}
      </ul>
    </div>
  );
}

function OfficeRow({ office }: { office: ReturnType<typeof useAdminStore>["offices"][number] }) {
  const { lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [e, setE] = useState({
    ar: office.ar,
    en: office.en,
    cityAr: office.city.ar,
    cityEn: office.city.en,
    areaAr: office.area.ar,
    areaEn: office.area.en,
    rating: String(office.rating),
    itemsCount: String(office.itemsCount),
  });
  return (
    <li className="bg-card border border-border rounded-xl p-3">
      {editing ? (
        <div className="space-y-2">
          <FieldRow>
            <Input value={e.ar} onChange={(x) => setE({ ...e, ar: x.target.value })} />
            <Input value={e.en} onChange={(x) => setE({ ...e, en: x.target.value })} />
          </FieldRow>
          <FieldRow>
            <Input value={e.cityAr} onChange={(x) => setE({ ...e, cityAr: x.target.value })} />
            <Input value={e.cityEn} onChange={(x) => setE({ ...e, cityEn: x.target.value })} />
          </FieldRow>
          <FieldRow>
            <Input value={e.areaAr} onChange={(x) => setE({ ...e, areaAr: x.target.value })} />
            <Input value={e.areaEn} onChange={(x) => setE({ ...e, areaEn: x.target.value })} />
          </FieldRow>
          <FieldRow>
            <Input
              type="number"
              value={e.rating}
              onChange={(x) => setE({ ...e, rating: x.target.value })}
            />
            <Input
              type="number"
              value={e.itemsCount}
              onChange={(x) => setE({ ...e, itemsCount: x.target.value })}
            />
          </FieldRow>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                officesApi.update(office.id, {
                  ar: e.ar,
                  en: e.en,
                  city: { ar: e.cityAr, en: e.cityEn },
                  area: { ar: e.areaAr, en: e.areaEn },
                  rating: Number(e.rating) || 0,
                  itemsCount: Number(e.itemsCount) || 0,
                });
                setEditing(false);
              }}
            >
              <Check className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate">
              {lang === "ar" ? office.ar : office.en}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {lang === "ar" ? office.city.ar : office.city.en} ·{" "}
              {lang === "ar" ? office.area.ar : office.area.en} · ★ {office.rating}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (confirm(lang === "ar" ? "حذف؟" : "Delete?")) officesApi.remove(office.id);
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      )}
    </li>
  );
}

// ------------------- Labs -------------------
function LabsTab() {
  const { lang } = useI18n();
  const { labs } = useAdminStore();
  const [form, setForm] = useState({
    id: "",
    ar: "",
    en: "",
    areaAr: "",
    areaEn: "",
    rating: "4.5",
    deliveryDays: "5",
  });

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{lang === "ar" ? "إضافة مختبر" : "Add lab"}</SectionTitle>
        <Input
          placeholder="id"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
        />
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
            placeholder="المنطقة (AR)"
            value={form.areaAr}
            onChange={(e) => setForm({ ...form, areaAr: e.target.value })}
          />
          <Input
            placeholder="Area (EN)"
            value={form.areaEn}
            onChange={(e) => setForm({ ...form, areaEn: e.target.value })}
          />
        </FieldRow>
        <FieldRow>
          <Input
            type="number"
            step="0.1"
            placeholder="Rating"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Delivery days"
            value={form.deliveryDays}
            onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
          />
        </FieldRow>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            if (!form.id || !form.ar || !form.en) return;
            const ok = labsApi.add({
              id: form.id.trim(),
              ar: form.ar.trim(),
              en: form.en.trim(),
              area: { ar: form.areaAr, en: form.areaEn },
              rating: Number(form.rating) || 0,
              deliveryDays: Number(form.deliveryDays) || 0,
              workTypes: [],
              priceList: [],
            });
            if (ok)
              setForm({
                id: "",
                ar: "",
                en: "",
                areaAr: "",
                areaEn: "",
                rating: "4.5",
                deliveryDays: "5",
              });
            else alert(lang === "ar" ? "ID موجود" : "ID exists");
          }}
        >
          <Plus className="size-4" /> {lang === "ar" ? "إضافة" : "Add"}
        </Button>
      </Card>

      {labs.length === 0 && (
        <p className="text-xs text-center text-muted-foreground py-4">
          {lang === "ar" ? "لا توجد مختبرات" : "No labs"}
        </p>
      )}
      <ul className="space-y-2">
        {labs.map((l) => (
          <li
            key={l.id}
            className="bg-card border border-border rounded-xl p-3 flex items-center gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm truncate">
                {lang === "ar" ? l.ar : l.en}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {lang === "ar" ? l.area.ar : l.area.en} · ★ {l.rating} · {l.deliveryDays}d
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (confirm(lang === "ar" ? "حذف؟" : "Delete?")) labsApi.remove(l.id);
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------- Products (cloud-backed) -------------------
function ProductsTab() {
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

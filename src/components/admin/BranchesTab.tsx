import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAdminStore, branchesApi } from "@/lib/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Plus, X, Check } from "lucide-react";
import { FieldRow, Card, SectionTitle } from "./AdminHelpers";

export function BranchesTab() {
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

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAdminStore, labsApi } from "@/lib/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { FieldRow, Card, SectionTitle } from "./AdminHelpers";

export function LabsTab() {
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

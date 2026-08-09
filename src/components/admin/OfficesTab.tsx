import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAdminStore, officesApi } from "@/lib/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Plus, X, Check } from "lucide-react";
import { FieldRow, Card, SectionTitle } from "./AdminHelpers";

export function OfficesTab() {
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

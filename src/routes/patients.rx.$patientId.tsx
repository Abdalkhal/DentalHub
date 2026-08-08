import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/patientsStore";
import { RX_CATALOG, RX_CATEGORIES, type RxCatalogItem, type RxCompany } from "@/data/rx-catalog";
import {
  Building2,
  FileEdit,
  MapPin,
  NotebookPen,
  Phone,
  Pill,
  Plus,
  Printer,
  Search,
  Send,
  Star,
  Stethoscope,
  X,
} from "lucide-react";

export const Route = createFileRoute("/patients/rx/$patientId")({
  head: () => ({
    meta: [
      { title: "الوصفة الطبية الإلكترونية (Rx) | DentalHub" },
      {
        name: "description",
        content:
          "ورقة وصفة طبية إلكترونية قابلة للتعديل: ترويسة العيادة والطبيب، إضافة أدوية، طباعة أو إرسال عبر واتساب.",
      },
      { property: "og:title", content: "الوصفة الطبية الإلكترونية (Rx) | DentalHub" },
      { property: "og:description", content: "ورقة وصفة طبية إلكترونية قابلة للتعديل وإرسالها للمريض." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RxScreen,
});

type Company = RxCompany;

type RxItem = RxCatalogItem;

const CATS = RX_CATEGORIES;

const COMPANIES: { key: Company | "ALL"; label: string; ar: string; color: string }[] = [
  { key: "ALL", label: "All", ar: "جميع الشركات", color: "text-primary" },
  { key: "LACALUT", label: "LACALUT", ar: "LACALUT", color: "text-red-600" },
  { key: "WISDOM", label: "WISDOM", ar: "WISDOM", color: "text-blue-900" },
  { key: "KIN", label: "KIN", ar: "KIN", color: "text-indigo-900" },
];

const COMPANY_LOGOS: Record<string, string> = {
  KIN: "/photo/kin.jpg",
  LACALUT: "/photo/lacalut.jpg",
  WISDOM: "/photo/wisdom.jpg",
};

const FAV_KEY = "dh:rx:favs:v1";

const PRESETS: RxItem[] = RX_CATALOG;


type Header = {
  clinicName: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicPhone: string;
  clinicAddress: string;
};

const HEADER_KEY = "dh:rx:header:v1";

const DEFAULT_HEADER: Header = {
  clinicName: "",
  doctorName: "",
  doctorSpecialty: "",
  clinicPhone: "",
  clinicAddress: "",
};

function RxScreen() {
  const { patientId } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);

  const [header, setHeader] = useState<Header>(DEFAULT_HEADER);
  const [editHeader, setEditHeader] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [items, setItems] = useState<RxItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HEADER_KEY);
      if (raw) setHeader({ ...DEFAULT_HEADER, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const saveHeader = (h: Header) => {
    setHeader(h);
    try {
      localStorage.setItem(HEADER_KEY, JSON.stringify(h));
    } catch {
      /* ignore */
    }
  };

  const today = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  }, []);

  const rxText = () => {
    let msg = "";
    if (header.clinicName) msg += `*${header.clinicName}*\n`;
    if (header.doctorName)
      msg += `*الطبيب:* ${header.doctorName}${header.doctorSpecialty ? ` (${header.doctorSpecialty})` : ""}\n`;
    msg += `*المريض:* ${p?.name || ""}\n`;
    msg += "-----------------------------------\n";
    msg += "*الوصفة الطبية (Rx):*\n\n";
    items.forEach((m, i) => {
      msg += `${i + 1}. *${m.name}*\n   - الجرعة: ${m.dosage} — ${m.instruction}\n   - المدة: ${m.duration}\n\n`;
    });
    msg += "-----------------------------------\n";
    if (header.clinicAddress) msg += `📍 ${header.clinicAddress}\n`;
    if (header.clinicPhone) msg += `📞 ${header.clinicPhone}\n`;
    msg += "مع تمنياتنا لكم بالشفاء العاجل.";
    return msg;
  };

  const sendWhatsApp = () => {
    if (!items.length) return;
    const phone = (p?.phone || "").replace(/[^\d]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(rxText())}`, "_blank", "noopener,noreferrer");
  };

  const print = () => {
    if (!items.length) return;
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string);
    const rows = items
      .map(
        (m, i) =>
          `<div style="margin-bottom:12px"><b>${i + 1}. ${esc(m.name)}</b><div style="font-size:12px;color:#475569">التعليمات: ${esc(
            m.instruction
          )} (${esc(m.duration)})</div></div>`
      )
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html dir="rtl"><head><title>Rx - ${esc(p?.name || "")}</title></head><body style="font-family:sans-serif;padding:28px;color:#0f172a">
      <div style="font-size:18px;font-weight:700;color:#0369a1">${esc(header.doctorName)}</div>
      <div style="font-size:12px;color:#64748b">${esc(header.doctorSpecialty)}</div>
      <div style="font-size:13px;font-weight:600">${esc(header.clinicName)}</div>
      <hr style="border:none;border-top:2px solid #0284c7;margin:12px 0" />
      <div style="font-size:12px;display:flex;gap:16px"><span>المريض: ${esc(p?.name || "")}</span><span>العمر: ${
        p?.age || ""
      }</span><span>التاريخ: ${today}</span></div>
      <div style="font-size:30px;font-style:italic;font-weight:700;color:#0284c7;margin:16px 0 8px">Rx</div>
      ${rows}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
      <div style="font-size:11px;color:#64748b">${esc(header.clinicAddress)} — ${esc(header.clinicPhone)}</div>
      <div style="margin-top:28px;font-size:11px;color:#94a3b8">توقيع الطبيب: .........................</div>
      </body></html>`
    );
    w.document.close();
    w.print();
  };

  if (!p) {
    return (
      <MobileShell>
        <TopBar title={ar ? "وصفة طبية" : "Prescription"} showBack />
        <div className="p-6 text-center">
          <p className="text-sm font-semibold">{ar ? "لم يتم العثور على المريض" : "Patient not found"}</p>
          <Link to="/patients" className="text-primary text-xs font-bold mt-2 inline-block">
            {ar ? "العودة لسجل المرضى" : "Back to patients"}
          </Link>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title={ar ? "الوصفة الطبية الإلكترونية (Rx)" : "e-Prescription (Rx)"} showBack />

      <div className="px-4 py-4 space-y-4 pb-28">
        <button
          onClick={() => setEditHeader(true)}
          className="w-full rounded-xl border border-primary/30 bg-primary/5 text-primary text-[12px] font-bold py-2.5 flex items-center justify-center gap-1.5"
        >
          <FileEdit className="size-4" /> {ar ? "تعديل معلومات العيادة والطبيب" : "Edit clinic & doctor info"}
        </button>

        {/* Prescription sheet */}
        <div className="rounded-2xl bg-card border border-border shadow-md p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold text-primary truncate">
                {header.doctorName || (ar ? "اسم الطبيب" : "Doctor name")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {header.doctorSpecialty || (ar ? "الاختصاص" : "Specialty")}
              </p>
              <p className="text-xs font-semibold text-foreground/80 mt-1">
                {header.clinicName || (ar ? "اسم العيادة" : "Clinic name")}
              </p>
            </div>
            <span className="shrink-0 rounded-xl border border-primary/25 bg-primary/5 p-2.5 text-primary">
              <Stethoscope className="size-7" />
            </span>
          </div>

          <div className="my-3 h-[2px] rounded bg-primary/70" />

          {/* Patient bar */}
          <div className="rounded-lg bg-muted/60 px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-[12px] truncate">
              {ar ? "المريض" : "Patient"}: {p.name}
            </span>
            <span className="text-muted-foreground whitespace-nowrap">
              {ar ? "العمر" : "Age"}: {p.age || "—"}
            </span>
            <span className="text-muted-foreground whitespace-nowrap">{today}</span>
          </div>

          {/* Rx symbol */}
          <p className="mt-4 text-3xl font-extrabold italic text-primary font-serif leading-none">Rx</p>

          {/* Items */}
          <div className="mt-3">
            {items.length === 0 ? (
              <div className="py-8 text-center">
                <NotebookPen className="size-9 mx-auto text-muted-foreground/60" />
                <p className="text-[12px] text-muted-foreground mt-2">
                  {ar ? 'الورقة فارغة.. اضغط "إضافة دواء" في الأسفل' : 'Empty sheet — tap "Add medicine"'}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((m, i) => (
                  <li key={`${m.id}-${i}`} className="flex items-start gap-2">
                    <span className="text-sm font-bold">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold" dir="ltr">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {ar ? "التعليمات" : "Instructions"}: {m.instruction} ({m.duration})
                      </p>
                    </div>
                    <button
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={ar ? "حذف" : "Remove"}
                      className="text-destructive shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Footer */}
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                <MapPin className="size-3" /> {header.clinicAddress || "—"}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground" dir="ltr">
                <Phone className="size-3" /> {header.clinicPhone || "—"}
              </p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-[10px] text-muted-foreground">{ar ? "توقيع الطبيب" : "Signature"}</p>
              <p className="text-muted-foreground/50 mt-3 text-xs">.........................</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full rounded-xl bg-primary text-primary-foreground text-[13px] font-bold py-3 flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="size-4" /> {ar ? "إضافة دواء للورقة" : "Add medicine"}
        </button>

        <div className="flex gap-2">
          <button
            onClick={print}
            disabled={!items.length}
            className="flex-1 rounded-xl bg-card border border-primary text-primary text-xs font-bold py-3 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="size-4" /> {ar ? "طباعة الورقة" : "Print"}
          </button>
          <button
            onClick={sendWhatsApp}
            disabled={!items.length}
            className="flex-1 rounded-xl bg-[#25D366] text-white text-xs font-bold py-3 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send className="size-4" /> {ar ? "إرسال WhatsApp" : "WhatsApp"}
          </button>
        </div>
      </div>

      {editHeader && <HeaderDialog header={header} onClose={() => setEditHeader(false)} onSave={saveHeader} ar={ar} />}
      {addOpen && (
        <AddMedicineSheet
          ar={ar}
          onClose={() => setAddOpen(false)}
          onPick={(m) => {
            setItems((prev) => [...prev, m]);
            setAddOpen(false);
          }}
        />
      )}
    </MobileShell>
  );
}

function HeaderDialog({
  header,
  onClose,
  onSave,
  ar,
}: {
  header: Header;
  onClose: () => void;
  onSave: (h: Header) => void;
  ar: boolean;
}) {
  const [form, setForm] = useState<Header>(header);
  const field = (key: keyof Header, label: string) => (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-4 space-y-3 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-extrabold">{ar ? "تعديل معلومات ورقة الوصفة" : "Edit prescription header"}</p>
        {field("doctorName", ar ? "اسم الطبيب" : "Doctor name")}
        {field("doctorSpecialty", ar ? "الاختصاص" : "Specialty")}
        {field("clinicName", ar ? "اسم العيادة" : "Clinic name")}
        {field("clinicPhone", ar ? "هاتف العيادة" : "Clinic phone")}
        {field("clinicAddress", ar ? "عنوان العيادة" : "Clinic address")}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border text-xs font-bold py-2.5">
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={() => {
              onSave(form);
              onClose();
            }}
            className="flex-1 rounded-xl bg-primary text-primary-foreground text-xs font-bold py-2.5"
          >
            {ar ? "حفظ التعديلات" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMedicineSheet({
  onClose,
  onPick,
  ar,
}: {
  onClose: () => void;
  onPick: (m: RxItem) => void;
  ar: boolean;
}) {
  const [cat, setCat] = useState("الكل");
  const [company, setCompany] = useState<Company | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PRESETS.filter(
      (m) =>
        (cat === "الكل" || m.category === cat) &&
        (company === "ALL" || m.company === company) &&
        `${m.name} ${m.nameAr ?? ""}`.toLowerCase().includes(needle)
    ).sort((a, b) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)));
  }, [cat, company, q, favs]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-card px-4 pb-4 pt-3 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <p className="text-[17px] font-extrabold text-foreground">
          {ar ? "اختر دواء لإضافته للورقة" : "Pick a medicine"}
        </p>

        <div className="mt-3 relative shrink-0">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? "ابحث عن دواء..." : "Search medicine..."}
            className="w-full h-11 rounded-full border border-border bg-muted/40 ps-10 pe-3 text-[13px] outline-none focus:border-primary"
          />
        </div>

        {/* Company cards */}
        <div className="mt-3 grid grid-cols-4 gap-2 shrink-0">
          {COMPANIES.map((c) => {
            const active = company === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCompany(c.key)}
                className={cn(
                  "rounded-2xl bg-card border py-2.5 px-1 flex flex-col items-center justify-center gap-1 shadow-soft transition overflow-hidden",
                  active ? "border-primary border-2 ring-1 ring-primary/20" : "border-border"
                )}
              >
                {c.key === "ALL" ? (
                  <Building2 className="size-6 text-primary" />
                ) : COMPANY_LOGOS[c.key] ? (
                  <img src={COMPANY_LOGOS[c.key]} alt={c.label} className="w-full h-8 object-contain" loading="lazy" />
                ) : (
                  <span className={cn("text-[12px] font-black leading-none", c.color)}>{c.label}</span>
                )}
                <span className="text-[9px] font-bold text-muted-foreground leading-none text-center">
                  {ar ? c.ar : c.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar h-[46px] my-2 shrink-0">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "h-9 rounded-full px-4 text-[13px] whitespace-nowrap border transition",
                cat === c
                  ? "bg-primary text-primary-foreground font-bold border-primary"
                  : "bg-card text-muted-foreground font-bold border-border"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pb-2">
          {list.map((m) => {
            const fav = favs.includes(m.id);
            return (
              <div
                key={m.id}
                className={cn(
                  "w-full rounded-2xl bg-card border p-3 flex items-center gap-2",
                  fav ? "border-primary/40" : "border-border"
                )}
              >
                <span className="size-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                  {m.image ? (
                    <img src={m.image} alt={m.name} loading="lazy" className="size-full object-contain bg-white" />
                  ) : (
                    <Pill className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-foreground truncate" dir="ltr">
                    {m.name}
                  </p>
                  {m.nameAr && (
                    <p className="text-[11px] font-semibold text-foreground/70 truncate">{m.nameAr}</p>
                  )}
                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                    {m.instruction} ({m.duration})
                  </p>
                </div>
                <button
                  onClick={() => toggleFav(m.id)}
                  aria-label={ar ? "مفضلة" : "Favorite"}
                  className="shrink-0 p-1"
                >
                  <Star
                    className={cn("size-6", fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50")}
                  />
                </button>
                <button
                  onClick={() => onPick(m)}
                  aria-label={ar ? "إضافة" : "Add"}
                  className="size-9 shrink-0 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            );
          })}
          {list.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">{ar ? "لا نتائج" : "No results"}</p>
          )}
        </div>
      </div>
    </div>
  );
}


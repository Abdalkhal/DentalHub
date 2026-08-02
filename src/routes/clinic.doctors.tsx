import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { addDoctor, removeDoctor, useClinic } from "@/lib/clinicStore";
import { Stethoscope, Plus, Trash2, Phone, Clock } from "lucide-react";
import { EmptyState, Field, Sheet, inputCls } from "./clinic.materials";

export const Route = createFileRoute("/clinic/doctors")({
  head: () => ({
    meta: [
      { title: "أطباء العيادة | DentalHub" },
      { name: "description", content: "دليل أطباء العيادة والاختصاصات وأوقات الدوام والحالات المسندة لكل طبيب." },
      { property: "og:title", content: "أطباء العيادة | DentalHub" },
      { property: "og:description", content: "دليل أطباء العيادة والاختصاصات والدوام." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { doctors } = useClinic();
  const [open, setOpen] = useState(false);

  return (
    <MobileShell>
      <TopBar title={ar ? "أطباء العيادة" : "Clinic Doctors"} showBack />
      <div className="px-3 pt-3 pb-6">
        <button
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2"
        >
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "إضافة طبيب" : "Add doctor"}
        </button>

        <ul className="mt-3 space-y-2.5">
          {doctors.length === 0 ? (
            <EmptyState icon={Stethoscope} title={ar ? "لا يوجد أطباء بعد" : "No doctors yet"} sub={ar ? "أضف أطباء العيادة واختصاصاتهم" : "Add clinic staff"} />
          ) : (
            doctors.map((d) => (
              <li key={d.id} className="flex items-start gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-soft">
                <span className="size-11 shrink-0 rounded-2xl bg-[oklch(0.95_0.04_250)] text-[oklch(0.45_0.18_256)] font-display font-extrabold flex items-center justify-center">
                  {d.name.trim().charAt(0) || "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-extrabold text-sm truncate">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.specialty}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="size-3" />{d.phone || "—"}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" />{d.shift || "—"}</span>
                  </div>
                  <p className="text-[11px] font-bold text-primary mt-1">
                    {ar ? "الحالات المسندة" : "Assigned cases"}: {d.cases}
                  </p>
                </div>
                <button onClick={() => removeDoctor(d.id)} className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {open && <DoctorModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

function DoctorModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: "", specialty: "", phone: "", shift: "", cases: 0 });
  return (
    <Sheet onClose={onClose} title={ar ? "إضافة طبيب" : "Add doctor"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          addDoctor(f);
          onClose();
        }}
        className="space-y-3"
      >
        <Field label={ar ? "اسم الطبيب" : "Doctor name"}>
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
        </Field>
        <Field label={ar ? "الاختصاص" : "Specialty"}>
          <input value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "الهاتف" : "Phone"}>
            <input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label={ar ? "الدوام" : "Shift"}>
            <input value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value })} className={inputCls} placeholder={ar ? "صباحي 9-2" : "Morning 9-2"} />
          </Field>
        </div>
        <Field label={ar ? "عدد الحالات المسندة" : "Assigned cases"}>
          <input type="number" min={0} value={f.cases} onChange={(e) => setF({ ...f, cases: Number(e.target.value) })} className={inputCls} />
        </Field>
        <button type="submit" className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card">
          {ar ? "حفظ" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}

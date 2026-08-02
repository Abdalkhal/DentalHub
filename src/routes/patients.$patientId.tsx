import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { usePatients, updatePatient, deletePatient } from "@/lib/patientsStore";
import { MobileShell } from "@/components/MobileShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Phone, CalendarDays, User, Clock, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/patients/$patientId")({
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const patients = usePatients();
  const p = patients.find((pt) => pt.id === patientId);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  if (!p) {
    return (
      <MobileShell>
        <div className="p-6 text-center text-slate-400">
          <User className="size-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{ar ? "المريض غير موجود" : "Patient not found"}</p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="px-3 pt-4 pb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/patients" })} className="size-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <Back className="size-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-lg">{p.name}</h1>
          <p className="text-[11px] text-slate-500">{p.fileNo}</p>
        </div>
      </header>

      <div className="px-3 pb-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-slate-500">{ar ? "العمر" : "Age"}</span><p className="font-bold">{p.age || "—"} {ar ? "سنة" : "yrs"}</p></div>
            <div><span className="text-xs text-slate-500">{ar ? "الجنس" : "Gender"}</span><p className="font-bold">{p.gender === "male" ? (ar ? "ذكر" : "Male") : ar ? "أنثى" : "Female"}</p></div>
            <div><span className="text-xs text-slate-500">{ar ? "الهاتف" : "Phone"}</span><p className="font-bold flex items-center gap-1"><Phone className="size-3" />{p.phone || "—"}</p></div>
            <div><span className="text-xs text-slate-500">{ar ? "آخر زيارة" : "Last visit"}</span><p className="font-bold flex items-center gap-1"><CalendarDays className="size-3" />{p.lastVisit}</p></div>
          </div>
        </div>

        {p.complaint && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500 mb-1">{ar ? "الشكوى / ملاحظات" : "Complaint / Notes"}</p>
            <p className="text-sm text-slate-700">{p.complaint}</p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

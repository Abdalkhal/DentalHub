import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { usePatients } from "@/lib/patientsStore";
import { AddAppointmentModal } from "@/components/AddAppointmentModal";
import dentalBridge from "@/assets/dental-bridge.png";
import {
  ArrowRight, ArrowLeft, User, CreditCard, Users,
  Calendar, Plus, Package, ClipboardList, BarChart3, Stethoscope,
} from "lucide-react";

export const Route = createFileRoute("/clinic/")({
  component: ClinicHome,
});

function ClinicHome() {
  const { lang, dir, toggle } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const patients = usePatients();
  const [showAddAppointment, setShowAddAppointment] = useState(false);

  return (
    <MobileShell hideBottomNav>
      <div className="min-h-svh bg-slate-50 flex justify-center">
        <div className="w-full max-w-[440px] bg-[#E6F0FF]">
          {/* Header */}
          <header className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="h-9 px-3 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-600 transition"
              >
                {lang === "ar" ? "EN" : "AR"}
              </button>
              <button
                onClick={() => navigate({ to: "/account" })}
                className="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
              >
                <User className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-lg text-slate-800">
                {ar ? "عيادتي" : "My Clinic"}
              </h1>
              <button
                onClick={() => navigate({ to: "/" })}
                className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
              >
                <BackIcon className="size-5" />
              </button>
            </div>
          </header>

          <div className="px-4 space-y-4 pb-8">
            {/* Hero Banner */}
            <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-4 overflow-hidden">
              <div className="absolute -bottom-6 -end-6 size-32 rounded-full bg-white/10" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="font-display font-extrabold text-lg text-white leading-tight">
                    {ar ? "إدارة العيادة والمرضى" : "Clinic & Patient Management"}
                  </h2>
                  <p className="text-xs text-white/70 mt-1">
                    {ar ? "كل ما يخص عيادتك في مكان واحد" : "Everything for your clinic in one place"}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setShowAddAppointment(true)}
                      className="h-10 px-4 rounded-xl bg-white text-blue-600 text-xs font-bold shadow-sm hover:bg-blue-50 transition flex items-center gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      {ar ? "إضافة موعد" : "Add Appointment"}
                    </button>
                    <button
                      onClick={() => navigate({ to: "/clinic/appointments" })}
                      className="h-10 px-4 rounded-xl bg-blue-700/40 text-white text-xs font-bold hover:bg-blue-700/60 transition flex items-center gap-1.5"
                    >
                      <Calendar className="size-3.5" />
                      {ar ? "مواعيد اليوم" : "Today's Visits"}
                    </button>
                  </div>
                </div>
                <div className="shrink-0 w-28 h-28 flex items-center justify-center -mt-2 -me-1">
                  <img src={dentalBridge} alt="" loading="lazy" className="max-w-full max-h-full object-contain opacity-90" />
                </div>
              </div>
            </div>

            {/* Section 1: Daily Services & Patients */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3">
                {ar ? "الخدمات اليومية والمرضى" : "Daily Services & Patients"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/clinic/finance" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition">
                  <span className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><CreditCard className="size-5" /></span>
                  <p className="font-display font-bold text-sm text-slate-800">{ar ? "المالية والحسابات" : "Finance & Accounts"}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">{ar ? "إيرادات اليوم $0" : "Today's revenue $0"}</span>
                </Link>
                <Link to="/patients" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition">
                  <span className="size-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3"><Users className="size-5" /></span>
                  <p className="font-display font-bold text-sm text-slate-800">{ar ? "المرضى والمواعيد" : "Patients & Appointments"}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold bg-sky-50 text-sky-600 px-2 py-1 rounded-lg">{ar ? `مرضى ${patients.length}` : `${patients.length} patients`}</span>
                </Link>
              </div>
            </div>

            {/* Section 2: Inventory & Orders */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3">
                {ar ? "المخزون والمشتريات" : "Inventory & Purchases"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/clinic/orders" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition">
                  <span className="size-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3"><ClipboardList className="size-5" /></span>
                  <p className="font-display font-bold text-sm text-slate-800">{ar ? "طلبيات العيادة والمختبرات" : "Clinic & Lab Orders"}</p>
                </Link>
                <Link to="/clinic/materials" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition">
                  <span className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Package className="size-5" /></span>
                  <p className="font-display font-bold text-sm text-slate-800">{ar ? "مواد العيادة" : "Clinic Materials"}</p>
                </Link>
              </div>
            </div>

            {/* Section 3: Reports & Doctors */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3">
                {ar ? "التقارير والإدارة" : "Reports & Management"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/clinic/reports" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition">
                  <span className="size-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><BarChart3 className="size-5" /></span>
                  <p className="font-display font-bold text-sm text-slate-800">{ar ? "التقارير والإحصائيات" : "Reports & Statistics"}</p>
                </Link>
                <Link to="/clinic/doctors" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition">
                  <span className="size-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3"><Stethoscope className="size-5" /></span>
                  <p className="font-display font-bold text-sm text-slate-800">{ar ? "أطباء العيادة" : "Clinic Doctors"}</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddAppointment && <AddAppointmentModal onClose={() => setShowAddAppointment(false)} />}
    </MobileShell>
  );
}

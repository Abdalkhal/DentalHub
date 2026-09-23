import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { usePatients } from "@/lib/patientsStore";
import { AddAppointmentModal } from "@/components/AddAppointmentModal";
import clinicHero from "@/assets/clinic-hero.jpg";
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
    <MobileShell hideBottomNav wide className="md:bg-slate-50">
      {/* This page carries its own 440px cap on top of the shell's, so both
          have to be lifted for the desktop layout to get any room. */}
      <div className="min-h-svh bg-slate-50 flex justify-center">
        <div className="w-full max-w-[440px] bg-[#E6F0FF] md:max-w-none md:bg-transparent md:px-6 lg:px-8 lg:max-w-7xl">
          {/* Header */}
          <header className="flex items-center justify-between px-4 pt-4 pb-2 md:px-0 md:pt-8 md:pb-6">
            <div className="flex items-center gap-2 md:order-last">
              <button
                onClick={toggle}
                className="h-9 px-3 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-600 transition md:h-10 md:px-4 md:bg-white md:border md:border-slate-200"
              >
                {lang === "ar" ? "EN" : "AR"}
              </button>
              <button
                onClick={() => navigate({ to: "/account" })}
                className="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition md:size-10 md:bg-white md:border md:border-slate-200"
              >
                <User className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <h1 className="font-display font-extrabold text-lg text-slate-800 md:text-3xl">
                {ar ? "عيادتي" : "My Clinic"}
              </h1>
              <button
                onClick={() => navigate({ to: "/" })}
                className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition md:order-first md:size-10 md:bg-white md:border md:border-slate-200"
              >
                <BackIcon className="size-5" />
              </button>
            </div>
          </header>

          {/* Phone: one vertical stack. md:+ : the hero spans the full width
              and the three labelled groups become side-by-side columns, so
              all six destinations are visible without scrolling. */}
          <div className="px-4 space-y-4 pb-8 md:px-0 md:pb-12 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:items-start lg:grid-cols-3">
            {/* Hero Banner */}
            <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl overflow-hidden md:col-span-2 lg:col-span-3 lg:rounded-[32px]">
              <div className="absolute -bottom-6 -end-6 size-32 rounded-full bg-white/10 md:size-72 md:-bottom-24" />
              <div className="relative z-10 flex items-stretch">
                <div className="flex-1 p-4 flex flex-col justify-center md:p-10 lg:px-14">
                  <h2 className="font-display font-extrabold text-lg text-white leading-tight md:text-4xl lg:text-[44px]">
                    {ar ? "إدارة العيادة والمرضى" : "Clinic & Patient Management"}
                  </h2>
                  <p className="text-xs text-white/70 mt-1 md:text-lg md:mt-3 md:text-white/85 md:max-w-md">
                    {ar ? "كل ما يخص عيادتك في مكان واحد" : "Everything for your clinic in one place"}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 md:flex-row md:mt-8 md:gap-3">
                    <button
                      onClick={() => setShowAddAppointment(true)}
                      className="w-full h-10 rounded-xl bg-white text-blue-600 text-xs font-bold shadow-sm hover:bg-blue-50 transition flex items-center justify-center gap-1.5 md:w-auto md:h-12 md:px-7 md:text-sm md:rounded-full"
                    >
                      <Plus className="size-3.5 md:size-4" />
                      {ar ? "إضافة موعد" : "Add Appointment"}
                    </button>
                    <button
                      onClick={() => navigate({ to: "/clinic/appointments" })}
                      className="w-full h-10 rounded-xl bg-blue-700/40 text-white text-xs font-bold hover:bg-blue-700/60 transition flex items-center justify-center gap-1.5 md:w-auto md:h-12 md:px-7 md:text-sm md:rounded-full md:bg-white/15 md:hover:bg-white/25"
                    >
                      <Calendar className="size-3.5 md:size-4" />
                      {ar ? "مواعيد اليوم" : "Today's Visits"}
                    </button>
                  </div>
                </div>
                <div className="w-1/2 shrink-0 overflow-hidden md:w-[42%] lg:w-[46%]">
                  <img src={clinicHero} alt="" loading="lazy" className="size-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Section 1: Daily Services & Patients */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3 md:text-xs md:uppercase md:tracking-wider md:text-slate-400 md:mb-4">
                {ar ? "الخدمات اليومية والمرضى" : "Daily Services & Patients"}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link to="/clinic/finance" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><CreditCard className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "المالية والحسابات" : "Finance & Accounts"}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg md:mt-3 md:text-xs md:px-2.5">{ar ? "إيرادات اليوم $0" : "Today's revenue $0"}</span>
                </Link>
                <Link to="/patients" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><Users className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "المرضى والمواعيد" : "Patients & Appointments"}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold bg-sky-50 text-sky-600 px-2 py-1 rounded-lg md:mt-3 md:text-xs md:px-2.5">{ar ? `مرضى ${patients.length}` : `${patients.length} patients`}</span>
                </Link>
              </div>
            </div>

            {/* Section 2: Inventory & Orders */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3 md:text-xs md:uppercase md:tracking-wider md:text-slate-400 md:mb-4">
                {ar ? "المخزون والمشتريات" : "Inventory & Purchases"}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link to="/clinic/orders" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><ClipboardList className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "طلبيات العيادة والمختبرات" : "Clinic & Lab Orders"}</p>
                </Link>
                <Link to="/clinic/materials" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><Package className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "مواد العيادة" : "Clinic Materials"}</p>
                </Link>
              </div>
            </div>

            {/* Section 3: Reports & Doctors */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3 md:text-xs md:uppercase md:tracking-wider md:text-slate-400 md:mb-4">
                {ar ? "التقارير والإدارة" : "Reports & Management"}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link to="/clinic/reports" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><BarChart3 className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "التقارير والإحصائيات" : "Reports & Statistics"}</p>
                </Link>
                <Link to="/clinic/doctors" className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><Stethoscope className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "أطباء العيادة" : "Clinic Doctors"}</p>
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { usePatients } from "@/lib/patientsStore";
import { useClinics, addClinic, updateClinic, setActiveClinic, setClinicsStoreUser, type Clinic } from "@/lib/clinicsStore";
import { useClinic, clinicTotals } from "@/lib/clinicStore";
import { useAppointments } from "@/lib/appointmentsStore";
import { useSession } from "@/lib/useAuth";
import { AddAppointmentModal } from "@/components/AddAppointmentModal";
import { cn } from "@/lib/utils";
import clinicHero from "@/assets/clinic-hero.jpg";
import {
  ArrowRight, ArrowLeft, User, CreditCard, Users,
  Calendar, Plus, Package, ClipboardList, BarChart3, Stethoscope,
  Building2, ChevronDown, Pencil, Check,
} from "lucide-react";

export const Route = createFileRoute("/clinic/")({
  component: ClinicHome,
});

function ClinicHome() {
  const { lang, dir, toggle } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const { user } = useSession();
  useEffect(() => {
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  const patients = usePatients();
  const appointments = useAppointments();
  const totals = clinicTotals(useClinic());
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayCount = appointments.filter((a) => a.date === todayStr).length;
  const [showAddAppointment, setShowAddAppointment] = useState(false);

  const { clinics, activeClinicId } = useClinics();
  const activeClinic = clinics.find((c) => c.id === activeClinicId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formWorkDays, setFormWorkDays] = useState("");

  const openAddClinic = () => {
    setEditingId(null);
    setFormName("");
    setFormAddress("");
    setFormWorkDays("");
    setFormMode("add");
    setMenuOpen(false);
  };
  const openEditClinic = (c: Clinic) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormAddress(c.address);
    setFormWorkDays(c.workDays);
    setFormMode("edit");
    setMenuOpen(false);
  };
  const saveClinicForm = () => {
    if (!formName.trim()) return;
    if (formMode === "add") {
      addClinic({ name: formName.trim(), address: formAddress.trim(), workDays: formWorkDays.trim() });
    } else if (formMode === "edit" && editingId) {
      updateClinic(editingId, { name: formName.trim(), address: formAddress.trim(), workDays: formWorkDays.trim() });
    }
    setFormMode("closed");
  };

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

          {/* Clinic switcher — a dentist running more than one clinic picks
              which one is active here; every patient/appointment/finance/
              inventory store below re-keys to that clinic's own isolated
              storage the moment it changes (see clinicsStore.ts). */}
          <div className="relative flex justify-center px-4 pb-3 md:px-0 md:justify-start">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white ps-4 pe-2 shadow-sm transition hover:shadow-md"
            >
              <span className="font-display text-sm font-bold text-slate-800">
                {activeClinic?.name ?? (ar ? "عيادتي" : "My Clinic")}
              </span>
              <ChevronDown className={cn("size-4 text-slate-400 transition-transform", menuOpen && "rotate-180")} />
              <span className="flex size-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <Building2 className="size-4" />
              </span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {clinics.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
                    >
                      <button
                        onClick={() => {
                          setActiveClinic(c.id);
                          setMenuOpen(false);
                        }}
                        className="min-w-0 flex-1 text-start"
                      >
                        <p className="truncate font-display text-sm font-bold text-slate-800">{c.name}</p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => openEditClinic(c)}
                          className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {c.id === activeClinicId && (
                          <span className="flex size-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                            <Check className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={openAddClinic}
                    className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-primary hover:bg-sky-50"
                  >
                    <Plus className="size-4" />
                    {ar ? "إضافة عيادة جديدة" : "Add new clinic"}
                  </button>
                </div>
              </>
            )}
          </div>

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
                      {ar ? `مواعيد اليوم (${todayCount})` : `Today's Visits (${todayCount})`}
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
                <Link to="/clinic/finance" className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><CreditCard className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "المالية والحسابات" : "Finance & Accounts"}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug md:text-sm">{ar ? "الإيرادات، المصاريف، الفواتير والمدفوعات" : "Income, expenses, invoices and payments"}</p>
                  <span className="inline-block w-fit mt-auto pt-2 text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg md:mt-3 md:text-xs md:px-2.5">{ar ? `إيرادات اليوم ${totals.income.toLocaleString()}` : `Today's revenue ${totals.income.toLocaleString()}`}</span>
                </Link>
                <Link to="/patients" className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><Users className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "المرضى والمواعيد" : "Patients & Appointments"}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug md:text-sm">{ar ? "سجلات المرضى، المواعيد والخطط العلاجية" : "Patient records, appointments and treatment plans"}</p>
                  <span className="inline-block w-fit mt-auto pt-2 text-[10px] font-semibold bg-sky-50 text-sky-600 px-2 py-1 rounded-lg md:mt-3 md:text-xs md:px-2.5">{ar ? `مرضى ${patients.length}` : `${patients.length} patients`}</span>
                </Link>
              </div>
            </div>

            {/* Section 2: Inventory & Orders */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3 md:text-xs md:uppercase md:tracking-wider md:text-slate-400 md:mb-4">
                {ar ? "المخزون والمشتريات" : "Inventory & Purchases"}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link to="/clinic/orders" className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><ClipboardList className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "طلبيات العيادة والمختبرات" : "Clinic & Lab Orders"}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug md:text-sm">{ar ? "طلبات المختبرات ومستلزمات العيادة" : "Lab requests and clinic supplies"}</p>
                </Link>
                <Link to="/clinic/materials" className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><Package className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "مواد العيادة" : "Clinic Materials"}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug md:text-sm">{ar ? "المخزون والمستهلكات والكيمياويات والمخدر" : "Inventory, consumables, chemicals and anesthesia"}</p>
                </Link>
              </div>
            </div>

            {/* Section 3: Reports & Doctors */}
            <div>
              <h3 className="font-display font-bold text-sm text-slate-500 mb-3 md:text-xs md:uppercase md:tracking-wider md:text-slate-400 md:mb-4">
                {ar ? "التقارير والإدارة" : "Reports & Management"}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link to="/clinic/reports" className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><BarChart3 className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "التقارير والإحصائيات" : "Reports & Statistics"}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug md:text-sm">{ar ? "أداء شهري، ملخص العلاجات وتصدير التقارير" : "Monthly performance, treatment summary and report exports"}</p>
                </Link>
                <Link to="/clinic/doctors" className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition md:p-5 md:shadow-none md:border-slate-200 md:hover:shadow-lg md:hover:-translate-y-0.5">
                  <span className="size-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 md:size-14 md:mb-4"><Stethoscope className="size-5 md:size-6" /></span>
                  <p className="font-display font-bold text-sm text-slate-800 md:text-base md:leading-snug">{ar ? "أطباء العيادة" : "Clinic Doctors"}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug md:text-sm">{ar ? "الأطباء، الاختصاصات والدوام والحالات" : "Doctors, specialties, shifts and cases"}</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddAppointment && <AddAppointmentModal onClose={() => setShowAddAppointment(false)} />}

      {formMode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setFormMode("closed")} />
          <div className="relative w-full max-w-md space-y-4 rounded-t-3xl bg-[#EBF3FA] p-5 sm:rounded-3xl">
            <h3 className="font-display text-lg font-extrabold text-slate-800">
              {formMode === "add" ? (ar ? "عيادة جديدة" : "New clinic") : ar ? "تعديل العيادة" : "Edit clinic"}
            </h3>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">{ar ? "اسم العيادة" : "Clinic name"}</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={ar ? "مثال: عيادة الأسرة" : "e.g. Family Clinic"}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">{ar ? "العنوان" : "Address"}</label>
              <input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder={ar ? "المنطقة / الشارع" : "Area / Street"}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">{ar ? "أيام العمل" : "Working days"}</label>
              <input
                value={formWorkDays}
                onChange={(e) => setFormWorkDays(e.target.value)}
                placeholder={ar ? "مثال: السبت-الخميس" : "e.g. Sat-Thu"}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={saveClinicForm}
                disabled={!formName.trim()}
                className="h-12 flex-1 rounded-2xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {ar ? "حفظ" : "Save"}
              </button>
              <button
                onClick={() => setFormMode("closed")}
                className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600"
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

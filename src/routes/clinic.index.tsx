import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { usePatients } from "@/lib/patientsStore";
import { useClinics, addClinic, updateClinic, setActiveClinic, setClinicsStoreUser, type Clinic } from "@/lib/clinicsStore";
import { useClinic, todayIncome, fmtMoney } from "@/lib/clinicStore";
import { useAppointments } from "@/lib/appointmentsStore";
import { useSession } from "@/lib/useAuth";
import { useMaterialsBadge } from "@/lib/materialsStore";
import { AddAppointmentModal } from "@/components/AddAppointmentModal";
import { cn } from "@/lib/utils";
import { BookingLinkCard } from "@/components/booking/BookingLinkCard";
import {
  ArrowRight, ArrowLeft, User, CreditCard, Users,
  Calendar, Plus, Package, ClipboardList, BarChart3, Stethoscope,
  Building2, ChevronDown, Pencil, Check, ShieldCheck, Clock, type LucideIcon } from "lucide-react";

type Item = {
  to: string;
  icon: LucideIcon;
  title: string;
  /** One short line. */
  subtitle: string;
  /** A number shown on the card (patients). */
  count?: number;
  /** An alert count (materials running low). */
  badge?: number;
};

/** A compact card: icon, title, one line. Every card has the same height. */
function ServiceCard({ it, wide }: { it: Item; wide?: boolean }) {
  return (
    <Link
      to={it.to}
      className={cn(
        "group flex h-[72px] items-center gap-2.5 rounded-[18px] border border-[#DCE7F5] bg-white px-3.5 shadow-[0_4px_14px_-8px_rgba(30,58,138,0.25)] transition hover:-translate-y-0.5 hover:border-[#1D6FE8]/40 hover:shadow-md md:h-[84px]",
        wide && "col-span-2 md:col-span-1",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F1FE] text-[#1D6FE8] md:size-11">
        <it.icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        {/* Phones: the title may take two lines and the subtitle is left out, so nothing is cut off. */}
        <span className="line-clamp-2 block font-display text-[13px] font-extrabold leading-[17px] text-[#0F2747] md:truncate md:text-sm">{it.title}</span>
        <span className="mt-0.5 hidden truncate text-xs text-[#5B6B82] md:block">{it.subtitle}</span>
      </span>
      {it.count !== undefined && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E8F1FE] px-1.5 text-[11px] font-extrabold text-[#1D6FE8]">
          {it.count}
        </span>
      )}
      {!!it.badge && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-extrabold text-white">
          {it.badge > 99 ? "99+" : it.badge}
        </span>
      )}
    </Link>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-extrabold text-[#0F2747] md:mb-3">
        <span className="h-4 w-1 rounded-full bg-[#1D6FE8]" />
        {title}
      </h3>
      {/* Phones: two columns, an odd last card spans the row. md:+ one column per section. */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-1 md:gap-3">
        {items.map((it, i) => (
          <ServiceCard key={it.to} it={it} wide={items.length % 2 === 1 && i === items.length - 1} />
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/clinic/")({
  component: ClinicHome,
});

function ClinicHome() {
  const { lang, dir, toggle } = useI18n();
  const materialsBadge = useMaterialsBadge();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const { user } = useSession();
  useEffect(() => {
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  const patients = usePatients();
  const appointments = useAppointments();
  const income = todayIncome(useClinic());
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todays = appointments.filter((a) => a.date === todayStr && a.status !== "cancelled");
  const todayCount = todays.length;
  // The next patient: today's first appointment from now on that isn't done.
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const next = todays
    .filter((a) => a.status !== "completed" && (a.time || "") >= nowHm)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""))[0];
  const incomeText =
    income.IQD || !income.USD
      ? fmtMoney(income.IQD, "IQD") + (income.USD ? ` + ${fmtMoney(income.USD, "USD")}` : "")
      : fmtMoney(income.USD, "USD");
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
          {/* Header + clinic switcher: stacked on phones/tablets, one row at lg:+ */}
          <div className="lg:flex lg:items-center lg:gap-5 lg:pt-7 lg:pb-5">
          <header className="flex items-center justify-between px-4 pt-4 pb-2 md:px-0 md:pt-8 md:pb-6 lg:p-0">
            {/* lg:+ : the shell top bar already has language + account */}
            <div className="flex items-center gap-2 md:order-last lg:hidden">
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
              <h1 className="font-display font-extrabold text-lg text-slate-800 md:text-3xl lg:text-[28px] lg:text-slate-900">
                {ar ? "عيادتي" : "My Clinic"}
              </h1>
              <button
                onClick={() => navigate({ to: "/" })}
                className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition md:order-first md:size-10 md:bg-white md:border md:border-slate-200 lg:hidden"
              >
                <BackIcon className="size-5" />
              </button>
            </div>
          </header>

          </div>

          <div className="space-y-4 px-4 pb-8 md:space-y-6 md:px-0 md:pb-12">
            {/* Today at a glance: the clinic, today's visits, the next patient
                and today's income, with one main action under them. */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2F80F0] to-[#1748B8] p-4 text-white shadow-[0_14px_30px_-14px_rgba(29,78,216,0.55)] md:p-7">
              <span className="pointer-events-none absolute -top-14 -start-12 size-48 rounded-full bg-white/10" />
              <div className="relative flex items-center justify-between gap-2">
                {/* Clinic switcher — a dentist running more than one clinic
                    picks which one is active here; every patient/appointment/
                    finance/inventory store below re-keys to that clinic's own
                    isolated storage the moment it changes (see clinicsStore.ts). */}
                <div className="relative min-w-0">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-9 max-w-full items-center gap-1.5 rounded-full bg-white/15 ps-1.5 pe-3 transition hover:bg-white/25"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Building2 className="size-3.5" />
                    </span>
                    <span className="truncate font-display text-[13px] font-extrabold md:text-sm">
                      {activeClinic?.name ?? (ar ? "عيادتي" : "My Clinic")}
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 opacity-85 transition-transform", menuOpen && "rotate-180")} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                      <div className="absolute start-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-[#DCE7F5] bg-white text-slate-800 shadow-xl">
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
                              <p className="truncate font-display text-sm font-bold text-[#0F2747]">{c.name}</p>
                            </button>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                onClick={() => openEditClinic(c)}
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              {c.id === activeClinicId && (
                                <span className="flex size-7 items-center justify-center rounded-lg bg-[#E8F1FE] text-[#1D6FE8]">
                                  <Check className="size-3.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={openAddClinic}
                          className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-[#1D6FE8] hover:bg-[#E8F1FE]"
                        >
                          <Plus className="size-4" />
                          {ar ? "إضافة عيادة جديدة" : "Add new clinic"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <span className="shrink-0 text-[11px] font-bold text-white/75 md:text-sm">{ar ? "ملخص اليوم" : "Today"}</span>
              </div>

              <div className="relative mt-4 grid grid-cols-[1fr_1.35fr_1.35fr] gap-2 md:mt-6 md:gap-4 lg:grid-cols-[1fr_1.4fr_1.4fr_auto] lg:items-stretch">
                <button
                  onClick={() => navigate({ to: "/clinic/appointments" })}
                  className="rounded-2xl bg-white/[0.13] p-2.5 text-start transition hover:bg-white/20 md:p-4"
                >
                  <Calendar className="size-4 opacity-85" />
                  <p className="mt-1.5 font-display text-[22px] font-extrabold leading-7 md:text-3xl md:leading-10">{todayCount}</p>
                  <p className="truncate text-[10.5px] font-bold text-white/80 md:text-xs">{ar ? "مواعيد اليوم" : "Today's visits"}</p>
                </button>
                <button
                  onClick={() => navigate({ to: "/clinic/appointments" })}
                  className="min-w-0 rounded-2xl bg-white/[0.13] p-2.5 text-start transition hover:bg-white/20 md:p-4"
                >
                  <Clock className="size-4 opacity-85" />
                  <p className="mt-1.5 truncate font-display text-[14px] font-extrabold leading-7 md:text-xl md:leading-10">
                    {next ? next.patientName || (ar ? "مريض" : "Patient") : ar ? "لا يوجد" : "None"}
                  </p>
                  <p className="truncate text-[10.5px] font-bold text-white/80 md:text-xs">
                    {next ? (
                      <>
                        {ar ? "التالي" : "Next"} · <bdi dir="ltr">{next.time}</bdi>
                      </>
                    ) : ar ? (
                      "المريض التالي"
                    ) : (
                      "Next patient"
                    )}
                  </p>
                </button>
                <Link to="/clinic/finance" className="min-w-0 rounded-2xl bg-white/[0.13] p-2.5 text-start transition hover:bg-white/20 md:p-4">
                  <CreditCard className="size-4 opacity-85" />
                  <p className="mt-1.5 truncate font-display text-[14px] font-extrabold leading-7 md:text-xl md:leading-10">{incomeText}</p>
                  <p className="truncate text-[10.5px] font-bold text-white/80 md:text-xs">{ar ? "إيرادات اليوم" : "Today's income"}</p>
                </Link>
                <button
                  onClick={() => setShowAddAppointment(true)}
                  className="col-span-3 flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white font-display text-sm font-extrabold text-[#1D6FE8] shadow-sm transition hover:bg-blue-50 lg:col-span-1 lg:h-auto lg:px-8"
                >
                  <Plus className="size-4" strokeWidth={2.6} />
                  {ar ? "إضافة موعد" : "Add appointment"}
                </button>
              </div>
            </section>

            <BookingLinkCard />

            <div className="space-y-5 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
              <Section
                title={ar ? "الخدمات اليومية والمرضى" : "Daily Services & Patients"}
                items={[
                  { to: "/patients", icon: Users, title: ar ? "المرضى والمواعيد" : "Patients & Appointments", subtitle: ar ? "السجلات والمواعيد والخطط" : "Records, visits and plans", count: patients.length },
                  { to: "/clinic/finance", icon: CreditCard, title: ar ? "المالية والحسابات" : "Finance & Accounts", subtitle: ar ? "الإيرادات والمصاريف والفواتير" : "Income, expenses, invoices" },
                ]}
              />
              <Section
                title={ar ? "المخزون والمشتريات" : "Inventory & Purchases"}
                items={[
                  { to: "/clinic/orders", icon: ClipboardList, title: ar ? "طلبيات العيادة والمختبرات" : "Clinic & Lab Orders", subtitle: ar ? "المختبرات والمستلزمات" : "Labs and supplies" },
                  { to: "/clinic/materials", icon: Package, title: ar ? "مواد العيادة" : "Clinic Materials", subtitle: ar ? "المخزون والمستهلكات" : "Stock and consumables", badge: materialsBadge },
                ]}
              />
              <Section
                title={ar ? "الفريق والإدارة" : "Team & Management"}
                items={[
                  { to: "/clinic/doctors", icon: Stethoscope, title: ar ? "أطباء العيادة" : "Clinic Doctors", subtitle: ar ? "الاختصاصات والدوام" : "Specialties and shifts" },
                  { to: "/clinic/secretaries", icon: ShieldCheck, title: ar ? "السكرتارية" : "Secretaries", subtitle: ar ? "الدعوات والصلاحيات" : "Invites and access" },
                  { to: "/clinic/reports", icon: BarChart3, title: ar ? "التقارير والإحصائيات" : "Reports & Statistics", subtitle: ar ? "الأداء الشهري والتصدير" : "Monthly performance, exports" },
                ]}
              />
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  Users,
  UserPlus,
  UserCheck,
  Phone,
  X,
  Edit3,
  Trash2,
  Building2,
} from "lucide-react";
import {
  useStaff,
  addStaffMember,
  updateStaffMember,
  removeStaffMember,
  type StaffDepartment,
  type StaffMember,
} from "@/lib/staffStore";
import { DEPARTMENTS, getDepartment } from "@/data/staffDepartments";

export const Route = createFileRoute("/labs/staff")({
  component: StaffPage,
});

const inputClass =
  "w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition";

function StaffPage() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const staff = useStaff();

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [viewDeptId, setViewDeptId] = useState<StaffDepartment | null>(null);

  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const totalMembers = staff.length;

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => {
      const nameMatch = (ar ? d.ar : d.en).toLowerCase().includes(q);
      const memberMatch = staff.some(
        (m) =>
          m.department === d.id &&
          (m.name.toLowerCase().includes(q) || (m.phone || "").includes(q)),
      );
      return nameMatch || memberMatch;
    });
  }, [search, ar, staff]);

  const countFor = (deptId: StaffDepartment) =>
    staff.filter((m) => m.department === deptId).length;

  const membersOf = (deptId: StaffDepartment) =>
    staff.filter((m) => m.department === deptId);

  const handleSaveMember = (data: { name: string; phone: string; department: StaffDepartment }) => {
    if (editingMember) {
      updateStaffMember(editingMember.id, data);
      toast.success(ar ? "تم تحديث بيانات العضو بنجاح" : "Member updated successfully");
    } else {
      addStaffMember(data);
      toast.success(ar ? "تمت إضافة العضو بنجاح" : "Member added successfully");
    }
    setShowAddModal(false);
    setEditingMember(null);
  };

  const handleRemove = (member: StaffMember) => {
    removeStaffMember(member.id);
    toast.success(ar ? "تم حذف العضو" : "Member removed");
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingMember(member);
    setShowAddModal(true);
  };

  const viewDept = viewDeptId ? getDepartment(viewDeptId) : undefined;
  const viewMembers = viewDeptId ? membersOf(viewDeptId) : [];

  return (
    <div className="min-h-svh bg-slate-50 overflow-x-hidden" dir={dir}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate({ to: "/labs/dashboard" })}
              className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
              title={ar ? "رجوع" : "Back"}
            >
              <BackIcon className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-lg text-slate-900 truncate">
                {ar ? "كادر المختبر" : "Lab Staff"}
              </h1>
              <p className="text-xs text-slate-500 truncate">
                {ar ? "إدارة جميع أعضاء كادر المختبر والمهام والصلاحيات" : "Manage all lab staff members, roles and permissions"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingMember(null);
              setShowAddModal(true);
            }}
            className="h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition shrink-0"
          >
            <UserPlus className="size-4" />
            {ar ? "إضافة عضو جديد" : "Add New Member"}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <span className="size-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Users className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {ar ? "إجمالي الأعضاء" : "Total Members"}
              </p>
              <p className="text-3xl font-extrabold text-slate-900 font-display">{totalMembers}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ar ? "ابحث باسم العضو أو الوظيفة..." : "Search by member name or role..."}
            className="w-full h-11 bg-white rounded-xl border border-slate-200 ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </div>

        {/* Department cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDepartments.map((d) => {
            const Icon = d.icon;
            const count = countFor(d.id);
            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", d.color)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm text-slate-800 truncate">
                      {ar ? d.ar : d.en}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {count} {ar ? "أعضاء" : "members"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2 flex-1">
                  {ar ? d.descAr : d.descEn}
                </p>
                <button
                  onClick={() => setViewDeptId(d.id)}
                  className="w-full h-10 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <UserCheck className="size-4" />
                  {ar ? "عرض الأعضاء" : "View Members"}
                </button>
              </div>
            );
          })}
        </div>

        {filteredDepartments.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {ar ? "لا توجد نتائج مطابقة" : "No matching departments"}
          </div>
        )}
      </div>

      {/* Add / Edit member modal */}
      {showAddModal && (
        <MemberFormModal
          ar={ar}
          editing={editingMember}
          onClose={() => {
            setShowAddModal(false);
            setEditingMember(null);
          }}
          onSave={handleSaveMember}
        />
      )}

      {/* View members modal */}
      {viewDeptId && viewDept && (
        <ViewMembersModal
          ar={ar}
          dept={viewDept}
          members={viewMembers}
          onClose={() => setViewDeptId(null)}
          onEdit={handleOpenEdit}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}

function MemberFormModal({
  ar,
  editing,
  onClose,
  onSave,
}: {
  ar: boolean;
  editing: StaffMember | null;
  onClose: () => void;
  onSave: (data: { name: string; phone: string; department: StaffDepartment }) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [department, setDepartment] = useState<StaffDepartment>(
    editing?.department ?? "cad_designer",
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(ar ? "اسم العضو مطلوب" : "Member name is required");
      return;
    }
    onSave({ name: name.trim(), phone: phone.trim(), department });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92svh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <UserPlus className="size-4" />
            </span>
            <h2 className="font-display font-extrabold text-base">
              {ar
                ? editing
                  ? "تعديل عضو"
                  : "إضافة عضو جديد"
                : editing
                  ? "Edit Member"
                  : "Add New Member"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">
              {ar ? "اسم العضو" : "Member Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ar ? "أدخل اسم العضو" : "Enter member name"}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {ar ? "رقم الهاتف" : "Phone Number"}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={ar ? "أدخل رقم الهاتف" : "Enter phone number"}
              dir="ltr"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {ar ? "القسم" : "Department"}
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as StaffDepartment)}
              className={cn(inputClass, "appearance-none")}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {ar ? d.ar : d.en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
          >
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 h-11 rounded-xl bg-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-sky-700 transition"
          >
            {editing ? (ar ? "حفظ التعديلات" : "Save Changes") : ar ? "إضافة العضو" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewMembersModal({
  ar,
  dept,
  members,
  onClose,
  onEdit,
  onRemove,
}: {
  ar: boolean;
  dept: NonNullable<ReturnType<typeof getDepartment>>;
  members: StaffMember[];
  onClose: () => void;
  onEdit: (m: StaffMember) => void;
  onRemove: (m: StaffMember) => void;
}) {
  const Icon = dept.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92svh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={cn("size-9 rounded-xl flex items-center justify-center", dept.color)}>
              <Icon className="size-4" />
            </span>
            <div>
              <h2 className="font-display font-extrabold text-base">
                {ar ? dept.ar : dept.en}
              </h2>
              <p className="text-[11px] text-slate-400 font-semibold">
                {members.length} {ar ? "أعضاء" : "members"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {members.length === 0 ? (
            <div className="text-center py-12">
              <span className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Users className="size-6 text-slate-400" />
              </span>
              <p className="text-sm text-slate-400">
                {ar ? "لا يوجد أعضاء في هذا القسم بعد" : "No members in this department yet"}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5"
                >
                  <span className="size-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-display font-bold shrink-0">
                    {m.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                    {m.phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1" dir="ltr">
                        <Phone className="size-3" />
                        {m.phone}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onEdit(m)}
                    className="size-8 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 flex items-center justify-center transition"
                    title={ar ? "تعديل" : "Edit"}
                  >
                    <Edit3 className="size-4" />
                  </button>
                  <button
                    onClick={() => onRemove(m)}
                    className="size-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition"
                    title={ar ? "حذف" : "Remove"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
          >
            {ar ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

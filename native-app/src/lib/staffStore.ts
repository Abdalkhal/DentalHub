import { createLocalStore } from "./createLocalStore";

export type StaffDepartment =
  | "cad_designer"
  | "ceramist"
  | "mix_tech"
  | "prosthetics_tech"
  | "sales"
  | "zirconia"
  | "acrylic"
  | "admin_support";

export type StaffMember = {
  id: string;
  name: string;
  phone: string;
  department: StaffDepartment;
  createdAt: string;
};

const staffStore = createLocalStore<StaffMember[]>("dh:lab_staff", [], {
  migrate: (data) => (Array.isArray(data) ? (data as StaffMember[]) : []),
});

export function useStaff(): StaffMember[] {
  return staffStore.useStore();
}

export function addStaffMember(member: Omit<StaffMember, "id" | "createdAt">): StaffMember {
  const full: StaffMember = {
    ...member,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  staffStore.set((prev) => [...prev, full]);
  return full;
}

export function updateStaffMember(id: string, updates: Partial<Omit<StaffMember, "id">>): void {
  staffStore.set((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
}

export function removeStaffMember(id: string): void {
  staffStore.set((prev) => prev.filter((m) => m.id !== id));
}

import { useSyncExternalStore } from "react";

export type Appointment = {
  id: string;
  patientName: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string;
  appointmentType: string;
  clinicRoom: string;
  doctor: string;
  treatment: string;
  notes: string;
  reminder: boolean;
  createdAt: string;
};

const KEY_PREFIX = "dh_appointments_v1:";
let currentUserId = "";
let state: Appointment[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function getKey() {
  return KEY_PREFIX + (currentUserId || "guest");
}

function def(): Appointment[] {
  return [];
}

function load(): Appointment[] {
  if (typeof window === "undefined") return def();
  try {
    const r = localStorage.getItem(getKey());
    return r ? (JSON.parse(r) as Appointment[]) : def();
  } catch {
    return def();
  }
}

function ensure() {
  if (!loaded && typeof window !== "undefined") {
    state = load();
    loaded = true;
  }
}

function save(list: Appointment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(), JSON.stringify(list));
  } catch {}
}

function notify() {
  listeners.forEach((l) => l());
}

function emit() {
  save(state);
  notify();
}

export function setAppointmentsStoreUser(uid: string) {
  currentUserId = uid;
  loaded = false;
  state = [];
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === getKey() && e.newValue) {
      try {
        state = JSON.parse(e.newValue) as Appointment[];
        loaded = true;
        listeners.forEach((l) => l());
      } catch {}
    }
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): Appointment[] {
  ensure();
  return state;
}

function getServerSnapshot(): Appointment[] {
  return def();
}

export function useAppointments(): Appointment[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getAppointments(): Appointment[] {
  ensure();
  return state;
}

function normalizeDate(d: string): string {
  return (d || "").slice(0, 10);
}

export function addAppointment(input: Omit<Appointment, "id" | "createdAt">): Appointment {
  ensure();
  const appt: Appointment = {
    ...input,
    date: normalizeDate(input.date),
    id: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  state = [appt, ...state];
  emit();
  return appt;
}

export function removeAppointment(id: string) {
  ensure();
  state = state.filter((a) => a.id !== id);
  emit();
}

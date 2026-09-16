import { useEffect, useSyncExternalStore } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/integrations/firebase/config";
import { db } from "@/integrations/firebase/client";
import type { StaffDepartment } from "./staffStore";

export type LabRole = "TECHNICIAN" | "DESIGNER" | "ADMIN";

export type LabMember = {
  id: string;
  labId: string;
  uid?: string;
  email: string;
  name: string;
  phone: string;
  role: LabRole;
  department: StaffDepartment;
  status: "invited" | "active";
  createdAt: string;
  invitedBy?: string;
};

/** Maps a lab department to the clean Firestore custom-claim role. */
export function roleForDepartment(dept: StaffDepartment): LabRole {
  if (dept === "cad_designer") return "DESIGNER";
  if (dept === "admin_support") return "ADMIN";
  return "TECHNICIAN";
}

function memberRef(memberId: string) {
  return doc(db, "lab_members", memberId);
}

const functions = getFunctions(app);

// Module-level singleton store (same shape as ordersStore.ts/patientsStore.ts):
// every `useLabMembers(labId)` call anywhere in the app reads the SAME array,
// so an invite made from "كادر المختبر" shows up immediately in "طلب
// جديد"'s staff picker too instead of each screen tracking its own copy.
//
// Fetched through the `listLabMembers` Cloud Function (Admin SDK) rather
// than a client-side `collectionGroup` query + `onSnapshot`: that query kept
// failing outright with "Missing or insufficient permissions" because
// Firestore requires a security rule declared with the recursive
// `{path=**}` wildcard to authorize a `collectionGroup()` read, separately
// from the ordinary rule that already covers a normal `collection()`/`doc()`
// read at that same path — easy to get wrong, and the failure mode looks
// identical to "no members" with no visible error. Routing the read through
// the same trusted server path as `inviteLabMember` sidesteps that class of
// bug for a list that was never realtime-critical to begin with.
let members: LabMember[] = [];
let _labId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): LabMember[] {
  return members;
}

function getServerSnapshot(): LabMember[] {
  return [];
}

async function fetchLabMembers(labId: string): Promise<void> {
  const call = httpsCallable<{ labId: string }, { members: LabMember[] }>(
    functions,
    "listLabMembers",
  );
  try {
    const res = await call({ labId });
    if (_labId !== labId) return; // a newer call for a different lab has since started
    members = res.data.members;
    emit();
  } catch (err) {
    console.warn("Failed to fetch lab members:", err);
  }
}

function connectLabMembers(labId: string) {
  _labId = labId;
  void fetchLabMembers(labId);
}

/** Realtime, shared list of members for a lab — see the store comment above. */
export function useLabMembers(labId: string) {
  useEffect(() => {
    if (!labId) return;
    connectLabMembers(labId);
  }, [labId]);

  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { members: labId ? list : [] };
}

export type InviteLabMemberInput = {
  email: string;
  name: string;
  phone?: string;
  role: LabRole;
  department: StaffDepartment;
  /** Chosen by the lab owner and relayed to the member directly — there is no email/SMS delivery. */
  password: string;
};

/**
 * Invokes the `inviteLabMember` Cloud Function which creates (or links) a real
 * Firebase Auth account, sets custom claims (`role`, `labId`) and writes the
 * `lab_members` document server-side.
 *
 * Updates the shared store optimistically the moment the call succeeds (so
 * "إجمالي الأعضاء" and the staff pickers reflect it instantly), then
 * refetches in the background to reconcile with the server.
 */
export async function inviteLabMember(
  labId: string,
  input: InviteLabMemberInput,
): Promise<{ uid: string; created: boolean }> {
  const call = httpsCallable<
    { labId: string } & InviteLabMemberInput,
    { memberId: string; uid: string; created: boolean }
  >(functions, "inviteLabMember");
  const res = await call({ labId, ...input });
  const { uid, created } = res.data;

  if (_labId === labId && !members.some((m) => m.id === uid)) {
    members = [
      ...members,
      {
        id: uid,
        uid,
        labId,
        email: input.email,
        name: input.name,
        phone: input.phone ?? "",
        role: input.role,
        department: input.department,
        status: created ? "invited" : "active",
        createdAt: new Date().toISOString(),
      },
    ];
    emit();
  }
  void fetchLabMembers(labId);

  return { uid, created };
}

/** Updates a member's role/department/contact info (owner or lab admin only). */
export async function updateLabMember(
  labId: string,
  memberId: string,
  updates: Partial<Pick<LabMember, "name" | "phone" | "role" | "department">>,
): Promise<void> {
  await setDoc(memberRef(memberId), { labId, ...updates }, { merge: true });
  members = members.map((m) => (m.id === memberId ? { ...m, ...updates } : m));
  emit();
}

/** Removes a member (owner or lab admin only). */
export async function removeLabMember(memberId: string): Promise<void> {
  await deleteDoc(memberRef(memberId));
  members = members.filter((m) => m.id !== memberId);
  emit();
}

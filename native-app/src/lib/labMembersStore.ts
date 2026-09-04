import { useEffect, useState } from "react";
import {
  collectionGroup,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
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

/** Realtime listener for all members of a lab. */
export function useLabMembers(labId: string) {
  const [members, setMembers] = useState<LabMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labId) {
      setMembers([]);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const q = query(collectionGroup(db, "lab_members"), where("labId", "==", labId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LabMember, "id">) })));
        setLoading(false);
      },
      () => {
        setMembers([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [labId]);

  return { members, loading };
}

export type InviteLabMemberInput = {
  email: string;
  name: string;
  phone?: string;
  role: LabRole;
  department: StaffDepartment;
};

/**
 * Invokes the `inviteLabMember` Cloud Function which creates (or links) a real
 * Firebase Auth account, sets custom claims (`role`, `labId`) and writes the
 * `lab_members` document server-side.
 */
export async function inviteLabMember(labId: string, input: InviteLabMemberInput): Promise<void> {
  const functions = getFunctions(app);
  const call = httpsCallable<{ labId: string } & InviteLabMemberInput, { memberId: string }>(
    functions,
    "inviteLabMember",
  );
  await call({ labId, ...input });
}

/** Updates a member's role/department/contact info (owner or lab admin only). */
export async function updateLabMember(
  labId: string,
  memberId: string,
  updates: Partial<Pick<LabMember, "name" | "phone" | "role" | "department">>,
): Promise<void> {
  await setDoc(memberRef(memberId), { labId, ...updates }, { merge: true });
}

/** Removes a member (owner or lab admin only). */
export async function removeLabMember(memberId: string): Promise<void> {
  await deleteDoc(memberRef(memberId));
}

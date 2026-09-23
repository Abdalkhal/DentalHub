import { useEffect, useState } from "react";
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

// Fetched through the `listLabMembers` Cloud Function (Admin SDK) rather
// than a client-side `collectionGroup` query + `onSnapshot`: Firestore
// requires a security rule declared with the recursive `{path=**}` wildcard
// to authorize a `collectionGroup()` read, separately from the ordinary
// rule that already covers a normal `collection()`/`doc()` read at that
// same path — easy to get wrong, and the failure mode looks identical to
// "no members" with no visible error (a flat "Missing or insufficient
// permissions" from the listener, silently caught). Routing the read
// through the same trusted server path as `inviteLabMember` sidesteps that
// class of bug for a list that was never realtime-critical to begin with.
export function useLabMembers(labId: string) {
  const [members, setMembers] = useState<LabMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!labId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const call = httpsCallable<{ labId: string }, { members: LabMember[] }>(
        functions,
        "listLabMembers",
      );
      const res = await call({ labId });
      setMembers(res.data.members);
    } catch (err) {
      console.warn("Failed to fetch lab members:", err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId]);

  return { members, loading, refetch };
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
  return { uid: res.data.uid, created: res.data.created };
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

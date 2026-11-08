// Current name / photo / account type of other accounts, from
// public_profiles, cached. Used by the messages screens so a conversation
// shows who the other side is *now* (the thread doc only keeps the name and
// photo from when they last wrote). Identical in the web app and the native
// app (src/lib/accountCards.ts).
import { useQueries, useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

export type AccountCard = { name: string; photoURL: string; accountType: string };

async function fetchCard(uid: string): Promise<AccountCard | null> {
  const snap = await getDoc(doc(db, "public_profiles", uid));
  if (!snap.exists()) return null;
  const d = snap.data() as Record<string, unknown>;
  const name = [d.name, d.surname].filter((x) => typeof x === "string" && x.trim()).join(" ").trim();
  return {
    name: name || String(d.clinicName || ""),
    photoURL: typeof d.photoURL === "string" ? d.photoURL : "",
    accountType: typeof d.accountType === "string" ? d.accountType : "",
  };
}

const opts = (uid: string) => ({
  queryKey: ["account-card", uid],
  queryFn: () => fetchCard(uid),
  enabled: !!uid,
  staleTime: 10 * 60_000,
});

export function useAccountCard(uid: string | undefined) {
  return useQuery(opts(uid ?? "")).data ?? null;
}

/** Cards for several accounts at once, keyed by uid (missing ones omitted). */
export function useAccountCards(uids: string[]): Record<string, AccountCard> {
  const unique = [...new Set(uids.filter(Boolean))];
  const results = useQueries({ queries: unique.map(opts) });
  const out: Record<string, AccountCard> = {};
  results.forEach((r, i) => {
    if (r.data) out[unique[i]] = r.data;
  });
  return out;
}

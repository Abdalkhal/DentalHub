import { useEffect, useState } from "react";
import {
  onSnapshot,
  type Query,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

export function useRealtimeQuery<T>(
  q: Query<DocumentData> | null,
  mapper?: (doc: QueryDocumentSnapshot<DocumentData>) => T,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) return;
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => (mapper ? mapper(d) : (d.data() as T))));
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsub;
  }, [q, mapper]);

  return { data, loading };
}

export function useRealtimeDoc<T>(ref: DocumentReference<DocumentData> | null): {
  data: T | null;
  loading: boolean;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) return;
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? (snap.data() as T) : null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsub;
  }, [ref]);

  return { data, loading };
}

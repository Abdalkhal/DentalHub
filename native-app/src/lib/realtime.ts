import { useEffect, useRef, useState } from "react";
import {
  onSnapshot,
  queryEqual,
  refEqual,
  type Query,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

// Callers build their query/ref (and mapper) inline, so each render hands us a
// new object. Keying the effect on identity re-subscribed on every render, and
// every snapshot's setState caused another render — an endless
// unsubscribe/subscribe loop (~50 Listen requests/sec). Reuse the previous
// object while it is structurally equal so the effect only re-runs on a real
// change.
function useStableQuery(q: Query<DocumentData> | null) {
  const ref = useRef(q);
  if (q !== ref.current && (!q || !ref.current || !queryEqual(q, ref.current))) {
    ref.current = q;
  }
  return ref.current;
}

function useStableRef(r: DocumentReference<DocumentData> | null) {
  const ref = useRef(r);
  if (r !== ref.current && (!r || !ref.current || !refEqual(r, ref.current))) {
    ref.current = r;
  }
  return ref.current;
}

export function useRealtimeQuery<T>(
  q: Query<DocumentData> | null,
  mapper?: (doc: QueryDocumentSnapshot<DocumentData>) => T,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const stableQ = useStableQuery(q);
  const mapperRef = useRef(mapper);
  mapperRef.current = mapper;

  useEffect(() => {
    if (!stableQ) return;
    const unsub = onSnapshot(
      stableQ,
      (snap) => {
        const map = mapperRef.current;
        setData(snap.docs.map((d) => (map ? map(d) : (d.data() as T))));
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsub;
  }, [stableQ]);

  return { data, loading };
}

export function useRealtimeDoc<T>(ref: DocumentReference<DocumentData> | null): {
  data: T | null;
  loading: boolean;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const stableRef = useStableRef(ref);

  useEffect(() => {
    if (!stableRef) return;
    const unsub = onSnapshot(
      stableRef,
      (snap) => {
        setData(snap.exists() ? (snap.data() as T) : null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsub;
  }, [stableRef]);

  return { data, loading };
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  QueryConstraint,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Firestore,
} from "firebase/firestore";

const DEFAULT_PAGE_SIZE = 20;

export type PaginatedResult<T> = {
  items: T[];
  hasMore: boolean;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
};

export type PaginationParams = {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
};

export type SortConfig = {
  field: string;
  direction: "asc" | "desc";
};

export type FilterConfig = {
  field: string;
  operator: "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains" | "array-contains-any";
  value: unknown;
};

export function buildPaginatedQuery(
  db: Firestore,
  collectionName: string,
  options: {
    filters?: FilterConfig[];
    sort?: SortConfig;
    pagination?: PaginationParams;
  } = {},
) {
  const constraints: QueryConstraint[] = [];

  if (options.filters) {
    for (const f of options.filters) {
      constraints.push(where(f.field, f.operator as any, f.value as any));
    }
  }

  if (options.sort) {
    constraints.push(orderBy(options.sort.field, options.sort.direction));
  }

  const pageSize = options.pagination?.pageSize ?? DEFAULT_PAGE_SIZE;
  constraints.push(limit(pageSize));

  if (options.pagination?.cursor) {
    constraints.push(startAfter(options.pagination.cursor));
  }

  return query(collection(db, collectionName), ...constraints);
}

export async function fetchPage<T>(
  db: Firestore,
  collectionName: string,
  options: {
    filters?: FilterConfig[];
    sort?: SortConfig;
    pagination?: PaginationParams;
  } = {},
): Promise<PaginatedResult<T>> {
  const q = buildPaginatedQuery(db, collectionName, options);
  const snapshot = await getDocs(q);

  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
  const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  const hasMore = snapshot.docs.length >= (options.pagination?.pageSize ?? DEFAULT_PAGE_SIZE);

  return { items, hasMore, lastVisible };
}

export async function getDocument<T>(db: Firestore, collectionName: string, documentId: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, documentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as unknown as T;
}

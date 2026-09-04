import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { MATERIALS, WORK_TYPES, MANUFACTURING_METHODS } from "./dentalConfig";

export type CatalogMaterial = { id: string; ar: string; en: string };
export type CatalogWorkType = {
  id: string;
  ar: string;
  en: string;
  category?: "core" | "advanced";
};
export type CatalogMethod = { id: string; ar: string; en: string };

export type LabCatalog = {
  materials: CatalogMaterial[];
  workTypes: CatalogWorkType[];
  manufacturingMethods: CatalogMethod[];
  updatedAt?: string;
};

/**
 * Single shared source of truth for the default lab work-services menu.
 * Used as the fallback everywhere (dentist order form and lab dashboard)
 * when a lab has not configured its own custom catalog yet.
 *
 * - 8 primary materials (زركون، إيماكس، سيراميك ملتحم بالمعدن، معدن كامل،
 *   سيراميك تجميلي، تركيبات مؤقتة، تقويم شفاف، تيتانيوم بار).
 * - All work types (core + advanced).
 * - All manufacturing methods.
 */
export const DEFAULT_LAB_SERVICES: LabCatalog = {
  materials: MATERIALS.map((m) => ({ id: m.id, ar: m.ar, en: m.en })),
  workTypes: WORK_TYPES.map((w) => ({ id: w.id, ar: w.ar, en: w.en, category: w.category })),
  manufacturingMethods: MANUFACTURING_METHODS.map((m) => ({ id: m.id, ar: m.ar, en: m.en })),
};

/** Returns a fresh clone of the default full catalog. */
export function defaultCatalog(): LabCatalog {
  return {
    materials: DEFAULT_LAB_SERVICES.materials.map((m) => ({ ...m })),
    workTypes: DEFAULT_LAB_SERVICES.workTypes.map((w) => ({ ...w })),
    manufacturingMethods: DEFAULT_LAB_SERVICES.manufacturingMethods.map((m) => ({ ...m })),
  };
}

function catalogDocRef(labId: string) {
  return doc(db, "labs", labId, "custom_catalog", "catalog");
}

/**
 * Live listener for a lab's custom catalog. Falls back to the default full
 * catalog when no custom configuration exists yet.
 */
export function useLabCatalog(labId: string) {
  const [catalog, setCatalog] = useState<LabCatalog>(defaultCatalog());
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!labId) {
      setCatalog(defaultCatalog());
      setIsCustom(false);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const unsub = onSnapshot(
      catalogDocRef(labId),
      (snap) => {
        const base = defaultCatalog();
        if (snap.exists()) {
          const data = snap.data() as Partial<LabCatalog>;
          setCatalog({
            materials: data.materials?.length ? data.materials : base.materials,
            workTypes: data.workTypes?.length ? data.workTypes : base.workTypes,
            manufacturingMethods: data.manufacturingMethods?.length
              ? data.manufacturingMethods
              : base.manufacturingMethods,
            updatedAt: data.updatedAt,
          });
          setIsCustom(true);
        } else {
          setCatalog(base);
          setIsCustom(false);
        }
        setLoading(false);
      },
      () => {
        setCatalog(defaultCatalog());
        setIsCustom(false);
        setLoading(false);
      },
    );
    return unsub;
  }, [labId]);

  return { catalog, isCustom, loading };
}

/** Persists the modified catalog under `labs/{labId}/custom_catalog`. */
export async function saveLabCatalog(labId: string, catalog: LabCatalog): Promise<void> {
  await setDoc(
    catalogDocRef(labId),
    { ...catalog, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

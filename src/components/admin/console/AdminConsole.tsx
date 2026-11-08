import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, orderBy, query, type Timestamp } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { BranchesTab } from "@/components/admin/BranchesTab";
import { LabsTab } from "@/components/admin/LabsTab";
import { OfficesTab } from "@/components/admin/OfficesTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { CleanupOrphansButton, SyncProfilesButton } from "@/components/admin/SyncProfilesButton";
import {
  adActionCall,
  adminErrorMessage,
  extendSubscriptionAction,
  getAccountFile,
  getBusinessData,
  resolveReportAction,
  revokeSessionsAction,
  setAccountStatusAction,
  setCommissionRate,
  type BusinessData,
} from "@/lib/adminBusiness";
import { useAdminAccounts, useAdminLogs, useAdminOffers } from "@/lib/adminPanel";
import { useAllAds } from "@/lib/adsStore";
import { useSignedImageUrls } from "@/lib/products";
import { useRealtimeQuery } from "@/lib/realtime";
import { AdminConsoleView, type AdminAd, type AdminReport, type ConsoleActions } from "./AdminConsoleView";
import { SegmentedTabs } from "./ui";

function useReports() {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  return useRealtimeQuery<AdminReport>(q, (d) => {
    const x = d.data() as Record<string, unknown>;
    return { ...(x as AdminReport), id: d.id, createdAt: (x.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? "" };
  });
}

function ContentTabs() {
  const [tab, setTab] = useState<"branches" | "offices" | "labs" | "products">("products");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "products", label: "المنتجات" },
            { value: "offices", label: "المكاتب" },
            { value: "labs", label: "المختبرات" },
            { value: "branches", label: "الفروع" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <SyncProfilesButton ar />
          <CleanupOrphansButton ar />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 md:p-5">
        {tab === "products" && <ProductsTab />}
        {tab === "offices" && <OfficesTab />}
        {tab === "labs" && <LabsTab />}
        {tab === "branches" && <BranchesTab />}
      </div>
    </div>
  );
}

export function AdminConsole({ adminName }: { adminName: string }) {
  const { data: accounts = [] } = useAdminAccounts();
  const { data: offers = [] } = useAdminOffers();
  const { data: logs = [] } = useAdminLogs(200);
  const { data: reports = [] } = useReports();
  const { data: generalAds = [] } = useAllAds();
  const adPaths = useMemo(() => generalAds.map((a) => a.images?.[0]).filter(Boolean) as string[], [generalAds]);
  const { data: adUrls = {} } = useSignedImageUrls(adPaths);
  const allAds: AdminAd[] = useMemo(
    () => [
      ...offers,
      ...generalAds.map(
        (a): AdminAd =>
          ({
            id: a.id,
            kind: "ads",
            ownerName: a.accountName,
            supplierId: a.accountId,
            title: a.title,
            description: a.description,
            imageUrl: adUrls[a.images?.[0] ?? ""] ?? "",
            expiryDate: a.expiryDate ?? "",
            currency: "USD",
            status: a.status,
            rejectReason: a.rejectReason,
          }) as AdminAd,
      ),
    ],
    [offers, generalAds, adUrls],
  );
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [businessError, setBusinessError] = useState("");

  const refreshBusiness = useCallback(() => {
    setBusinessError("");
    getBusinessData()
      .then(setBusiness)
      .catch((err) => {
        console.warn("Admin business data not loaded:", err);
        setBusinessError("تعذر تحميل بيانات الأرباح والمختبرات. حاول التحديث.");
      });
  }, []);
  useEffect(refreshBusiness, [refreshBusiness]);

  const actions: ConsoleActions = {
    refreshBusiness,
    setRate: setCommissionRate,
    loadAccountFile: getAccountFile,
    setStatus: (uid, status, reason) => setAccountStatusAction(uid, status, reason),
    extend: extendSubscriptionAction,
    revoke: revokeSessionsAction,
    approveAd: (ad, expiryDate) => adActionCall({ collection: ad.kind === "ads" ? "ads" : "offers", id: ad.id, action: "approve", expiryDate }),
    rejectAd: (ad, reason) => adActionCall({ collection: ad.kind === "ads" ? "ads" : "offers", id: ad.id, action: "reject", reason }),
    stopAd: (ad) => adActionCall({ collection: ad.kind === "ads" ? "ads" : "offers", id: ad.id, action: "stop" }),
    resolveReport: resolveReportAction,
    signOut: () => void signOut(auth),
    errorText: adminErrorMessage,
  };

  return (
    <AdminConsoleView
      adminName={adminName}
      business={business}
      businessError={businessError}
      accounts={accounts}
      offers={allAds}
      reports={reports}
      logs={logs}
      actions={actions}
      contentSlot={<ContentTabs />}
    />
  );
}

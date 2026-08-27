import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { OrderInvoiceModal } from "@/components/OrderInvoiceModal";
import { OfficialInvoiceView } from "@/components/OfficialInvoiceView";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { useDentistCases, isCompletedStatus } from "@/lib/caseTracking";
import { useDentistInvoices } from "@/lib/invoices";
import { resolveOrderTotal } from "@/lib/orderLines";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import type { UserRoleDoc, InvoiceDoc } from "@/integrations/firebase/types";
import type { Order } from "@/lib/ordersStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2,
  ReceiptText,
  FlaskConical,
  Package,
  Bone,
  X,
  Printer,
  Hash,
  Share2,
} from "lucide-react";

export const Route = createFileRoute("/invoices/")({
  component: Invoices,
});

type Tab = "all" | "supplies" | "implants" | "labs";

function fmtOrderTotal(order: Order): string {
  const n = resolveOrderTotal(order);
  if (order.currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${n.toLocaleString("en-US")} د.ع`;
}

function fmtOfficeTotal(inv: InvoiceDoc): string {
  const usd = Number(inv.totalUSD) || 0;
  const iqd = Number(inv.totalIQD) || 0;
  if (iqd > 0 && usd > 0) return `${iqd.toLocaleString("en-US")} د.ع + $${usd.toFixed(2)}`;
  if (iqd > 0) return `${iqd.toLocaleString("en-US")} د.ع`;
  return `$${(Number(inv.total) || usd).toFixed(2)}`;
}

/** Fetches `user_roles` profiles for a set of ids (labs / offices). */
function useProfiles(ids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, UserRoleDoc>>({});
  const [loading, setLoading] = useState(true);

  const key = ids.slice().sort().join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setProfiles({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const map: Record<string, UserRoleDoc> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "user_roles", id));
            if (snap.exists()) map[id] = snap.data() as UserRoleDoc;
          } catch {
            /* ignore missing profiles */
          }
        }),
      );
      if (!cancelled) {
        setProfiles(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { profiles, loading };
}

function Invoices() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>("all");
  const [selectedLab, setSelectedLab] = useState<{ labId: string; order: Order } | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<InvoiceDoc | null>(null);

  const { cases: labCases, loading: labLoading } = useDentistCases(user?.uid ?? "");
  const { invoices: officeInvoices, loading: officeLoading } = useDentistInvoices(user?.uid ?? "");

  // Lab invoices = completed lab cases for this doctor (English or Arabic).
  const completedLab = useMemo(
    () => labCases.filter((c) => isCompletedStatus(c.order.status)),
    [labCases],
  );

  const labIds = useMemo(
    () => [...new Set(completedLab.map((c) => c.labId).filter(Boolean))],
    [completedLab],
  );
  const officeIds = useMemo(
    () => [...new Set(officeInvoices.map((i) => i.officeId).filter(Boolean))],
    [officeInvoices],
  );
  const { profiles, loading: profilesLoading } = useProfiles([...labIds, ...officeIds]);

  const labCards = useMemo(
    () =>
      completedLab.map((c) => ({
        key: `lab-${c.order.id}`,
        labId: c.labId,
        order: c.order,
        profile: profiles[c.labId],
      })),
    [completedLab, profiles],
  );

  const supplies = useMemo(
    () => officeInvoices.filter((i) => profiles[i.officeId]?.accountType === "supply"),
    [officeInvoices, profiles],
  );
  const implants = useMemo(
    () => officeInvoices.filter((i) => profiles[i.officeId]?.accountType === "implant"),
    [officeInvoices, profiles],
  );

  const loading = labLoading || officeLoading || profilesLoading;

  const tabs: { id: Tab; ar: string; en: string }[] = [
    { id: "all", ar: "الكل", en: "All" },
    { id: "supplies", ar: "فواتير المستلزمات", en: "Supplies" },
    { id: "implants", ar: "فواتير شركات الزرعات", en: "Implants" },
    { id: "labs", ar: "فواتير المختبرات", en: "Labs" },
  ];

  const renderCard = (item: {
    key: string;
    name: string;
    orderNumber: string;
    total: string;
    icon: typeof ReceiptText;
    iconTone: string;
    onClick: () => void;
  }) => (
    <button
      key={item.key}
      onClick={item.onClick}
      className="w-full bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-card transition text-start"
    >
      <div className="flex items-center gap-3">
        <span className={cn("size-11 rounded-2xl ring-1 flex items-center justify-center shrink-0", item.iconTone)}>
          <item.icon className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm text-foreground truncate">{item.name}</p>
          <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1" dir="ltr">
            <Hash className="size-3 shrink-0" />
            {item.orderNumber}
          </p>
        </div>
        <span className="font-display font-extrabold text-base text-emerald-700 shrink-0" dir="ltr">
          {item.total}
        </span>
      </div>
    </button>
  );

  const labCardsList = labCards.map((c) => {
    const profile = c.profile;
    const name = profile?.name || (ar ? "مختبر" : "Lab");
    return renderCard({
      key: c.key,
      name,
      orderNumber: c.order.orderNumber || `#${c.order.caseId ?? ""}`,
      total: fmtOrderTotal(c.order),
      icon: FlaskConical,
      iconTone: "bg-violet-50 ring-violet-200 text-violet-600",
      onClick: () => setSelectedLab({ labId: c.labId, order: c.order }),
    });
  });

  const supplyCardsList = supplies.map((inv) => {
    const profile = profiles[inv.officeId];
    const name = profile?.name || (ar ? "مكتب مستلزمات" : "Supplies Office");
    return renderCard({
      key: `sup-${inv.id}`,
      name,
      orderNumber: inv.orderNumber,
      total: fmtOfficeTotal(inv),
      icon: Package,
      iconTone: "bg-sky-50 ring-sky-200 text-sky-600",
      onClick: () => setSelectedOffice(inv),
    });
  });

  const implantCardsList = implants.map((inv) => {
    const profile = profiles[inv.officeId];
    const name = profile?.name || (ar ? "شركة زرعات" : "Implant Company");
    return renderCard({
      key: `imp-${inv.id}`,
      name,
      orderNumber: inv.orderNumber,
      total: fmtOfficeTotal(inv),
      icon: Bone,
      iconTone: "bg-amber-50 ring-amber-200 text-amber-600",
      onClick: () => setSelectedOffice(inv),
    });
  });

  const list =
    tab === "labs"
      ? labCardsList
      : tab === "supplies"
        ? supplyCardsList
        : tab === "implants"
          ? implantCardsList
          : [...labCardsList, ...supplyCardsList, ...implantCardsList];

  const activeLab = selectedLab
    ? {
        order: selectedLab.order,
        profile: profiles[selectedLab.labId],
      }
    : null;

  return (
    <MobileShell>
      <TopBar title={ar ? "الفواتير" : "Invoices"} showBack />
      <div className="px-4 pt-3 pb-6">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-9 px-3.5 rounded-full text-xs font-bold border transition",
                tab === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent",
              )}
            >
              {ar ? t.ar : t.en}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {list.length} {ar ? "فواتير" : "invoices"}
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <span className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/30 mb-4">
              <ReceiptText className="size-8" strokeWidth={1.5} />
            </span>
            <p className="font-display font-bold text-sm text-muted-foreground">
              {ar ? "لا توجد فواتير بعد" : "No invoices yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">{list}</div>
        )}
      </div>

      {/* Lab invoice modal (official printable blue header) */}
      {activeLab && (
        <OrderInvoiceModal
          order={activeLab.order}
          labName={activeLab.profile?.name}
          labAddress={
            activeLab.profile
              ? [activeLab.profile.city, activeLab.profile.address].filter(Boolean).join("، ")
              : undefined
          }
          labPhone={activeLab.profile?.phone}
          onClose={() => setSelectedLab(null)}
        />
      )}

      {/* Supplies / implant invoice modal */}
      {selectedOffice && (
        <OfficeInvoiceModal
          invoice={selectedOffice}
          officeName={profiles[selectedOffice.officeId]?.name}
          officePhone={profiles[selectedOffice.officeId]?.phone}
          officeAddress={[
            profiles[selectedOffice.officeId]?.city,
            profiles[selectedOffice.officeId]?.address,
          ]
            .filter(Boolean)
            .join("، ")}
          ar={ar}
          onClose={() => setSelectedOffice(null)}
        />
      )}
    </MobileShell>
  );
}

function OfficeInvoiceModal({
  invoice,
  officeName,
  officePhone,
  officeAddress,
  ar,
  onClose,
}: {
  invoice: InvoiceDoc;
  officeName?: string;
  officePhone?: string;
  officeAddress?: string;
  ar: boolean;
  onClose: () => void;
}) {
  const handlePrint = () => window.print();

  const handleShare = async () => {
    const lines = invoice.items.map((i) => {
      const total =
        i.currency === "IQD"
          ? `${(i.price * i.quantity).toLocaleString("en-US")} د.ع`
          : `$${(i.price * i.quantity).toFixed(2)}`;
      return `• ${i.name} ×${i.quantity} — ${total}`;
    });
    const usd = Number(invoice.totalUSD) || 0;
    const iqd = Number(invoice.totalIQD) || 0;
    const text = [
      ar ? "فاتورة" : "Invoice",
      invoice.orderNumber,
      invoice.doctorName,
      ...lines,
      ...(iqd > 0
        ? [ar ? `الإجمالي بالدينار: ${iqd.toLocaleString("en-US")} د.ع` : `IQD total: ${iqd.toLocaleString("en-US")} IQD`]
        : []),
      ...(usd > 0
        ? [ar ? `الإجمالي بالدولار: $${usd.toFixed(2)}` : `USD total: $${usd.toFixed(2)}`]
        : []),
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: ar ? "فاتورة" : "Invoice", text });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard?.writeText(text);
        toast.success(ar ? "تم نسخ ملخص الفاتورة" : "Invoice summary copied");
      } catch {
        toast.error(ar ? "تعذرت المشاركة" : "Share failed");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-slate-100 border-b-0 shadow-sm">
            <h3 className="font-display font-extrabold text-base text-slate-900">
              {ar ? "فاتورة المستلزمات" : "Supplies Invoice"}
            </h3>
            <button
              onClick={onClose}
              className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Print / Share */}
          <div className="flex gap-2 bg-white px-4 pb-3 no-print">
            <button
              onClick={handlePrint}
              className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
              style={{ backgroundColor: "#0E6E66" }}
            >
              <Printer className="size-4" />
              {ar ? "طباعة" : "Print"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition"
            >
              <Share2 className="size-4" />
              {ar ? "مشاركة" : "Share"}
            </button>
          </div>

          {/* Invoice document */}
          <div id="invoice-print" className="bg-white rounded-b-2xl border border-slate-100 p-4">
            <OfficialInvoiceView
              invoice={invoice}
              storeName={officeName || (ar ? "مكتب المستلزمات الطبية" : "Medical Supplies Store")}
              storePhone={officePhone || ""}
              storeAddress={officeAddress || ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { OrderInvoiceModal } from "@/components/OrderInvoiceModal";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { useDentistCases, isCompletedStatus } from "@/lib/caseTracking";
import { useDentistInvoices } from "@/lib/invoices";
import { resolveOrderTotal } from "@/lib/orderLines";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import type { UserRoleDoc, InvoiceDoc, InvoiceItem } from "@/integrations/firebase/types";
import type { Order } from "@/lib/ordersStore";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ReceiptText,
  FlaskConical,
  Package,
  Bone,
  X,
  Printer,
  Hash,
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

function fmtDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
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
  ar,
  onClose,
}: {
  invoice: InvoiceDoc;
  officeName?: string;
  ar: boolean;
  onClose: () => void;
}) {
  const itemTotal = (it: InvoiceItem) =>
    it.currency === "IQD"
      ? `${(it.price * it.quantity).toLocaleString("en-US")} د.ع`
      : `$${(it.price * it.quantity).toFixed(2)}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
        <div
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-l from-sky-600 to-blue-600 text-white">
            <div className="min-w-0">
              <p className="font-display font-extrabold truncate">{officeName || (ar ? "فاتورة" : "Invoice")}</p>
              <p className="text-xs text-white/80 font-mono" dir="ltr">
                {invoice.orderNumber}
              </p>
            </div>
            <button onClick={onClose} className="size-9 rounded-xl hover:bg-white/15 flex items-center justify-center">
              <X className="size-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{ar ? "تاريخ الفاتورة" : "Date"}</span>
              <span>{fmtDate(invoice.createdAt) || "—"}</span>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              {invoice.items.map((it, i) => (
                <div key={`${it.productId}-${i}`} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-700 truncate">{it.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {it.quantity} {ar ? "×" : "×"} {it.currency === "IQD" ? it.price.toLocaleString() : `$${it.price.toFixed(2)}`}
                    </p>
                  </div>
                  <span className="font-bold text-slate-800 shrink-0" dir="ltr">{itemTotal(it)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">{ar ? "الإجمالي" : "Total"}</span>
              <span className="font-display font-extrabold text-lg text-emerald-700" dir="ltr">
                {fmtOfficeTotal(invoice)}
              </span>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full h-11 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition no-print"
            >
              <Printer className="size-4" />
              {ar ? "طباعة الفاتورة" : "Print Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

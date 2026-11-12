import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Lock, Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { useI18n } from "@/lib/i18n";
import { useSession, useUserRole } from "@/lib/useAuth";
import { useOrders } from "@/lib/orders";
import { officeDoctors } from "@/lib/promo";
import { productsQueryKey } from "@/lib/products";
import {
  decidePriceAccess,
  grantPriceAccess,
  officePriceAccessKey,
  revokePriceAccess,
  setPricesHidden,
  useOfficePriceAccess,
  type PriceAccess,
} from "@/lib/priceAccess";
import { cn } from "@/lib/utils";

// Same screen as the native app's price-access.tsx.
export const Route = createFileRoute("/price-access")({
  component: () => (
    <RoleGuard allowedRoles={["supply", "implant"]}>
      <PriceAccessManager />
    </RoleGuard>
  ),
});

const TEAL = "#0E6E66";

function PriceAccessManager() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const uid = user?.uid;
  const qc = useQueryClient();
  const officeName = role?.name || "";
  const hidden = role?.pricesHidden === true;
  const [switching, setSwitching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: list = [], isLoading } = useOfficePriceAccess(uid);
  const { data: orders = [] } = useOrders(uid);

  const pending = list.filter((a) => a.status === "pending");
  const approved = list.filter((a) => a.status === "approved");
  const known = useMemo(() => new Set(list.filter((a) => a.status !== "declined").map((a) => a.doctorId)), [list]);
  const q = search.trim().toLowerCase();
  const others = officeDoctors(orders)
    .filter((d) => !known.has(d.id))
    .filter((d) => !q || d.name.toLowerCase().includes(q));

  const refresh = () => qc.invalidateQueries({ queryKey: officePriceAccessKey(uid) });

  const toggle = async () => {
    const next = !hidden;
    const message = next
      ? ar
        ? "لن يرى أسعارك إلا الأطباء الذين تعتمدهم. باقي الأطباء يرون «اطلب السعر». متابعة؟"
        : 'Only doctors you approve will see your prices. Others see "Request price". Continue?'
      : ar
        ? "ستظهر أسعارك لكل الأطباء مرة أخرى. متابعة؟"
        : "Your prices will show to every doctor again. Continue?";
    if (!window.confirm(message)) return;
    setSwitching(true);
    try {
      await setPricesHidden(next);
      await qc.invalidateQueries({ queryKey: productsQueryKey });
      toast.success(next ? (ar ? "أصبحت أسعارك للمعتمدين فقط" : "Prices are now for approved doctors") : ar ? "أسعارك ظاهرة للجميع" : "Prices show to everyone");
    } catch {
      toast.error(ar ? "تعذّر تغيير الإعداد" : "Couldn't change the setting");
    } finally {
      setSwitching(false);
    }
  };

  const act = async (key: string, run: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await run();
      await refresh();
      toast.success(done);
    } catch {
      toast.error(ar ? "تعذّر الحفظ" : "Couldn't save");
    } finally {
      setBusy(null);
    }
  };

  const nameOf = (a: Pick<PriceAccess, "doctorName">) => a.doctorName || (ar ? "طبيب" : "Doctor");

  return (
    <MobileShell wide>
      <TopBar title={ar ? "إظهار الأسعار" : "Who sees prices"} showBack wide maxW="3xl" />
      <div className="px-4 py-4 space-y-5 pb-24 md:px-6 md:py-8 lg:max-w-3xl lg:mx-auto">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-800">
              {ar ? "الأسعار للأطباء المعتمدين فقط" : "Prices for approved doctors only"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {hidden
                ? ar ? "مفعّل: باقي الأطباء يرون «اطلب السعر»" : 'On: other doctors see "Request price"'
                : ar ? "متوقف: أسعارك ظاهرة لكل الأطباء" : "Off: every doctor sees your prices"}
            </p>
          </div>
          {switching ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={hidden}
              aria-label={ar ? "الأسعار للأطباء المعتمدين فقط" : "Prices for approved doctors only"}
              onClick={toggle}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition", hidden ? "bg-[#0E6E66]" : "bg-slate-300")}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                  hidden ? "start-[22px]" : "start-0.5",
                )}
              />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <Section title={ar ? `طلبات جديدة (${pending.length})` : `New requests (${pending.length})`}>
                {pending.map((a) => (
                  <Row key={a.id} name={nameOf(a)} hint={ar ? "يطلب رؤية أسعارك" : "Asks to see your prices"}>
                    <IconButton
                      label={ar ? "رفض" : "Decline"}
                      busy={busy === `d${a.doctorId}`}
                      tone="plain"
                      onClick={() => act(`d${a.doctorId}`, () => decidePriceAccess(a.doctorId, false, officeName, ar), ar ? "تم الرفض" : "Declined")}
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </IconButton>
                    <IconButton
                      label={ar ? "اعتماد" : "Approve"}
                      busy={busy === `a${a.doctorId}`}
                      onClick={() => act(`a${a.doctorId}`, () => decidePriceAccess(a.doctorId, true, officeName, ar), ar ? "تم الاعتماد" : "Approved")}
                    >
                      <Check className="h-4 w-4 text-white" />
                    </IconButton>
                  </Row>
                ))}
              </Section>
            )}

            <Section title={ar ? `الأطباء المعتمدون (${approved.length})` : `Approved doctors (${approved.length})`}>
              {approved.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">{ar ? "لا يوجد أطباء معتمدون بعد." : "No approved doctors yet."}</p>
              ) : (
                approved.map((a) => (
                  <Row key={a.id} name={nameOf(a)} hint={ar ? "يرى أسعارك" : "Sees your prices"}>
                    <button
                      type="button"
                      disabled={busy === `r${a.doctorId}`}
                      onClick={() => {
                        if (!window.confirm(ar ? `سحب الاعتماد من ${nameOf(a)}؟` : `Remove approval for ${nameOf(a)}?`)) return;
                        void act(`r${a.doctorId}`, () => revokePriceAccess(a.doctorId), ar ? "تم سحب الاعتماد" : "Removed");
                      }}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {ar ? "سحب" : "Remove"}
                    </button>
                  </Row>
                ))
              )}
            </Section>

            <Section title={ar ? "اعتماد طبيب تعرفه" : "Approve a doctor you know"}>
              <p className="text-xs text-slate-400">{ar ? "الأطباء الذين طلبوا من مكتبك سابقاً." : "Doctors who have ordered from you."}</p>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={ar ? "ابحث عن طبيب" : "Search doctors"}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 text-sm outline-none focus:border-[#0E6E66] focus:ring-2 focus:ring-[#0E6E66]/20"
                />
              </div>
              {others.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                  <Users className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-400">{ar ? "لا يوجد أطباء آخرون" : "No other doctors"}</p>
                </div>
              ) : (
                others.map((d) => (
                  <Row key={d.id} name={d.name || (ar ? "طبيب" : "Doctor")}>
                    <IconButton
                      label={ar ? "اعتماد" : "Approve"}
                      busy={busy === `g${d.id}`}
                      onClick={() => act(`g${d.id}`, () => grantPriceAccess(d.id, d.name, officeName, ar), ar ? "تم الاعتماد" : "Approved")}
                    >
                      <UserPlus className="h-4 w-4 text-white" />
                    </IconButton>
                  </Row>
                ))
              )}
            </Section>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-extrabold text-slate-700">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ name, hint, children }: { name: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{name}</p>
        {!!hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function IconButton({
  label,
  busy,
  tone = "primary",
  onClick,
  children,
}: {
  label: string;
  busy: boolean;
  tone?: "primary" | "plain";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={onClick}
      className={cn(
        "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition disabled:opacity-60",
        tone === "plain" ? "bg-slate-100 hover:bg-slate-200" : "hover:opacity-90",
      )}
      style={tone === "primary" ? { backgroundColor: TEAL } : undefined}
    >
      {busy ? <Loader2 className={cn("h-4 w-4 animate-spin", tone === "primary" ? "text-white" : "text-primary")} /> : children}
    </button>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { useDesignerCases } from "@/lib/designerStore";
import { getStatusLabel, getStatusColor } from "@/lib/caseTracking";
import { cn } from "@/lib/utils";
import { Loader2, Layers, PenTool } from "lucide-react";

export const Route = createFileRoute("/designer/")({
  component: DesignerIndex,
});

function DesignerIndex() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { cases, loading } = useDesignerCases(user?.uid || "");

  return (
    <MobileShell>
      <TopBar title={ar ? "حالاتي كمصمم" : "My Design Cases"} showBack />
      <div className="px-4 pt-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <PenTool className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">
              {ar ? "لا توجد حالات مسندة إليك" : "No cases assigned to you"}
            </p>
            <p className="text-xs mt-1">
              {ar ? "ستظهر الحالات المسندة إليك هنا" : "Cases assigned to you will appear here"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cases.map(({ order }) => (
              <li key={order.id}>
                <Link
                  to="/designer/$caseId"
                  params={{ caseId: order.id }}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="size-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Layers className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-800 truncate">
                      {order.patient || (ar ? "غير محدد" : "Unspecified")}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {order.doctor} · {ar ? "الحالة" : "Case"} #{order.caseId || order.orderNumber}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{order.workType}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 px-2 py-1 rounded-full text-[10px] font-bold",
                      getStatusColor(order.status),
                    )}
                  >
                    {getStatusLabel(order.status, lang)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}

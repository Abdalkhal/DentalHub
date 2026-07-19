import { CASE_STEPS, type CaseStatus } from "@/data/labs";
import { useI18n, type DictKey } from "@/lib/i18n";
import { Check, Truck, PackageCheck, Hammer, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON: Record<CaseStatus, typeof Check> = {
  received: Inbox,
  in_progress: Hammer,
  done: Check,
  on_the_way: Truck,
  delivered: PackageCheck,
};

const LABEL: Record<CaseStatus, DictKey> = {
  received: "case_received",
  in_progress: "case_inprogress",
  done: "case_done",
  on_the_way: "case_ontheway",
  delivered: "case_delivered",
};

export function CaseTimeline({ status }: { status: CaseStatus }) {
  const { t } = useI18n();
  const currentIdx = CASE_STEPS.indexOf(status);
  return (
    <ol className="relative space-y-3">
      {CASE_STEPS.map((step, idx) => {
        const reached = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = ICON[step];
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                "size-8 rounded-full flex items-center justify-center border transition-colors shrink-0",
                reached
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(LABEL[step])}
              </p>
            </div>
            {isCurrent && (
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">●</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

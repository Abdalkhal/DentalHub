import { useEffect } from "react";
import {
  X,
  User,
  Stethoscope,
  Hash,
  Calendar,
  Palette,
  StickyNote,
  Paperclip,
  Building2,
  Phone,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FDI_UPPER, FDI_LOWER, UPPER_POS, LOWER_POS } from "@/components/DentalArch";
import { VITA_SHADES } from "@/lib/dentalConfig";
import { formatOrderId } from "@/lib/ordersStore";
import { cleanDoctorNotes } from "@/lib/orderLines";
import { translateWorkItem } from "@/lib/rxTranslations";
import { CaseChat } from "@/components/CaseChat";
import { markCaseRead, type CaseMessageSenderRole } from "@/lib/caseMessages";
import type { Order } from "@/lib/ordersStore";
import archUpper from "@/assets/arch-upper.png";
import archLower from "@/assets/arch-lower.png";
import { CaseFileLink } from "@/components/CaseFileLink";

type WorkTypeKey = "crown" | "bridge" | "veneer" | "inlay";

const WT_META: Record<WorkTypeKey, { ar: string; en: string; dot: string }> = {
  crown: { ar: "تاج", en: "Crown", dot: "bg-blue-500" },
  bridge: { ar: "جسر", en: "Bridge", dot: "bg-green-500" },
  veneer: { ar: "فينير", en: "Veneer", dot: "bg-purple-500" },
  inlay: { ar: "حشوة داخلية/خارجية", en: "Inlay/Onlay", dot: "bg-orange-500" },
};

const WT_ORDER: WorkTypeKey[] = ["crown", "bridge", "veneer", "inlay"];

const EXTRA_SHADES: Record<string, string> = {
  "1M1": "#F7F2EA",
  "1M2": "#F2E7D6",
  "2M1": "#EFE6D8",
  "2M2": "#EAD9C2",
  "2L1.5": "#E7DCC8",
  "2R1.5": "#EBDDC9",
  "3M1": "#E4D5BC",
  "3M2": "#DCC5A6",
  "3L1.5": "#DDC9A8",
  "3L2.5": "#D2B68E",
  "3R1.5": "#E0CFB0",
  "3R2.5": "#D6BC99",
  "4M1": "#D6C3A2",
  "4M2": "#CBB08A",
  "4L1.5": "#D0B896",
  "4L2.5": "#C4A477",
  "4R1.5": "#D3BC9B",
  "5M1": "#C7AC85",
  "5M2": "#BB9C72",
  "5M3": "#AD8C60",
  BL1: "#FBF7F1",
  BL2: "#F7F1E6",
  BL3: "#F3EBDB",
  BL4: "#EFE5D1",
};

function shadeHex(code: string): string {
  return VITA_SHADES.find((s) => s.code === code)?.hex ?? EXTRA_SHADES[code] ?? "#e2e8f0";
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function statusLabel(status: string, ar: boolean): string {
  if (ar) {
    return status === "new"
      ? "جديد"
      : status === "in_progress"
        ? "قيد التنفيذ"
        : status === "completed"
          ? "مكتملة"
          : "متأخرة";
  }
  return status === "new"
    ? "New"
    : status === "in_progress"
      ? "In Progress"
      : status === "completed"
        ? "Completed"
        : "Delayed";
}

const cardCls = "bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)]";

export function IncomingOrderRxModal({
  order,
  onClose,
  labId,
  senderRole = "lab",
  senderName,
  currentUserId,
}: {
  order: Order;
  onClose: () => void;
  labId?: string;
  senderRole?: CaseMessageSenderRole;
  senderName?: string;
  currentUserId?: string;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  useEffect(() => {
    if (labId && currentUserId) markCaseRead(order.id, currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId, currentUserId, order.id]);

  const teeth: Record<number, WorkTypeKey> = {};
  if (order.rxTeeth) {
    Object.entries(order.rxTeeth).forEach(([n, t]) => {
      teeth[Number(n)] = t as WorkTypeKey;
    });
  }

  const counts: Record<WorkTypeKey, number> = { crown: 0, bridge: 0, veneer: 0, inlay: 0 };
  Object.values(teeth).forEach((t) => {
    if (t in counts) counts[t] += 1;
  });

  const rxItems: string[] = order.rxItems ?? [];
  const toothItems: Record<string, string[]> =
    (order.rxData?.toothItems as Record<string, string[]>) ?? {};

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#EBF3FA] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#EBF3FA]/95 backdrop-blur border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-extrabold text-base text-slate-800 truncate">
              {senderRole === "doctor"
                ? ar ? "وصفة الحالة" : "Case Rx"
                : ar ? "وصفة الحالة الواردة" : "Incoming Case Rx"}
            </p>
            <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
              {formatOrderId(order)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-9 shrink-0 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Dentist / clinic / patient / dates */}
          <div className={cn(cardCls, "p-4 space-y-2.5")}>
            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="size-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <Stethoscope className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {order.doctor || (ar ? "غير محدد" : "Unspecified")}
                  </p>
                  {order.clinic && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <Building2 className="size-3" /> {order.clinic}
                    </p>
                  )}
                </div>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold">
                {statusLabel(order.status, ar)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <InfoRow
                icon={User}
                label={ar ? "المريض" : "Patient"}
                value={order.patient || (ar ? "غير محدد" : "Unspecified")}
              />
              {order.patientPhone && (
                <InfoRow
                  icon={Phone}
                  label={ar ? "الهاتف" : "Phone"}
                  value={order.patientPhone}
                  ltr
                />
              )}
              <InfoRow
                icon={Calendar}
                label={ar ? "تاريخ الإنشاء" : "Created"}
                value={formatDate(order.receivedDate)}
                ltr
              />
              <InfoRow
                icon={Calendar}
                label={ar ? "تاريخ التسليم" : "Delivery"}
                value={formatDate(order.dueDate)}
                ltr
              />
              <InfoRow icon={Hash} label={ar ? "رقم الحالة" : "Case ID"} value={formatOrderId(order)} ltr />
            </div>
          </div>

          {/* Odontogram */}
          <div className={cn(cardCls, "p-3")}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">
              {ar ? "مخطط الأسنان (Odontogram)" : "Odontogram"}
            </p>
            <RxArch jaw="upper" teeth={teeth} />
            <RxArch jaw="lower" teeth={teeth} />
            {Object.keys(teeth).length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center pb-1">
                {ar ? "لا يوجد تخطيط أسنان" : "No tooth charting"}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {WT_ORDER.map((k) => {
                  const meta = WT_META[k];
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-600"
                    >
                      <span className={cn("size-2.5 rounded-full", meta.dot)} />
                      {ar ? meta.ar : meta.en} · {counts[k]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Materials & work types */}
          <div className={cn(cardCls, "p-4")}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">
              {ar ? "المواد وأنواع العمل" : "Materials & Work Types"}
            </p>

            {Object.keys(toothItems).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(toothItems).map(([tooth, items]) => (
                  <div key={tooth} className="flex items-start gap-2">
                    <span
                      className="shrink-0 inline-flex items-center justify-center size-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold"
                      dir="ltr"
                    >
                      {tooth}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((it, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-700"
                        >
                          {translateWorkItem(it, lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : rxItems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {rxItems.map((it, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-700"
                  >
                    {translateWorkItem(it, lang)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {ar ? "لا توجد مواد محددة" : "No materials specified"}
              </p>
            )}
          </div>

          {/* Shade + notes */}
          <div className={cn(cardCls, "p-4 space-y-3")}>
            <div className="flex items-center gap-3">
              <Palette className="size-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500">
                {ar ? "اللون (VITA)" : "Shade (VITA)"}
              </span>
              {order.shade ? (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-300 bg-white">
                  <span
                    className="size-4 rounded-full border border-slate-300"
                    style={{ background: shadeHex(order.shade) }}
                  />
                  <span className="text-sm font-bold text-slate-700" dir="ltr">
                    {order.shade}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">{ar ? "غير محدد" : "—"}</span>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote className="size-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">
                  {ar ? "الملاحظات" : "Notes"}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {cleanDoctorNotes(order.notes) || (ar ? "لا توجد ملاحظات" : "No notes")}
              </p>
            </div>
          </div>

          {/* Attachments */}
          <div className={cn(cardCls, "p-4")}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">
              {ar ? "المرفقات" : "Attachments"}
            </p>
            {(order.attachments ?? []).length === 0 ? (
              <p className="text-xs text-slate-400">{ar ? "لا توجد مرفقات" : "No attachments"}</p>
            ) : (
              <ul className="space-y-2">
                {(order.attachments ?? []).map((f, i) => (
                  <li key={i}>
                    <CaseFileLink name={f.name} path={f.path} url={f.url} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Case chat */}
          {labId && currentUserId && (
            <div className={cn(cardCls, "p-3")}>
              <CaseChat
                labId={labId}
                caseId={order.id}
                currentUserId={currentUserId}
                senderRole={senderRole}
                senderName={senderName || (ar ? "المختبر" : "Lab")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  ltr,
}: {
  icon: typeof User;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="size-3.5 text-slate-400 shrink-0" />
      <span className="text-[11px] font-bold text-slate-500 shrink-0">{label}</span>
      <span
        className={cn("text-xs font-semibold text-slate-700 truncate", ltr && "font-mono")}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function RxArch({ jaw, teeth }: { jaw: "upper" | "lower"; teeth: Record<number, WorkTypeKey> }) {
  const fdiList = jaw === "upper" ? FDI_UPPER : FDI_LOWER;
  const posMap = jaw === "upper" ? UPPER_POS : LOWER_POS;
  const archSrc = jaw === "upper" ? archUpper : archLower;

  return (
    <div className="relative w-full aspect-[4/3] max-w-sm mx-auto">
      <img
        src={archSrc}
        alt={jaw}
        className="absolute inset-0 w-full h-full object-contain"
        loading="lazy"
      />
      {fdiList.map((n) => {
        const pos = posMap[n];
        if (!pos) return null;
        const lx = 50 + (pos[0] - 50) * 1.22;
        const ly = 50 + (pos[1] - 50) * 1.18;
        const wt = teeth[n];
        return (
          <span
            key={n}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 w-[8%] max-w-[24px] aspect-square rounded-full border text-[9px] font-bold flex items-center justify-center",
              wt
                ? cn("text-white border-white shadow", WT_META[wt].dot)
                : "bg-slate-100 text-slate-400 border-white",
            )}
            style={{ top: `${ly}%`, left: `${lx}%` }}
          >
            {n}
          </span>
        );
      })}
    </div>
  );
}

import { X, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  orderNumber: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({ orderNumber, onCancel, onConfirm }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-extrabold text-lg">
            {ar ? "تأكيد حذف الطلب" : "Confirm Deletion"}
          </h3>
          <button
            onClick={onCancel}
            className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center py-2">
          <span className="size-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
            <Trash2 className="size-6" />
          </span>
          <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
            {ar
              ? `هل أنت متأكد من أنك تريد حذف ${orderNumber}؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to delete ${orderNumber}? This action cannot be undone.`}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-border bg-card font-display font-bold text-sm hover:bg-accent transition"
          >
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-rose-500 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-rose-600 transition"
          >
            <Trash2 className="size-4" />
            {ar ? "حذف" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Entry to the booking link from the clinic hub, with the pending count.
import { Link } from "@tanstack/react-router";
import { CalendarCheck2, ChevronLeft } from "lucide-react";
import { usePendingBookingCount } from "@/lib/bookingInbox";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

export function BookingLinkCard({ className }: { className?: string }) {
  const { user } = useSession();
  const pending = usePendingBookingCount(user?.uid);
  return (
    <Link
      to="/clinic/booking"
      // A quiet white card in the clinic's blue: the summary above holds the main action.
      className={cn(
        "relative flex items-center gap-3.5 rounded-[18px] border border-[#DCE7F5] bg-white px-4 py-3 shadow-[0_4px_14px_-6px_rgba(30,58,138,0.18)] transition hover:border-[#1D6FE8]/40 hover:shadow-md md:py-4",
        className,
      )}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F1FE] text-[#1D6FE8]">
        <CalendarCheck2 className="size-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display text-[15px] font-extrabold text-[#0F2747]">
          رابط الحجز للمرضى
        </span>
        <span className="block truncate text-xs text-[#5B6B82] md:text-sm">
          {pending > 0
            ? `${pending} طلب حجز بانتظار ردك`
            : "يحجز المرضى من إنستغرام وواتساب بدون تسجيل"}
        </span>
      </span>
      {pending > 0 && (
        <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
          {pending}
        </span>
      )}
      <ChevronLeft className="relative size-5 shrink-0 text-slate-400 ltr:rotate-180" />
    </Link>
  );
}

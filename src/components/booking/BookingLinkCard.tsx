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
      className={cn(
        "relative flex items-center gap-4 overflow-hidden rounded-3xl bg-[radial-gradient(120%_140%_at_90%_0%,#1FB5A1_0%,#0E6E66_60%,#0A4F4A_100%)] p-4 text-white shadow-sm transition hover:shadow-lg md:p-5",
        className,
      )}
    >
      <span className="absolute -bottom-8 -left-8 size-28 rounded-full bg-white/10" />
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        <CalendarCheck2 className="size-6" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display text-[15px] font-bold md:text-lg">
          رابط الحجز للمرضى
        </span>
        <span className="block text-xs text-white/80 md:text-sm">
          {pending > 0
            ? `${pending} طلب حجز بانتظار ردك`
            : "يحجز المرضى من إنستغرام وواتساب بدون تسجيل"}
        </span>
      </span>
      {pending > 0 && (
        <span className="relative flex h-7 min-w-7 items-center justify-center rounded-full bg-rose-500 px-2 text-xs font-bold">
          {pending}
        </span>
      )}
      <ChevronLeft className="relative size-5 shrink-0 text-white/70" />
    </Link>
  );
}

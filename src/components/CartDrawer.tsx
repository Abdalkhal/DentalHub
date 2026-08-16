import { useState } from "react";
import { X, Plus, Minus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, removeFromCart, updateCartQuantity, cartTotal, cartByOffice } from "@/lib/cartStore";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { useUserRole, useSession } from "@/lib/useAuth";
import { placeCartOrder } from "@/lib/orders";
import { toast } from "sonner";

export function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -end-1 size-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const cart = useCart();
  const navigate = useNavigate();
  const { user } = useSession();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [placing, setPlacing] = useState(false);
  const total = cartTotal();
  const grouped = cartByOffice();

  const handlePlaceOrder = async () => {
    if (!user || cart.length === 0) return;
    setPlacing(true);
    try {
      await placeCartOrder({
        id: user.uid,
        name: role?.name || (ar ? "طبيب أسنان" : "Dentist"),
        phone: role?.phone,
        address: role?.address,
      });
      await queryClient.invalidateQueries({ queryKey: ["dentist-orders", user.uid] });
      toast.success(ar ? "تم إرسال الطلب بنجاح" : "Order placed successfully");
      onClose();
    } catch (e: any) {
      toast.error(ar ? `فشل إرسال الطلب: ${e?.message || e}` : `Order failed: ${e?.message || e}`);
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
          <h2 className="font-bold text-lg">
            {ar ? "سلة التسوق" : "Shopping Cart"}
            {total.count > 0 && (
              <span className="text-sm text-slate-400 font-normal ms-2">
                {total.count} {ar ? "عنصر" : "items"}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <X className="size-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingCart className="size-12 text-slate-300 mb-3" />
            <p className="font-bold text-slate-500">{ar ? "السلة فارغة" : "Cart is empty"}</p>
            <p className="text-sm text-slate-400 mt-1">{ar ? "أضف منتجات من المكاتب" : "Add products from supply offices"}</p>
            <button
              onClick={() => { onClose(); navigate({ to: "/supplies" }); }}
              className="mt-4 h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
            >
              {ar ? "تصفح المنتجات" : "Browse products"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.entries(grouped).map(([officeId, officeItems]) => (
                <div key={officeId} className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <ShoppingCart className="size-3" />
                    {officeItems[0].officeName}
                  </p>

                  {officeItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      {item.productImage ? (
                        <img src={item.productImage} alt="" className="size-12 rounded-xl object-cover bg-white shrink-0" />
                      ) : (
                        <div className="size-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                          <ShoppingCart className="size-5 text-slate-300" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.productName}</p>
                        <p className="text-[11px] text-slate-400">
                          {item.currency === "IQD" ? `${item.unitPrice.toLocaleString()} د.ع` : `$${item.unitPrice.toFixed(2)}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="size-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="size-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="size-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{ar ? "الإجمالي" : "Subtotal"}</span>
                <span className="font-extrabold text-lg text-slate-800">
                  ${total.subtotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {placing ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
                {placing ? (ar ? "جارٍ الإرسال..." : "Placing...") : ar ? "إتمام الطلب" : "Complete order"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { router } from 'expo-router';

/** What's needed to open the screen a notification is about. */
export type NotificationTarget = {
  type?: string;
  orderId?: string;
  invoiceId?: string;
  chatWith?: string;
  forRole?: string;
  senderId?: string;
};

// Shared by the notifications list and a tapped phone notification, so both
// open the same screen. An unknown type opens the list rather than failing.
export function openNotificationTarget(n: NotificationTarget): void {
  if (n.type === 'booking_new' || n.type === 'booking_cancelled') {
    router.push('/clinic-booking' as never);
  } else if (n.type === 'data_export') {
    router.push('/settings' as never);
  } else if (n.type === 'clinic_team') {
    router.push('/clinic-doctors' as never);
  } else if (n.type === 'message' && n.chatWith) {
    router.push({ pathname: '/messages', params: { with: n.chatWith } });
  } else if (n.type === 'case_message') {
    // The doctor reads case chats from case tracking; the lab from its orders.
    if (n.forRole === 'doctor') router.push({ pathname: '/track-cases', params: n.orderId ? { open: n.orderId } : {} });
    else router.push('/orders' as never);
  } else if (n.type === 'price_request') {
    router.push('/price-access' as never);
  } else if ((n.type === 'discount' || n.type === 'price_approved') && n.senderId) {
    router.push({ pathname: '/profile/[accountId]', params: { accountId: n.senderId } } as never);
  } else if (n.invoiceId) {
    router.push({ pathname: '/doctor-invoices/[invoiceId]', params: { invoiceId: n.invoiceId } });
  } else if (n.orderId || n.type === 'order_new' || n.type === 'order_status') {
    router.push('/orders' as never);
  } else {
    router.push('/notifications');
  }
}

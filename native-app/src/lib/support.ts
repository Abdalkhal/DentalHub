// The support/admin WhatsApp Business number, per the app owner. Ads and
// brand-agent enquiries route here; nothing about either is automated — it is
// only how the advertiser/agent and the Dent Hub team get in touch.
export const SUPPORT_WHATSAPP_NUMBER = "9647503581161";

/** A wa.me link to the support number with `message` prefilled. */
export function supportWhatsAppUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Delivery is never actually charged anywhere in checkout today (no fee field exists on
// CheckoutRequest/AddressPayload) — this threshold is informational/marketing copy only,
// not an enforced business rule. Kept as a single constant so every place that mentions
// the free-shipping threshold (cart summary tooltip, cart promo banner, etc.) stays in
// sync instead of hardcoding the number separately.
export const FREE_SHIPPING_THRESHOLD_AMD = 30000;

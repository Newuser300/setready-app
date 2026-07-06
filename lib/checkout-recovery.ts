// Shared Stripe Checkout options that enable abandoned-cart recovery.
//
// Spread the return value into stripe.checkout.sessions.create({ ... }).
// - Sets a 1-hour expiry so the recovery email (sent from the
//   checkout.session.expired webhook) goes out promptly instead of 24h later.
// - customer_email lets us reach the buyer and lets Stripe pre-fill checkout.
// - after_expiration.recovery gives a one-click "resume" link (payment mode).
//   Recovery links are only enabled for payment-mode sessions to avoid any
//   subscription-mode incompatibility; subscription abandonments fall back to
//   the item's page (metadata.returnPath) in the webhook.
//
// Also remember to add `itemName` and `returnPath` to the session's `metadata`
// so the recovery email can name the item and link back to the right page.
export function abandonedCartOptions(opts: {
  email?: string | null
  mode?: 'payment' | 'subscription'
}): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  }
  if (opts.email) fields.customer_email = opts.email
  if (opts.mode !== 'subscription') {
    fields.after_expiration = { recovery: { enabled: true, allow_promotion_codes: true } }
  }
  return fields
}

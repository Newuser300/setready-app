import Stripe from 'stripe'

// Shared Stripe client, constructed lazily.
//
// Why: `new Stripe(process.env.STRIPE_SECRET_KEY!)` at module scope runs the
// moment the module is imported. `next build` imports every route module while
// collecting page data, so any environment without STRIPE_SECRET_KEY fails the
// whole build with "Neither apiKey nor config.authenticator provided" — even
// though nothing calls Stripe at build time. (Same class of bug as the Supabase
// admin client, fixed in 0471c59.)
//
// The proxy below defers construction to first real property access, so route
// modules import cleanly and a missing key only surfaces at request time.

type StripeClient = InstanceType<typeof Stripe>

// Matches the apiVersion already used across the checkout routes.
const API_VERSION = '2026-04-22.dahlia'

let client: StripeClient | null = null

export function getStripe(): StripeClient {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = new Stripe(key, { apiVersion: API_VERSION as any })
  }
  return client
}

/** True when Stripe is configured — use to fail gracefully instead of throwing. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

/**
 * Drop-in replacement for a module-scope `const stripe = new Stripe(...)`.
 * Behaves like a Stripe instance; constructs on first use.
 */
export const stripe: StripeClient = new Proxy({} as StripeClient, {
  get(_target, prop, receiver) {
    const instance = getStripe()
    const value = Reflect.get(instance as unknown as object, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
  has(_target, prop) {
    return Reflect.has(getStripe() as unknown as object, prop)
  },
})

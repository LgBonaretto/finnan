import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe =
  secretKey && secretKey !== 'sk_test_coloque_depois'
    ? new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' })
    : null

export function isStripeEnabled() {
  return stripe !== null
}

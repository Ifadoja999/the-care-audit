import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
      apiVersion: '2025-01-27.acacia' as Stripe.StripeConfig['apiVersion'],
    });
  }
  return _stripe;
}

export function getTierPrices(): Record<string, string> {
  return {
    featured_verified: (process.env.STRIPE_PRICE_FEATURED || '').trim(),
    verified_profile: (process.env.STRIPE_PRICE_VERIFIED || '').trim(),
    facility_response: (process.env.STRIPE_PRICE_RESPONSE || '').trim(),
  };
}

export const TIER_NAMES: Record<string, string> = {
  featured_verified: 'Featured Verified',
  verified_profile: 'Verified Profile',
  facility_response: 'Facility Response',
};

export const TIER_AMOUNTS: Record<string, number> = {
  featured_verified: 149,
  verified_profile: 79,
  facility_response: 49,
};

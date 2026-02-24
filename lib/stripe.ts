import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

export function getTierPrices(): Record<string, string> {
  return {
    featured_verified: process.env.STRIPE_PRICE_FEATURED || '',
    verified_profile: process.env.STRIPE_PRICE_VERIFIED || '',
    facility_response: process.env.STRIPE_PRICE_RESPONSE || '',
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

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getTierPrices, getTierPricesAnnual } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';

const VALID_TIERS = ['featured_verified', 'verified_profile', 'facility_response'] as const;
const VALID_BILLING_PERIODS = ['monthly', 'annual'] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { facility_id, tier, billing_period = 'monthly', promotekit_referral } = body;

    if (!facility_id || !tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid facility_id or tier' }, { status: 400 });
    }
    if (!VALID_BILLING_PERIODS.includes(billing_period)) {
      return NextResponse.json({ error: 'Invalid billing_period' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: facility, error } = await supabase
      .from('facilities')
      .select('id, facility_name, total_violations, city, state')
      .eq('id', facility_id)
      .single();

    if (error || !facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const violations = facility.total_violations;

    // Block checkout for facilities with no inspection data
    if (violations === null || violations === undefined) {
      return NextResponse.json(
        { error: 'Sponsorship tiers are not yet available for this facility. Tier eligibility requires state inspection data, which is not yet available for this state.' },
        { status: 400 }
      );
    }

    // Eligibility check
    if ((tier === 'featured_verified' || tier === 'verified_profile') && violations > 3) {
      return NextResponse.json(
        { error: 'This facility does not qualify for this tier. Featured Verified and Verified Profile require 3 or fewer violations.' },
        { status: 400 }
      );
    }
    if (tier === 'facility_response' && violations <= 3) {
      return NextResponse.json(
        { error: 'This facility does not qualify for this tier. Facility Response is for facilities with 4 or more violations.' },
        { status: 400 }
      );
    }

    const prices = billing_period === 'annual' ? getTierPricesAnnual() : getTierPrices();
    const priceId = prices[tier];
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this tier' }, { status: 500 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com').trim().replace(/\/+$/, '');

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        facility_id: facility.id,
        tier,
        facility_name: facility.facility_name,
        promotekit_referral: promotekit_referral ?? undefined,
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          facility_id: facility.id,
          tier,
        },
      },
      success_url: `${siteUrl}/for-facilities?success=true`,
      cancel_url: `${siteUrl}/for-facilities?canceled=true`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Look up Stripe customer by email
    const customers = await getStripe().customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No subscription found for this email address.' },
        { status: 404 }
      );
    }

    const customer = customers.data[0];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${siteUrl}/for-facilities`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}

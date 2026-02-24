import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { sendTier1Welcome, sendTier2Welcome, sendTier3Welcome } from '@/lib/emails';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const facilityId = session.metadata?.facility_id;
      const tier = session.metadata?.tier;
      const customerEmail = session.customer_details?.email || session.customer_email;

      if (!facilityId || !tier) {
        console.error('Missing metadata in checkout session');
        break;
      }

      const onboardingToken = crypto.randomUUID();

      // Update facility in Supabase
      const { error: updateError } = await supabase
        .from('facilities')
        .update({
          is_sponsored: true,
          sponsor_tier: tier,
          onboarding_token: onboardingToken,
          onboarding_completed: false,
        })
        .eq('id', facilityId);

      if (updateError) {
        console.error('Failed to update facility:', updateError);
        break;
      }

      // Get facility details for email
      const { data: facility } = await supabase
        .from('facilities')
        .select('facility_name, city, state')
        .eq('id', facilityId)
        .single();

      if (customerEmail && facility) {
        try {
          if (tier === 'featured_verified') {
            await sendTier1Welcome({
              email: customerEmail,
              facilityName: facility.facility_name,
              city: facility.city,
              token: onboardingToken,
            });
          } else if (tier === 'verified_profile') {
            await sendTier2Welcome({
              email: customerEmail,
              facilityName: facility.facility_name,
              token: onboardingToken,
            });
          } else if (tier === 'facility_response') {
            await sendTier3Welcome({
              email: customerEmail,
              facilityName: facility.facility_name,
              token: onboardingToken,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const facilityId = subscription.metadata?.facility_id;

      if (!facilityId) {
        // Try to find facility by looking up the customer's active subscriptions
        console.error('No facility_id in subscription metadata');
        break;
      }

      // Get facility slug for photo cleanup
      const { data: facility } = await supabase
        .from('facilities')
        .select('slug')
        .eq('id', facilityId)
        .single();

      // Reset facility sponsorship
      await supabase
        .from('facilities')
        .update({
          is_sponsored: false,
          sponsor_tier: null,
          onboarding_token: null,
          onboarding_completed: false,
          website_url: null,
          contact_email: null,
          facility_description: null,
          facility_response: null,
        })
        .eq('id', facilityId);

      // Delete photos from storage
      if (facility?.slug) {
        const slugParts = facility.slug.split('/');
        const folderPath = `${slugParts[0]}/${slugParts[1]}/${slugParts[2]}`;
        const { data: files } = await supabase.storage
          .from('facility-photos')
          .list(folderPath);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${folderPath}/${f.name}`);
          await supabase.storage.from('facility-photos').remove(filePaths);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const facilityId = subscription.metadata?.facility_id;
      if (!facilityId) break;

      // Check if tier changed by looking at the price
      const priceId = subscription.items.data[0]?.price?.id;
      let newTier: string | null = null;

      if (priceId === process.env.STRIPE_PRICE_FEATURED) newTier = 'featured_verified';
      else if (priceId === process.env.STRIPE_PRICE_VERIFIED) newTier = 'verified_profile';
      else if (priceId === process.env.STRIPE_PRICE_RESPONSE) newTier = 'facility_response';

      if (newTier) {
        await supabase
          .from('facilities')
          .update({ sponsor_tier: newTier })
          .eq('id', facilityId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

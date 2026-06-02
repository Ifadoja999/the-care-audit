import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { sendTier1Welcome, sendTier2Welcome, sendTier3Welcome } from '@/lib/emails';
import Stripe from 'stripe';

async function resolveAttribution(session: Stripe.Checkout.Session): Promise<{
  attributionSource: 'promo_code' | 'promotekit_cookie' | 'heard_about_field' | 'unknown';
  attributedTo: string | null;
  heardAbout: string | null;
  promoCode: string | null;
}> {
  // Signal 1: free-text "How did you hear about us?" field
  const heardAbout =
    session.custom_fields?.find((f) => f.key === 'heard_about')?.text?.value ?? null;

  // Signal 2: PromoteKit cookie stored in session metadata at checkout time
  // Guard against the literal string "undefined" — Stripe SDK can serialize
  // a JavaScript undefined into the string "undefined" in metadata
  const rawReferral = session.metadata?.promotekit_referral;
  const promokitReferral = rawReferral && rawReferral !== 'undefined' ? rawReferral : null;

  // Signal 3: promo code — retrieve session with discounts expanded to get code string
  let promoCode: string | null = null;
  try {
    // Retrieve with 5s timeout — if this hangs, fall through to cookie/heard-about attribution
    const fullSession = await getStripe().checkout.sessions.retrieve(session.id, {
      expand: ['discounts.promotion_code'],
    });
    const firstDiscount = fullSession.discounts?.[0];
    if (firstDiscount && typeof firstDiscount.promotion_code === 'object' && firstDiscount.promotion_code !== null) {
      promoCode = (firstDiscount.promotion_code as Stripe.PromotionCode).code ?? null;
    }
  } catch (e) {
    console.error('[attribution] Failed to expand session discounts:', e);
  }

  // Precedence: promo code > PromoteKit cookie > heard-about text
  if (promoCode) {
    return { attributionSource: 'promo_code', attributedTo: promoCode, heardAbout, promoCode };
  }
  if (promokitReferral) {
    return { attributionSource: 'promotekit_cookie', attributedTo: promokitReferral, heardAbout, promoCode: null };
  }
  if (heardAbout) {
    return { attributionSource: 'heard_about_field', attributedTo: heardAbout, heardAbout, promoCode: null };
  }
  return { attributionSource: 'unknown', attributedTo: null, heardAbout, promoCode: null };
}

// Fire-and-forget: intentionally not awaited so it does not block webhook response
function postAttributionToSlack(params: {
  facilityName: string;
  tier: string;
  attributionSource: string;
  attributedTo: string | null;
  heardAbout: string | null;
}): void {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const sourceLabel: Record<string, string> = {
    promo_code: 'Promo code',
    promotekit_cookie: 'PromoteKit cookie',
    heard_about_field: '"How did you hear" field',
    unknown: 'Unknown',
  };

  const text = [
    `*New subscription:* ${params.facilityName} (${params.tier})`,
    `• Attribution: *${sourceLabel[params.attributionSource] ?? params.attributionSource}*`,
    `• Attributed to: ${params.attributedTo ?? 'none'}`,
    `• "How did you hear about us?": ${params.heardAbout ?? '(blank)'}`,
  ].join('\n');

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch((e) => console.error('[attribution] Slack post failed:', e));
}

function revalidateFacility(slug: string | null | undefined) {
  if (!slug) return;
  revalidatePath(`/${slug}`);
  const parts = slug.split('/');
  if (parts.length >= 2) {
    revalidatePath(`/${parts[0]}/${parts[1]}`);
    revalidatePath(`/${parts[0]}`);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, (process.env.STRIPE_WEBHOOK_SECRET || '').trim());
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
        console.error('Missing metadata in checkout session:', session.id);
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
        console.error('Failed to update facility:', facilityId, updateError);
        // Return 500 so Stripe retries the webhook
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Get facility details for email and revalidation
      const { data: facility } = await supabase
        .from('facilities')
        .select('facility_name, city, state, slug')
        .eq('id', facilityId)
        .single();

      // Revalidate cached pages
      revalidateFacility(facility?.slug);

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

      // Partner attribution — unconditional, fires regardless of email/facility availability
      const attribution = await resolveAttribution(session);

      if (session.customer && typeof session.customer === 'string') {
        try {
          await getStripe().customers.update(session.customer, {
            metadata: {
              attribution_source: attribution.attributionSource,
              attributed_to: attribution.attributedTo ?? 'unknown',
              heard_about: attribution.heardAbout ?? '',
              promo_code_used: attribution.promoCode ?? '',
            },
          });
        } catch (e) {
          console.error('[attribution] Failed to update customer metadata:', e);
        }
      }

      // Fire-and-forget: does not block webhook response
      postAttributionToSlack({
        facilityName: facility?.facility_name ?? facilityId,
        tier,
        attributionSource: attribution.attributionSource,
        attributedTo: attribution.attributedTo,
        heardAbout: attribution.heardAbout,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const facilityId = subscription.metadata?.facility_id;

      if (!facilityId) {
        console.error('No facility_id in subscription metadata for sub:', subscription.id, '- cannot deactivate facility');
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

        // Revalidate cached pages
        revalidateFacility(facility.slug);
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

      if (priceId === (process.env.STRIPE_PRICE_FEATURED || '').trim() || priceId === (process.env.STRIPE_PRICE_FEATURED_ANNUAL || '').trim()) newTier = 'featured_verified';
      else if (priceId === (process.env.STRIPE_PRICE_VERIFIED || '').trim() || priceId === (process.env.STRIPE_PRICE_VERIFIED_ANNUAL || '').trim()) newTier = 'verified_profile';
      else if (priceId === (process.env.STRIPE_PRICE_RESPONSE || '').trim() || priceId === (process.env.STRIPE_PRICE_RESPONSE_ANNUAL || '').trim()) newTier = 'facility_response';

      if (newTier) {
        const { data: updatedFacility } = await supabase
          .from('facilities')
          .update({ sponsor_tier: newTier })
          .eq('id', facilityId)
          .select('slug')
          .single();

        revalidateFacility(updatedFacility?.slug);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'The Care Audit <noreply@thecareaudit.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com';

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#2563EB,#1e40af);padding:24px 32px;text-align:center">
<img src="${SITE_URL}/images/logo.png" alt="The Care Audit" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:12px">
<span style="color:#ffffff;font-size:20px;font-weight:700;vertical-align:middle">The Care Audit</span>
</td></tr>
<tr><td style="padding:32px">
${content}
</td></tr>
<tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280">
<a href="${SITE_URL}" style="color:#2563EB;text-decoration:none">thecareaudit.com</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
<tr><td align="center">
<a href="${url}" style="display:inline-block;background:#2563EB;color:#ffffff;font-weight:600;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none">${text}</a>
</td></tr>
</table>`;
}

export async function sendTier1Welcome(params: {
  email: string;
  facilityName: string;
  city: string;
  token: string;
}) {
  const onboardUrl = `${SITE_URL}/onboard/${params.token}`;
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Welcome to The Care Audit</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thank you for subscribing to <strong>Featured Verified</strong> for <strong>${params.facilityName}</strong>.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your Featured Verified badge is now active. To complete your listing, set up your profile with photos, contact information, and a facility description.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Once your profile is complete, your facility will appear in the Featured section on the ${params.city} page.</p>
<h3 style="margin:24px 0 12px;color:#111827;font-size:16px">What&rsquo;s included:</h3>
<ul style="color:#374151;line-height:1.8;margin:0 0 16px;padding-left:20px">
<li>Featured Verified badge on your profile</li>
<li>Priority placement on city and state pages</li>
<li>Up to 4 facility photos</li>
<li>&ldquo;Schedule a Tour&rdquo; button</li>
<li>Updated contact info (phone, address, website, email)</li>
<li>Facility description</li>
</ul>
${ctaButton('Complete Your Profile', onboardUrl)}
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">Need to manage your subscription? <a href="${SITE_URL}/api/stripe/portal" style="color:#2563EB">Manage subscription</a></p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Welcome to The Care Audit — Set Up Your Featured Listing',
    html: emailLayout(content),
  });
}

export async function sendTier2Welcome(params: {
  email: string;
  facilityName: string;
  token: string;
}) {
  const onboardUrl = `${SITE_URL}/onboard/${params.token}`;
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Welcome to The Care Audit</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thank you for subscribing to <strong>Verified Profile</strong> for <strong>${params.facilityName}</strong>.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your &ldquo;Claimed&rdquo; badge is now active. Complete your profile with updated contact information and a description.</p>
<h3 style="margin:24px 0 12px;color:#111827;font-size:16px">What&rsquo;s included:</h3>
<ul style="color:#374151;line-height:1.8;margin:0 0 16px;padding-left:20px">
<li>&ldquo;Claimed&rdquo; badge on your profile</li>
<li>Updated contact info (phone, address, website, email)</li>
<li>Facility description</li>
</ul>
${ctaButton('Complete Your Profile', onboardUrl)}
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">Need to manage your subscription? <a href="${SITE_URL}/api/stripe/portal" style="color:#2563EB">Manage subscription</a></p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Welcome to The Care Audit — Complete Your Verified Profile',
    html: emailLayout(content),
  });
}

export async function sendTier3Welcome(params: {
  email: string;
  facilityName: string;
  token: string;
}) {
  const responseUrl = `${SITE_URL}/facility-response/${params.token}`;
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Welcome to The Care Audit</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thank you for subscribing to <strong>Facility Response</strong> for <strong>${params.facilityName}</strong>.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">You can now post an official response on your facility&rsquo;s profile page. Your response will appear below the inspection summary, giving families your perspective.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">You have up to 1,000 characters to share corrective actions taken, context about violations, or updates about your facility.</p>
${ctaButton('Write Your Response', responseUrl)}
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">Need to manage your subscription? <a href="${SITE_URL}/api/stripe/portal" style="color:#2563EB">Manage subscription</a></p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Welcome to The Care Audit — Post Your Facility Response',
    html: emailLayout(content),
  });
}

export async function sendUpdateListingLink(params: {
  email: string;
  facilityName: string;
  token: string;
  tier: string;
}) {
  const formUrl = params.tier === 'facility_response'
    ? `${SITE_URL}/facility-response/${params.token}`
    : `${SITE_URL}/onboard/${params.token}`;

  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Update Your Listing</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Click below to update your facility listing for <strong>${params.facilityName}</strong>.</p>
${ctaButton('Update Your Listing', formUrl)}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Update your listing on The Care Audit',
    html: emailLayout(content),
  });
}

export async function sendDowngradeEmail(params: {
  email: string;
  facilityName: string;
  city: string;
  state: string;
  oldCount: number;
  newCount: number;
  currentTierName: string;
}) {
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Important update about your listing</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your facility, <strong>${params.facilityName}</strong> in ${params.city}, ${params.state}, recently received an updated state inspection report.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your violation count has changed from ${params.oldCount} to ${params.newCount}, which means your current ${params.currentTierName} listing no longer meets the eligibility requirements.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Eligibility for Featured Verified and Verified Profile listings requires 3 or fewer violations from the most recent state inspection.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your listing will transition to our Facility Response plan ($49/month) on your next billing cycle. With Facility Response, you can post an official response on your facility&rsquo;s profile page and update your phone number and address.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">If you&rsquo;d prefer to cancel your subscription entirely, you can do so anytime through your subscription management page.</p>
${ctaButton('Manage Your Subscription', `${SITE_URL}/api/stripe/portal`)}
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">If your violation count decreases to 3 or fewer following a future inspection, you&rsquo;ll be eligible to upgrade back to Featured Verified or Verified Profile.</p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Important update about your listing on The Care Audit',
    html: emailLayout(content),
  });
}

export async function sendUpgradeEmail(params: {
  email: string;
  facilityName: string;
  city: string;
  state: string;
  newCount: number;
}) {
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Great news for your facility</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your facility, <strong>${params.facilityName}</strong> in ${params.city}, ${params.state}, recently received an updated state inspection report showing <strong>${params.newCount} violation${params.newCount === 1 ? '' : 's'}</strong>.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Congratulations &mdash; this means your facility now qualifies for our premium listing options.</p>
<h3 style="margin:24px 0 12px;color:#111827;font-size:16px">Featured Verified ($149/month)</h3>
<ul style="color:#374151;line-height:1.8;margin:0 0 16px;padding-left:20px">
<li>Featured Verified badge</li>
<li>Priority placement on city and state pages</li>
<li>Up to 4 photos, &ldquo;Schedule a Tour&rdquo; button</li>
<li>Updated contact info and description</li>
</ul>
<h3 style="margin:24px 0 12px;color:#111827;font-size:16px">Verified Profile ($79/month)</h3>
<ul style="color:#374151;line-height:1.8;margin:0 0 16px;padding-left:20px">
<li>&ldquo;Claimed&rdquo; badge</li>
<li>Updated contact info and description</li>
</ul>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thousands of families use The Care Audit every month to research assisted living facilities in your area. A clean inspection record is something to be proud of &mdash; make sure families see it.</p>
${ctaButton('View Your Options', `${SITE_URL}/for-facilities`)}
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">You&rsquo;re currently subscribed to our Facility Response plan. Your current subscription will remain unchanged unless you choose to upgrade.</p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Great news — your facility now qualifies for a Featured listing',
    html: emailLayout(content),
  });
}

export async function sendOutreachEmail(params: {
  email: string;
  facilityName: string;
  city: string;
  state: string;
  totalViolations: number;
  facilityId: string;
}) {
  const optOutUrl = `${SITE_URL}/api/outreach/opt-out?facility_id=${params.facilityId}`;
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Families are viewing your facility&rsquo;s inspection report</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px"><strong>${params.facilityName}</strong> in ${params.city}, ${params.state} is listed on The Care Audit, a public directory of assisted living facility inspection reports.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thousands of families visit The Care Audit every month to research assisted living options. Your facility&rsquo;s profile currently shows <strong>${params.totalViolations} violation${params.totalViolations === 1 ? '' : 's'}</strong> from the most recent state inspection.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">The Care Audit organizes publicly available government inspection data into a searchable, readable format. All data comes directly from official state inspection reports.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">The Care Audit offers facility owners the ability to enhance their listing, update their contact information, and stand out to families actively searching for care options.</p>
${ctaButton('View Your Options', `${SITE_URL}/for-facilities`)}
<p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:24px 0 0;text-align:center">
<a href="${optOutUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from these emails</a>
</p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: "Families are viewing your facility's inspection report",
    html: emailLayout(content),
  });
}

export async function sendPriceChangeAnnouncement(params: {
  email: string;
  facilityName: string;
  currentTier: string;
  currentRate: number;
}) {
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Pricing update for The Care Audit</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">We&rsquo;re raising prices for new customers. Your current rate is locked in for 12 months from your sign-up date. No action needed on your part.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px"><strong>Your current plan:</strong> ${params.currentTier} at $${params.currentRate}/month</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Thank you for being an early subscriber to The Care Audit.</p>
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">Need to manage your subscription? <a href="${SITE_URL}/api/stripe/portal" style="color:#2563EB">Manage subscription</a></p>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Pricing update for The Care Audit',
    html: emailLayout(content),
  });
}

export async function sendGrandfatheredReminder(params: {
  email: string;
  facilityName: string;
  currentRate: number;
  newRate: number;
  expiryDate: string;
}) {
  const content = `
<h2 style="margin:0 0 16px;color:#111827;font-size:22px">Your grandfathered rate expires next month</h2>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your grandfathered rate of <strong>$${params.currentRate}/month</strong> for <strong>${params.facilityName}</strong> expires next month.</p>
<p style="color:#374151;line-height:1.6;margin:0 0 16px">Your new rate will be <strong>$${params.newRate}/month</strong> starting ${params.expiryDate}. You can cancel anytime before then.</p>
${ctaButton('Manage Your Subscription', `${SITE_URL}/api/stripe/portal`)}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.email,
    subject: 'Your grandfathered rate expires next month',
    html: emailLayout(content),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get('facility_id');

  if (!facilityId) {
    return new NextResponse(optOutPage('Invalid unsubscribe link.'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('facilities')
    .update({ outreach_opt_out: true })
    .eq('id', facilityId);

  if (error) {
    console.error('Opt-out error:', error);
    return new NextResponse(optOutPage('Something went wrong. Please try again later.'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new NextResponse(
    optOutPage("You've been unsubscribed from The Care Audit facility outreach emails."),
    { headers: { 'Content-Type': 'text/html' } }
  );
}

function optOutPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — The Care Audit</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:#fff;border-radius:12px;padding:48px;max-width:480px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{font-size:20px;color:#111827;margin:0 0 12px}p{color:#6b7280;line-height:1.6;margin:0}</style>
</head>
<body><div class="card"><h1>The Care Audit</h1><p>${message}</p></div></body>
</html>`;
}

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('reports')
    .select('html, generated_at')
    .eq('id', 'daily')
    .single();

  if (error || !data) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;">
        <h2>No report available yet.</h2>
        <p>The Daily Report generates at 4:00 PM CST. Check back then.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return new NextResponse(data.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

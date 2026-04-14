-- Migration: Create transparency_leads table
-- Run this in the Supabase dashboard SQL editor
-- Required for: Transparency Checker email capture (THE-20)

CREATE TABLE IF NOT EXISTS public.transparency_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  facility_slug text NOT NULL,
  facility_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (email, facility_slug)
);

CREATE INDEX IF NOT EXISTS transparency_leads_email_idx ON public.transparency_leads (email);
CREATE INDEX IF NOT EXISTS transparency_leads_created_at_idx ON public.transparency_leads (created_at DESC);

-- Enable RLS (service role bypasses this, but good practice)
ALTER TABLE public.transparency_leads ENABLE ROW LEVEL SECURITY;

-- Only allow service role reads/writes (no public access)
CREATE POLICY "Service role only" ON public.transparency_leads
  USING (false);

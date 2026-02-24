-- The Care Audit — Monetization Schema Migration
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/uhgooncaygpajfalazeb/sql/new

-- Monetization: subscriber-provided profile enhancements
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS facility_description TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS facility_response TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS onboarding_token TEXT UNIQUE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Outreach: scraped contact info for email blasts (internal only, never displayed on site)
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS outreach_email TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS outreach_website TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS outreach_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS outreach_opt_out BOOLEAN DEFAULT FALSE;

-- Index for onboarding token lookups
CREATE INDEX IF NOT EXISTS idx_facilities_onboarding_token ON facilities(onboarding_token) WHERE onboarding_token IS NOT NULL;

-- Index for outreach queries
CREATE INDEX IF NOT EXISTS idx_facilities_outreach ON facilities(outreach_sent, outreach_opt_out) WHERE outreach_email IS NOT NULL;

-- Create storage bucket for facility photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('facility-photos', 'facility-photos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read access
DROP POLICY IF EXISTS "Public read access for facility photos" ON storage.objects;
CREATE POLICY "Public read access for facility photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'facility-photos');

-- Storage policy: service role write access
DROP POLICY IF EXISTS "Service role write access for facility photos" ON storage.objects;
CREATE POLICY "Service role write access for facility photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'facility-photos' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role update access for facility photos" ON storage.objects;
CREATE POLICY "Service role update access for facility photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'facility-photos' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role delete access for facility photos" ON storage.objects;
CREATE POLICY "Service role delete access for facility photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'facility-photos' AND auth.role() = 'service_role');

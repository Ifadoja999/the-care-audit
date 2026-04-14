-- The Care Audit — Lead Capture Schema Migration
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/uhgooncaygpajfalazeb/sql/new

CREATE TABLE IF NOT EXISTS facility_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_phone TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_facility_leads_facility_id ON facility_leads(facility_id);

-- RLS: enable row-level security
ALTER TABLE facility_leads ENABLE ROW LEVEL SECURITY;

-- Service role can insert leads (called from API routes)
DROP POLICY IF EXISTS "Service role insert facility_leads" ON facility_leads;
CREATE POLICY "Service role insert facility_leads"
ON facility_leads FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Service role can select leads (called from API routes)
DROP POLICY IF EXISTS "Service role select facility_leads" ON facility_leads;
CREATE POLICY "Service role select facility_leads"
ON facility_leads FOR SELECT
USING (auth.role() = 'service_role');

-- Service role can update leads (to set notified_at)
DROP POLICY IF EXISTS "Service role update facility_leads" ON facility_leads;
CREATE POLICY "Service role update facility_leads"
ON facility_leads FOR UPDATE
USING (auth.role() = 'service_role');

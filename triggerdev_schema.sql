-- Trigger.dev Integration — New Supabase Tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- All 6 tables + 2 facility column additions + RLS policies

-- ============================================
-- TABLE 1: automation_log
-- Tracks every Trigger.dev task execution
-- ============================================
CREATE TABLE IF NOT EXISTS automation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  state_code TEXT,
  status TEXT CHECK (status IN ('started', 'completed', 'failed', 'skipped')) NOT NULL,
  payload JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_automation_log_task ON automation_log(task_name);
CREATE INDEX IF NOT EXISTS idx_automation_log_state ON automation_log(state_code);
CREATE INDEX IF NOT EXISTS idx_automation_log_status ON automation_log(status);
CREATE INDEX IF NOT EXISTS idx_automation_log_started ON automation_log(started_at);

-- ============================================
-- TABLE 2: gsc_milestones
-- Google Search Console traffic milestones
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_type TEXT NOT NULL DEFAULT 'clicks',
  milestone_value INTEGER NOT NULL,
  metric TEXT CHECK (metric IN ('clicks', 'impressions')) NOT NULL,
  period TEXT CHECK (period IN ('daily', 'weekly', 'monthly')) NOT NULL,
  reached_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(milestone_value, metric, period)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_milestones_unique ON gsc_milestones(milestone_value, metric, period);

-- ============================================
-- TABLE 3: foia_requests
-- FOIA / public records request tracking
-- ============================================
CREATE TABLE IF NOT EXISTS foia_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  request_type TEXT CHECK (request_type IN ('FOIA', 'Open Records', 'MPIA', 'Public Records', 'Other')) NOT NULL,
  agency_name TEXT NOT NULL,
  agency_email TEXT,
  submitted_date DATE NOT NULL,
  expected_response_date DATE,
  actual_response_date DATE,
  status TEXT CHECK (status IN ('submitted', 'acknowledged', 'processing', 'received', 'denied', 'appealed', 'closed')) DEFAULT 'submitted',
  notes TEXT,
  follow_up_sent_dates JSONB DEFAULT '[]',
  next_follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foia_state ON foia_requests(state_code);
CREATE INDEX IF NOT EXISTS idx_foia_status ON foia_requests(status);
CREATE INDEX IF NOT EXISTS idx_foia_next_follow_up ON foia_requests(next_follow_up_date);

-- ============================================
-- TABLE 4: portal_health
-- State portal uptime monitoring
-- ============================================
CREATE TABLE IF NOT EXISTS portal_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL,
  portal_url TEXT NOT NULL,
  portal_type TEXT CHECK (portal_type IN ('registry', 'inspection', 'profile')) NOT NULL,
  status TEXT CHECK (status IN ('up', 'down', 'degraded', 'changed')) NOT NULL,
  http_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  content_hash TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_health_state ON portal_health(state_code);
CREATE INDEX IF NOT EXISTS idx_portal_health_checked ON portal_health(checked_at);
CREATE INDEX IF NOT EXISTS idx_portal_health_status ON portal_health(status);

-- ============================================
-- TABLE 5: price_change_tracking
-- Grandfathered pricing and drip campaign tracking
-- ============================================
CREATE TABLE IF NOT EXISTS price_change_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  old_price_id TEXT NOT NULL,
  new_price_id TEXT NOT NULL,
  grandfathered_since DATE NOT NULL,
  grandfathered_expires DATE NOT NULL,
  drip_60_sent BOOLEAN DEFAULT FALSE,
  drip_60_sent_at TIMESTAMPTZ,
  drip_30_sent BOOLEAN DEFAULT FALSE,
  drip_30_sent_at TIMESTAMPTZ,
  drip_14_sent BOOLEAN DEFAULT FALSE,
  drip_14_sent_at TIMESTAMPTZ,
  drip_3_sent BOOLEAN DEFAULT FALSE,
  drip_3_sent_at TIMESTAMPTZ,
  migrated BOOLEAN DEFAULT FALSE,
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_tracking_facility ON price_change_tracking(facility_id);
CREATE INDEX IF NOT EXISTS idx_price_tracking_expires ON price_change_tracking(grandfathered_expires);
CREATE INDEX IF NOT EXISTS idx_price_tracking_migrated ON price_change_tracking(migrated);

-- ============================================
-- TABLE 6: facility_change_log
-- Tracks changes detected during re-scraping
-- ============================================
CREATE TABLE IF NOT EXISTS facility_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  state_code TEXT NOT NULL,
  change_type TEXT CHECK (change_type IN ('new_facility', 'closed_facility', 'violation_change', 'data_update', 'missing_from_scrape')) NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  consecutive_missing_count INTEGER DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_change_log_state ON facility_change_log(state_code);
CREATE INDEX IF NOT EXISTS idx_change_log_type ON facility_change_log(change_type);
CREATE INDEX IF NOT EXISTS idx_change_log_processed ON facility_change_log(processed);

-- ============================================
-- FACILITY TABLE ADDITIONS
-- New columns for pipeline reconciliation
-- ============================================
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS consecutive_missing_scrapes INTEGER DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS last_seen_in_scrape TIMESTAMPTZ;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- All new tables: service role only (internal)
-- ============================================
ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON automation_log FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE gsc_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON gsc_milestones FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE foia_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON foia_requests FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE portal_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON portal_health FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE price_change_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON price_change_tracking FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE facility_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON facility_change_log FOR ALL USING (auth.role() = 'service_role');

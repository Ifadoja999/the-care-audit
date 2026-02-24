export interface Facility {
  id: string;
  facility_name: string;
  license_number: string;
  state: string;
  city: string;
  county: string;
  address: string;
  phone: string | null;
  facility_type: string;
  licensed_capacity: number | null;
  last_inspection_date: string;
  total_violations: number | null;
  report_url: string;
  ai_summary: string;
  slug: string;
  last_updated: string;
  is_sponsored?: boolean;
  sponsor_expiry_date?: string;
  sponsor_tier?: string | null;
  // Monetization: subscriber-provided profile enhancements
  website_url?: string | null;
  contact_email?: string | null;
  facility_description?: string | null;
  facility_response?: string | null;
  onboarding_token?: string | null;
  onboarding_completed?: boolean;
  // Outreach: internal only, never displayed on site
  outreach_email?: string | null;
  outreach_website?: string | null;
  outreach_sent?: boolean;
  outreach_opt_out?: boolean;
  // Facility lifecycle status
  facility_status?: 'active' | 'closed' | 'license_expired' | 'license_suspended';
}

export interface Violation {
  id: string;
  facility_id: string;
  violation_code: string;
  violation_description: string;
  severity_level: 'High' | 'Medium' | 'Low';
  date_cited: string;
  correction_deadline: string;
  status: 'Open' | 'Corrected' | 'Pending' | 'Unknown';
}

export interface FacilityWithViolations extends Facility {
  violations: Violation[];
}

export interface StateStats {
  state: string;
  facility_count: number;
}

export interface CityStats {
  city: string;
  facility_count: number;
}

export interface Facility {
  id: string;
  facility_name: string;
  license_number: string;
  state: string;
  city: string;
  county: string;
  address: string;
  facility_type: string;
  last_inspection_date: string;
  safety_grade: 'A' | 'B' | 'C' | 'F';
  total_violations: number;
  severity_level: 'High' | 'Medium' | 'Low';
  report_url: string;
  ai_summary: string;
  slug: string;
  last_updated: string;
  is_sponsored?: boolean;
  sponsor_expiry_date?: string;
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

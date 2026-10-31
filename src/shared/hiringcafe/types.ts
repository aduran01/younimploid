// Shapes observed in tests/fixtures/hiringcafe/. See docs/HIRINGCAFE.md.
// Fields not seen in every fixture are optional. String values stay plain strings
// because the endpoint is unofficial and may add values at any time.
// job_information's user ID lists (viewedByUsers etc.) are deliberately not typed.

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface LocationOptions {
  radius?: number;
  radius_unit?: string;
  ignore_radius?: boolean;
  flexible_regions?: string[];
}

export interface SearchLocation {
  id: string;
  postal_code?: string;
  types: string[];
  formatted_address: string;
  address_components: AddressComponent[];
  geometry: { location: { lat: number; lon: number } };
  postal_code_source?: string;
  workplace_types?: string[];
  options: LocationOptions;
}

export interface SearchState {
  searchQuery?: string;
  locations?: SearchLocation[];
  workplaceTypes?: string[];
  commitmentTypes?: string[];
  restrictJobsToTransparentSalaries?: boolean;
  departments?: string[];
  calcFrequency?: string;
  maxCompensationLowEnd?: string;
  seniorityLevel?: string[];
  securityClearances?: string[];
}

export interface JobInformation {
  title: string;
  job_title_raw: string;
  num_views?: number;
  num_applies?: number;
  num_saves?: number;
}

export interface ProcessedJobData {
  core_job_title: string;
  requirements_summary: string;
  technical_tools: string[];
  licenses_or_certifications: string[];
  associates_degree_requirement: string;
  bachelors_degree_requirement: string;
  masters_degree_requirement: string;
  doctorate_degree_requirement: string;
  min_industry_and_role_yoe: number | null;
  min_management_and_leadership_yoe: number | null;
  job_category: string;
  commitment: string[];
  role_type: string;
  seniority_level: string;
  workplace_type: string;
  formatted_workplace_location: string;
  language_requirements: string[];
  yearly_min_compensation: number | null;
  yearly_max_compensation: number | null;
  monthly_min_compensation: number | null;
  monthly_max_compensation: number | null;
  weekly_min_compensation: number | null;
  weekly_max_compensation: number | null;
  'bi-weekly_min_compensation': number | null;
  'bi-weekly_max_compensation': number | null;
  daily_min_compensation: number | null;
  daily_max_compensation: number | null;
  hourly_min_compensation: number | null;
  hourly_max_compensation: number | null;
  is_compensation_transparent: boolean;
  listed_compensation_currency: string;
  listed_compensation_frequency: string;
  estimated_publish_date: string;
  estimated_publish_date_millis: number;
  security_clearance: string;
  visa_sponsorship: boolean;
  company_name: string;
  company_website: string | null;
  company_sector_and_industry: string | null;
  company_activities: string[] | null;
  company_tagline: string | null;
}

export interface EnrichedCompanyData {
  name: string | null;
  homepage_uri: string | null;
  hq_country: string | null;
  industries: string[] | null;
  nb_employees: number | null;
  year_founded: number | null;
  tagline: string | null;
}

export interface JobHit {
  id: string;
  objectID: string;
  source: string;
  board_token: string;
  source_and_board_token: string;
  apply_url: string;
  is_expired: boolean;
  requisition_id: string;
  job_information: JobInformation;
  v5_processed_job_data: ProcessedJobData;
  enriched_company_data: EnrichedCompanyData;
  job_incarnation?: number;
  original_source_id?: string;
  hc_indexed_at?: string;
}

export interface PageProps {
  ssrHits: JobHit[];
  ssrPage: number;
  ssrTotalCount: number;
  ssrCompanyCount: number;
  ssrPageSize: number;
  ssrIsLastPage: boolean;
  // Only ever null in fixtures, so its real shape is unknown.
  ssrError: unknown;
  ssrSignedIn: boolean;
  initialSearchState: SearchState;
}

export interface DataResponse {
  pageProps: PageProps;
}

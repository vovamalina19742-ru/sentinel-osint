export type TargetType = 'phone' | 'email' | 'username' | 'image' | 'listing_url';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface InvestigationStep {
  id: string;
  target: string;
  platform: string;
  status: 'running' | 'found' | 'not_found' | 'error';
  message: string;
  progress_percent: number;
  url?: string;
}

export interface RedFlag {
  id: string;
  source: string;
  title: string;
  description: string;
  severity: RiskSeverity;
}

export interface SocialProfile {
  platform: string;
  url: string;
  exists: boolean;
  raw_details?: Record<string, unknown>;
}

export interface InvestigationDossier {
  id: string;
  target: string;
  target_type: TargetType;
  trust_score: number; // 0 - 100
  created_at: string;
  summary: string;
  red_flags: RedFlag[];
  profiles: SocialProfile[];
  raw_findings: Record<string, unknown>;
}

export interface ImageComparisonResult {
  hash1: string;
  hash2: string;
  hamming_distance: number;
  similarity_percent: number;
  is_duplicate: boolean;
  risk_severity: RiskSeverity;
  verdict: string;
}

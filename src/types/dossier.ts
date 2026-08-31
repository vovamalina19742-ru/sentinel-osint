export type TargetType = 'phone' | 'email' | 'username' | 'image' | 'listing_url';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

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
  rawDetails?: Record<string, unknown>;
}

export interface InvestigationDossier {
  id: string;
  target: string;
  targetType: TargetType;
  trustScore: number; // 0 - 100
  createdAt: string;
  summary: string;
  redFlags: RedFlag[];
  profiles: SocialProfile[];
  rawFindings: Record<string, unknown>;
}

export interface ImageComparisonResult {
  hash1: string;
  hash2: string;
  hammingDistance: number;
  similarityPercent: number;
  isDuplicate: boolean;
  riskSeverity: RiskSeverity;
  verdict: string;
}

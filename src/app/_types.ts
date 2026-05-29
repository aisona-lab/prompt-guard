// Shared UI types for the prompt-guard playground (mirror the API response shape).

export interface Finding {
  rule_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  matched_text: string;
  position: number;
  confidence: number;
  remediation: string;
  detector: string;
}

export interface ScanResult {
  risk_score: number;
  is_safe: boolean;
  findings: Finding[];
  normalized_prompt?: string;
  metadata: {
    scan_duration_ms: number;
    detectors_used: string[];
    prompt_length: number;
    transformations_applied: string[];
  };
}

export interface CustomRule {
  id: string;
  pattern: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  remediation: string;
}

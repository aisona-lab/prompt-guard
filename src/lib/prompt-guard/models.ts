// prompt-guard models — data types for the scanning engine

export enum Severity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

export enum Category {
  INJECTION = "prompt-injection",
  JAILBREAK = "jailbreak",
  LEAKAGE = "system-prompt-leak",
  OBFUSCATION = "obfuscation",
  HIJACKING = "goal-hijacking",
  PII_EXFIL = "pii-exfiltration",
}

export interface Finding {
  rule_id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  matched_text: string;
  position: number;
  confidence: number;
  remediation: string;
  detector: string;
}

export interface GuardResult {
  prompt: string;
  normalized_prompt: string;
  risk_score: number;
  is_safe: boolean;
  findings: Finding[];
  metadata: {
    scan_duration_ms: number;
    detectors_used: string[];
    prompt_length: number;
    transformations_applied: string[];
  };
}

export interface NormalizedPrompt {
  original: string;
  normalized: string;
  decoded_segments: string[];
  transformations_applied: string[];
}

export interface ScanRequest {
  prompt: string;
  threshold?: number;
  detectors?: string[];
  include_normalized?: boolean;
}

export interface RuleDefinition {
  id: string;
  title: string;
  severity: Severity;
  pattern: string;
  category: Category;
  remediation: string;
  description?: string;
}

// Calibrated so that a single CRITICAL or HIGH finding clears the default
// threshold (30) on its own, while a lone MEDIUM/LOW signal does not — those
// only push a prompt over the line when they stack. See bench/ for the
// precision/recall trade-off these weights were tuned against.
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  [Severity.CRITICAL]: 50,
  [Severity.HIGH]: 40,
  [Severity.MEDIUM]: 18,
  [Severity.LOW]: 6,
  [Severity.INFO]: 1,
};

export const SEVERITY_ORDER: Severity[] = [
  Severity.CRITICAL,
  Severity.HIGH,
  Severity.MEDIUM,
  Severity.LOW,
  Severity.INFO,
];

export function getHighestSeverity(findings: Finding[]): Severity | null {
  if (!findings.length) return null;
  for (const sev of SEVERITY_ORDER) {
    if (findings.some((f) => f.severity === sev)) return sev;
  }
  return null;
}

// prompt-guard PII detector — detects personally identifiable information exfiltration

import { BaseDetector } from "./base";
import { Finding, Category, Severity, NormalizedPrompt, RuleDefinition } from "../models";

// PII patterns
const PII_RULES: RuleDefinition[] = [
  {
    id: "PII-001",
    title: "SSN pattern detected",
    severity: Severity.CRITICAL,
    pattern: "\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b",
    category: Category.PII_EXFIL,
    description: "A Social Security Number pattern was found in the prompt. This could be an attempt to exfiltrate PII.",
    remediation: "Do not include SSNs in prompts. Redact or mask this data before processing.",
  },
  {
    id: "PII-002",
    title: "Credit card number detected",
    severity: Severity.CRITICAL,
    pattern: "\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b",
    category: Category.PII_EXFIL,
    description: "A credit card number pattern was found. This is a PII exfiltration risk.",
    remediation: "Remove credit card numbers from prompts. Use tokenized references instead.",
  },
  {
    id: "PII-003",
    title: "Email address detected",
    severity: Severity.MEDIUM,
    pattern: "\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\\b",
    category: Category.PII_EXFIL,
    description: "An email address was found in the prompt. Consider if this is necessary.",
    remediation: "Avoid including real email addresses in prompts. Use placeholder emails for testing.",
  },
  {
    id: "PII-004",
    title: "Phone number detected",
    severity: Severity.MEDIUM,
    pattern: "\\b(?:\\+?1[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b",
    category: Category.PII_EXFIL,
    description: "A phone number pattern was found in the prompt.",
    remediation: "Remove phone numbers from prompts unless explicitly needed for the task.",
  },
  {
    id: "PII-005",
    title: "API key pattern detected",
    severity: Severity.CRITICAL,
    pattern: "(?:sk-|sk_live_|pk_live_|AKIA|ghp_|gho_|glpat-|xox[bpas]-)[a-zA-Z0-9_\\-]{20,}",
    category: Category.PII_EXFIL,
    description: "An API key or secret token pattern was detected. This is a critical security risk.",
    remediation: "NEVER include API keys in prompts. Revoke any exposed keys immediately.",
  },
  {
    id: "PII-006",
    title: "IP address detected",
    severity: Severity.LOW,
    pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b",
    category: Category.PII_EXFIL,
    description: "An IP address was found in the prompt.",
    remediation: "Consider masking IP addresses before sending to an LLM.",
  },
  {
    id: "PII-007",
    title: "PII extraction request",
    severity: Severity.HIGH,
    pattern: "(?:extract|collect|gather|harvest|scrape|dump|list|provide|give|show|find|search|look\\s+up)\\s+(?:all\\s+)?(?:personal|private|sensitive|confidential|user|customer|employee)\\s+(?:data|information|details|records|profiles|pii)",
    category: Category.PII_EXFIL,
    description: "The prompt requests extraction of personal or sensitive data, which may be a PII exfiltration attempt.",
    remediation: "Do not use LLMs to extract or aggregate personal data. Ensure data handling compliance.",
  },
];

export class PIIDetector extends BaseDetector {
  name = "pii-exfiltration";

  detect(prompt: NormalizedPrompt): Finding[] {
    const findings: Finding[] = [];
    const textsToCheck = [prompt.normalized, ...prompt.decoded_segments];

    for (const rule of PII_RULES) {
      try {
        const regex = new RegExp(rule.pattern, "gi");
        for (const text of textsToCheck) {
          let match: RegExpExecArray | null;
          regex.lastIndex = 0;
          while ((match = regex.exec(text)) !== null) {
            const matchedText = match[0];
            const position = match.index;
            findings.push({
              rule_id: rule.id,
              category: Category.PII_EXFIL,
              severity: rule.severity,
              title: rule.title,
              description: rule.description || rule.title,
              matched_text: matchedText.length > 100 ? matchedText.substring(0, 100) + "..." : matchedText,
              position: Math.max(0, position),
              confidence: this.calculateConfidence(matchedText, rule),
              remediation: rule.remediation,
              detector: this.name,
            });
          }
        }
      } catch {
        // Invalid regex, skip
      }
    }

    return findings;
  }

  private calculateConfidence(matchedText: string, rule: { severity: Severity }): number {
    let confidence = 0.80;
    if (matchedText.length > 10) confidence += 0.05;
    if (matchedText.length > 20) confidence += 0.05;
    if (rule.severity === Severity.CRITICAL) confidence += 0.10;
    return Math.min(0.99, confidence);
  }
}

export { PII_RULES };

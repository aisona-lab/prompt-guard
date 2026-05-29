// prompt-guard injection detector — detects prompt injection attempts

import { BaseDetector } from "./base";
import { Finding, Category, Severity, NormalizedPrompt, RuleDefinition } from "../models";

const INJECTION_RULES: RuleDefinition[] = [
  {
    id: "INJ-001",
    title: "Direct instruction override",
    severity: Severity.CRITICAL,
    pattern: "ignore\\s+(?:all\\s+)?(?:the\\s+|these\\s+|those\\s+)?(?:previous\\s+|above\\s+|prior\\s+|preceding\\s+|earlier\\s+|original\\s+)?(?:instructions?|prompts?|rules?|directives?|commands?|guidelines?|orders?)|ignore\\s+(?:everything\\s+)?(?:the\\s+)?(?:above|foregoing|preceding|aforementioned)\\b",
    category: Category.INJECTION,
    remediation: "The prompt contains an attempt to override system instructions. Reject or sanitize before sending to the LLM.",
    description: "Detects phrases like 'ignore all previous instructions' that attempt to override the system prompt.",
  },
  {
    id: "INJ-002",
    title: "Delimiter injection",
    severity: Severity.CRITICAL,
    pattern: "\\[system\\]|\\[INST\\]|<\\|system\\|>|<\\|im_start\\|>",
    category: Category.INJECTION,
    remediation: "The prompt injects system delimiters. Strip these before processing.",
    description: "Detects injection of chat template delimiters like [SYSTEM] or <|im_start|>.",
  },
  {
    id: "INJ-003",
    title: "Role override",
    severity: Severity.HIGH,
    pattern: "you\\s+are\\s+now|from\\s+now\\s+on\\s+you\\s+(?:are|will\\s+be|must)",
    category: Category.INJECTION,
    remediation: "The prompt attempts to redefine the model's role. Reject or flag for review.",
    description: "Detects attempts to redefine the AI's role or identity.",
  },
  {
    id: "INJ-004",
    title: "Disregard instructions",
    severity: Severity.HIGH,
    pattern: "disregard\\s+(?:everything|all|your)\\s+(?:above|previous|prior)",
    category: Category.INJECTION,
    remediation: "The prompt asks the model to disregard its instructions. Reject this prompt.",
    description: "Detects phrases instructing the model to disregard previous instructions.",
  },
  {
    id: "INJ-005",
    title: "Forget instructions",
    severity: Severity.HIGH,
    pattern: "forget\\s+(?:about\\s+)?(?:everything|all|your\\s+instructions|what\\s+(?:i|you)\\s+said|the\\s+(?:previous|above|prior)|(?:all\\s+)?(?:the\\s+)?(?:previous|prior|preceding|earlier)\\s+(?:instructions?|orders?|tasks?|commands?))",
    category: Category.INJECTION,
    remediation: "The prompt asks the model to forget its instructions. Flag for review.",
    description: "Detects attempts to make the model forget its programming.",
  },
  {
    id: "INJ-006",
    title: "New instructions injection",
    severity: Severity.CRITICAL,
    pattern: "new\\s+(?:instructions?|task|objective|goal|directive)s?\\s*:",
    category: Category.INJECTION,
    remediation: "The prompt attempts to inject new instructions. Reject before processing.",
    description: "Detects injection of new instructions via 'new instructions:' or similar.",
  },
  {
    id: "INJ-007",
    title: "Real instructions probe",
    severity: Severity.HIGH,
    pattern: "your\\s+(?:real|actual|true)\\s+(?:instructions?|purpose|goal|objective)",
    category: Category.INJECTION,
    remediation: "The prompt probes for the model's real instructions. Consider flagging.",
    description: "Detects probing for the model's hidden instructions or true purpose.",
  },
  {
    id: "INJ-008",
    title: "Act as override",
    severity: Severity.HIGH,
    pattern: "act\\s+as\\s+(?:if\\s+)?you\\s+(?:are|were|have\\s+no)",
    category: Category.INJECTION,
    remediation: "The prompt attempts to make the model act as something else. Review carefully.",
    description: "Detects 'act as if you are' patterns that attempt role manipulation.",
  },
  {
    id: "INJ-009",
    title: "Safety bypass",
    severity: Severity.CRITICAL,
    pattern: "(?:override|bypass|circumvent|ignore|disable|remove|turn\\s+off|get\\s+rid\\s+of)\\s+(?:(?:your|all|the|its|any)\\s+)?(?:safety|filter|restriction|guardrail|polic(?:y|ies)|guideline|content\\s+polic(?:y|ies)|rule)s?",
    category: Category.INJECTION,
    remediation: "The prompt attempts to bypass safety filters. Reject immediately.",
    description: "Detects explicit attempts to bypass safety mechanisms.",
  },
  {
    id: "INJ-010",
    title: "Stop sequence injection",
    severity: Severity.HIGH,
    pattern: "<\\|end\\|>|<\\|endoftext\\|>|<\\/s>|\\[\\/?INST\\]|<\\|im_end\\|>",
    category: Category.INJECTION,
    remediation: "The prompt injects stop sequences. Strip these tokens before processing.",
    description: "Detects injection of model stop sequences or end tokens.",
  },
];

export class InjectionDetector extends BaseDetector {
  name = "injection";

  detect(prompt: NormalizedPrompt): Finding[] {
    const findings: Finding[] = [];
    const textsToCheck = [prompt.normalized, ...prompt.decoded_segments];

    for (const rule of INJECTION_RULES) {
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
              category: rule.category,
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

  private calculateConfidence(matchedText: string, rule: RuleDefinition): number {
    let confidence = 0.85;
    if (matchedText.length > 20) confidence += 0.05;
    if (matchedText.length > 40) confidence += 0.05;
    if (rule.severity === Severity.CRITICAL) confidence += 0.05;
    return Math.min(0.99, confidence);
  }
}

export { INJECTION_RULES };

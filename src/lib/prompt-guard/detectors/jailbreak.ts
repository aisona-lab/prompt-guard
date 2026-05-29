// prompt-guard jailbreak detector — detects jailbreak patterns

import { BaseDetector } from "./base";
import { Finding, Category, Severity, NormalizedPrompt, RuleDefinition } from "../models";

const JAILBREAK_RULES: RuleDefinition[] = [
  {
    id: "JB-001",
    title: "DAN jailbreak attempt",
    severity: Severity.CRITICAL,
    pattern: "you\\s+are\\s+(?:now\\s+)?dan|(?:act|behave|respond|talk)\\s+(?:as\\s+(?:if\\s+you\\s+are\\s+)?|like\\s+)dan|\\bdan\\s+mode|\\bdan\\b\\s*[:,]|do\\s+anything\\s+now|\\bdan\\b\\s+(?:has\\s+(?:no|broken)|can\\s+do|will\\s+(?:answer|do)|is\\s+free)",
    category: Category.JAILBREAK,
    remediation: "DAN jailbreak pattern detected. Reject this prompt.",
    description: "Detects the classic DAN (Do Anything Now) jailbreak pattern.",
  },
  {
    id: "JB-002",
    title: "Developer/unrestricted mode",
    severity: Severity.HIGH,
    pattern: "developer\\s+mode|jailbreak\\s+mode|unrestricted\\s+mode|god\\s+mode",
    category: Category.JAILBREAK,
    remediation: "The prompt attempts to activate a fictitious unrestricted mode.",
    description: "Detects attempts to activate developer, jailbreak, or unrestricted modes.",
  },
  {
    id: "JB-003",
    title: "Fictional framing evasion",
    severity: Severity.MEDIUM,
    pattern: "in\\s+(?:a\\s+|this\\s+)?(?:fictional|hypothetical|imaginary)\\s+(?:world|scenario|story|universe)",
    category: Category.JAILBREAK,
    remediation: "The prompt uses fictional framing to evade restrictions. Review context.",
    description: "Detects fictional/hypothetical framing used to bypass content policies.",
  },
  {
    id: "JB-004",
    title: "Pretend without restrictions",
    severity: Severity.HIGH,
    pattern: "pretend\\s+(?:you\\s+are|to\\s+be)\\s+(?:an?\\s+)?(?:AI|model|assistant)\\s+(?:without|with\\s+no|that\\s+(?:has\\s+no|ignores))",
    category: Category.JAILBREAK,
    remediation: "The prompt asks the model to pretend without restrictions. Reject.",
    description: "Detects 'pretend you are an AI without restrictions' patterns.",
  },
  {
    id: "JB-005",
    title: "Educational/research framing",
    severity: Severity.MEDIUM,
    pattern: "for\\s+(?:educational|research|fictional|creative\\s+writing)\\s+purposes?\\s*(?:only)?",
    category: Category.JAILBREAK,
    remediation: "The prompt uses educational/research framing. Verify legitimacy.",
    description: "Detects 'for educational purposes' framing often used to bypass restrictions.",
  },
  {
    id: "JB-006",
    title: "Grandma jailbreak",
    severity: Severity.HIGH,
    pattern: "(?:grandmother|grandma|granny|abuela)\\b.{0,60}(?:read|tell|say|sang?|sing|recite|whisper|make|made|used\\s+to|would)",
    category: Category.JAILBREAK,
    remediation: "Grandma jailbreak pattern detected. This uses emotional manipulation.",
    description: "Detects the 'grandma used to tell me' jailbreak technique.",
  },
  {
    id: "JB-007",
    title: "Repeat after me",
    severity: Severity.MEDIUM,
    pattern: "repeat\\s+after\\s+me|say\\s+the\\s+(?:following|words|phrase)",
    category: Category.JAILBREAK,
    remediation: "The prompt uses repetition commands. Review the requested content.",
    description: "Detects 'repeat after me' patterns used to force model output.",
  },
  {
    id: "JB-008",
    title: "Roleplay without restrictions",
    severity: Severity.HIGH,
    pattern: "roleplay.*no\\s+restrictions|as\\s+a\\s+character.*(?:say|do)",
    category: Category.JAILBREAK,
    remediation: "The prompt uses roleplay framing to bypass restrictions. Review carefully.",
    description: "Detects roleplay with no restrictions patterns.",
  },
  {
    id: "JB-009",
    title: "Hypothetical bypass",
    severity: Severity.MEDIUM,
    pattern: "hypothetical(?:ly)?\\b.{0,40}if\\s+you\\s+(?:had\\s+no|could|were|did\\s*n.?t|weren.?t|have\\s+no)",
    category: Category.JAILBREAK,
    remediation: "The prompt uses hypothetical framing to probe restricted capabilities.",
    description: "Detects 'hypothetically, if you could/were' bypass patterns.",
  },
  {
    id: "JB-010",
    title: "Evil/confident mode",
    severity: Severity.HIGH,
    pattern: "(?:evil|confident|sigma|omega|amoral|unhinged)\\s+(?:mode|assistant|ai|chatbot|bot|persona|version)",
    category: Category.JAILBREAK,
    remediation: "The prompt attempts to activate an alternate persona. Reject.",
    description: "Detects 'evil mode' or 'confident mode' alternate persona jailbreaks.",
  },
  {
    id: "JB-011",
    title: "Explicitly unconstrained model",
    severity: Severity.HIGH,
    pattern: "(?:you\\s+(?:have|now\\s+have)\\s+no|with\\s+no|without\\s+(?:any|the)|that\\s+(?:has\\s+no|ignores|has\\s+broken\\s+free\\s+of))\\s+(?:rules?|restrictions?|filters?|limits?|limitations?|guidelines?|boundaries|ethics?|morals?|constraints?|content\\s+polic(?:y|ies))",
    category: Category.JAILBREAK,
    remediation: "The prompt declares the model is free of rules/filters/ethics — a core jailbreak framing. Reject.",
    description: "Detects assertions that the model has 'no rules / no restrictions / no filters / no ethics'.",
  },
  {
    id: "JB-012",
    title: "Unfiltered persona / jailbroken",
    severity: Severity.HIGH,
    pattern: "(?:unfiltered|amoral|uncensored|unrestricted|no[\\s-]filter)\\b.{0,30}(?:chatbot|ai|assistant|model|bot|persona)|\\bjail\\s*broken\\b",
    category: Category.JAILBREAK,
    remediation: "The prompt invokes an unfiltered/jailbroken persona (AIM, STAN, etc.). Reject.",
    description: "Detects named or described unfiltered/amoral/jailbroken personas such as AIM or STAN.",
  },
];

export class JailbreakDetector extends BaseDetector {
  name = "jailbreak";

  detect(prompt: NormalizedPrompt): Finding[] {
    const findings: Finding[] = [];
    const textsToCheck = [prompt.normalized, ...prompt.decoded_segments];

    for (const rule of JAILBREAK_RULES) {
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
    let confidence = 0.82;
    if (matchedText.length > 15) confidence += 0.05;
    if (matchedText.length > 30) confidence += 0.05;
    if (rule.severity === Severity.CRITICAL) confidence += 0.07;
    return Math.min(0.99, confidence);
  }
}

export { JAILBREAK_RULES };

// prompt-guard leakage detector — detects system prompt leak attempts

import { BaseDetector } from "./base";
import { Finding, Category, Severity, NormalizedPrompt, RuleDefinition } from "../models";

const LEAKAGE_RULES: RuleDefinition[] = [
  {
    id: "LEAK-001",
    title: "System prompt extraction",
    severity: Severity.CRITICAL,
    pattern: "(?:what\\s+(?:are|is|were)|tell\\s+me|show\\s+me|reveal|print|output|display|repeat|give\\s+me|share)\\s+(?:me\\s+)?(?:your\\s+|the\\s+)?(?:(?:system|initial|base|original|hidden|secret|exact|full|complete)\\s+)*(?:system\\s+)?(?:prompt|instructions?)",
    category: Category.LEAKAGE,
    remediation: "The prompt attempts to extract the system prompt. Do not include system instructions in the response.",
    description: "Detects direct attempts to extract system prompt or instructions.",
  },
  {
    id: "LEAK-002",
    title: "Instruction summarization",
    severity: Severity.HIGH,
    pattern: "(?:summarize|explain|describe)\\s+(?:your\\s+)?(?:instructions?|system\\s+prompt|configuration)",
    category: Category.LEAKAGE,
    remediation: "The prompt asks the model to summarize its instructions. Review before responding.",
    description: "Detects attempts to get the model to summarize or explain its instructions.",
  },
  {
    id: "LEAK-003",
    title: "Programming probe",
    severity: Severity.HIGH,
    pattern: "what\\s+(?:were\\s+you|have\\s+you\\s+been)\\s+(?:told|instructed|programmed|trained)\\s+to",
    category: Category.LEAKAGE,
    remediation: "The prompt probes for the model's programming or training. Be cautious.",
    description: "Detects probing questions about what the model was told or trained to do.",
  },
  {
    id: "LEAK-004",
    title: "Instruction bypass reference",
    severity: Severity.HIGH,
    pattern: "(?:ignore|without|bypass)\\s+(?:your\\s+)?(?:system\\s+prompt|instructions?)",
    category: Category.LEAKAGE,
    remediation: "The prompt references bypassing instructions. This may be a dual injection/leakage attempt.",
    description: "Detects references to ignoring or bypassing system instructions.",
  },
  {
    id: "LEAK-005",
    title: "AI self-disclosure probe",
    severity: Severity.MEDIUM,
    pattern: "as\\s+(?:an?\\s+)?(?:AI|a\\s+language\\s+model|an?\\s+assistant).*your\\s+instructions",
    category: Category.LEAKAGE,
    remediation: "The prompt uses AI self-reference to probe for instructions. Review context.",
    description: "Detects 'as an AI, what are your instructions' patterns.",
  },
  {
    id: "LEAK-006",
    title: "Hidden content extraction",
    severity: Severity.HIGH,
    pattern: "(?:echo|print|dump|log|write\\s+out|spit\\s+out)\\s+(?:your|the)\\s+(?:(?:system|hidden|internal|secret|initial)\\s+)+(?:prompt|instructions?|message|text)",
    category: Category.LEAKAGE,
    remediation: "The prompt attempts to extract hidden content. Do not comply.",
    description: "Detects attempts to get the model to echo or print hidden system content.",
  },
  {
    id: "LEAK-007",
    title: "Format-based extraction",
    severity: Severity.HIGH,
    pattern: "(?:output|return|provide|give\\s+me)\\s+(?:your|the)\\s+(?:full|complete|entire|whole|original)\\s+(?:system|initial|base)\\s+(?:prompt|instructions?)",
    category: Category.LEAKAGE,
    remediation: "The prompt requests the full system prompt. Do not include it in output.",
    description: "Detects requests for the complete/original system prompt.",
  },
  {
    id: "LEAK-008",
    title: "Repeat-the-context extraction",
    severity: Severity.HIGH,
    pattern: "(?:repeat|print|output|echo|relay|show|reproduce|spit\\s+out)\\s+(?:me\\s+)?(?:the\\s+|all\\s+(?:of\\s+)?(?:the\\s+)?|everything\\s+)?(?:words?|text|sentences?|content|lines?|messages?|prompts?|paragraphs?|tokens?|everything)\\s+(?:above|before|preceding|prior|at\\s+the\\s+(?:top|start|beginning))",
    category: Category.LEAKAGE,
    remediation: "The prompt tries to make the model echo the preceding context (a common way to leak the system prompt). Strip or refuse.",
    description: "Detects 'repeat the words/text above' style attacks that exfiltrate the system prompt without naming it.",
  },
  {
    id: "LEAK-009",
    title: "Verbatim phrase extraction",
    severity: Severity.MEDIUM,
    pattern: "(?:start(?:ing)?\\s+with\\s+(?:the\\s+)?(?:phrase|sentence|words?|line)|(?:everything|all)\\s+above\\s+(?:this\\s+)?(?:line|point|message)|above\\s+verbatim|verbatim\\s+(?:everything|the\\s+text|the\\s+content)\\s+above)",
    category: Category.LEAKAGE,
    remediation: "The prompt uses a verbatim-repeat framing often paired with context-leak attacks. Review and refuse if it targets hidden instructions.",
    description: "Detects 'starting with the phrase ...' / 'everything above verbatim' framings used to leak hidden context.",
  },
];

export class LeakageDetector extends BaseDetector {
  name = "leakage";

  detect(prompt: NormalizedPrompt): Finding[] {
    const findings: Finding[] = [];
    const textsToCheck = [prompt.normalized, ...prompt.decoded_segments];

    for (const rule of LEAKAGE_RULES) {
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
    if (rule.severity === Severity.CRITICAL) confidence += 0.04;
    return Math.min(0.99, confidence);
  }
}

export { LEAKAGE_RULES };

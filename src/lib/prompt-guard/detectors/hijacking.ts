// prompt-guard hijacking detector — detects indirect prompt injection / goal hijacking

import { BaseDetector } from "./base";
import { Finding, Category, Severity, NormalizedPrompt, RuleDefinition } from "../models";

const HIJACKING_RULES: RuleDefinition[] = [
  {
    id: "HJ-001",
    title: "Hidden instruction injection",
    severity: Severity.CRITICAL,
    pattern: "<!--\\s*instructions?:|\\[hidden:|\\{system:|<!--\\s*system",
    category: Category.HIJACKING,
    remediation: "Hidden instructions found in markup. Strip HTML/XML comments before processing.",
    description: "Detects hidden instructions embedded in HTML comments or markup delimiters.",
  },
  {
    id: "HJ-002",
    title: "Embedded system instructions",
    severity: Severity.CRITICAL,
    pattern: "(?:system|assistant|user)\\s*:\\s*(?:ignore|forget|override|bypass|new|change)",
    category: Category.HIJACKING,
    remediation: "Embedded role-based instructions detected. Sanitize before processing.",
    description: "Detects embedded role-prefixed instructions that mimic chat format.",
  },
  {
    id: "HJ-003",
    title: "Data exfiltration via URL",
    severity: Severity.HIGH,
    pattern: "https?://[^\\s]*[?&](?:prompt|system|instruction|key|token|secret|data)=",
    category: Category.HIJACKING,
    remediation: "URL with sensitive parameter detected. Do not follow or include in LLM context.",
    description: "Detects URLs that attempt to exfiltrate data via query parameters.",
  },
  {
    id: "HJ-004",
    title: "Indirect instruction injection",
    severity: Severity.HIGH,
    pattern: "(?:when\\s+you\\s+see|if\\s+you\\s+(?:read|see|encounter)|upon\\s+(?:seeing|reading))\\s+(?:this|the\\s+(?:above|following|text))",
    category: Category.HIJACKING,
    remediation: "Conditional instruction detected. This may be an indirect injection attempt.",
    description: "Detects conditional triggers like 'when you see this' that attempt to hijack behavior.",
  },
  {
    id: "HJ-005",
    title: "Copy-paste injection",
    severity: Severity.MEDIUM,
    pattern: "(?:copy|paste|insert|include|append|prepend)\\s+(?:the\\s+)?(?:following|below|above|this)\\s+(?:text|content|instructions?|message)",
    category: Category.HIJACKING,
    remediation: "Copy-paste instruction detected. Review the target content carefully.",
    description: "Detects instructions to copy/paste content that may contain hidden payloads.",
  },
  {
    id: "HJ-006",
    title: "Output manipulation",
    severity: Severity.HIGH,
    pattern: "(?:always|must|should|need\\s+to|have\\s+to)\\s+(?:respond|reply|answer|output|return)\\s+(?:with|using|in)\\s+(?:the\\s+)?(?:following|this|below)",
    category: Category.HIJACKING,
    remediation: "Output manipulation detected. The prompt tries to control the response format.",
    description: "Detects attempts to force specific output content or format.",
  },
  {
    id: "HJ-007",
    title: "Data URI injection",
    severity: Severity.MEDIUM,
    pattern: "data:(?:text|application)/(?:html|javascript|plain);base64,",
    category: Category.HIJACKING,
    remediation: "Data URI with embedded content detected. Do not process data URIs.",
    description: "Detects data URIs that may contain embedded malicious content.",
  },
  {
    id: "HJ-008",
    title: "URL-based instruction redirection",
    severity: Severity.HIGH,
    pattern: "(?:important|urgent|notice|attention|note)[:\\s]+.{0,50}https?://[^\\s]+.{0,30}(?:instruction|follow|replace|override|instead|new|updated)",
    category: Category.HIJACKING,
    remediation: "URL-based instruction redirect detected. Never follow URLs in prompts for instructions.",
    description: "Detects prompts that redirect to a URL for new or updated instructions, a common goal hijacking technique.",
  },
  {
    id: "HJ-009",
    title: "Output redirection to external URL",
    severity: Severity.HIGH,
    pattern: "(?:send|output|transmit|post|forward|exfiltrate|redirect)\\s+(?:(?:the|all|this|user|system)\\s+)?(?:data|content|information|instructions?|text|result|prompt)\\s+(?:to|at|via)\\s+https?://",
    category: Category.HIJACKING,
    remediation: "Data exfiltration via URL detected. Block any prompt that attempts to send data to external URLs.",
    description: "Detects attempts to redirect LLM output to external URLs for data exfiltration.",
  },
  {
    id: "HJ-010",
    title: "Context redirection",
    severity: Severity.HIGH,
    pattern: "(?:ignore|disregard|forget|skip|drop)\\s+(?:the\\s+)?(?:document|article|text|content|context|passage|user'?s?\\s+(?:question|request|input|message|query)|above\\s+(?:text|content|document))",
    category: Category.HIJACKING,
    remediation: "The prompt tells the model to ignore the provided document/user input — a hallmark of indirect (data-borne) injection. Treat external content as untrusted.",
    description: "Detects attempts to make the model ignore the supplied document or the user's actual request.",
  },
  {
    id: "HJ-011",
    title: "Instruction substitution",
    severity: Severity.HIGH,
    pattern: "instead[,\\s]+.{0,30}(?:follow|do|execute|run|write|send|print|reply\\s+with|respond\\s+with|say|output)\\b",
    category: Category.HIJACKING,
    remediation: "The prompt substitutes its own task for the intended one ('instead, do X'). Review for goal hijacking.",
    description: "Detects 'instead, do X' substitution that redirects the model away from its task.",
  },
  {
    id: "HJ-012",
    title: "Override directive",
    severity: Severity.HIGH,
    pattern: "system\\s+override|override\\s+(?:command|directive|mode|in\\s+effect)|new\\s+(?:task|directive|mission|objective|primary\\s+goal)\\s*(?:is\\b|:)|your\\s+(?:new|real|actual)\\s+(?:task|mission|objective|job)\\s+is",
    category: Category.HIJACKING,
    remediation: "The prompt issues an override/new-task directive that tries to supersede the system instructions. Reject.",
    description: "Detects 'SYSTEM OVERRIDE' / 'your new task is' directives used to hijack the model's goal.",
  },
];

export class HijackingDetector extends BaseDetector {
  name = "hijacking";

  detect(prompt: NormalizedPrompt): Finding[] {
    const findings: Finding[] = [];
    const textsToCheck = [prompt.normalized, ...prompt.decoded_segments];

    for (const rule of HIJACKING_RULES) {
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
              severity: rule.severity as Severity,
              title: rule.title,
              description: rule.description || rule.title,
              matched_text: matchedText.length > 100 ? matchedText.substring(0, 100) + "..." : matchedText,
              position: Math.max(0, position),
              confidence: this.calculateConfidence(matchedText),
              remediation: rule.remediation,
              detector: this.name,
            });
          }
        }
      } catch {
        // Invalid regex, skip
      }
    }

    // Heuristic: calculate ratio of potential embedded instructions
    this.checkInstructionRatio(prompt, findings);

    return findings;
  }

  private checkInstructionRatio(prompt: NormalizedPrompt, findings: Finding[]): void {
    const text = prompt.normalized;
    const instructionKeywords = [
      "ignore", "forget", "override", "bypass", "system",
      "instruction", "new task", "act as", "pretend",
    ];

    let instructionCount = 0;
    for (const keyword of instructionKeywords) {
      const regex = new RegExp(keyword, "gi");
      const matches = text.match(regex);
      if (matches) instructionCount += matches.length;
    }

    const ratio = instructionCount / Math.max(1, text.split(/\s+/).length);
    if (ratio > 0.05 && instructionCount >= 3) {
      const alreadyHasHjFinding = findings.some((f) => f.rule_id.startsWith("HJ-"));
      if (!alreadyHasHjFinding) {
        findings.push({
          rule_id: "HJ-DENSITY",
          category: Category.HIJACKING,
          severity: Severity.MEDIUM,
          title: "High instruction density",
          description: `The prompt has an unusually high density of instruction-like keywords (${instructionCount} in ${text.split(/\s+/).length} words). This may indicate indirect prompt injection.`,
          matched_text: `${instructionCount} instruction keywords found`,
          position: 0,
          confidence: Math.min(0.85, 0.5 + ratio * 2),
          remediation: "Review the prompt for potential indirect injection embedded in user content.",
          detector: this.name,
        });
      }
    }
  }

  private calculateConfidence(matchedText: string): number {
    let confidence = 0.8;
    if (matchedText.length > 15) confidence += 0.05;
    if (matchedText.length > 30) confidence += 0.05;
    return Math.min(0.95, confidence);
  }
}

export { HIJACKING_RULES };

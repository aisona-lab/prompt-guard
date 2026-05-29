// prompt-guard obfuscation detector — detects encoding evasion techniques

import { BaseDetector } from "./base";
import { Finding, Category, Severity, NormalizedPrompt, RuleDefinition } from "../models";

// Static rule definitions for the Rules Browser
const OBFUSCATION_RULES: RuleDefinition[] = [
  {
    id: "OBF-001",
    title: "Zero-width characters detected",
    severity: Severity.HIGH,
    pattern: "[\\u200B\\u200C\\u200D\\uFEFF]",
    category: Category.OBFUSCATION,
    remediation: "Strip zero-width characters before processing the prompt.",
    description: "Detects zero-width Unicode characters (U+200B, U+200C, U+200D, U+FEFF) that may be used to hide content or bypass filters.",
  },
  {
    id: "OBF-002",
    title: "Base64-encoded content detected",
    severity: Severity.MEDIUM,
    pattern: "[A-Za-z0-9+/]{20,}={0,2}",
    category: Category.OBFUSCATION,
    remediation: "Decode and review any base64 content before processing the prompt.",
    description: "Detects base64-encoded strings that may conceal malicious instructions. Severity escalates to CRITICAL if decoded content contains suspicious keywords.",
  },
  {
    id: "OBF-003",
    title: "Homoglyph characters detected",
    severity: Severity.HIGH,
    pattern: "[\\u0400-\\u04FF\\u0370-\\u03FF\\uFF00-\\uFFEF]",
    category: Category.OBFUSCATION,
    remediation: "Normalize homoglyphs to their ASCII equivalents before processing.",
    description: "Detects Unicode homoglyph characters from Cyrillic, Greek, and fullwidth ranges that visually resemble ASCII letters and can bypass keyword filters.",
  },
  {
    id: "OBF-004",
    title: "Hex escape sequences detected",
    severity: Severity.MEDIUM,
    pattern: "\\\\x[0-9a-fA-F]{2}",
    category: Category.OBFUSCATION,
    remediation: "Decode hex escape sequences before processing the prompt.",
    description: "Detects hex-encoded escape sequences (\\xNN) that may be used to obfuscate content. Severity escalates to CRITICAL if decoded content contains suspicious keywords.",
  },
  {
    id: "OBF-005",
    title: "ROT13-encoded content detected",
    severity: Severity.HIGH,
    pattern: "(dynamic: checks normalizer transformations)",
    category: Category.OBFUSCATION,
    remediation: "Decode ROT13 content and review before processing.",
    description: "Detects ROT13-encoded text that decodes to suspicious content. Identified via the normalization pipeline.",
  },
  {
    id: "OBF-006",
    title: "Leetspeak obfuscation with malicious intent",
    severity: Severity.HIGH,
    pattern: "(dynamic: leetspeak substitutions like 1=I, 0=O, 3=E, 4=A, 5=S, 7=T)",
    category: Category.OBFUSCATION,
    remediation: "Normalize leetspeak before processing to detect hidden patterns.",
    description: "Detects leetspeak character substitutions (e.g., '1gn0r3 4ll') that decode to suspicious keywords, likely used to bypass keyword filters. Only fires when decoded content contains malicious intent.",
  },
];

// Zero-width characters
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;

// Base64 pattern
const BASE64_PATTERN = /[A-Za-z0-9+/]{20,}={0,2}/g;

// Homoglyph characters (non-ASCII chars that look like ASCII)
const HOMOGLYPH_RANGES = /[\u0400-\u04FF\u0370-\u03FF\uFF00-\uFFEF]/g;

// Hex escape pattern
const HEX_ESCAPE_PATTERN = /\\x[0-9a-fA-F]{2}/g;

// Malicious keywords to check in decoded content
const MALICIOUS_KEYWORDS = [
  "ignore", "instruction", "system", "jailbreak", "bypass",
  "override", "forget", "disregard", "dan", "hack",
];

function isPrintableAscii(str: string): boolean {
  const printable = str.replace(/\s/g, "");
  if (printable.length < 4) return false;
  const asciiCount = printable.split("").filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length;
  return asciiCount / printable.length > 0.8;
}

export class ObfuscationDetector extends BaseDetector {
  name = "obfuscation";

  detect(prompt: NormalizedPrompt): Finding[] {
    const findings: Finding[] = [];

    // 1. Zero-width character detection
    const zeroWidthMatches = prompt.original.match(ZERO_WIDTH_CHARS);
    if (zeroWidthMatches) {
      findings.push({
        rule_id: "OBF-001",
        category: Category.OBFUSCATION,
        severity: Severity.HIGH,
        title: "Zero-width characters detected",
        description: "The prompt contains zero-width Unicode characters (U+200B, U+200C, U+200D, U+FEFF) that may be used to hide content or bypass filters.",
        matched_text: `${zeroWidthMatches.length} zero-width character(s) found`,
        position: prompt.original.search(ZERO_WIDTH_CHARS),
        confidence: 0.92,
        remediation: "Strip zero-width characters before processing the prompt.",
        detector: this.name,
      });
    }

    // 2. Base64 encoding detection
    const base64Matches = prompt.original.match(BASE64_PATTERN);
    if (base64Matches) {
      for (const match of base64Matches) {
        try {
          const decoded = atob(match);
          if (isPrintableAscii(decoded)) {
            const decodedLower = decoded.toLowerCase();
            const hasMalicious = MALICIOUS_KEYWORDS.some((kw) => decodedLower.includes(kw));

            findings.push({
              rule_id: "OBF-002",
              category: Category.OBFUSCATION,
              severity: hasMalicious ? Severity.CRITICAL : Severity.MEDIUM,
              title: hasMalicious ? "Base64-encoded malicious content" : "Base64-encoded content detected",
              description: hasMalicious
                ? `Base64 string decodes to content containing suspicious keywords: "${decoded.substring(0, 80)}"`
                : `Base64 string found that decodes to: "${decoded.substring(0, 80)}"`,
              matched_text: match.substring(0, 60) + (match.length > 60 ? "..." : ""),
              position: prompt.original.indexOf(match),
              confidence: hasMalicious ? 0.95 : 0.7,
              remediation: hasMalicious
                ? "Decode and review the base64 content. Contains malicious instructions."
                : "Review the decoded base64 content for potential injection.",
              detector: this.name,
            });
          }
        } catch {
          // Not valid base64
        }
      }
    }

    // 3. Homoglyph detection
    const homoglyphMatches = prompt.original.match(HOMOGLYPH_RANGES);
    if (homoglyphMatches && homoglyphMatches.length > 2) {
      findings.push({
        rule_id: "OBF-003",
        category: Category.OBFUSCATION,
        severity: Severity.HIGH,
        title: "Homoglyph characters detected",
        description: `Found ${homoglyphMatches.length} Unicode homoglyph characters that resemble ASCII letters. These may be used to bypass keyword filters.`,
        matched_text: `${homoglyphMatches.length} homoglyph character(s) detected`,
        position: prompt.original.search(HOMOGLYPH_RANGES),
        confidence: Math.min(0.95, 0.6 + homoglyphMatches.length * 0.05),
        remediation: "Normalize homoglyphs to their ASCII equivalents before processing.",
        detector: this.name,
      });
    }

    // 4. Hex escape detection
    const hexMatches = prompt.original.match(HEX_ESCAPE_PATTERN);
    if (hexMatches) {
      const decoded = prompt.original.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const decodedLower = decoded.toLowerCase();
      const hasMalicious = MALICIOUS_KEYWORDS.some((kw) => decodedLower.includes(kw));

      findings.push({
        rule_id: "OBF-004",
        category: Category.OBFUSCATION,
        severity: hasMalicious ? Severity.CRITICAL : Severity.MEDIUM,
        title: hasMalicious ? "Hex-encoded malicious content" : "Hex escape sequences detected",
        description: hasMalicious
          ? "Hex escape sequences decode to content with malicious keywords."
          : `Found ${hexMatches.length} hex escape sequence(s) that may be used to obfuscate content.`,
        matched_text: hexMatches.slice(0, 5).join(" "),
        position: prompt.original.search(HEX_ESCAPE_PATTERN),
        confidence: hasMalicious ? 0.94 : 0.7,
        remediation: "Decode hex escape sequences before processing the prompt.",
        detector: this.name,
      });
    }

    // 5. Check transformations applied by normalizer
    if (prompt.transformations_applied.includes("rot13-decode")) {
      findings.push({
        rule_id: "OBF-005",
        category: Category.OBFUSCATION,
        severity: Severity.HIGH,
        title: "ROT13-encoded content detected",
        description: "The prompt contains ROT13-encoded text that decodes to suspicious content.",
        matched_text: "ROT13-encoded segment",
        position: 0,
        confidence: 0.85,
        remediation: "Decode ROT13 content and review before processing.",
        detector: this.name,
      });
    }

    // 6. Leetspeak detection (only fires when leetspeak reveals suspicious keywords)
    if (prompt.transformations_applied.includes("leetspeak-normalization")) {
      const leetSnippet = prompt.decoded_segments.length > 0
        ? prompt.decoded_segments[prompt.decoded_segments.length - 1].substring(0, 80)
        : "Leetspeak substitutions detected";
      findings.push({
        rule_id: "OBF-006",
        category: Category.OBFUSCATION,
        severity: Severity.HIGH,
        title: "Leetspeak obfuscation with malicious intent",
        description: "The prompt contains leetspeak character substitutions that decode to suspicious keywords, likely used to bypass keyword filters.",
        matched_text: leetSnippet,
        position: 0,
        confidence: 0.88,
        remediation: "Normalize leetspeak before processing to detect hidden patterns.",
        detector: this.name,
      });
    }

    return findings;
  }
}

export { OBFUSCATION_RULES };

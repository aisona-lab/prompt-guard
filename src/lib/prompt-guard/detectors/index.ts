// prompt-guard detector registry — manages all detectors

import { BaseDetector } from "./base";
import { InjectionDetector } from "./injection";
import { JailbreakDetector } from "./jailbreak";
import { LeakageDetector } from "./leakage";
import { ObfuscationDetector } from "./obfuscation";
import { HijackingDetector } from "./hijacking";
import { PIIDetector } from "./pii";
import { Finding, NormalizedPrompt } from "../models";

const ALL_DETECTORS: BaseDetector[] = [
  new InjectionDetector(),
  new JailbreakDetector(),
  new LeakageDetector(),
  new ObfuscationDetector(),
  new HijackingDetector(),
  new PIIDetector(),
];

export function getDetector(name: string): BaseDetector | undefined {
  return ALL_DETECTORS.find((d) => d.name === name);
}

export function getAllDetectors(): BaseDetector[] {
  return ALL_DETECTORS;
}

export function runDetectors(
  prompt: NormalizedPrompt,
  detectorNames?: string[]
): { findings: Finding[]; detectorsUsed: string[] } {
  const detectors = detectorNames
    ? ALL_DETECTORS.filter((d) => detectorNames.includes(d.name))
    : ALL_DETECTORS;

  const detectorsUsed: string[] = [];
  const allFindings: Finding[] = [];

  for (const detector of detectors) {
    if (!detector.isEnabled()) continue;
    try {
      const findings = detector.detect(prompt);
      if (findings.length > 0) {
        allFindings.push(...findings);
      }
      detectorsUsed.push(detector.name);
    } catch {
      // Detector error, skip
      detectorsUsed.push(detector.name);
    }
  }

  // Deduplicate findings by rule_id + detector (keep first match, merge positions)
  const seen = new Map<string, Finding>();
  for (const f of allFindings) {
    const key = `${f.rule_id}:${f.detector}`;
    if (seen.has(key)) {
      // Update matched_text to show all matches, keep highest confidence
      const existing = seen.get(key)!;
      if (!existing.matched_text.includes(f.matched_text)) {
        existing.matched_text = `${existing.matched_text}; ${f.matched_text}`;
      }
      existing.confidence = Math.max(existing.confidence, f.confidence);
    } else {
      seen.set(key, { ...f });
    }
  }
  const dedupedFindings = Array.from(seen.values());

  return {
    findings: dedupedFindings,
    detectorsUsed: [...new Set(detectorsUsed)],
  };
}

export { ALL_DETECTORS };

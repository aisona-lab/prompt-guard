// prompt-guard — main scanner module

import { GuardResult, Finding, ScanRequest } from "./models";
import { normalize } from "./normalizer";
import { runDetectors, getAllDetectors } from "./detectors";
import { calculateScore, isSafe } from "./scorer";
import { INJECTION_RULES } from "./detectors/injection";
import { JAILBREAK_RULES } from "./detectors/jailbreak";
import { LEAKAGE_RULES } from "./detectors/leakage";
import { OBFUSCATION_RULES } from "./detectors/obfuscation";
import { HIJACKING_RULES } from "./detectors/hijacking";
import { PII_RULES } from "./detectors/pii";

export function scan(request: ScanRequest): GuardResult {
  const startTime = performance.now();

  // 1. Normalize the prompt
  const normalized = normalize(request.prompt);

  // 2. Run detectors
  const { findings, detectorsUsed } = runDetectors(
    normalized,
    request.detectors
  );

  // 3. Calculate risk score
  const riskScore = calculateScore(findings);
  const safe = isSafe(riskScore, request.threshold ?? 30);

  // 4. Calculate duration
  const duration = performance.now() - startTime;

  return {
    prompt: request.prompt,
    normalized_prompt: normalized.normalized,
    risk_score: riskScore,
    is_safe: safe,
    findings,
    metadata: {
      scan_duration_ms: Math.round(duration),
      detectors_used: detectorsUsed,
      prompt_length: request.prompt.length,
      transformations_applied: normalized.transformations_applied,
    },
  };
}

export function scanBatch(
  prompts: string[],
  threshold?: number,
  detectors?: string[]
): GuardResult[] {
  return prompts.map((prompt) =>
    scan({ prompt, threshold, detectors })
  );
}

export function getAllRules() {
  return [
    ...INJECTION_RULES,
    ...JAILBREAK_RULES,
    ...LEAKAGE_RULES,
    ...OBFUSCATION_RULES,
    ...HIJACKING_RULES,
    ...PII_RULES,
  ];
}

export { normalize } from "./normalizer";
export { calculateScore, isSafe } from "./scorer";
export { getAllDetectors } from "./detectors";
export * from "./models";

// prompt-guard scorer — calculates risk score from findings

import { Finding, Severity, SEVERITY_WEIGHTS } from "./models";

export function calculateScore(findings: Finding[]): number {
  if (!findings.length) return 0;

  const base = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHTS[f.severity] * f.confidence,
    0
  );

  // Cap at 100, minimum 1 if there are findings
  const score = Math.min(100, Math.round(base));
  return findings.length > 0 ? Math.max(1, score) : 0;
}

export function isSafe(score: number, threshold: number = 30): boolean {
  return score < threshold;
}

export function getScoreLabel(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  // Tiers are aligned with SEVERITY_WEIGHTS and the default threshold (30):
  // a single HIGH finding (~33) reads "ELEVATED", a single CRITICAL (~48)
  // reads "HIGH RISK" — so a blocked prompt never shows a reassuring label.
  if (score >= 75) {
    return { label: "CRITICAL", color: "text-red-600", bgColor: "bg-red-500" };
  }
  if (score >= 45) {
    return {
      label: "HIGH RISK",
      color: "text-orange-600",
      bgColor: "bg-orange-500",
    };
  }
  if (score >= 30) {
    return {
      label: "ELEVATED",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500",
    };
  }
  if (score >= 10) {
    return { label: "LOW", color: "text-blue-600", bgColor: "bg-blue-500" };
  }
  return { label: "SAFE", color: "text-emerald-600", bgColor: "bg-emerald-500" };
}

export function getSeverityColor(severity: Severity): {
  color: string;
  bgColor: string;
  borderColor: string;
} {
  switch (severity) {
    case Severity.CRITICAL:
      return {
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-950",
        borderColor: "border-red-300 dark:border-red-800",
      };
    case Severity.HIGH:
      return {
        color: "text-orange-700 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-950",
        borderColor: "border-orange-300 dark:border-orange-800",
      };
    case Severity.MEDIUM:
      return {
        color: "text-yellow-700 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-950",
        borderColor: "border-yellow-300 dark:border-yellow-800",
      };
    case Severity.LOW:
      return {
        color: "text-blue-700 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-950",
        borderColor: "border-blue-300 dark:border-blue-800",
      };
    case Severity.INFO:
      return {
        color: "text-gray-700 dark:text-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-700",
      };
  }
}

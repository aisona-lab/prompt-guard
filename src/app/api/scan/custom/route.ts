import { NextRequest, NextResponse } from "next/server";
import { scan } from "@/lib/prompt-guard";
import { calculateScore, isSafe } from "@/lib/prompt-guard/scorer";
import { Finding, Severity } from "@/lib/prompt-guard/models";

const VALID_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

interface CustomRule {
  id: string;
  pattern: string;
  severity: string;
  category: string;
  title: string;
  description?: string;
  remediation?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      custom_rules,
      threshold,
      detectors,
      include_normalized,
    } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' field" },
        { status: 400 }
      );
    }

    if (prompt.length > 50000) {
      return NextResponse.json(
        { error: "Prompt too long (max 50000 characters)" },
        { status: 400 }
      );
    }

    // Validate custom_rules
    if (!Array.isArray(custom_rules) || custom_rules.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'custom_rules' array" },
        { status: 400 }
      );
    }

    if (custom_rules.length > 20) {
      return NextResponse.json(
        { error: "Too many custom rules (max 20)" },
        { status: 400 }
      );
    }

    // Validate each custom rule
    for (let i = 0; i < custom_rules.length; i++) {
      const rule = custom_rules[i];
      if (!rule.id || typeof rule.id !== "string") {
        return NextResponse.json(
          { error: `Custom rule at index ${i}: missing or invalid 'id'` },
          { status: 400 }
        );
      }
      if (!rule.pattern || typeof rule.pattern !== "string") {
        return NextResponse.json(
          { error: `Custom rule at index ${i}: missing or invalid 'pattern'` },
          { status: 400 }
        );
      }
      // User-supplied regex runs on the server; cap length to limit the blast
      // radius of catastrophic-backtracking (ReDoS) patterns.
      if (rule.pattern.length > 500) {
        return NextResponse.json(
          { error: `Custom rule at index ${i}: pattern too long (max 500 characters)` },
          { status: 400 }
        );
      }
      if (!VALID_SEVERITIES.includes(rule.severity)) {
        return NextResponse.json(
          {
            error: `Custom rule at index ${i}: severity must be one of ${VALID_SEVERITIES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      if (!rule.category || typeof rule.category !== "string") {
        return NextResponse.json(
          {
            error: `Custom rule at index ${i}: missing or invalid 'category'`,
          },
          { status: 400 }
        );
      }
      if (!rule.title || typeof rule.title !== "string") {
        return NextResponse.json(
          { error: `Custom rule at index ${i}: missing or invalid 'title'` },
          { status: 400 }
        );
      }
    }

    // 1. Run the normal scan first
    const baseResult = scan({
      prompt,
      threshold: threshold ?? 30,
      detectors,
      include_normalized: true, // Need normalized prompt for custom rules
    });

    // 2. Apply custom rules against the normalized prompt
    const normalizedPrompt = baseResult.normalized_prompt;
    const customFindings: Finding[] = [];
    const warnings: string[] = [];
    let customRulesApplied = 0;

    for (const rule of custom_rules as CustomRule[]) {
      let regex: RegExp;
      try {
        regex = new RegExp(rule.pattern, "gi");
      } catch {
        warnings.push(
          `Invalid regex pattern for rule '${rule.id}': ${rule.pattern}`
        );
        continue;
      }

      // Find all matches
      let match: RegExpExecArray | null;
      try {
        match = regex.exec(normalizedPrompt);
      } catch {
        warnings.push(
          `Regex execution error for rule '${rule.id}': ${rule.pattern}`
        );
        continue;
      }

      const ruleMatches: Finding[] = [];
      while (match !== null) {
        ruleMatches.push({
          rule_id: `CUSTOM-${rule.id}`,
          category: rule.category as Finding["category"],
          severity: rule.severity as Severity,
          title: rule.title,
          description: rule.description || "Custom user-defined rule",
          matched_text: match[0].slice(0, 100),
          position: match.index,
          confidence: 0.8,
          remediation: rule.remediation || "Review this custom finding",
          detector: "custom",
        });

        // Prevent infinite loops for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }

        try {
          match = regex.exec(normalizedPrompt);
        } catch {
          break;
        }
      }

      if (ruleMatches.length > 0) {
        customFindings.push(...ruleMatches);
        customRulesApplied++;
      }
    }

    // 3. Merge custom findings with built-in findings, deduplicate by rule_id
    // Use rule_id as dedup key for built-in findings (they already have unique rule_ids)
    // Use rule_id:position as key for custom findings to preserve multiple matches
    const allFindingsMap = new Map<string, Finding>();

    // Add built-in findings first (keyed by rule_id)
    for (const finding of baseResult.findings) {
      allFindingsMap.set(finding.rule_id, finding);
    }

    // Add custom findings — CUSTOM- prefix prevents collision with built-in rule_ids
    // Multiple matches from the same rule get unique keys via position
    for (const finding of customFindings) {
      const key = `${finding.rule_id}:${finding.position}`;
      allFindingsMap.set(key, finding);
    }

    const allFindings = Array.from(allFindingsMap.values());

    // 4. Recalculate risk score
    const riskScore = calculateScore(allFindings);
    const safe = isSafe(riskScore, threshold ?? 30);

    // 5. Build the response
    const result: Record<string, unknown> = {
      prompt: baseResult.prompt,
      risk_score: riskScore,
      is_safe: safe,
      findings: allFindings,
      metadata: {
        ...baseResult.metadata,
        custom_rules_applied: customRulesApplied,
      },
    };

    // Include normalized_prompt only if requested
    if (include_normalized) {
      result.normalized_prompt = baseResult.normalized_prompt;
    }

    // Include warnings if any
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Custom scan error:", error);
    return NextResponse.json(
      { error: "Internal server error during custom scan" },
      { status: 500 }
    );
  }
}

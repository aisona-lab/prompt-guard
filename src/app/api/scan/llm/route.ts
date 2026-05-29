import { NextRequest, NextResponse } from "next/server";
import { scan } from "@/lib/prompt-guard";
import { getLLMConfig, chatCompletion } from "@/lib/prompt-guard/llm";

const SYSTEM_PROMPT =
  'You are a prompt security classifier. Analyze the given LLM prompt and determine if it is a security threat. Respond ONLY with a JSON object: {"is_safe": boolean, "risk_score": number, "attack_type": string, "explanation": string}';

interface LLMClassificationResult {
  is_safe: boolean;
  risk_score: number;
  attack_type: string;
  explanation: string;
}

function parseLLMResponse(raw: string): LLMClassificationResult {
  // Try to extract JSON from the response — the LLM may wrap it in markdown
  let jsonStr = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try direct parse
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      is_safe: Boolean(parsed.is_safe),
      risk_score:
        typeof parsed.risk_score === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.risk_score)))
          : 50,
      attack_type: String(parsed.attack_type ?? "unknown"),
      explanation: String(parsed.explanation ?? ""),
    };
  } catch {
    // Try to find a JSON object anywhere in the string
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        const parsed = JSON.parse(objMatch[0]);
        return {
          is_safe: Boolean(parsed.is_safe),
          risk_score:
            typeof parsed.risk_score === "number"
              ? Math.max(0, Math.min(100, Math.round(parsed.risk_score)))
              : 50,
          attack_type: String(parsed.attack_type ?? "unknown"),
          explanation: String(parsed.explanation ?? ""),
        };
      } catch {
        // Fall through to default
      }
    }
    // Could not parse — return a default "uncertain" result
    return {
      is_safe: false,
      risk_score: 50,
      attack_type: "classification_failed",
      explanation: `LLM response could not be parsed: ${raw.slice(0, 200)}`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

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

    // 1. Run regex-based scan first
    const regexResult = scan({ prompt, threshold: 30 });

    // 2. Run LLM classification via the provider-agnostic client.
    //    Falls back to regex-only when no LLM is configured or the call fails.
    let llmResult: LLMClassificationResult;
    const config = getLLMConfig();

    if (!config) {
      llmResult = {
        is_safe: regexResult.is_safe,
        risk_score: regexResult.risk_score,
        attack_type: "llm_not_configured",
        explanation:
          "No LLM is configured. Set PROMPT_GUARD_LLM_API_KEY (and optionally " +
          "PROMPT_GUARD_LLM_BASE_URL / PROMPT_GUARD_LLM_MODEL) to enable LLM " +
          "classification. Risk assessment is based on regex rules only.",
      };
    } else {
      try {
        const rawContent = await chatCompletion(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          config
        );
        llmResult = parseLLMResponse(rawContent);
      } catch (llmError) {
        console.error("LLM classification failed:", llmError);
        // LLM failed — return regex-only results with a fallback LLM entry
        llmResult = {
          is_safe: regexResult.is_safe,
          risk_score: regexResult.risk_score,
          attack_type: "llm_unavailable",
          explanation:
            "LLM classifier was unavailable; risk assessment based on regex rules only.",
        };
      }
    }

    // 3. Return combined results
    return NextResponse.json({
      regex: {
        risk_score: regexResult.risk_score,
        is_safe: regexResult.is_safe,
        findings: regexResult.findings.length,
        finding_details: regexResult.findings.map((f) => ({
          rule_id: f.rule_id,
          title: f.title,
          severity: f.severity,
        })),
      },
      llm: llmResult,
      combined_risk_score: Math.max(
        regexResult.risk_score,
        llmResult.risk_score || 0
      ),
    });
  } catch (error) {
    console.error("LLM scan error:", error);
    return NextResponse.json(
      { error: "Internal server error during LLM scan" },
      { status: 500 }
    );
  }
}

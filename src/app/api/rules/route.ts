import { NextResponse } from "next/server";
import { getAllRules } from "@/lib/prompt-guard";

export async function GET() {
  try {
    const rules = getAllRules();
    return NextResponse.json({
      rules: rules.map((rule) => ({
        id: rule.id,
        title: rule.title,
        severity: rule.severity,
        category: rule.category,
        pattern: rule.pattern,
        description: rule.description,
        remediation: rule.remediation,
      })),
      total: rules.length,
    });
  } catch (error) {
    console.error("Rules error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

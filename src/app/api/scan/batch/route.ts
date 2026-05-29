import { NextRequest, NextResponse } from "next/server";
import { scanBatch } from "@/lib/prompt-guard";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompts, threshold, detectors } = body;

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'prompts' array" },
        { status: 400 }
      );
    }

    if (prompts.length > 100) {
      return NextResponse.json(
        { error: "Too many prompts (max 100)" },
        { status: 400 }
      );
    }

    for (const p of prompts) {
      if (typeof p !== "string" || p.length > 50000) {
        return NextResponse.json(
          { error: "Each prompt must be a string (max 50000 characters)" },
          { status: 400 }
        );
      }
    }

    const results = scanBatch(prompts, threshold, detectors);

    return NextResponse.json({
      results,
      total: results.length,
      blocked: results.filter((r) => !r.is_safe).length,
      passed: results.filter((r) => r.is_safe).length,
    });
  } catch (error) {
    console.error("Batch scan error:", error);
    return NextResponse.json(
      { error: "Internal server error during batch scan" },
      { status: 500 }
    );
  }
}

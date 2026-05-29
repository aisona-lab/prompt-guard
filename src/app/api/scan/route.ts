import { NextRequest, NextResponse } from "next/server";
import { scan } from "@/lib/prompt-guard";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, threshold, detectors, include_normalized } = body;

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

    const result = scan({
      prompt,
      threshold: threshold ?? 30,
      detectors,
      include_normalized,
    });

    // Remove normalized_prompt unless explicitly requested
    if (!include_normalized) {
      const { normalized_prompt, ...rest } = result;
      return NextResponse.json(rest);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error during scan" },
      { status: 500 }
    );
  }
}

// prompt-guard — provider-agnostic LLM client
//
// Speaks the OpenAI Chat Completions wire format, which is the de-facto
// standard. That makes the same code work with:
//   - OpenAI            (PROMPT_GUARD_LLM_BASE_URL=https://api.openai.com/v1)
//   - OpenRouter        (https://openrouter.ai/api/v1)
//   - Groq / Together / Fireworks / DeepInfra / any OpenAI-compatible gateway
//   - Local open-source engines, no API key required:
//       Ollama          (http://localhost:11434/v1, model e.g. "llama3.1")
//       LM Studio        (http://localhost:1234/v1)
//       llama.cpp server (http://localhost:8080/v1)
//
// No third-party SDK is used — only `fetch` — so there are no vendor lock-in
// dependencies and nothing to install.

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function isLocalEndpoint(url: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(url);
}

/**
 * Reads LLM configuration from the environment. Returns `null` when no usable
 * configuration is present (no API key for a remote endpoint), so callers can
 * gracefully fall back to regex-only scanning instead of throwing.
 */
export function getLLMConfig(): LLMConfig | null {
  const baseUrl = (process.env.PROMPT_GUARD_LLM_BASE_URL || DEFAULT_BASE_URL).trim();
  const apiKey = (process.env.PROMPT_GUARD_LLM_API_KEY || "").trim();
  const model = (process.env.PROMPT_GUARD_LLM_MODEL || DEFAULT_MODEL).trim();

  // Local engines (Ollama, LM Studio, llama.cpp) don't require an API key.
  if (!apiKey && !isLocalEndpoint(baseUrl)) {
    return null;
  }

  return { baseUrl, apiKey, model };
}

export interface ChatCompletionOptions {
  temperature?: number;
  timeoutMs?: number;
  /**
   * Request strict JSON output via `response_format`. Supported by OpenAI and
   * many gateways, but some local engines reject it — disable with
   * PROMPT_GUARD_LLM_JSON_MODE=false. Defaults to false for max compatibility;
   * parsing is robust enough to handle plain/markdown responses regardless.
   */
  jsonMode?: boolean;
}

/**
 * Calls an OpenAI-compatible `/chat/completions` endpoint and returns the raw
 * assistant message content. Throws on network errors, timeouts, or non-2xx
 * responses so the caller can decide how to degrade.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config: LLMConfig,
  options: ChatCompletionOptions = {}
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const timeoutMs = options.timeoutMs ?? 20000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const jsonMode =
    options.jsonMode ??
    (process.env.PROMPT_GUARD_LLM_JSON_MODE || "").toLowerCase() === "true";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `LLM request failed (${response.status} ${response.statusText}): ${detail.slice(0, 300)}`
      );
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

import type { Prompt } from "./prompts.js";

export const DEFAULT_MODELS: Record<ContextLens.Provider, string> = {
  openai: "gpt-5-mini",
  anthropic: "claude-haiku-5-5",
};

export const MAX_OUTPUT_TOKENS = 800;

export interface ProviderRequest {
  url: string;
  init: { method: "POST"; headers: Record<string, string>; body: string };
}

/** Builds the streaming HTTP request for the configured provider. Pure, so it is unit-tested. */
export function buildRequest(settings: ContextLens.Settings, prompt: Prompt): ProviderRequest {
  const model = settings.model.trim() || DEFAULT_MODELS[settings.provider];

  if (settings.provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": settings.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          stream: true,
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
        }),
      },
    };
  }

  return {
    url: "https://api.openai.com/v1/chat/completions",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    },
  };
}

/** Turns a failed HTTP response into a short, user-facing message. */
export async function describeHttpError(res: { status: number; text(): Promise<string> }): Promise<string> {
  let detail = "";
  try {
    const body = JSON.parse(await res.text());
    detail = body?.error?.message ?? "";
  } catch {
    // body was not JSON
  }
  if (res.status === 401) return "Invalid API key. Check it in ContextLens settings.";
  if (res.status === 429) return "Rate limited by the provider. Try again in a moment.";
  return detail ? `API error ${res.status}: ${detail}` : `API error ${res.status}`;
}

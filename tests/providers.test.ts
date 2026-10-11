import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MODELS, buildRequest, describeHttpError } from "../src/shared/providers.js";

const prompt = { system: "SYS", user: "USER" };

describe("buildRequest", () => {
  it("builds a streaming OpenAI chat completions request", () => {
    const { url, init } = buildRequest({ provider: "openai", apiKey: "sk-test", model: "gpt-x" }, prompt);
    const body = JSON.parse(init.body);
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(init.headers.authorization, "Bearer sk-test");
    assert.equal(body.model, "gpt-x");
    assert.equal(body.stream, true);
    assert.deepEqual(body.messages, [
      { role: "system", content: "SYS" },
      { role: "user", content: "USER" },
    ]);
  });

  it("builds a streaming Anthropic messages request", () => {
    const { url, init } = buildRequest({ provider: "anthropic", apiKey: "ak-test", model: "claude-x" }, prompt);
    const body = JSON.parse(init.body);
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(init.headers["x-api-key"], "ak-test");
    assert.equal(init.headers["anthropic-version"], "2023-06-01");
    assert.equal(body.system, "SYS");
    assert.deepEqual(body.messages, [{ role: "user", content: "USER" }]);
    assert.equal(body.stream, true);
    assert.ok(body.max_tokens > 0);
  });

  it("falls back to the provider's default model when none is set", () => {
    const { init } = buildRequest({ provider: "anthropic", apiKey: "k", model: "  " }, prompt);
    assert.equal(JSON.parse(init.body).model, DEFAULT_MODELS.anthropic);
  });

  it("never puts the API key in the URL", () => {
    for (const provider of ["openai", "anthropic"] as const) {
      const { url } = buildRequest({ provider, apiKey: "secret-key", model: "" }, prompt);
      assert.ok(!url.includes("secret-key"));
    }
  });
});

describe("describeHttpError", () => {
  const response = (status: number, body: string) => ({ status, text: async () => body });

  it("explains invalid keys", async () => {
    assert.match(await describeHttpError(response(401, "{}")), /Invalid API key/);
  });

  it("explains rate limits", async () => {
    assert.match(await describeHttpError(response(429, "")), /Rate limited/);
  });

  it("includes the provider's error message when present", async () => {
    const msg = await describeHttpError(response(400, JSON.stringify({ error: { message: "bad model" } })));
    assert.equal(msg, "API error 400: bad model");
  });

  it("handles non-JSON bodies", async () => {
    assert.equal(await describeHttpError(response(500, "<html>")), "API error 500");
  });
});

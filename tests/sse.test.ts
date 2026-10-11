import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SseParser, parseEvent } from "../src/shared/sse.js";

describe("SseParser", () => {
  it("returns data from complete events", () => {
    const parser = new SseParser();
    assert.deepEqual(parser.push('data: {"a":1}\n\ndata: {"b":2}\n\n'), ['{"a":1}', '{"b":2}']);
  });

  it("buffers events split across network chunks", () => {
    const parser = new SseParser();
    assert.deepEqual(parser.push('data: {"te'), []);
    assert.deepEqual(parser.push('xt":"hi"}\n'), []);
    assert.deepEqual(parser.push("\n"), ['{"text":"hi"}']);
  });

  it("handles CRLF line endings and ignores event/comment lines", () => {
    const parser = new SseParser();
    const events = parser.push(": keep-alive\r\n\r\nevent: ping\r\ndata: {}\r\n\r\n");
    assert.deepEqual(events, ["{}"]);
  });

  it("joins multi-line data fields", () => {
    const parser = new SseParser();
    assert.deepEqual(parser.push("data: line1\ndata: line2\n\n"), ["line1\nline2"]);
  });
});

describe("parseEvent (OpenAI)", () => {
  it("extracts content deltas", () => {
    const data = JSON.stringify({ choices: [{ delta: { content: "Hello" } }] });
    assert.deepEqual(parseEvent("openai", data), { kind: "delta", text: "Hello" });
  });

  it("recognizes the [DONE] sentinel", () => {
    assert.deepEqual(parseEvent("openai", "[DONE]"), { kind: "done" });
  });

  it("ignores role-only and empty deltas", () => {
    const data = JSON.stringify({ choices: [{ delta: { role: "assistant" } }] });
    assert.deepEqual(parseEvent("openai", data), { kind: "ignore" });
  });

  it("surfaces API errors", () => {
    const data = JSON.stringify({ error: { message: "quota exceeded" } });
    assert.deepEqual(parseEvent("openai", data), { kind: "error", message: "quota exceeded" });
  });
});

describe("parseEvent (Anthropic)", () => {
  it("extracts text deltas", () => {
    const data = JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } });
    assert.deepEqual(parseEvent("anthropic", data), { kind: "delta", text: "Hi" });
  });

  it("ends on message_stop", () => {
    assert.deepEqual(parseEvent("anthropic", '{"type":"message_stop"}'), { kind: "done" });
  });

  it("ignores ping and message_start events", () => {
    assert.deepEqual(parseEvent("anthropic", '{"type":"ping"}'), { kind: "ignore" });
    assert.deepEqual(parseEvent("anthropic", '{"type":"message_start","message":{}}'), { kind: "ignore" });
  });

  it("surfaces stream errors", () => {
    const data = JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } });
    assert.deepEqual(parseEvent("anthropic", data), { kind: "error", message: "Overloaded" });
  });

  it("ignores malformed JSON", () => {
    assert.deepEqual(parseEvent("anthropic", "{not json"), { kind: "ignore" });
  });
});

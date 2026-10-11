import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_SELECTION_CHARS, buildPrompt, truncate } from "../src/shared/prompts.js";

describe("buildPrompt", () => {
  it("gives each action its own instructions", () => {
    const explain = buildPrompt({ action: "explain", text: "x" }).system;
    const summarize = buildPrompt({ action: "summarize", text: "x" }).system;
    const rewrite = buildPrompt({ action: "rewrite", text: "x" }).system;
    assert.match(explain, /Explain/);
    assert.match(summarize, /bullet points/);
    assert.match(rewrite, /Rewrite/);
    assert.equal(new Set([explain, summarize, rewrite]).size, 3);
  });

  it("includes the page title when available", () => {
    const { user } = buildPrompt({ action: "explain", text: "CRDTs merge state", pageTitle: "Distributed Systems" });
    assert.match(user, /Page title: Distributed Systems/);
    assert.match(user, /CRDTs merge state/);
  });

  it("omits the page title line when missing", () => {
    const { user } = buildPrompt({ action: "explain", text: "hello" });
    assert.doesNotMatch(user, /Page title/);
  });
});

describe("truncate", () => {
  it("leaves short text unchanged apart from trimming", () => {
    assert.equal(truncate("  hello  "), "hello");
  });

  it("caps long selections and marks them as truncated", () => {
    const result = truncate("a".repeat(MAX_SELECTION_CHARS + 500));
    assert.ok(result.startsWith("a".repeat(MAX_SELECTION_CHARS)));
    assert.ok(result.endsWith("[truncated]"));
  });
});

/**
 * Incremental parser for Server-Sent Events. Network chunks can split an event
 * anywhere, so input is buffered until a blank line ends each event.
 */
export class SseParser {
  private buffer = "";

  /** Feeds a raw chunk and returns the `data` payload of every completed event. */
  push(chunk: string): string[] {
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const events: string[] = [];
    let boundary: number;
    while ((boundary = this.buffer.indexOf("\n\n")) !== -1) {
      const raw = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n");
      if (data) events.push(data);
    }
    return events;
  }
}

export type StreamEvent =
  | { kind: "delta"; text: string }
  | { kind: "done" }
  | { kind: "error"; message: string }
  | { kind: "ignore" };

/** Interprets one SSE `data` payload from the given provider's streaming API. */
export function parseEvent(provider: ContextLens.Provider, data: string): StreamEvent {
  if (provider === "openai" && data === "[DONE]") return { kind: "done" };

  let json: any;
  try {
    json = JSON.parse(data);
  } catch {
    return { kind: "ignore" };
  }

  if (json?.error) {
    return { kind: "error", message: String(json.error.message ?? "Unknown API error") };
  }

  if (provider === "openai") {
    const text = json?.choices?.[0]?.delta?.content;
    return typeof text === "string" && text ? { kind: "delta", text } : { kind: "ignore" };
  }

  // Anthropic Messages API
  if (json?.type === "content_block_delta" && json.delta?.type === "text_delta") {
    return { kind: "delta", text: String(json.delta.text) };
  }
  if (json?.type === "message_stop") return { kind: "done" };
  return { kind: "ignore" };
}

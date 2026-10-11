// Ambient types shared by the content script, service worker and options page.
// Declared globally (no import/export) so the content script can stay a classic
// script: Chrome loads content scripts as plain scripts, not ES modules.

declare namespace ContextLens {
  type Action = "explain" | "summarize" | "rewrite";
  type Provider = "openai" | "anthropic";

  interface Settings {
    provider: Provider;
    apiKey: string;
    model: string;
  }

  /** Sent by the content script over a long-lived port to start a request. */
  interface AskRequest {
    action: Action;
    text: string;
    pageTitle?: string;
  }

  /** Streamed back from the service worker over the same port. */
  type StreamMessage =
    | { type: "delta"; text: string }
    | { type: "done" }
    | { type: "error"; message: string; needsSetup?: boolean };

  /** One-off messages between extension contexts. */
  type RuntimeMessage =
    | { type: "run"; action: Action }
    | { type: "open-options" };
}

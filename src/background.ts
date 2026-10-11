import { buildPrompt } from "./shared/prompts.js";
import { buildRequest, describeHttpError } from "./shared/providers.js";
import { loadSettings } from "./shared/settings.js";
import { SseParser, parseEvent } from "./shared/sse.js";

// The service worker owns every LLM call, so the API key never enters a web page's context.
// Each request arrives on its own port; tokens stream back over it as they are generated.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "contextlens-ask") return;

  const controller = new AbortController();
  port.onDisconnect.addListener(() => controller.abort()); // panel closed: stop paying for tokens

  port.onMessage.addListener((req: ContextLens.AskRequest) => {
    streamAnswer(req, port, controller.signal).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      send(port, { type: "error", message: err instanceof Error ? err.message : String(err) });
    });
  });
});

async function streamAnswer(
  req: ContextLens.AskRequest,
  port: chrome.runtime.Port,
  signal: AbortSignal,
): Promise<void> {
  const settings = await loadSettings();
  if (!settings.apiKey) {
    send(port, { type: "error", message: "Add an API key to start using ContextLens.", needsSetup: true });
    return;
  }

  const { url, init } = buildRequest(settings, buildPrompt(req));
  const res = await fetch(url, { ...init, signal });
  if (!res.ok || !res.body) {
    send(port, { type: "error", message: await describeHttpError(res), needsSetup: res.status === 401 });
    return;
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const parser = new SseParser();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const data of parser.push(value)) {
      const event = parseEvent(settings.provider, data);
      if (event.kind === "delta") send(port, { type: "delta", text: event.text });
      else if (event.kind === "error") return send(port, { type: "error", message: event.message });
      else if (event.kind === "done") return send(port, { type: "done" });
    }
  }
  send(port, { type: "done" });
}

function send(port: chrome.runtime.Port, msg: ContextLens.StreamMessage): void {
  try {
    port.postMessage(msg);
  } catch {
    // port already closed
  }
}

// Keyboard shortcut: run "Explain" on the current selection in the active tab.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "explain-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  const msg: ContextLens.RuntimeMessage = { type: "run", action: "explain" };
  chrome.tabs.sendMessage(tab.id, msg).catch(() => {
    // no content script on this page (e.g. chrome:// pages)
  });
});

// Content scripts cannot open the options page themselves.
chrome.runtime.onMessage.addListener((msg: ContextLens.RuntimeMessage) => {
  if (msg?.type === "open-options") chrome.runtime.openOptionsPage();
});

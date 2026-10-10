import type { AskRequest, AskResponse } from "./messages";

// The service worker owns all LLM calls so API keys never enter page context.
chrome.runtime.onMessage.addListener((msg: AskRequest, _sender, sendResponse) => {
  if (msg?.type !== "ask") return;
  handleAsk(msg).then(sendResponse);
  return true; // keep the channel open for the async response
});

async function handleAsk(req: AskRequest): Promise<AskResponse> {
  // TODO: call an LLM API with a prompt built from req.action and req.text
  return { ok: true, result: `[${req.action}] LLM integration coming soon.` };
}

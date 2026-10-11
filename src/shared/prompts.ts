/** Longest selection sent to the model; keeps requests fast and cheap. */
export const MAX_SELECTION_CHARS = 6000;

const INSTRUCTIONS: Record<ContextLens.Action, string> = {
  explain:
    "Explain the selected text clearly for a smart reader who may be new to the topic. " +
    "Define jargon, give the key idea first, and keep it under 150 words.",
  summarize:
    "Summarize the selected text in 2 to 4 short bullet points that capture the main ideas. " +
    "Do not add information that is not in the text.",
  rewrite:
    "Rewrite the selected text to be clearer and more concise while keeping its meaning and tone. " +
    "Return only the rewritten text.",
};

export interface Prompt {
  system: string;
  user: string;
}

export function truncate(text: string, max = MAX_SELECTION_CHARS): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max) + " …[truncated]";
}

/** Builds the system and user prompt for one action on a text selection. */
export function buildPrompt(req: ContextLens.AskRequest): Prompt {
  const system =
    "You are ContextLens, an assistant embedded in the user's browser. " +
    "You help with text the user selected on a web page. " +
    INSTRUCTIONS[req.action] +
    " Respond in the same language as the selected text. Use plain text, no Markdown headings.";

  const context = req.pageTitle ? `Page title: ${req.pageTitle}\n\n` : "";
  const user = `${context}Selected text:\n"""\n${truncate(req.text)}\n"""`;

  return { system, user };
}

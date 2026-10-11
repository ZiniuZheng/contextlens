import { DEFAULT_MODELS } from "./providers.js";

const KEY = "settings";

export const DEFAULT_SETTINGS: ContextLens.Settings = {
  provider: "openai",
  apiKey: "",
  model: DEFAULT_MODELS.openai,
};

/** Settings live in chrome.storage.local (never synced) so the API key stays on this device. */
export async function loadSettings(): Promise<ContextLens.Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<ContextLens.Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: ContextLens.Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

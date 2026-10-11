import { DEFAULT_MODELS } from "./shared/providers.js";
import { loadSettings, saveSettings } from "./shared/settings.js";

const form = document.querySelector<HTMLFormElement>("#settings")!;
const provider = form.querySelector<HTMLSelectElement>("#provider")!;
const apiKey = form.querySelector<HTMLInputElement>("#apiKey")!;
const model = form.querySelector<HTMLInputElement>("#model")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;

function showPlaceholder(): void {
  model.placeholder = DEFAULT_MODELS[provider.value as ContextLens.Provider];
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  provider.value = settings.provider;
  apiKey.value = settings.apiKey;
  model.value = settings.model === DEFAULT_MODELS[settings.provider] ? "" : settings.model;
  showPlaceholder();
}

provider.addEventListener("change", showPlaceholder);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const p = provider.value as ContextLens.Provider;
  await saveSettings({ provider: p, apiKey: apiKey.value.trim(), model: model.value.trim() || DEFAULT_MODELS[p] });
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 1500);
});

init();

import type { Action, AskResponse } from "./messages";

// Floating panel rendered in a Shadow DOM so host-page CSS can't leak in.
const host = document.createElement("div");
host.style.all = "initial";
const shadow = host.attachShadow({ mode: "closed" });
shadow.innerHTML = `
  <style>
    .panel { position: fixed; z-index: 2147483647; display: none; max-width: 320px;
      background: #fff; color: #111; border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.15); font: 13px/1.4 system-ui, sans-serif; padding: 8px; }
    .actions { display: flex; gap: 4px; }
    button { border: 1px solid #ccc; background: #f7f7f7; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
    .out { margin-top: 6px; white-space: pre-wrap; }
  </style>
  <div class="panel">
    <div class="actions">
      <button data-action="explain">Explain</button>
      <button data-action="summarize">Summarize</button>
      <button data-action="rewrite">Rewrite</button>
    </div>
    <div class="out"></div>
  </div>`;
document.documentElement.appendChild(host);

const panel = shadow.querySelector<HTMLDivElement>(".panel")!;
const out = shadow.querySelector<HTMLDivElement>(".out")!;
let selected = "";

document.addEventListener("mouseup", (e) => {
  if (e.composedPath().includes(host)) return;
  const sel = window.getSelection();
  selected = sel?.toString().trim() ?? "";
  if (!selected || !sel?.rangeCount) { panel.style.display = "none"; return; }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  panel.style.top = `${rect.bottom + 8}px`;
  panel.style.left = `${rect.left}px`;
  out.textContent = "";
  panel.style.display = "block";
});

panel.addEventListener("click", async (e) => {
  const action = (e.target as HTMLElement).dataset.action as Action | undefined;
  if (!action) return;
  out.textContent = "Thinking…";
  const res: AskResponse = await chrome.runtime.sendMessage({ type: "ask", action, text: selected });
  out.textContent = res.ok ? res.result ?? "" : `Error: ${res.error}`;
});

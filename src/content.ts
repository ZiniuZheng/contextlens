// ContextLens content script. Chrome loads content scripts as classic scripts, so this
// file has no imports; shared types come from the ambient ContextLens namespace.
(() => {
  const ACTIONS: { id: ContextLens.Action; label: string }[] = [
    { id: "explain", label: "Explain" },
    { id: "summarize", label: "Summarize" },
    { id: "rewrite", label: "Rewrite" },
  ];
  const MIN_SELECTION = 2;
  const MARGIN = 8;

  // The panel lives in a closed Shadow DOM: page CSS can't restyle it, page scripts can't reach in.
  const host = document.createElement("contextlens-root");
  host.style.cssText = "all: initial; position: fixed; top: 0; left: 0; z-index: 2147483647;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host { --bg: #ffffff; --fg: #1d1d1f; --muted: #6e6e73; --border: #d9d9de;
              --btn: #f2f2f5; --btn-hover: #e6e6ea; --accent: #5b5bd6; --error: #c62828; }
      @media (prefers-color-scheme: dark) {
        :host { --bg: #1f1f23; --fg: #f2f2f5; --muted: #a1a1aa; --border: #3a3a40;
                --btn: #2c2c31; --btn-hover: #38383e; --accent: #8b8bf0; --error: #ef6b6b; }
      }
      .panel { position: fixed; display: none; width: max-content; max-width: min(380px, calc(100vw - 16px));
               background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 10px;
               box-shadow: 0 8px 24px rgba(0,0,0,.18); font: 13px/1.5 system-ui, -apple-system, sans-serif;
               padding: 6px; box-sizing: border-box; }
      .panel.open { display: block; }
      .bar { display: flex; gap: 4px; align-items: center; }
      button { font: inherit; color: var(--fg); background: var(--btn); border: 1px solid var(--border);
               border-radius: 6px; padding: 3px 10px; cursor: pointer; }
      button:hover { background: var(--btn-hover); }
      button.active { border-color: var(--accent); color: var(--accent); }
      .spacer { flex: 1; }
      .icon { padding: 3px 7px; color: var(--muted); }
      .out { display: none; margin: 8px 4px 2px; white-space: pre-wrap; overflow-wrap: anywhere;
             max-height: 320px; overflow-y: auto; }
      .out.show { display: block; }
      .out.loading { color: var(--muted); }
      .out.error { color: var(--error); }
      .setup { display: none; margin: 6px 4px 2px; }
      .setup.show { display: block; }
    </style>
    <div class="panel" role="dialog" aria-label="ContextLens">
      <div class="bar">
        ${ACTIONS.map((a) => `<button data-action="${a.id}">${a.label}</button>`).join("")}
        <span class="spacer"></span>
        <button class="icon" data-copy title="Copy answer" hidden>Copy</button>
        <button class="icon" data-close title="Close (Esc)" aria-label="Close">✕</button>
      </div>
      <div class="out" aria-live="polite"></div>
      <div class="setup"><button data-setup>Open settings</button></div>
    </div>`;
  document.documentElement.appendChild(host);

  const panel = shadow.querySelector<HTMLDivElement>(".panel")!;
  const out = shadow.querySelector<HTMLDivElement>(".out")!;
  const setup = shadow.querySelector<HTMLDivElement>(".setup")!;
  const copyBtn = shadow.querySelector<HTMLButtonElement>("[data-copy]")!;

  let selectedText = "";
  let port: chrome.runtime.Port | null = null;

  function currentSelection(): { text: string; rect: DOMRect } | null {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length < MIN_SELECTION || !sel?.rangeCount) return null;
    return { text, rect: sel.getRangeAt(0).getBoundingClientRect() };
  }

  function place(rect: DOMRect): void {
    panel.classList.add("open");
    const { width, height } = panel.getBoundingClientRect();
    const below = rect.bottom + MARGIN;
    const top = below + height > window.innerHeight ? Math.max(MARGIN, rect.top - height - MARGIN) : below;
    const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - width - MARGIN);
    panel.style.top = `${top}px`;
    panel.style.left = `${Math.max(MARGIN, left)}px`;
  }

  function resetOutput(): void {
    out.textContent = "";
    out.className = "out";
    setup.classList.remove("show");
    copyBtn.hidden = true;
    shadow.querySelectorAll("button.active").forEach((b) => b.classList.remove("active"));
  }

  function open(selection: { text: string; rect: DOMRect }): void {
    cancel();
    selectedText = selection.text;
    resetOutput();
    place(selection.rect);
  }

  function close(): void {
    cancel();
    panel.classList.remove("open");
  }

  function cancel(): void {
    port?.disconnect(); // tells the service worker to abort the request
    port = null;
  }

  function run(action: ContextLens.Action): void {
    cancel();
    resetOutput();
    shadow.querySelector(`[data-action="${action}"]`)?.classList.add("active");
    out.className = "out show loading";
    out.textContent = "Thinking…";

    let received = false;
    const p = chrome.runtime.connect({ name: "contextlens-ask" });
    port = p;
    p.onMessage.addListener((msg: ContextLens.StreamMessage) => {
      if (port !== p) return; // a newer request replaced this one
      if (msg.type === "delta") {
        if (!received) {
          received = true;
          out.className = "out show";
          out.textContent = "";
        }
        out.textContent += msg.text; // textContent, never innerHTML: model output is untrusted
        out.scrollTop = out.scrollHeight;
      } else if (msg.type === "done") {
        copyBtn.hidden = !received;
        if (!received) out.textContent = "No response.";
        p.disconnect();
        port = null;
      } else {
        out.className = "out show error";
        out.textContent = msg.message;
        setup.classList.toggle("show", Boolean(msg.needsSetup));
        p.disconnect();
        port = null;
      }
    });
    const req: ContextLens.AskRequest = { action, text: selectedText, pageTitle: document.title };
    p.postMessage(req);
  }

  panel.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("button");
    if (!target) return;
    const action = target.dataset.action as ContextLens.Action | undefined;
    if (action) run(action);
    else if (target.hasAttribute("data-close")) close();
    else if (target.hasAttribute("data-setup")) {
      const msg: ContextLens.RuntimeMessage = { type: "open-options" };
      chrome.runtime.sendMessage(msg);
    } else if (target.hasAttribute("data-copy")) {
      navigator.clipboard.writeText(out.textContent ?? "").then(() => {
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      });
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (e.composedPath().includes(host)) return;
    // Let the browser finish updating the selection before reading it.
    setTimeout(() => {
      const selection = currentSelection();
      if (selection) open(selection);
      else if (!port) close();
    }, 0);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) close();
  });

  // Keyboard shortcut relayed from the service worker.
  chrome.runtime.onMessage.addListener((msg: ContextLens.RuntimeMessage) => {
    if (msg?.type !== "run") return;
    const selection = currentSelection();
    if (!selection) return;
    open(selection);
    run(msg.action);
  });
})();

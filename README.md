# ContextLens

> 🚧 **Work in progress**

ContextLens is a Chrome extension that brings AI assistance into any web page. Select text and a floating panel appears in place, letting you **explain**, **summarize**, or **rewrite** it without switching to a chat window.

## Architecture

- **Manifest V3** extension written in **TypeScript**
- **Content script** renders the overlay with native DOM APIs and CSS inside a **Shadow DOM**, so it looks the same on any site
- **Background service worker** handles all LLM requests, keeping API keys out of page context
- Typed message contract between the two (`src/messages.ts`)

## Getting started

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.

## Roadmap

- [x] Project scaffold (MV3, TypeScript, esbuild)
- [x] Selection-triggered floating panel in Shadow DOM
- [ ] LLM integration in the service worker
- [ ] Streaming responses into the panel
- [ ] Options page for API key and model settings
- [ ] Keyboard shortcut and dark mode

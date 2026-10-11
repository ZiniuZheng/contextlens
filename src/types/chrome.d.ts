// Minimal typings for the Chrome extension APIs this project uses.
// Kept in-repo so the build has no dependency beyond TypeScript itself.

declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: chrome.tabs.Tab;
    }
    interface Port {
      name: string;
      postMessage(message: unknown): void;
      disconnect(): void;
      onMessage: Event<(message: any, port: Port) => void>;
      onDisconnect: Event<(port: Port) => void>;
    }
    interface Event<T extends (...args: any[]) => any> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
    }
    const lastError: { message?: string } | undefined;
    const onConnect: Event<(port: Port) => void>;
    const onMessage: Event<
      (message: any, sender: MessageSender, sendResponse: (response?: unknown) => void) => boolean | void
    >;
    function connect(info?: { name?: string }): Port;
    function sendMessage(message: unknown): Promise<unknown>;
    function openOptionsPage(): Promise<void>;
  }

  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    }
    const local: StorageArea;
  }

  namespace tabs {
    interface Tab {
      id?: number;
    }
    function query(query: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }

  namespace commands {
    const onCommand: chrome.runtime.Event<(command: string) => void>;
  }

  namespace action {
    const onClicked: chrome.runtime.Event<(tab: chrome.tabs.Tab) => void>;
  }
}

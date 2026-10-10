export type Action = "explain" | "summarize" | "rewrite";

export interface AskRequest {
  type: "ask";
  action: Action;
  text: string;
}

export interface AskResponse {
  ok: boolean;
  result?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  system_prompt: string | null;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  image_urls: string[] | null;
  created_at: string;
}

export interface ChatRequest {
  messages: {
    role: "user" | "assistant";
    content: string;
    images?: string[]; // base64 이미지 배열
  }[];
  model: string;
  system?: string;
}

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
] as const;

export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

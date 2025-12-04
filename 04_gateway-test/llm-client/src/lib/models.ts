export const MODELS = [
  // OpenAI
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', color: 'bg-green-500' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', color: 'bg-green-500' },
  // Anthropic (Claude 4.5)
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', color: 'bg-orange-500' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'Anthropic', color: 'bg-orange-500' },
  // Google
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', color: 'bg-blue-500' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'Google', color: 'bg-blue-500' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'Google', color: 'bg-blue-500' },
  // xAI (Grok)
  { value: 'grok-3', label: 'Grok 3', provider: 'xAI', color: 'bg-gray-700' },
  { value: 'grok-3-mini', label: 'Grok 3 Mini', provider: 'xAI', color: 'bg-gray-700' },
  { value: 'grok-2', label: 'Grok 2', provider: 'xAI', color: 'bg-gray-700' },
];

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

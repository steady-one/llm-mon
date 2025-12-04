export type Provider = 'openai' | 'anthropic' | 'google' | 'xai';
export type Mode = 'passthrough' | 'reseller';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

// Pass-through 모드에서 각 Provider에 대한 설정
const PROVIDER_CONFIG = {
  openai: {
    baseUrl: '/api/v1/openai',
    endpoint: '/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini'],
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    baseUrl: '/api/v1/anthropic',
    endpoint: '/messages',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    defaultModel: 'claude-3-5-haiku-20241022',
  },
  google: {
    baseUrl: '/api/v1/google',
    endpoint: '/chat/completions',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-1.5-flash',
  },
  xai: {
    baseUrl: '/api/v1/xai',
    endpoint: '/chat/completions',
    models: ['grok-beta'],
    defaultModel: 'grok-beta',
  },
};

// Reseller 모드에서 사용 가능한 모델
export const RESELLER_MODELS = [
  // OpenAI
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)', provider: 'openai' },
  // Anthropic (Claude 4.5)
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Anthropic)', provider: 'anthropic' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Anthropic)', provider: 'anthropic' },
  // Google
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Google)', provider: 'google' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Google)', provider: 'google' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Google)', provider: 'google' },
  // xAI (Grok)
  { value: 'grok-3', label: 'Grok 3 (xAI)', provider: 'xai' },
  { value: 'grok-3-mini', label: 'Grok 3 Mini (xAI)', provider: 'xai' },
  { value: 'grok-2', label: 'Grok 2 (xAI)', provider: 'xai' },
];

export function getProviderConfig(provider: Provider) {
  return PROVIDER_CONFIG[provider];
}

export function getModelsForProvider(provider: Provider) {
  return PROVIDER_CONFIG[provider].models;
}

export function getDefaultModel(provider: Provider) {
  return PROVIDER_CONFIG[provider].defaultModel;
}

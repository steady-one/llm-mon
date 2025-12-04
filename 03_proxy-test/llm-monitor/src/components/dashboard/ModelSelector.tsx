'use client';

import { useState, useEffect } from 'react';

interface Model {
  id: string;
  provider: string;
  name: string;
  description: string;
  inputPrice: number;
  outputPrice: number;
}

// 지원하는 모델 목록
const AVAILABLE_MODELS: Model[] = [
  // OpenAI
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    description: '가장 강력한 OpenAI 모델, 멀티모달 지원',
    inputPrice: 2.5,
    outputPrice: 10,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    description: '빠르고 저렴한 OpenAI 모델',
    inputPrice: 0.15,
    outputPrice: 0.6,
  },
  // Anthropic (Claude 4.5)
  {
    id: 'claude-sonnet-4-5',
    provider: 'anthropic',
    name: 'Claude Sonnet 4.5',
    description: '최신 Sonnet, 에이전트 및 코딩에 최적화',
    inputPrice: 3,
    outputPrice: 15,
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    name: 'Claude Haiku 4.5',
    description: '빠르고 저렴한 최신 모델',
    inputPrice: 1,
    outputPrice: 5,
  },
  // Google
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    description: '최신 Gemini 2.0, 빠르고 강력',
    inputPrice: 0.1,
    outputPrice: 0.4,
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    description: '긴 컨텍스트 지원 (1M 토큰)',
    inputPrice: 1.25,
    outputPrice: 5,
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
    description: '빠르고 효율적인 모델',
    inputPrice: 0.075,
    outputPrice: 0.3,
  },
  // xAI (Grok)
  {
    id: 'grok-3',
    provider: 'xai',
    name: 'Grok 3',
    description: '최신 Grok 플래그십 모델',
    inputPrice: 3,
    outputPrice: 15,
  },
  {
    id: 'grok-3-mini',
    provider: 'xai',
    name: 'Grok 3 Mini',
    description: '빠르고 효율적인 Grok 모델',
    inputPrice: 0.3,
    outputPrice: 0.5,
  },
  {
    id: 'grok-2',
    provider: 'xai',
    name: 'Grok 2',
    description: '안정적인 Grok 모델',
    inputPrice: 2,
    outputPrice: 10,
  },
];

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  openai: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  anthropic: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  google: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  xai: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
};

interface Props {
  selectedModel?: string;
  onSelect?: (model: Model) => void;
}

export default function ModelSelector({ selectedModel, onSelect }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string | undefined>(selectedModel);

  useEffect(() => {
    setSelected(selectedModel);
  }, [selectedModel]);

  const filteredModels = filter === 'all'
    ? AVAILABLE_MODELS
    : AVAILABLE_MODELS.filter((m) => m.provider === filter);

  const handleSelect = (model: Model) => {
    setSelected(model.id);
    onSelect?.(model);
  };

  const providers = ['all', ...new Set(AVAILABLE_MODELS.map((m) => m.provider))];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">사용 가능한 모델</h2>

      {/* Provider Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {providers.map((provider) => (
          <button
            key={provider}
            onClick={() => setFilter(provider)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === provider
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {provider === 'all' ? '전체' : PROVIDER_NAMES[provider]}
          </button>
        ))}
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModels.map((model) => {
          const colors = PROVIDER_COLORS[model.provider];
          const isSelected = selected === model.id;

          return (
            <div
              key={model.id}
              onClick={() => handleSelect(model)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : `${colors.border} ${colors.bg} hover:border-blue-300`
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                      {PROVIDER_NAMES[model.provider]}
                    </span>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">
                        선택됨
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mt-2">{model.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>입력: ${model.inputPrice}/1M 토큰</span>
                  <span>출력: ${model.outputPrice}/1M 토큰</span>
                </div>
              </div>
              <div className="mt-2">
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">{model.id}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Example */}
      {selected && (
        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">사용 예시</span>
            <button
              onClick={() => {
                const code = `curl -X POST http://localhost:3000/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "${selected}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;
                navigator.clipboard.writeText(code);
                alert('복사되었습니다!');
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              복사
            </button>
          </div>
          <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST http://localhost:3000/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "${selected}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
          </pre>
        </div>
      )}
    </div>
  );
}

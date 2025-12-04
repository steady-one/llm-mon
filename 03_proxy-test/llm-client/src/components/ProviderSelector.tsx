'use client';

import { Provider } from '@/lib/llm-client';

interface ProviderSelectorProps {
  provider: Provider;
  onChange: (provider: Provider) => void;
  disabled?: boolean;
}

const providers: { value: Provider; label: string; color: string }[] = [
  { value: 'openai', label: 'OpenAI', color: 'bg-green-500' },
  { value: 'anthropic', label: 'Anthropic', color: 'bg-orange-500' },
  { value: 'google', label: 'Google', color: 'bg-blue-500' },
  { value: 'xai', label: 'xAI', color: 'bg-gray-700' },
];

export default function ProviderSelector({
  provider,
  onChange,
  disabled,
}: ProviderSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {providers.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          disabled={disabled}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            provider === p.value
              ? `${p.color} text-white`
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

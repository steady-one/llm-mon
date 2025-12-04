'use client';

import { Mode } from '@/lib/llm-client';

interface ModeSelectorProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  disabled?: boolean;
}

export default function ModeSelector({
  mode,
  onChange,
  disabled,
}: ModeSelectorProps) {
  return (
    <div className="flex gap-4">
      <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
        <input
          type="radio"
          name="mode"
          value="passthrough"
          checked={mode === 'passthrough'}
          onChange={() => onChange('passthrough')}
          disabled={disabled}
          className="w-4 h-4"
        />
        <span className="font-medium">Pass-through</span>
        <span className="text-sm text-gray-500">(고객 API Key 사용)</span>
      </label>
      <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
        <input
          type="radio"
          name="mode"
          value="reseller"
          checked={mode === 'reseller'}
          onChange={() => onChange('reseller')}
          disabled={disabled}
          className="w-4 h-4"
        />
        <span className="font-medium">Reseller</span>
        <span className="text-sm text-gray-500">(통합 API Key 사용)</span>
      </label>
    </div>
  );
}

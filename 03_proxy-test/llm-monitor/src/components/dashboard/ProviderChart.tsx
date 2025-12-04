'use client';

interface ProviderData {
  provider: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  estimatedCost: number;
}

interface ProviderChartProps {
  data: ProviderData[];
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500',
  xai: 'bg-gray-700',
};

export default function ProviderChart({ data }: ProviderChartProps) {
  const totalRequests = data.reduce((sum, p) => sum + p.requests, 0);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Provider별 사용량</h3>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">아직 사용 데이터가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {data.map((provider) => {
            const percentage = totalRequests > 0
              ? ((provider.requests / totalRequests) * 100).toFixed(1)
              : '0';

            return (
              <div key={provider.provider}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium capitalize">{provider.provider}</span>
                  <span className="text-sm text-gray-500">
                    {provider.requests.toLocaleString()} 요청 ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${PROVIDER_COLORS[provider.provider] || 'bg-gray-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>
                    토큰: {(provider.inputTokens + provider.outputTokens).toLocaleString()}
                  </span>
                  <span>
                    비용: ${(provider.totalCost + provider.estimatedCost).toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

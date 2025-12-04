'use client';

interface ModeData {
  mode: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  estimatedCost: number;
}

interface ModeStatsProps {
  data: ModeData[];
}

export default function ModeStats({ data }: ModeStatsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">모드별 사용량</h3>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">아직 사용 데이터가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((mode) => (
            <div
              key={mode.mode}
              className={`p-4 rounded-lg ${
                mode.mode === 'passthrough' ? 'bg-blue-50' : 'bg-purple-50'
              }`}
            >
              <h4 className="font-semibold capitalize mb-2">
                {mode.mode === 'passthrough' ? 'Pass-through' : 'Reseller'}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">요청 수:</span>
                  <span className="font-medium">{mode.requests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">입력 토큰:</span>
                  <span className="font-medium">{mode.inputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">출력 토큰:</span>
                  <span className="font-medium">{mode.outputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {mode.mode === 'passthrough' ? '예상 비용:' : '실제 비용:'}
                  </span>
                  <span className="font-medium">
                    ${mode.mode === 'passthrough'
                      ? mode.estimatedCost.toFixed(4)
                      : mode.totalCost.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

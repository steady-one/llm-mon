'use client';

interface ModelData {
  provider: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  estimatedCost: number;
  avgLatencyMs: number;
  pricing: {
    inputPricePer1m: number;
    outputPricePer1m: number;
  } | null;
}

interface ModelTableProps {
  models: ModelData[];
}

export default function ModelTable({ models }: ModelTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <h3 className="text-lg font-semibold p-4 border-b">모델별 상세 통계</h3>

      {models.length === 0 ? (
        <p className="text-gray-500 text-center py-8">아직 사용 데이터가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-right">요청 수</th>
                <th className="px-4 py-3 text-right">입력 토큰</th>
                <th className="px-4 py-3 text-right">출력 토큰</th>
                <th className="px-4 py-3 text-right">비용</th>
                <th className="px-4 py-3 text-right">평균 지연</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {models.map((model, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 capitalize">{model.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs">{model.model}</td>
                  <td className="px-4 py-3 text-right">
                    {model.requests.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {model.inputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {model.outputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${(model.totalCost + model.estimatedCost).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {model.avgLatencyMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

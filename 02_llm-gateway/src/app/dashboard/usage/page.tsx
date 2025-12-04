'use client'

import { useEffect, useState } from 'react'

interface UsageData {
  period: { days: number; since: string }
  summary: {
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    totalCost: number
    providerCost: number
    margin: number
  }
  byModel: {
    model: string
    requests: number
    inputTokens: number
    outputTokens: number
    totalCost: number
  }[]
  logs: {
    id: string
    model: string
    inputTokens: number
    outputTokens: number
    totalCost: number
    latencyMs: number | null
    requestedAt: string
    apiKey: string
  }[]
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/usage?days=${days}`)
        const usageData = await res.json()
        setData(usageData)
      } catch (error) {
        console.error('Failed to fetch usage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">사용량 분석</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
          <option value={90}>최근 90일</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">총 요청</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data?.summary.totalRequests.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">총 토큰</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data?.summary.totalTokens.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            입력: {data?.summary.totalInputTokens.toLocaleString() || 0} / 출력:{' '}
            {data?.summary.totalOutputTokens.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">총 비용</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${data?.summary.totalCost.toFixed(4) || '0.0000'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">원가 vs 마진</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            ${data?.summary.providerCost.toFixed(4) || '0.0000'}
            <span className="text-sm text-gray-500 font-normal"> 원가</span>
          </p>
          <p className="text-sm text-green-600">
            +${data?.summary.margin.toFixed(4) || '0.0000'} 마진 (20%)
          </p>
        </div>
      </div>

      {/* Usage by Model */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">모델별 사용량</h2>
        </div>
        {data?.byModel && data.byModel.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    모델
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    요청
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    입력 토큰
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    출력 토큰
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    비용
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byModel.map((model) => (
                  <tr key={model.model}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {model.model}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {model.requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {model.inputTokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {model.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      ${model.totalCost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            아직 사용 기록이 없습니다.
          </div>
        )}
      </div>

      {/* Recent Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">최근 요청</h2>
        </div>
        {data?.logs && data.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    모델
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    토큰
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    비용
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    지연시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(log.requestedAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.model}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {log.apiKey}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {(log.inputTokens + log.outputTokens).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      ${log.totalCost.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            아직 사용 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}

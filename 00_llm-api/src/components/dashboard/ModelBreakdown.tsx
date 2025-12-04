'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { ModelUsage } from '@/types'

interface ModelBreakdownProps {
  data: ModelUsage[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ModelBreakdown({ data }: ModelBreakdownProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">모델별 사용량</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {/* 파이 차트 */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="totalTokens"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(props) => {
                  const entry = props as unknown as { name: string; percentage: number }
                  const modelName = entry.name || ''
                  const pct = entry.percentage ?? 0
                  return `${modelName.slice(0, 10)}${modelName.length > 10 ? '...' : ''} (${pct.toFixed(1)}%)`
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatNumber(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 테이블 */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-2">모델</th>
                <th className="pb-2 text-right">토큰</th>
                <th className="pb-2 text-right">비용</th>
                <th className="pb-2 text-right">비율</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={item.model} className="border-b border-gray-100">
                  <td className="py-2 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate max-w-[120px]" title={item.model}>
                      {item.model}
                    </span>
                  </td>
                  <td className="py-2 text-right">{formatNumber(item.totalTokens)}</td>
                  <td className="py-2 text-right">{formatCurrency(item.cost)}</td>
                  <td className="py-2 text-right">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

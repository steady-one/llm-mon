'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailyUsage } from '@/types'

interface UsageChartProps {
  data: DailyUsage[]
}

export function UsageChart({ data }: UsageChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: item.date.slice(5), // MM-DD 형식
    cost: Number(item.cost.toFixed(4)),
  }))

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">일별 사용량 추이</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'cost') return [`$${value.toFixed(4)}`, '비용']
                return [value.toLocaleString(), name === 'totalTokens' ? '총 토큰' : name]
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalTokens"
              name="총 토큰"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cost"
              name="비용 ($)"
              stroke="#10b981"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

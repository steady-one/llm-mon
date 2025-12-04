'use client'

import { formatCurrency, formatNumber } from '@/lib/utils'
import type { UsageSummary } from '@/types'

interface CostSummaryProps {
  summary: UsageSummary
}

export function CostSummary({ summary }: CostSummaryProps) {
  const cards = [
    {
      title: '총 비용',
      value: formatCurrency(summary.totalCost),
      icon: '💰',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: '총 토큰',
      value: formatNumber(summary.totalTokens),
      icon: '📊',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Input 토큰',
      value: formatNumber(summary.totalInputTokens),
      icon: '📥',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      title: 'Output 토큰',
      value: formatNumber(summary.totalOutputTokens),
      icon: '📤',
      color: 'bg-orange-50 border-orange-200',
    },
    {
      title: '총 요청 수',
      value: formatNumber(summary.totalRequests),
      icon: '🔄',
      color: 'bg-gray-50 border-gray-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`p-4 rounded-lg border ${card.color}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{card.icon}</span>
            <span className="text-sm text-gray-600">{card.title}</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{card.value}</div>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  balance: number
  usage: {
    totalRequests: number
    totalTokens: number
    totalCost: number
  }
  apiKeysCount: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [balanceRes, usageRes, keysRes] = await Promise.all([
          fetch('/api/balance'),
          fetch('/api/usage?days=30'),
          fetch('/api/keys'),
        ])

        const [balanceData, usageData, keysData] = await Promise.all([
          balanceRes.json(),
          usageRes.json(),
          keysRes.json(),
        ])

        setData({
          balance: balanceData.balance || 0,
          usage: {
            totalRequests: usageData.summary?.totalRequests || 0,
            totalTokens: usageData.summary?.totalTokens || 0,
            totalCost: usageData.summary?.totalCost || 0,
          },
          apiKeysCount: keysData.apiKeys?.length || 0,
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">대시보드</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">잔액</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${data?.balance.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">$</span>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
          >
            충전하기 &rarr;
          </Link>
        </div>

        {/* Total Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 요청 (30일)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data?.usage.totalRequests.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">&#x1F4E8;</span>
            </div>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 토큰 (30일)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data?.usage.totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">&#x1F4DD;</span>
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 비용 (30일)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${data?.usage.totalCost.toFixed(4)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">&#x1F4B0;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 시작</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/keys"
            className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-xl">&#x1F511;</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">API Key 관리</p>
              <p className="text-sm text-gray-500">
                {data?.apiKeysCount}개의 API Key 활성화됨
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/usage"
            className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-xl">&#x1F4CA;</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">사용량 분석</p>
              <p className="text-sm text-gray-500">상세 사용량 및 비용 확인</p>
            </div>
          </Link>
        </div>
      </div>

      {/* API Usage Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API 사용 가이드</h2>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100">
            <code>{`curl https://your-domain.com/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer llm_sk_your_api_key" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}</code>
          </pre>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          OpenAI SDK와 호환됩니다. Base URL만 변경하면 됩니다.
        </p>
      </div>
    </div>
  )
}

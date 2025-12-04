'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CostSummary } from '@/components/dashboard/CostSummary'
import { UsageChart } from '@/components/dashboard/UsageChart'
import { ModelBreakdown } from '@/components/dashboard/ModelBreakdown'
import type { UsageSummary, DailyUsage, ModelUsage } from '@/types'

interface UsageResponse {
  success: boolean
  data?: {
    summary: UsageSummary
    dailyUsage: DailyUsage[]
    modelUsage: ModelUsage[]
  }
  error?: string
}

interface SettingsResponse {
  success: boolean
  data?: Array<{ provider: string; apiKey: string }>
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [data, setData] = useState<{
    summary: UsageSummary
    dailyUsage: DailyUsage[]
    modelUsage: ModelUsage[]
  } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 설정 확인
      const settingsRes = await fetch('/api/settings')
      const settingsData: SettingsResponse = await settingsRes.json()

      if (!settingsData.success || !settingsData.data?.length) {
        setHasApiKey(false)
        setLoading(false)
        return
      }

      setHasApiKey(true)

      // 사용량 데이터 가져오기
      const usageRes = await fetch('/api/usage?days=30')
      const usageData: UsageResponse = await usageRes.json()

      if (!usageData.success) {
        throw new Error(usageData.error || 'Failed to fetch usage data')
      }

      setData(usageData.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/sync', { method: 'POST' })
      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'Sync failed')
      }

      setSuccess('데이터 동기화가 완료되었습니다')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleSeed = async () => {
    try {
      setSeeding(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/seed', { method: 'POST' })
      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'Seed failed')
      }

      setSuccess(`더미 데이터가 생성되었습니다 (${result.data.recordsCreated}개 레코드)`)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg border border-gray-200 p-8">
        <h2 className="text-xl font-semibold mb-4">API Key를 설정해주세요</h2>
        <p className="text-gray-600 mb-6">
          OpenAI 사용량을 모니터링하려면 먼저 API Key를 등록해야 합니다.
        </p>
        <div className="flex gap-4">
          <Link
            href="/settings"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            설정으로 이동
          </Link>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {seeding ? '생성 중...' : '더미 데이터로 테스트'}
          </button>
        </div>
      </div>
    )
  }

  const emptySummary: UsageSummary = {
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    totalRequests: 0,
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600">최근 30일 사용량</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding || syncing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {seeding ? '생성 중...' : '더미 데이터'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || seeding}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? '동기화 중...' : '데이터 동기화'}
          </button>
        </div>
      </div>

      {/* 성공 메시지 */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 요약 카드 */}
      <CostSummary summary={data?.summary || emptySummary} />

      {/* 차트 */}
      {data?.dailyUsage && data.dailyUsage.length > 0 ? (
        <>
          <UsageChart data={data.dailyUsage} />
          <ModelBreakdown data={data.modelUsage || []} />
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">
            아직 사용량 데이터가 없습니다. &quot;데이터 동기화&quot; 버튼을 눌러 데이터를 가져오세요.
          </p>
        </div>
      )}
    </div>
  )
}

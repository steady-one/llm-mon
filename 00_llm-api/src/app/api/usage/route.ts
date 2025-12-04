import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - 사용량 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const provider = searchParams.get('provider') || 'openai'

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 전체 사용량 데이터
    const usageData = await prisma.usageData.findMany({
      where: {
        provider,
        periodStart: {
          gte: startDate,
        },
      },
      orderBy: {
        periodStart: 'asc',
      },
    })

    // 요약 통계
    const summary = usageData.reduce(
      (acc, item) => ({
        totalTokens: acc.totalTokens + item.totalTokens,
        totalInputTokens: acc.totalInputTokens + item.inputTokens,
        totalOutputTokens: acc.totalOutputTokens + item.outputTokens,
        totalCost: acc.totalCost + item.cost,
        totalRequests: acc.totalRequests + item.requestCount,
      }),
      {
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        totalRequests: 0,
      }
    )

    // 일별 집계
    const dailyMap = new Map<string, {
      date: string
      inputTokens: number
      outputTokens: number
      totalTokens: number
      cost: number
      requestCount: number
    }>()

    usageData.forEach(item => {
      const dateKey = item.periodStart.toISOString().split('T')[0]
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
      }

      dailyMap.set(dateKey, {
        date: dateKey,
        inputTokens: existing.inputTokens + item.inputTokens,
        outputTokens: existing.outputTokens + item.outputTokens,
        totalTokens: existing.totalTokens + item.totalTokens,
        cost: existing.cost + item.cost,
        requestCount: existing.requestCount + item.requestCount,
      })
    })

    const dailyUsage = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    // 모델별 집계
    const modelMap = new Map<string, {
      model: string
      inputTokens: number
      outputTokens: number
      totalTokens: number
      cost: number
      requestCount: number
    }>()

    usageData.forEach(item => {
      const existing = modelMap.get(item.model) || {
        model: item.model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
      }

      modelMap.set(item.model, {
        model: item.model,
        inputTokens: existing.inputTokens + item.inputTokens,
        outputTokens: existing.outputTokens + item.outputTokens,
        totalTokens: existing.totalTokens + item.totalTokens,
        cost: existing.cost + item.cost,
        requestCount: existing.requestCount + item.requestCount,
      })
    })

    const modelUsage = Array.from(modelMap.values())
      .map(m => ({
        ...m,
        percentage: summary.totalTokens > 0
          ? (m.totalTokens / summary.totalTokens) * 100
          : 0,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        dailyUsage,
        modelUsage,
        rawData: usageData,
      },
    })
  } catch (error) {
    console.error('Usage GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}

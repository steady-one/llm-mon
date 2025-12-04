import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchOpenAIUsage, calculateCost } from '@/lib/openai'

// POST - OpenAI 사용량 동기화
export async function POST() {
  try {
    // OpenAI 설정 가져오기
    const settings = await prisma.settings.findUnique({
      where: { provider: 'openai' },
    })

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 400 }
      )
    }

    // 지난 30일 데이터 가져오기
    const endTime = Math.floor(Date.now() / 1000)
    const startTime = endTime - 30 * 24 * 60 * 60 // 30일 전

    const usageData = await fetchOpenAIUsage(
      settings.apiKey,
      startTime,
      endTime,
      '1d'
    )

    // 기존 데이터 삭제 (중복 방지)
    await prisma.usageData.deleteMany({
      where: {
        provider: 'openai',
        periodStart: {
          gte: new Date(startTime * 1000),
        },
      },
    })

    // 새 데이터 저장
    const records = usageData.data
      .filter(bucket => bucket.model) // 모델 정보가 있는 것만
      .map(bucket => {
        const model = bucket.model || 'unknown'
        const inputTokens = bucket.input_tokens || 0
        const outputTokens = bucket.output_tokens || 0
        const cost = calculateCost(model, inputTokens, outputTokens)

        return {
          provider: 'openai',
          periodStart: new Date(bucket.start_time * 1000),
          periodEnd: new Date(bucket.end_time * 1000),
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          requestCount: bucket.num_model_requests || 0,
        }
      })

    if (records.length > 0) {
      await prisma.usageData.createMany({
        data: records,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        synced: records.length,
        period: {
          start: new Date(startTime * 1000).toISOString(),
          end: new Date(endTime * 1000).toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Sync error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sync usage data'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

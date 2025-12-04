import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 더미 데이터 생성
const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'o1-mini']
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1-mini': { input: 3, output: 12 },
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// POST - 더미 데이터 생성
export async function POST() {
  try {
    // 기존 데이터 삭제
    await prisma.usageData.deleteMany({
      where: { provider: 'openai' }
    })

    // 더미 설정 생성 (없으면)
    await prisma.settings.upsert({
      where: { provider: 'openai' },
      update: {},
      create: {
        provider: 'openai',
        apiKey: 'sk-demo-key-for-testing',
      },
    })

    // 30일치 더미 데이터 생성
    const records = []
    const now = new Date()

    for (let day = 29; day >= 0; day--) {
      const date = new Date(now)
      date.setDate(date.getDate() - day)
      date.setHours(0, 0, 0, 0)

      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      // 각 모델별로 데이터 생성
      for (const model of MODELS) {
        // 일부 날은 특정 모델 사용 안 함 (랜덤성)
        if (Math.random() < 0.2) continue

        const inputTokens = randomInt(10000, 500000)
        const outputTokens = randomInt(5000, 200000)
        const pricing = MODEL_COSTS[model]
        const cost = (inputTokens / 1_000_000) * pricing.input +
                     (outputTokens / 1_000_000) * pricing.output

        records.push({
          provider: 'openai',
          periodStart: date,
          periodEnd: endDate,
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          requestCount: randomInt(50, 500),
        })
      }
    }

    await prisma.usageData.createMany({
      data: records,
    })

    return NextResponse.json({
      success: true,
      data: {
        message: '더미 데이터가 생성되었습니다',
        recordsCreated: records.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create dummy data' },
      { status: 500 }
    )
  }
}

// DELETE - 모든 데이터 삭제
export async function DELETE() {
  try {
    await prisma.usageData.deleteMany({})

    return NextResponse.json({
      success: true,
      data: { message: '모든 사용량 데이터가 삭제되었습니다' },
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete data' },
      { status: 500 }
    )
  }
}

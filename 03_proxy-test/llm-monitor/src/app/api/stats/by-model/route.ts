import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 모델별 상세 통계
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 모델별 통계
    const modelStats = await prisma.usageLog.groupBy({
      by: ['provider', 'model'],
      where: {
        orgId: user.id,
        requestedAt: { gte: startDate },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
        estimatedCost: true,
        latencyMs: true,
      },
      _count: true,
      _avg: {
        latencyMs: true,
      },
    });

    // 가격 정보 가져오기
    const pricingData = await prisma.pricing.findMany();
    const pricingMap = new Map(
      pricingData.map((p) => [`${p.provider}:${p.model}`, p])
    );

    const result = modelStats.map((m) => {
      const pricing = pricingMap.get(`${m.provider}:${m.model}`);
      return {
        provider: m.provider,
        model: m.model,
        requests: m._count,
        inputTokens: m._sum.inputTokens || 0,
        outputTokens: m._sum.outputTokens || 0,
        totalTokens: (m._sum.inputTokens || 0) + (m._sum.outputTokens || 0),
        totalCost: m._sum.totalCost || 0,
        estimatedCost: m._sum.estimatedCost || 0,
        avgLatencyMs: Math.round(m._avg.latencyMs || 0),
        pricing: pricing
          ? {
              inputPricePer1m: pricing.inputPricePer1m,
              outputPricePer1m: pricing.outputPricePer1m,
            }
          : null,
      };
    });

    // 정렬: 요청 수 기준
    result.sort((a, b) => b.requests - a.requests);

    return NextResponse.json({
      period: {
        days,
        from: startDate.toISOString(),
        to: new Date().toISOString(),
      },
      models: result,
    });
  } catch (error) {
    console.error('Stats by model error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

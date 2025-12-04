import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 사용량 요약 통계
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

    // 전체 사용량 통계
    const totalStats = await prisma.usageLog.aggregate({
      where: {
        orgId: user.id,
        requestedAt: { gte: startDate },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
        estimatedCost: true,
      },
      _count: true,
    });

    // Provider별 통계
    const providerStats = await prisma.usageLog.groupBy({
      by: ['provider'],
      where: {
        orgId: user.id,
        requestedAt: { gte: startDate },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
        estimatedCost: true,
      },
      _count: true,
    });

    // 모드별 통계
    const modeStats = await prisma.usageLog.groupBy({
      by: ['mode'],
      where: {
        orgId: user.id,
        requestedAt: { gte: startDate },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
        estimatedCost: true,
      },
      _count: true,
    });

    // 잔액 정보
    const balance = await prisma.balance.findUnique({
      where: { orgId: user.id },
    });

    return NextResponse.json({
      period: {
        days,
        from: startDate.toISOString(),
        to: new Date().toISOString(),
      },
      total: {
        requests: totalStats._count,
        inputTokens: totalStats._sum.inputTokens || 0,
        outputTokens: totalStats._sum.outputTokens || 0,
        totalCost: totalStats._sum.totalCost || 0,
        estimatedCost: totalStats._sum.estimatedCost || 0,
      },
      byProvider: providerStats.map((p) => ({
        provider: p.provider,
        requests: p._count,
        inputTokens: p._sum.inputTokens || 0,
        outputTokens: p._sum.outputTokens || 0,
        totalCost: p._sum.totalCost || 0,
        estimatedCost: p._sum.estimatedCost || 0,
      })),
      byMode: modeStats.map((m) => ({
        mode: m.mode,
        requests: m._count,
        inputTokens: m._sum.inputTokens || 0,
        outputTokens: m._sum.outputTokens || 0,
        totalCost: m._sum.totalCost || 0,
        estimatedCost: m._sum.estimatedCost || 0,
      })),
      balance: balance?.amount || 0,
    });
  } catch (error) {
    console.error('Stats summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

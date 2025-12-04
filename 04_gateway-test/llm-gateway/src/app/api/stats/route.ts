import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = parseInt(new URL(request.url).searchParams.get('days') || '30');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [total, byProvider, byModel, balance] = await Promise.all([
    prisma.usageLog.aggregate({
      where: { orgId: user.id, requestedAt: { gte: startDate } },
      _sum: { inputTokens: true, outputTokens: true, totalCost: true },
      _count: true,
    }),
    prisma.usageLog.groupBy({
      by: ['provider'],
      where: { orgId: user.id, requestedAt: { gte: startDate } },
      _sum: { inputTokens: true, outputTokens: true, totalCost: true },
      _count: true,
    }),
    prisma.usageLog.groupBy({
      by: ['provider', 'model'],
      where: { orgId: user.id, requestedAt: { gte: startDate } },
      _sum: { inputTokens: true, outputTokens: true, totalCost: true },
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.balance.findUnique({ where: { orgId: user.id } }),
  ]);

  return NextResponse.json({
    period: { days, from: startDate.toISOString(), to: new Date().toISOString() },
    total: {
      requests: total._count,
      inputTokens: total._sum.inputTokens || 0,
      outputTokens: total._sum.outputTokens || 0,
      totalCost: total._sum.totalCost || 0,
    },
    byProvider: byProvider.map((p) => ({
      provider: p.provider,
      requests: p._count,
      inputTokens: p._sum.inputTokens || 0,
      outputTokens: p._sum.outputTokens || 0,
      totalCost: p._sum.totalCost || 0,
    })),
    byModel: byModel.map((m) => ({
      provider: m.provider,
      model: m.model,
      requests: m._count,
      inputTokens: m._sum.inputTokens || 0,
      outputTokens: m._sum.outputTokens || 0,
      totalCost: m._sum.totalCost || 0,
      avgLatencyMs: Math.round(m._avg.latencyMs || 0),
    })),
    balance: balance?.amount || 0,
  });
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '100')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get usage logs
    const usageLogs = await prisma.usageLog.findMany({
      where: {
        orgId: session.userId,
        requestedAt: { gte: since },
      },
      orderBy: { requestedAt: 'desc' },
      take: limit,
      include: {
        apiKey: {
          select: { keyPrefix: true, name: true },
        },
      },
    })

    // Aggregate stats
    const stats = await prisma.usageLog.aggregate({
      where: {
        orgId: session.userId,
        requestedAt: { gte: since },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
        providerCost: true,
        margin: true,
      },
      _count: true,
    })

    // Group by model
    const byModel = await prisma.usageLog.groupBy({
      by: ['model'],
      where: {
        orgId: session.userId,
        requestedAt: { gte: since },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
      },
      _count: true,
    })

    // Daily usage for chart
    const dailyUsage = await prisma.$queryRaw<
      { date: string; totalCost: number; requests: number }[]
    >`
      SELECT
        date(requestedAt) as date,
        SUM(totalCost) as totalCost,
        COUNT(*) as requests
      FROM UsageLog
      WHERE orgId = ${session.userId}
        AND requestedAt >= ${since.toISOString()}
      GROUP BY date(requestedAt)
      ORDER BY date ASC
    `

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      summary: {
        totalRequests: stats._count,
        totalInputTokens: stats._sum.inputTokens || 0,
        totalOutputTokens: stats._sum.outputTokens || 0,
        totalTokens: (stats._sum.inputTokens || 0) + (stats._sum.outputTokens || 0),
        totalCost: stats._sum.totalCost || 0,
        providerCost: stats._sum.providerCost || 0,
        margin: stats._sum.margin || 0,
      },
      byModel: byModel.map((m) => ({
        model: m.model,
        requests: m._count,
        inputTokens: m._sum.inputTokens || 0,
        outputTokens: m._sum.outputTokens || 0,
        totalCost: m._sum.totalCost || 0,
      })),
      dailyUsage: dailyUsage.map((d) => ({
        date: d.date,
        totalCost: Number(d.totalCost),
        requests: Number(d.requests),
      })),
      logs: usageLogs.map((log) => ({
        id: log.id,
        model: log.model,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        totalCost: log.totalCost,
        latencyMs: log.latencyMs,
        requestedAt: log.requestedAt,
        apiKey: log.apiKey?.name || log.apiKey?.keyPrefix || 'Unknown',
      })),
    })
  } catch (error) {
    console.error('Get usage error:', error)
    return NextResponse.json(
      { error: '사용량 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

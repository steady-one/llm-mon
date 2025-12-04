import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from "date-fns"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "month"

  const now = new Date()
  let startDate: Date
  let previousStartDate: Date

  switch (period) {
    case "day":
      startDate = startOfDay(now)
      previousStartDate = subDays(startDate, 1)
      break
    case "week":
      startDate = startOfWeek(now)
      previousStartDate = subWeeks(startDate, 1)
      break
    case "month":
    default:
      startDate = startOfMonth(now)
      previousStartDate = subMonths(startDate, 1)
      break
  }

  // Current period stats
  const currentStats = await prisma.usageLog.aggregate({
    where: {
      orgId: session.user.id,
      requestedAt: { gte: startDate },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      estimatedCost: true,
    },
    _avg: {
      latencyMs: true,
    },
  })

  // Previous period stats for comparison
  const previousStats = await prisma.usageLog.aggregate({
    where: {
      orgId: session.user.id,
      requestedAt: {
        gte: previousStartDate,
        lt: startDate,
      },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      estimatedCost: true,
    },
  })

  const currentRequests = currentStats._count.id || 0
  const previousRequests = previousStats._count.id || 0
  const currentTokens = (currentStats._sum.inputTokens || 0) + (currentStats._sum.outputTokens || 0)
  const previousTokens = (previousStats._sum.inputTokens || 0) + (previousStats._sum.outputTokens || 0)
  const currentCost = currentStats._sum.estimatedCost || 0
  const previousCost = previousStats._sum.estimatedCost || 0

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  return NextResponse.json({
    period,
    summary: {
      requests: currentRequests,
      tokens: currentTokens,
      cost: currentCost,
      avgLatency: Math.round(currentStats._avg.latencyMs || 0),
    },
    changes: {
      requests: calculateChange(currentRequests, previousRequests),
      tokens: calculateChange(currentTokens, previousTokens),
      cost: calculateChange(currentCost, previousCost),
    },
  })
}

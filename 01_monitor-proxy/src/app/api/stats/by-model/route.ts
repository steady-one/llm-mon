import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth } from "date-fns"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")

  const from = fromParam ? new Date(fromParam) : startOfMonth(new Date())

  const modelStats = await prisma.usageLog.groupBy({
    by: ["model"],
    where: {
      orgId: session.user.id,
      requestedAt: { gte: from },
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
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  })

  const models = modelStats.map((stat) => ({
    model: stat.model,
    requests: stat._count.id,
    inputTokens: stat._sum.inputTokens || 0,
    outputTokens: stat._sum.outputTokens || 0,
    totalTokens: (stat._sum.inputTokens || 0) + (stat._sum.outputTokens || 0),
    cost: stat._sum.estimatedCost || 0,
    avgLatency: Math.round(stat._avg.latencyMs || 0),
  }))

  return NextResponse.json({ models })
}

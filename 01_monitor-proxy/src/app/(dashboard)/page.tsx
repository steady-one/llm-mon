import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"
import { TopModelsTable } from "@/components/dashboard/TopModelsTable"
import { UsageChart } from "@/components/charts/UsageChart"
import { startOfMonth, subDays, format } from "date-fns"

async function getStats(orgId: string) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const last7Days = subDays(now, 7)

  // This month's summary
  const monthlyStats = await prisma.usageLog.aggregate({
    where: {
      orgId,
      requestedAt: { gte: monthStart },
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

  // Daily usage for chart (last 7 days)
  const dailyUsage = await prisma.usageLog.groupBy({
    by: ["requestedAt"],
    where: {
      orgId,
      requestedAt: { gte: last7Days },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  })

  // Group by date for chart
  const usageByDate: Record<string, { tokens: number; requests: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(now, i), "MM/dd")
    usageByDate[date] = { tokens: 0, requests: 0 }
  }

  dailyUsage.forEach((item) => {
    const date = format(new Date(item.requestedAt), "MM/dd")
    if (usageByDate[date]) {
      usageByDate[date].tokens += (item._sum.inputTokens || 0) + (item._sum.outputTokens || 0)
      usageByDate[date].requests += item._count.id
    }
  })

  // Top models
  const topModels = await prisma.usageLog.groupBy({
    by: ["model"],
    where: {
      orgId,
      requestedAt: { gte: monthStart },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      estimatedCost: true,
    },
    orderBy: {
      _sum: {
        estimatedCost: "desc",
      },
    },
    take: 5,
  })

  return {
    summary: {
      requests: monthlyStats._count.id || 0,
      tokens: (monthlyStats._sum.inputTokens || 0) + (monthlyStats._sum.outputTokens || 0),
      cost: monthlyStats._sum.estimatedCost || 0,
      avgLatency: Math.round(monthlyStats._avg.latencyMs || 0),
    },
    chartData: Object.entries(usageByDate).map(([date, data]) => ({
      date,
      tokens: data.tokens,
      requests: data.requests,
    })),
    topModels: topModels.map((m) => ({
      model: m.model,
      requests: m._count.id,
      tokens: (m._sum.inputTokens || 0) + (m._sum.outputTokens || 0),
      cost: m._sum.estimatedCost || 0,
    })),
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const stats = await getStats(session.user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">This month&apos;s summary</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={formatNumber(stats.summary.requests)}
          icon="📈"
        />
        <StatCard
          title="Total Tokens"
          value={formatNumber(stats.summary.tokens)}
          icon="🔢"
        />
        <StatCard
          title="Total Cost"
          value={`$${stats.summary.cost.toFixed(2)}`}
          icon="💰"
        />
        <StatCard
          title="Avg Latency"
          value={`${stats.summary.avgLatency}ms`}
          icon="⚡"
        />
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={stats.chartData} />
        </CardContent>
      </Card>

      {/* Top Models */}
      <Card>
        <CardHeader>
          <CardTitle>Top Models</CardTitle>
        </CardHeader>
        <CardContent>
          <TopModelsTable models={stats.topModels} />
        </CardContent>
      </Card>
    </div>
  )
}

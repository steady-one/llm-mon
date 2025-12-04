import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CostChart } from "@/components/charts/CostChart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { startOfMonth } from "date-fns"

async function getCostData(orgId: string) {
  const monthStart = startOfMonth(new Date())

  // Cost by model
  const costByModel = await prisma.usageLog.groupBy({
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
  })

  // Total cost
  const totalCost = costByModel.reduce(
    (acc, item) => acc + (item._sum.estimatedCost || 0),
    0
  )

  return {
    totalCost,
    byModel: costByModel.map((item) => ({
      model: item.model,
      requests: item._count.id,
      inputTokens: item._sum.inputTokens || 0,
      outputTokens: item._sum.outputTokens || 0,
      cost: item._sum.estimatedCost || 0,
      percentage: totalCost > 0 ? ((item._sum.estimatedCost || 0) / totalCost) * 100 : 0,
    })),
    chartData: costByModel.slice(0, 5).map((item) => ({
      name: item.model.length > 15 ? item.model.slice(0, 15) + "..." : item.model,
      cost: item._sum.estimatedCost || 0,
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

export default async function CostsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const costData = await getCostData(session.user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cost Analysis</h1>
        <p className="text-gray-600">This month&apos;s cost breakdown</p>
      </div>

      {/* Total Cost Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Cost This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            ${costData.totalCost.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      {/* Cost by Model Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost by Model (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          {costData.chartData.length > 0 ? (
            <CostChart data={costData.chartData} />
          ) : (
            <p className="text-center text-gray-500 py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Cost Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Input Tokens</TableHead>
                <TableHead className="text-right">Output Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costData.byModel.map((item) => (
                <TableRow key={item.model}>
                  <TableCell className="font-medium">{item.model}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.requests)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.inputTokens)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.outputTokens)}</TableCell>
                  <TableCell className="text-right">${item.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {costData.byModel.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

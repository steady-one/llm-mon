import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subDays, format, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from "date-fns"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const granularity = searchParams.get("granularity") || "day"

  const now = new Date()
  const from = fromParam ? new Date(fromParam) : subDays(now, 7)
  const to = toParam ? new Date(toParam) : now

  // Fetch usage logs
  const logs = await prisma.usageLog.findMany({
    where: {
      orgId: session.user.id,
      requestedAt: {
        gte: from,
        lte: to,
      },
    },
    select: {
      requestedAt: true,
      inputTokens: true,
      outputTokens: true,
      estimatedCost: true,
    },
  })

  // Generate time buckets
  let buckets: Date[]
  let formatPattern: string

  if (granularity === "hour") {
    buckets = eachHourOfInterval({ start: startOfDay(from), end: endOfDay(to) })
    formatPattern = "MM/dd HH:00"
  } else {
    buckets = eachDayOfInterval({ start: from, end: to })
    formatPattern = "MM/dd"
  }

  // Initialize data
  const dataMap: Record<string, { tokens: number; requests: number; cost: number }> = {}
  buckets.forEach((date) => {
    const key = format(date, formatPattern)
    dataMap[key] = { tokens: 0, requests: 0, cost: 0 }
  })

  // Aggregate logs into buckets
  logs.forEach((log) => {
    const key = format(log.requestedAt, formatPattern)
    if (dataMap[key]) {
      dataMap[key].tokens += log.inputTokens + log.outputTokens
      dataMap[key].requests += 1
      dataMap[key].cost += log.estimatedCost || 0
    }
  })

  // Convert to array
  const timeline = Object.entries(dataMap).map(([date, data]) => ({
    date,
    ...data,
  }))

  return NextResponse.json({ timeline })
}

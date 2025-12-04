import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const balance = await prisma.balance.findUnique({
      where: { orgId: session.userId },
    })

    const recentTransactions = await prisma.balanceTransaction.findMany({
      where: { orgId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      balance: balance?.amount || 0,
      currency: 'USD',
      transactions: recentTransactions,
    })
  } catch (error) {
    console.error('Get balance error:', error)
    return NextResponse.json(
      { error: '잔액 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

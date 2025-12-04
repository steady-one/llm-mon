import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// MVP: Manual charge without payment gateway
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { amount } = await request.json()

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: '유효한 충전 금액을 입력해주세요.' },
        { status: 400 }
      )
    }

    if (amount > 1000) {
      return NextResponse.json(
        { error: 'MVP에서는 최대 $1000까지 충전 가능합니다.' },
        { status: 400 }
      )
    }

    const balance = await prisma.balance.findUnique({
      where: { orgId: session.userId },
    })

    if (!balance) {
      return NextResponse.json(
        { error: '잔액 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const newBalance = balance.amount + amount

    await prisma.$transaction([
      prisma.balance.update({
        where: { id: balance.id },
        data: { amount: newBalance },
      }),
      prisma.balanceTransaction.create({
        data: {
          orgId: session.userId,
          type: 'charge',
          amount: amount,
          balanceAfter: newBalance,
          description: `크레딧 충전: $${amount}`,
        },
      }),
    ])

    return NextResponse.json({
      message: `$${amount} 충전이 완료되었습니다.`,
      balance: newBalance,
    })
  } catch (error) {
    console.error('Charge balance error:', error)
    return NextResponse.json(
      { error: '충전 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

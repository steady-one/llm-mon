import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.userId },
      include: {
        balance: true,
      },
    })

    if (!org) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: org.id,
        name: org.name,
        email: org.email,
        balance: org.balance?.amount || 0,
      },
    })
  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json(
      { error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

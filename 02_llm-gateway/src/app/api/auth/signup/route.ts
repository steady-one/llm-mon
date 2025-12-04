import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const existingOrg = await prisma.organization.findUnique({
      where: { email },
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const org = await prisma.organization.create({
      data: {
        name,
        email,
        password: hashedPassword,
        balance: {
          create: {
            amount: 0,
          },
        },
      },
    })

    const session = await getSession()
    session.userId = org.id
    session.email = org.email
    session.name = org.name
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      message: '회원가입이 완료되었습니다.',
      user: {
        id: org.id,
        name: org.name,
        email: org.email,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

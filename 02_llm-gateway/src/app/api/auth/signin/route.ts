import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const org = await prisma.organization.findUnique({
      where: { email },
    })

    if (!org) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, org.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const session = await getSession()
    session.userId = org.id
    session.email = org.email
    session.name = org.name
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      message: '로그인 성공',
      user: {
        id: org.id,
        name: org.name,
        email: org.email,
      },
    })
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

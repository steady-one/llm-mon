import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingOrg = await prisma.organization.findUnique({
      where: { email },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password);

    // 조직 생성
    const org = await prisma.organization.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // 잔액 초기화 (Reseller용)
    await prisma.balance.create({
      data: {
        orgId: org.id,
        amount: 0,
      },
    });

    // JWT 생성
    const token = await createToken({ orgId: org.id, email: org.email });

    // 세션 쿠키 설정
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

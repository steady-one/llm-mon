import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const existing = await prisma.organization.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email exists' }, { status: 409 });
    }

    const org = await prisma.organization.create({
      data: { name, email, password: await hashPassword(password) },
    });

    await prisma.balance.create({ data: { orgId: org.id, amount: 0 } });

    const token = await createToken({ orgId: org.id, email: org.email });
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      organization: { id: org.id, name: org.name, email: org.email },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

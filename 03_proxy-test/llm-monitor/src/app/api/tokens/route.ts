import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, generateMonitorToken } from '@/lib/auth';

// Monitor Token 목록 조회
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokens = await prisma.monitorToken.findMany({
      where: { orgId: user.id },
      select: {
        id: true,
        tokenPrefix: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Monitor Token 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body;

    const { token, prefix, hash } = await generateMonitorToken();

    await prisma.monitorToken.create({
      data: {
        orgId: user.id,
        tokenHash: hash,
        tokenPrefix: prefix,
        name: name || null,
      },
    });

    // 토큰은 생성 시에만 반환 (이후에는 볼 수 없음)
    return NextResponse.json({
      success: true,
      token, // 전체 토큰 반환 - 사용자에게 저장하라고 알림
      prefix,
      message: 'Save this token now. You will not be able to see it again.',
    });
  } catch (error) {
    console.error('Create token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Monitor Token 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('id');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // 해당 조직의 토큰인지 확인
    const token = await prisma.monitorToken.findFirst({
      where: { id: tokenId, orgId: user.id },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    await prisma.monitorToken.delete({
      where: { id: tokenId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

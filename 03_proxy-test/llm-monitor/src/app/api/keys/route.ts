import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, generateApiKey } from '@/lib/auth';

// API Key 목록 조회
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { orgId: user.id },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Get keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// API Key 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body;

    const { key, prefix, hash } = await generateApiKey();

    await prisma.apiKey.create({
      data: {
        orgId: user.id,
        keyHash: hash,
        keyPrefix: prefix,
        name: name || null,
      },
    });

    // 키는 생성 시에만 반환 (이후에는 볼 수 없음)
    return NextResponse.json({
      success: true,
      key, // 전체 키 반환 - 사용자에게 저장하라고 알림
      prefix,
      message: 'Save this key now. You will not be able to see it again.',
    });
  } catch (error) {
    console.error('Create key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// API Key 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      );
    }

    // 해당 조직의 키인지 확인
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, orgId: user.id },
    });

    if (!key) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

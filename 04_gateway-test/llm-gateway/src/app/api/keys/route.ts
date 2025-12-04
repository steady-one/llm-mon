import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, generateApiKey } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { orgId: user.id },
    select: { id: true, keyPrefix: true, name: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { key, prefix, hash } = await generateApiKey();

  await prisma.apiKey.create({
    data: { orgId: user.id, keyHash: hash, keyPrefix: prefix, name: body.name || null },
  });

  return NextResponse.json({
    success: true,
    key,
    prefix,
    message: 'Save this key now. You will not see it again.',
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keyId = new URL(request.url).searchParams.get('id');
  if (!keyId) return NextResponse.json({ error: 'Key ID required' }, { status: 400 });

  const key = await prisma.apiKey.findFirst({ where: { id: keyId, orgId: user.id } });
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.apiKey.delete({ where: { id: keyId } });
  return NextResponse.json({ success: true });
}

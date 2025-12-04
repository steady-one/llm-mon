import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const balance = await prisma.balance.findUnique({ where: { orgId: user.id } });
  const transactions = await prisma.balanceTransaction.findMany({
    where: { orgId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ balance: balance?.amount || 0, transactions });
}

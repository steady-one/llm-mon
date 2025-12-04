import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount } = await request.json();
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.balance.upsert({
      where: { orgId: user.id },
      update: { amount: { increment: amount } },
      create: { orgId: user.id, amount },
    });

    await tx.balanceTransaction.create({
      data: {
        orgId: user.id,
        type: 'charge',
        amount,
        balanceAfter: balance.amount,
        description: `Charge: $${amount.toFixed(2)}`,
      },
    });

    return balance;
  });

  return NextResponse.json({ success: true, balance: result.amount });
}

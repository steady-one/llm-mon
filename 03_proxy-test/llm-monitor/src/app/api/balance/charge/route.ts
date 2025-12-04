import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// 잔액 충전 (테스트용 - 실제로는 결제 시스템 연동 필요)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 잔액 업데이트
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.balance.upsert({
        where: { orgId: user.id },
        update: {
          amount: { increment: amount },
        },
        create: {
          orgId: user.id,
          amount,
        },
      });

      await tx.balanceTransaction.create({
        data: {
          orgId: user.id,
          type: 'charge',
          amount,
          balanceAfter: balance.amount,
          description: `Manual charge: $${amount.toFixed(2)}`,
        },
      });

      return balance;
    });

    return NextResponse.json({
      success: true,
      balance: result.amount,
    });
  } catch (error) {
    console.error('Charge error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

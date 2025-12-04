import { prisma } from './prisma';

const DEFAULT_MARGIN_PERCENT = parseFloat(process.env.DEFAULT_MARGIN_PERCENT || '0.20');

export interface CostCalculation {
  providerCost: number;
  margin: number;
  totalCost: number;
}

// 가격 조회
export async function getPricing(provider: string, model: string) {
  const pricing = await prisma.pricing.findFirst({
    where: { provider, model },
    orderBy: { effectiveDate: 'desc' },
  });
  return pricing;
}

// 비용 계산
export async function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<CostCalculation | null> {
  const pricing = await getPricing(provider, model);

  if (!pricing) {
    console.warn(`No pricing found for ${provider}/${model}`);
    return null;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1m;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1m;
  const providerCost = inputCost + outputCost;
  const margin = providerCost * DEFAULT_MARGIN_PERCENT;
  const totalCost = providerCost + margin;

  return {
    providerCost: Math.round(providerCost * 1_000_000) / 1_000_000,
    margin: Math.round(margin * 1_000_000) / 1_000_000,
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
  };
}

// 예상 비용 계산 (Pass-through용)
export async function estimateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<number | null> {
  const pricing = await getPricing(provider, model);

  if (!pricing) {
    return null;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1m;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1m;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// 잔액 차감
export async function deductBalance(orgId: string, amount: number, description?: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const balance = await tx.balance.findUnique({
      where: { orgId },
    });

    if (!balance || balance.amount < amount) {
      return false;
    }

    const newAmount = balance.amount - amount;

    await tx.balance.update({
      where: { orgId },
      data: { amount: newAmount },
    });

    await tx.balanceTransaction.create({
      data: {
        orgId,
        type: 'usage',
        amount: -amount,
        balanceAfter: newAmount,
        description,
      },
    });

    return true;
  });
}

// Model 라우팅 테이블
export const MODEL_ROUTING: Record<string, { provider: string; actualModel: string }> = {
  // OpenAI
  'gpt-4o': { provider: 'openai', actualModel: 'gpt-4o' },
  'gpt-4o-mini': { provider: 'openai', actualModel: 'gpt-4o-mini' },
  // Anthropic (Claude 4.5)
  'claude-sonnet-4-5': { provider: 'anthropic', actualModel: 'claude-sonnet-4-5-20250929' },
  'claude-haiku-4-5': { provider: 'anthropic', actualModel: 'claude-haiku-4-5-20251001' },
  // Google
  'gemini-1.5-pro': { provider: 'google', actualModel: 'gemini-1.5-pro' },
  'gemini-1.5-flash': { provider: 'google', actualModel: 'gemini-1.5-flash' },
  'gemini-2.0-flash': { provider: 'google', actualModel: 'gemini-2.0-flash-exp' },
  // xAI (Grok)
  'grok-3': { provider: 'xai', actualModel: 'grok-3' },
  'grok-3-mini': { provider: 'xai', actualModel: 'grok-3-mini' },
  'grok-2': { provider: 'xai', actualModel: 'grok-2-1212' },
};

export function getProviderFromModel(model: string): { provider: string; actualModel: string } | null {
  // 직접 매칭 시도
  if (MODEL_ROUTING[model]) {
    return MODEL_ROUTING[model];
  }

  // Prefix 기반 매칭
  if (model.startsWith('gpt-')) return { provider: 'openai', actualModel: model };
  if (model.startsWith('claude-')) return { provider: 'anthropic', actualModel: model };
  if (model.startsWith('gemini-')) return { provider: 'google', actualModel: model };
  if (model.startsWith('grok-')) return { provider: 'xai', actualModel: model };

  return null;
}

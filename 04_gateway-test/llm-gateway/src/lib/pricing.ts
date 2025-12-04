import { prisma } from './prisma';

const MARGIN = parseFloat(process.env.MARGIN_PERCENT || '0.20');

export async function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const pricing = await prisma.pricing.findFirst({
    where: { provider, model },
    orderBy: { effectiveDate: 'desc' },
  });

  if (!pricing) {
    console.warn(`No pricing for ${provider}/${model}`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1m;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1m;
  const baseCost = inputCost + outputCost;
  const totalCost = baseCost * (1 + MARGIN);

  return Math.round(totalCost * 1_000_000) / 1_000_000;
}

export async function deductBalance(orgId: string, amount: number, description?: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const balance = await tx.balance.findUnique({ where: { orgId } });
    if (!balance || balance.amount < amount) return false;

    const newAmount = balance.amount - amount;
    await tx.balance.update({ where: { orgId }, data: { amount: newAmount } });
    await tx.balanceTransaction.create({
      data: { orgId, type: 'usage', amount: -amount, balanceAfter: newAmount, description },
    });
    return true;
  });
}

// Model 라우팅
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
  if (MODEL_ROUTING[model]) return MODEL_ROUTING[model];
  if (model.startsWith('gpt-')) return { provider: 'openai', actualModel: model };
  if (model.startsWith('claude-')) return { provider: 'anthropic', actualModel: model };
  if (model.startsWith('gemini-')) return { provider: 'google', actualModel: model };
  if (model.startsWith('grok-')) return { provider: 'xai', actualModel: model };
  return null;
}
